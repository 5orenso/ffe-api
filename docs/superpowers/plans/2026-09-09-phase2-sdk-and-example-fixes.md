# Phase 2: SDK and Example Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Node and PHP SDKs, the browser client and the examples behave exactly as the guide will describe them, with a real Node test suite.

**Architecture:** The Node SDK stays a single dependency-free class; behaviour is pinned by `node:test` tests that run against a local stub HTTP server, so no network or token is needed. The PHP SDK gets the same method surface additions. The browser client moves to `sdk/javascript/` so existing README links become true. Examples read the token from `FFE_TOKEN` and require the SDK by relative path so they run unmodified.

**Tech Stack:** Node.js 18 (`node:test`, `node:assert/strict`, `http`), PHP ≥ 5.4 with the curl extension.

**Spec:** `docs/superpowers/specs/2026-09-09-api-guide-overhaul-design.md` (section 4)

## Global Constraints

- Package name everywhere is `@flyfisheurope/ffe-api-sdk`.
- Both SDKs expose the same public method names: `login`, `brand`, `brands`, `category`, `categories`, `product`, `products`, `baskets`, `dealerInfo`, plus `posAddSale`, `posSales`, `posAddProduct`, `posEditProduct`, `posProducts` (PHP: not implemented, throw).
- Node constructor contract after this phase: `new FFE(token, { hostname, port, https })`; protocol switches to plain http only when `https === false`.
- Never put a real token in any file. Examples read `FFE_TOKEN` from the environment.
- Workspace policy blocks the assistant from running version-control commands. Commit steps are for the human to run; the executor prints the command and moves on. File moves are done with `mv`; version control detects the rename.
- PHP may not be installed on the executing machine. Where a step says `php -l`, run it if `php` is on PATH; otherwise print "php not installed, lint skipped" and ask the human to run it.

---

### Task 1: Node SDK test harness pinning current behaviour (and fixing Content-Length)

**Files:**
- Create: `sdk/node.js/test/ffe.test.js`
- Modify: `sdk/node.js/package.json` (scripts.test)
- Modify: `sdk/node.js/ffe.js` (Content-Length only)

**Interfaces:**
- Produces: the stub-server harness (`client()`, `reply`, `last`) reused by Tasks 2–4 in the same test file.

- [ ] **Step 1: Write the test file**

`sdk/node.js/test/ffe.test.js`:

```js
'use strict';
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
});

test.after(() => server.close());

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
    assert.equal(qs, '?brand=c%26f&limit=2');
    assert.equal(client().makeQueryString(undefined), '');
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
```

- [ ] **Step 2: Point npm test at it**

In `sdk/node.js/package.json` replace the `scripts` block with:

```json
  "scripts": {
    "test": "node --test test/ffe.test.js"
  },
```

- [ ] **Step 3: Run the tests; expect one failure**

Run: `cd sdk/node.js && npm test`
Expected: 5 pass, 1 fail: the non-ASCII POST test, because `Content-Length` is set from `postData.length` (characters) instead of bytes, so the server receives a truncated body.

- [ ] **Step 4: Fix Content-Length**

In `sdk/node.js/ffe.js`, inside `getEndpoint`, replace:

```js
                options.headers['Content-Length'] = postData.length;
```

with:

```js
                options.headers['Content-Length'] = Buffer.byteLength(postData);
```

- [ ] **Step 5: Run the tests; expect all green**

Run: `cd sdk/node.js && npm test`
Expected: 6 pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
git add sdk/node.js/test/ffe.test.js sdk/node.js/package.json sdk/node.js/ffe.js
git commit -m "Add Node SDK tests and fix Content-Length for non-ASCII bodies"
```

---

### Task 2: Node login() stores the returned apiToken

**Files:**
- Modify: `sdk/node.js/ffe.js` (`login`)
- Modify: `sdk/node.js/test/ffe.test.js`

**Interfaces:**
- Produces: `login(email, pass) -> Promise<{ status, apiToken?, message }>`; on `status === 200` the instance's `jwtToken` becomes `apiToken`.

- [ ] **Step 1: Add the failing tests**

Append to `sdk/node.js/test/ffe.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify the first new one fails**

Run: `cd sdk/node.js && npm test`
Expected: the "switches to the returned apiToken" test fails on the final assertion (`Bearer old-token` !== `Bearer new-token`).

- [ ] **Step 3: Implement**

In `sdk/node.js/ffe.js` replace the `login` method with:

```js
    login(email, pass) {
        return this.getEndpoint('/login/', 'POST', { email, pass }).then((data) => {
            if (data && data.status === 200 && data.apiToken) {
                this.jwtToken = data.apiToken;
            }
            return data;
        });
    }
```

If Phase 1 Task 3 showed that `/login/` only accepts form-encoded bodies, also change `getEndpoint` so the body encoding follows a fourth argument, and call `this.getEndpoint('/login/', 'POST', { email, pass }, 'form')`:

```js
    getEndpoint(url, method = 'GET', body, encoding = 'json') {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.hostname,
                port: this.port,
                path: url,
                method,
                headers: {
                    Authorization: `Bearer ${this.jwtToken}`
                }
            };
            let postData;
            if (typeof body === 'object') {
                if (encoding === 'form') {
                    postData = querystring.stringify(body);
                    options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                } else {
                    postData = JSON.stringify(body);
                    options.headers['Content-Type'] = 'application/json';
                }
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }
```

(the rest of `getEndpoint` is unchanged; `querystring` is already required at the top of the file). In that case change the login test's body assertion to `assert.deepEqual(querystring.parse(last.body), { email: 'me@example.com', pass: 'secret' })` and add `const querystring = require('querystring');` to the test file.

- [ ] **Step 4: Run the tests; expect all green**

Run: `cd sdk/node.js && npm test`
Expected: 8 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add sdk/node.js/ffe.js sdk/node.js/test/ffe.test.js
git commit -m "Node SDK: login() switches to the returned apiToken"
```

---

### Task 3: Node constructor only falls back to http when https === false

**Files:**
- Modify: `sdk/node.js/ffe.js` (constructor)
- Modify: `sdk/node.js/test/ffe.test.js`

- [ ] **Step 1: Add the failing test**

Append to the test file:

```js
test('constructor keeps https unless https is explicitly false', () => {
    assert.equal(new FFE('t').https, https);
    assert.equal(new FFE('t', { hostname: 'localhost', port: 8000 }).https, https);
    assert.equal(new FFE('t', { hostname: 'localhost', port: 8000, https: false }).https, http);
    assert.equal(new FFE('t', { https: true }).https, https);
});
```

- [ ] **Step 2: Run the tests to verify it fails**

Run: `cd sdk/node.js && npm test`
Expected: the new test fails on the second assertion (options without `https` currently switch to http).

- [ ] **Step 3: Implement**

In the constructor replace:

```js
            if (!options.https) {
                this.https = http;
            }
```

with:

```js
            if (options.https === false) {
                this.https = http;
            }
```

- [ ] **Step 4: Run the tests; expect all green**

Run: `cd sdk/node.js && npm test`
Expected: 9 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add sdk/node.js/ffe.js sdk/node.js/test/ffe.test.js
git commit -m "Node SDK: only use plain http when https is explicitly false"
```

---

### Task 4: Add baskets() to the Node SDK and cover dealerInfo()

**Files:**
- Modify: `sdk/node.js/ffe.js`
- Modify: `sdk/node.js/test/ffe.test.js`

**Interfaces:**
- Produces: `baskets(opt) -> Promise` hitting `/api/baskets/` with the query string from `opt`; `dealerInfo() -> Promise` hitting `/api/dealers/info`.

- [ ] **Step 1: Add the failing tests**

```js
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
```

- [ ] **Step 2: Run the tests to verify the baskets test fails**

Run: `cd sdk/node.js && npm test`
Expected: `TypeError: client(...).baskets is not a function`; dealerInfo test passes.

- [ ] **Step 3: Implement**

In `sdk/node.js/ffe.js`, after the `dealerInfo()` method add:

```js
    baskets(opt) {
        return this.getEndpoint(`/api/baskets/${this.makeQueryString(opt)}`);
    }
```

- [ ] **Step 4: Run the tests; expect all green**

Run: `cd sdk/node.js && npm test`
Expected: 11 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add sdk/node.js/ffe.js sdk/node.js/test/ffe.test.js
git commit -m "Node SDK: add baskets()"
```

---

### Task 5: PHP SDK: baskets(), dealerInfo(), declared debug property, composer requirements

**Files:**
- Modify: `sdk/php/ffe.php`
- Modify: `sdk/php/composer.json`

- [ ] **Step 1: Declare the debug property**

In `sdk/php/ffe.php` replace:

```php
    private $https;
    private $curlInfo;
```

with:

```php
    private $https;
    private $debug;
    private $curlInfo;
```

- [ ] **Step 2: Add the two methods**

Insert after the `product($articleno)` method:

```php
    /**
     * Get your current basket
     * @param object $opt
     *  $opt->presale int Optional, 1 enables pre-season mode
     * @return array See docs/reference/baskets.md
     */
    public function baskets($opt = null) {
        return $this->get('/api/baskets/' . $this->makeQueryString($opt));
    }

    /**
     * Information about the dealer account the token belongs to
     * @return array See docs/reference/dealers.md
     */
    public function dealerInfo() {
        return $this->get('/api/dealers/info');
    }
```

- [ ] **Step 3: Fix composer.json requirements**

The SDK uses short array syntax (`[]`), which needs PHP 5.4, and the curl extension. Replace `sdk/php/composer.json` with:

```json
{
    "name": "ffe/api",
    "description": "API access to FlyfishEurope",
    "require": {
        "php": ">=5.4",
        "ext-curl": "*"
    },
    "autoload": {
        "classmap": ["ffe.php"]
    }
}
```

- [ ] **Step 4: Lint**

Run: `command -v php >/dev/null && php -l sdk/php/ffe.php || echo "php not installed, lint skipped"`
Expected: `No syntax errors detected` or the skip message (then ask the human to run `php -l sdk/php/ffe.php`).

- [ ] **Step 5: Commit**

```bash
git add sdk/php/ffe.php sdk/php/composer.json
git commit -m "PHP SDK: add baskets() and dealerInfo(), declare requirements"
```

---

### Task 6: Move the browser client to sdk/javascript and fix its links

**Files:**
- Move: `example/javascript/ffe-api-sdk.js` → `sdk/javascript/ffe-api-sdk.js`
- Create: `sdk/javascript/README.md`
- Modify: `example/javascript/html-client.html` (script src)
- Modify: `example/javascript/README.md`

- [ ] **Step 1: Move the file**

Run: `mkdir -p sdk/javascript && mv example/javascript/ffe-api-sdk.js sdk/javascript/ffe-api-sdk.js`

- [ ] **Step 2: Update the demo page**

In `example/javascript/html-client.html` replace:

```html
        <script type="text/javascript" src="ffe-api-sdk.js"></script>
```

with:

```html
        <script type="text/javascript" src="../../sdk/javascript/ffe-api-sdk.js"></script>
```

- [ ] **Step 3: Write sdk/javascript/README.md**

```markdown
# FFE API SDK - Browser JavaScript

A small client-side script that renders brands, categories and products from the
Flyfish Europe Dealer API into an HTML page using `fetch`. It is demo code: it
writes into elements with fixed ids (`#categoryList`, `#product`, `#productList`,
`#productPagination`). Copy it and adapt it to your own markup.

Use a **client-side** token here (created in DealerWeb under My Account). Never put
a server-side token in a web page.

## Usage

```html
<script>
    FFE_TOKEN = '<your client-side token>';
    // Optional overrides:
    // FFE_URL = 'https://dealer.flyfisheurope.com/api';
    // FFE_IMAGE_DOMAIN = 'https://dealer.flyfisheurope.com';
</script>
<script src="https://cdn.jsdelivr.net/gh/5orenso/ffe-api@master/sdk/javascript/ffe-api-sdk.js"></script>
```

Then call from your page:

- `FFE.getProductList(brand, maingroup, limit, offset)` renders a product list.
- `FFE.getCategoryList(brand)` renders the main categories of a brand.
- `FFE.getProduct(articleno)` renders one product.

See [example/javascript/html-client.html](../../example/javascript/html-client.html)
for a complete page.
```

- [ ] **Step 4: Update example/javascript/README.md**

Replace the whole file with:

```markdown
# FFE API Examples - Clientside Javascript

Flyfish Europe REST API client side example.

## Files

- [html-client.html](html-client.html) — a page that lists brands, categories and products using [sdk/javascript/ffe-api-sdk.js](../../sdk/javascript/ffe-api-sdk.js).

## How to test

Serve the repository root over HTTP so the relative script path resolves, then open the page:

```bash
# From the repository root:
python3 -m http.server 9999
# Then open:
open http://localhost:9999/example/javascript/html-client.html
```

Edit `FFE_TOKEN` in `html-client.html` first and use a client-side token.
```

- [ ] **Step 5: Verify the page loads the script**

Run: `python3 -m http.server 9999 >/dev/null 2>&1 & sleep 1; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:9999/sdk/javascript/ffe-api-sdk.js; kill %1`
Expected: `200`.

- [ ] **Step 6: Commit**

```bash
git add sdk/javascript example/javascript
git commit -m "Move browser client to sdk/javascript and fix links"
```

---

### Task 7: Examples run unmodified with FFE_TOKEN

**Files:**
- Modify: `example/node.js/simple-dist.js`
- Modify: `example/node.js/README.md`
- Modify: `example/php/ffe.php`

- [ ] **Step 1: Rewrite the Node example**

Replace `example/node.js/simple-dist.js` with:

```js
'use strict';

// Run with:  FFE_TOKEN=<your token> node simple-dist.js
// When installed from npm use: const FFE = require('@flyfisheurope/ffe-api-sdk');
const FFE = require('../../sdk/node.js/ffe');

const token = process.env.FFE_TOKEN;
if (!token) {
    console.error('Set FFE_TOKEN to your DealerWeb API token first.');
    process.exit(1);
}
const ffe = new FFE(token);

Promise.all([
    ffe.products({ limit: 1, brand: 'scott' }),
    ffe.products({ limit: 1, brand: 'c&f' }),
    ffe.product('10443-233-20'),
    ffe.categories({ brand: 'scott' }),
    ffe.categories({ brand: 'c&f' }),
    ffe.category(101),
])
    .then((result) => {
        console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

- [ ] **Step 2: Update example/node.js/README.md**

```markdown
# FFE API Examples - Node.js

Flyfish Europe REST API server side example in Node.js.

## Files

- [simple-dist.js](simple-dist.js) — fetches a few products and categories.

## Run

```bash
FFE_TOKEN=<your token> node simple-dist.js
```

The example requires the SDK from this repository by relative path. In your own
project install it from npm instead:

```bash
npm install @flyfisheurope/ffe-api-sdk --save
```
```

- [ ] **Step 3: Rewrite the PHP example header**

In `example/php/ffe.php` replace everything from `<?php` down to and including the line `$ffe = new FFE($token, $options);` and the login block, so the file starts:

```php
<?php
// Run with:  FFE_TOKEN=<your token> php ffe.php
// Optional:  FFE_EMAIL and FFE_PASS to demonstrate login() instead of a pre-made token.
include(__DIR__ . '/../../sdk/php/ffe.php');

$token = getenv('FFE_TOKEN');
$options = new stdClass();
$options->debug = 0;
$ffe = new FFE($token ?: '', $options);
try {
    if (getenv('FFE_EMAIL') && getenv('FFE_PASS')) {
        $ffe->login(getenv('FFE_EMAIL'), getenv('FFE_PASS'));
    } elseif (!$token) {
        fwrite(STDERR, "Set FFE_TOKEN (or FFE_EMAIL and FFE_PASS) first.\n");
        exit(1);
    }
    $allbrands = $ffe->brands();
```

Keep the rest of the file (brands, categories, products loops and the `catch`) unchanged.

- [ ] **Step 4: Verify**

Run: `node example/node.js/simple-dist.js; echo "exit $?"` (without `FFE_TOKEN`)
Expected: `Set FFE_TOKEN ...` and `exit 1`.

Run: `FFE_TOKEN=$FFE_TOKEN node example/node.js/simple-dist.js | head -20` (with a real token)
Expected: JSON output beginning with an array of products.

Run: `command -v php >/dev/null && php -l example/php/ffe.php || echo "php not installed, lint skipped"`

- [ ] **Step 5: Commit**

```bash
git add example/node.js example/php
git commit -m "Examples read FFE_TOKEN and require the SDK by relative path"
```

---

### Task 8: Package name, READMEs and method documentation

**Files:**
- Modify: `sdk/node.js/README.md` (rewrite)
- Modify: `sdk/node.js/demo.js`
- Create: `sdk/php/README.md`
- Modify: `README.md` (SDK section only)

- [ ] **Step 1: Fix demo.js**

Replace `sdk/node.js/demo.js` with:

```js
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your ffe token>');

ffe.products({ limit: 20, brand: 'simms' })
    .then((result) => {
        console.log(result);
    })
    .catch((error) => {
        console.error(error);
    });
```

- [ ] **Step 2: Rewrite sdk/node.js/README.md**

```markdown
# FFE API SDK - Node.js

Flyfish Europe Dealer API SDK for Node.js. No dependencies.

## Install

```bash
npm install @flyfisheurope/ffe-api-sdk --save
```

## Usage

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE(process.env.FFE_TOKEN);

ffe.products({ limit: 20, brand: 'simms', unique: true })
    .then((products) => console.log(products))
    .catch((error) => console.error(error));
```

Every method returns a Promise that resolves with the parsed JSON from the API.
The Promise only rejects on network errors; an HTTP error such as 401 resolves
with the API's error body (`{ status: 401, message: 'Authentication Required' }`).
If the server returns something that is not JSON you get
`{ code: 500, error: 'Invalid JSON from server', message: '<raw body>', ... }`.
Always check the result before using it.

## Constructor

```javascript
new FFE(token, options)
```

| Option     | Default                     | Description |
|------------|-----------------------------|-------------|
| `hostname` | `dealer.flyfisheurope.com`  | API host |
| `port`     | `443`                       | API port |
| `https`    | `true`                      | Set to `false` to use plain http (local development only) |

## Methods

| Method | Endpoint | Notes |
|--------|----------|-------|
| `login(email, pass)` | `POST /login/` | On success the instance switches to the returned `apiToken` |
| `brands()` | `GET /api/brands/` | |
| `brand(brandno)` | `GET /api/brands/:brandno` | |
| `categories(opt)` | `GET /api/categories/` | `opt`: `limit`, `offset`, `brand`, `level`, `parent` |
| `category(categoryno)` | `GET /api/categories/:categoryno` | |
| `products(opt)` | `GET /api/products/` | `opt`: `limit`, `offset`, `brand`, `maingroup`, `intgroup`, `subgroup`, `mainCat`, `intCat`, `subCat`, `gtin`, `articleNoIn`, `search`, `unique`, `isNew` |
| `product(articleno)` | `GET /api/products/:articleno` | |
| `baskets(opt)` | `GET /api/baskets/` | `opt`: `presale` |
| `dealerInfo()` | `GET /api/dealers/info` | |
| `posSales(opt, { id })` | `GET /api/pos/sales/[:id]` | |
| `posAddSale(body)` | `POST /api/pos/sales/` | |
| `posProducts(opt, { id })` | `GET /api/pos/products/[:id]` | |
| `posAddProduct(body)` | `POST /api/pos/products/` | |
| `posEditProduct(body, { id })` | `PUT /api/pos/products/:id` | Returns `false` if `id` is missing |

Query options with empty values (`''`, `0`, `null`, `undefined`) are omitted from
the query string.

Full parameter and response documentation: [docs/reference](../../docs/reference/).

## Development

```bash
npm test
```

Tests run against a local stub server; no token needed.
```

- [ ] **Step 3: Create sdk/php/README.md**

```markdown
# FFE API SDK - PHP

Flyfish Europe Dealer API SDK for PHP (>= 5.4, curl extension). One file, no
dependencies.

## Install

Copy `ffe.php` into your project and `require` it, or add this repository as a
Composer path repository:

```json
{
    "repositories": [
        { "type": "path", "url": "path/to/ffe-api/sdk/php" }
    ],
    "require": { "ffe/api": "*" }
}
```

## Usage

```php
<?php
require 'ffe.php';
$ffe = new FFE(getenv('FFE_TOKEN'));

try {
    $products = $ffe->products((object) ['brand' => 'simms', 'unique' => 'true', 'limit' => 20]);
    foreach ($products as $product) {
        echo $product['name'], "\n";
    }
} catch (Exception $e) {
    echo 'API error: ', $e->getMessage(), "\n";
}
```

Methods return associative arrays. Any non-200 response or connection problem
throws an `Exception` (`Not authorized` for 401), so wrap calls in `try/catch`.
`lastCurlInfo()` returns `curl_getinfo()` for the last request when debugging.

## Constructor

```php
new FFE($token, $options)
```

`$options` is an object with optional `hostname` (default `dealer.flyfisheurope.com`),
`port` (443), `https` (1) and `debug` (0, set to 1 to echo requests and responses).

## Methods

| Method | Endpoint | Notes |
|--------|----------|-------|
| `login($email, $pass)` | `POST /login/` | On success the instance switches to the returned `apiToken` |
| `brands()` | `GET /api/brands/` | |
| `brand($brandno)` | `GET /api/brands/:brandno` | |
| `categories($opt)` | `GET /api/categories/` | `$opt` object: `limit`, `offset`, `brand`, `level`, `parent` |
| `category($categoryno)` | `GET /api/categories/:categoryno` | |
| `products($opt)` | `GET /api/products/` | `$opt` object: `limit`, `offset`, `brand`, `maingroup`, `intgroup`, `subgroup`, `mainCat`, `intCat`, `subCat`, `gtin`, `articleNoIn`, `search`, `unique`, `isNew` |
| `product($articleno)` | `GET /api/products/:articleno` | |
| `baskets($opt)` | `GET /api/baskets/` | `$opt` object: `presale` |
| `dealerInfo()` | `GET /api/dealers/info` | |
| `posAddSale`, `posSales`, `posAddProduct`, `posProducts` | `/api/pos/*` | Not implemented; throw `Exception('Not implemented')` |

Full parameter and response documentation: [docs/reference](../../docs/reference/).
```

- [ ] **Step 4: Fix the SDK section of the root README**

Replace the block from `# SDKs` through the RunKit line with:

```markdown
# SDKs

- [Server side JavaScript (Node.js)](./sdk/node.js/)
    ```bash
    $ npm install @flyfisheurope/ffe-api-sdk --save
    ```
    Test it online at RunKit: https://npm.runkit.com/@flyfisheurope/ffe-api-sdk
- [PHP](./sdk/php/)
- [Client side JavaScript](./sdk/javascript/)
```

- [ ] **Step 5: Verify links**

Run: `for f in sdk/node.js/README.md sdk/php/README.md sdk/javascript/README.md docs/reference; do test -e "$f" && echo "ok $f" || echo "MISSING $f"; done; grep -rn "require('ffe-api-sdk')" --include=*.js --include=*.md . | grep -v node_modules`
Expected: all `ok`; the grep prints nothing.

- [ ] **Step 6: Commit**

```bash
git add sdk/node.js/README.md sdk/node.js/demo.js sdk/php/README.md README.md
git commit -m "Consistent package name and full method docs for both SDKs"
```

---

### Task 9: Update CLAUDE.md and release the Node SDK

**Files:**
- Modify: `CLAUDE.md`
- Modify: `sdk/node.js/package.json` (version)

- [ ] **Step 1: Update CLAUDE.md**

- In "## Commands", replace the line `There is no build, lint or test suite. \`npm test\` in \`sdk/node.js\` is a placeholder that exits 1.` with `Node SDK tests: \`cd sdk/node.js && npm test\` (stub server, no token needed).`
- Remove the paragraph about `simple-dist.js` requiring an unchecked-in `./ffe`; replace with: `Examples read the token from \`FFE_TOKEN\` and require the SDK by relative path, so they run as-is.`
- In "Behavioural differences", delete the "Login token swap" bullet and replace the "Node https option" bullet with: `**Protocol**: both SDKs use https unless \`https\` is explicitly set to false (Node) / 0 (PHP).`
- In "### Browser client", change the path to `sdk/javascript/ffe-api-sdk.js` and note the demo page is `example/javascript/html-client.html`.
- Delete the "Known inconsistencies" bullets about `sdk/javascript/` and the unscoped package name. Keep the bullet about `/api/dealers/info` and `/api/pos/*` only if Phase 1 is not yet done; otherwise delete the section.

- [ ] **Step 2: Bump the version**

In `sdk/node.js/package.json` change `"version": "1.0.5"` to `"version": "1.1.0"` (new methods and behaviour change in `login()` and the `https` option).

- [ ] **Step 3: Final test run**

Run: `cd sdk/node.js && npm test && node -e "const F=require('./ffe'); console.log(Object.getOwnPropertyNames(F.prototype).sort().join(','))"`
Expected: 11 pass; the method list includes `baskets` and `dealerInfo`.

- [ ] **Step 4: Commit and release (human)**

```bash
git add CLAUDE.md sdk/node.js/package.json
git commit -m "Release @flyfisheurope/ffe-api-sdk 1.1.0"
git push origin master
cd sdk/node.js && ./npm-release.sh
```

Expected: a GitHub release tagged `1.1.0` and `npm view @flyfisheurope/ffe-api-sdk version` printing `1.1.0`.

---

## Self-review

- Spec coverage (section 4): package name (Task 8), login swap (Task 2), baskets/dealerInfo in both SDKs (Tasks 4, 5), https option (Task 3), examples with env token and relative require (Task 7), browser client move and links (Task 6), SDK READMEs with every method (Task 8), version bump and release (Task 9). Section 5's Node SDK tests are delivered by Tasks 1–4.
- Placeholders: none. The only conditional (form-encoded login) is fully coded in Task 2.
- Type consistency: `client()`, `reply`, `last` are defined in Task 1 and used unchanged in Tasks 2–4; `baskets(opt)`/`dealerInfo()` names match between Node, PHP, READMEs and the Phase 1 `x-sdk-*` strings.
