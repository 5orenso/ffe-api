'use strict';
// Node 18's test runner adds one abort listener per beforeEach run; raise the
// default of 10 so an 11+ test file does not print MaxListenersExceededWarning.
require('events').setMaxListeners(50);
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const https = require('https');
const FFE = require('../ffe');

// Local stub server. `reply` controls the next response, `last` records the
// request the SDK actually sent.
let server;
let port;
let last;
let reply;

test.before(async () => {
    server = http.createServer((req, res) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
            last = {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: Buffer.concat(chunks).toString('utf8'),
            };
            res.writeHead(reply.status, { 'Content-Type': 'application/json' });
            res.end(typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body));
        });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
    // Without this, the listening server handle keeps the event loop "alive"
    // from the test runner's perspective and test.after() never runs on
    // Node 18.18.2 (no --test-force-exit available on this version) — see
    // task-2-report.md for the isolated repro. unref() doesn't stop the
    // server from accepting real connections; those sockets are ref'd on
    // their own for the duration of each request.
    server.unref();
});

test.after(() => {
    server.closeAllConnections();
    server.close();
});

test.beforeEach(() => {
    last = null;
    reply = { status: 200, body: [] };
});

function client(token = 'test-token') {
    return new FFE(token, { hostname: '127.0.0.1', port, https: false });
}

test('GET sends the bearer token to the right path and resolves the JSON', async () => {
    reply.body = [{ brandno: 'simms', sort: 1, name: 'Simms' }];
    const result = await client().brands();
    assert.equal(last.method, 'GET');
    assert.equal(last.url, '/api/brands/');
    assert.equal(last.headers.authorization, 'Bearer test-token');
    assert.deepEqual(result, reply.body);
});

test('makeQueryString encodes values and drops empty ones', () => {
    const qs = client().makeQueryString({ brand: 'c&f', limit: 2, offset: 0, search: '' });
    assert.equal(qs, '?brand=c%26f&limit=2&offset=0');
    assert.equal(client().makeQueryString(undefined), '');
    assert.equal(client().makeQueryString({ isNew: 0, x: null, y: undefined }), '?isNew=0');
});

test('products() appends the query string', async () => {
    await client().products({ brand: 'scott', limit: 1 });
    assert.equal(last.url, '/api/products/?brand=scott&limit=1');
});

test('POST sends a JSON body with correct Content-Length for non-ASCII', async () => {
    const payload = { name: 'Ørret', qty: 1 };
    await client().posAddSale(payload);
    assert.equal(last.method, 'POST');
    assert.equal(last.url, '/api/pos/sales/');
    assert.equal(last.headers['content-type'], 'application/json');
    assert.equal(last.body, JSON.stringify(payload));
});

test('a non-JSON body resolves an error object instead of throwing', async () => {
    reply = { status: 502, body: '<html>Bad gateway</html>' };
    const result = await client().brands();
    assert.equal(result.code, 500);
    assert.equal(result.error, 'Invalid JSON from server');
    assert.equal(result.path, '/api/brands/');
});

test('a connection failure rejects', async () => {
    const ffe = new FFE('t', { hostname: '127.0.0.1', port: 1, https: false });
    await assert.rejects(ffe.brands());
});

test('login() posts credentials and switches to the returned apiToken', async () => {
    reply.body = { status: 200, apiToken: 'new-token', message: 'OK' };
    const ffe = client('old-token');
    const result = await ffe.login('me@example.com', 'secret');
    assert.equal(last.method, 'POST');
    assert.equal(last.url, '/login/');
    assert.deepEqual(JSON.parse(last.body), { email: 'me@example.com', pass: 'secret' });
    assert.equal(result.apiToken, 'new-token');
    await ffe.brands();
    assert.equal(last.headers.authorization, 'Bearer new-token');
});

test('failed login() keeps the old token', async () => {
    reply = { status: 401, body: { status: 401, message: 'Login failed' } };
    const ffe = client('old-token');
    const result = await ffe.login('me@example.com', 'wrong');
    assert.equal(result.status, 401);
    reply = { status: 200, body: [] };
    await ffe.brands();
    assert.equal(last.headers.authorization, 'Bearer old-token');
});

test('constructor keeps https unless https is explicitly false', () => {
    assert.equal(new FFE('t').https, https);
    assert.equal(new FFE('t', { hostname: 'localhost', port: 8000 }).https, https);
    assert.equal(new FFE('t', { hostname: 'localhost', port: 8000, https: false }).https, http);
    assert.equal(new FFE('t', { https: true }).https, https);
});

test('baskets() hits /api/baskets/ with optional query', async () => {
    reply.body = { lines: [], qty: 0 };
    const result = await client().baskets({ presale: 1 });
    assert.equal(last.url, '/api/baskets/?presale=1');
    assert.deepEqual(result, reply.body);
    await client().baskets();
    assert.equal(last.url, '/api/baskets/');
});

test('dealerInfo() hits /api/dealers/info', async () => {
    reply.body = { customerno: 999999 };
    const result = await client().dealerInfo();
    assert.equal(last.url, '/api/dealers/info');
    assert.deepEqual(result, reply.body);
});

test('login() with 200 but no apiToken keeps the old token', async () => {
    reply.body = { status: 200, message: 'OK' };
    const ffe = client('old-token');
    const result = await ffe.login('me@example.com', 'secret');
    assert.equal(result.status, 200);
    reply = { status: 200, body: [] };
    await ffe.brands();
    assert.equal(last.headers.authorization, 'Bearer old-token');
});

test('login() with a non-JSON body keeps the old token', async () => {
    reply = { status: 200, body: '<html>not json</html>' };
    const ffe = client('old-token');
    const result = await ffe.login('me@example.com', 'secret');
    assert.equal(result.error, 'Invalid JSON from server');
    reply = { status: 200, body: [] };
    await ffe.brands();
    assert.equal(last.headers.authorization, 'Bearer old-token');
});

test('baskets({}) and baskets({ presale: 0 }) build the expected query string', async () => {
    await client().baskets({});
    assert.equal(last.url, '/api/baskets/');
    await client().baskets({ presale: 0 });
    assert.equal(last.url, '/api/baskets/?presale=0');
});

test('https is only swapped to http when the option is strictly false, not merely falsy', () => {
    assert.equal(new FFE('t', { https: 0 }).https, https);
});

test('setBasketLine() sends PATCH /api/baskets/ with a JSON {id, qty} body', async () => {
    reply.body = { status: 201, message: 'Basket update', data: { qty: 1, price: null, retailPrice: null, id: 613599, addedFrom: 'api', addedBy: 'me@example.com' } };
    const result = await client().setBasketLine({ id: 613599, qty: 1 });
    assert.equal(last.method, 'PATCH');
    assert.equal(last.url, '/api/baskets/');
    assert.equal(last.headers['content-type'], 'application/json');
    assert.equal(last.body, JSON.stringify({ id: 613599, qty: 1 }));
    assert.deepEqual(result, reply.body);
});

test('setBasketLine() throws TypeError when id is not the numeric product id', () => {
    assert.throws(() => client().setBasketLine({ id: '13960-096-10', qty: 1 }), TypeError);
});

test('setBasketLine() throws TypeError when qty is not a non-negative integer', () => {
    assert.throws(() => client().setBasketLine({ id: 613599, qty: -1 }), TypeError);
    assert.throws(() => client().setBasketLine({ id: 613599, qty: 1.5 }), TypeError);
    assert.throws(() => client().setBasketLine({ id: 613599 }), TypeError);
});
