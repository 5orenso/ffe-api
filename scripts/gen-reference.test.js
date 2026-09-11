'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { render, staleFiles } = require('./gen-reference');

const spec = yaml.load(fs.readFileSync(path.join(__dirname, 'fixtures', 'mini-spec.yaml'), 'utf8'));

test('one file per tag with generated header', () => {
    const out = render(spec);
    assert.deepEqual(Object.keys(out).sort(), ['brands.md', 'login.md', 'pos-sales.md']);
    assert.ok(out['brands.md'].startsWith('<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->'));
});

test('URL table lists every operation', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\| `\/api\/brands\/` \| GET \| List brands \|/);
    assert.match(md, /\| `\/api\/brands\/\{brandno\}` \| GET \| Get one brand \|/);
});

test('path parameters are rendered with example and description', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\| brandno \| path \| string \| yes \| simms \| Brand id \|/);
});

test('responses resolve $ref and print JSON examples', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\*\*401\*\* Missing or invalid token/);
    assert.match(md, /"message": "Authentication Required"/);
    assert.match(md, /"brandno": "simms"/);
});

test('sample calls include curl, Node SDK and PHP SDK', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /curl -H 'Authorization: Bearer <your token>' 'https:\/\/dealer\.flyfisheurope\.com\/api\/brands\/simms'/);
    assert.match(md, /ffe\.brand\('simms'\)/);
    assert.match(md, /\$ffe->brand\('simms'\)/);
});

test('responses render every entry of an examples map', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\*\*Brand found\*\*/);
    assert.match(md, /"brandno": "simms"/);
    assert.match(md, /\*\*Unknown brandno returns an empty object\*\*/);
    assert.match(md, /```json\n\{\}\n```/);
});

test('sample calls degrade to a comment when SDK strings are absent', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\/\/ No PHP SDK method for this endpoint/);
    assert.doesNotMatch(md, /\$result = \/\//);
});

test('login curl sample renders the request body and omits the auth header', () => {
    const md = render(spec)['login.md'];
    const curlBlock = md.match(/\*\*curl\*\*\n\n```bash\n([\s\S]*?)\n```/)[1];
    assert.match(curlBlock, /-d '\{"email":"you@example\.com","pass":"secret"\}'/);
    assert.doesNotMatch(curlBlock, /Authorization/);
});

test('non-GET curl sample falls back to a placeholder body when no example exists', () => {
    const md = render(spec)['pos-sales.md'];
    assert.match(md, /-d '<json body>'/);
});

test('PATCH operations are rendered in the URL table and as their own operation section', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\| `\/api\/brands\/\{brandno\}` \| PATCH \| Patch brand \|/);
    assert.match(md, /## PATCH \/api\/brands\/\{brandno\}/);
});

test('fields table is rendered once per schema and linked from every operation that returns it', () => {
    const md = render(spec)['brands.md'];
    assert.equal(md.split('## Fields: Brand\n').length - 1, 1);
    assert.equal((md.match(/Response fields: see \[Brand\]\(#fields-brand\)\./g) || []).length, 2);
    assert.match(md, /## Fields: Brand\n\nOne brand as the dealer sees it\.\n\n\| Field \| Type \| Description \|/);
    assert.match(md, /\| id \| integer \|  \|/);
    assert.match(md, /\| brandno \| string \| Lowercase brand id \\\| used as the brand filter\. \|/);
    assert.match(md, /\| counts \| object \|  \|/);
    assert.match(md, /\| counts\.total \| integer \| Number of products\. \|/);
    assert.match(md, /\| images \| array of object \|  \|/);
    assert.match(md, /\| images\[\]\.small \| string \|  \|/);
    assert.match(md, /\| status \| string \(active \\\| hidden\), nullable \| Multi-line description\. \|/);
    assert.ok(md.indexOf('## Fields: Brand') > md.lastIndexOf('### Sample calls'));
});

test('oneOf/anyOf properties render as a union of their member types', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\| stock \| string \\\| integer \| Availability text or count\. \|/);
});

test('operations without a 2xx schema get no fields link or section', () => {
    const md = render(spec)['pos-sales.md'];
    assert.doesNotMatch(md, /Response fields/);
    assert.doesNotMatch(md, /## Fields:/);
});

test('array items defined via allOf have their member properties merged into one row set', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\| lines \| array of object \|  \|/);
    assert.match(md, /\| lines\[\]\.sku \| string \| Article number\. \|/);
    assert.match(md, /\| lines\[\]\.qty \| integer \| Quantity\. \|/);
    const linesRows = md.match(/\| lines\[\]\.\w+ \|/g) || [];
    assert.equal(linesRows.length, new Set(linesRows).size);
});

test('staleFiles reports changed, missing and extra files', () => {
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-ref-'));
    fs.writeFileSync(path.join(dir, 'same.md'), 'a');
    fs.writeFileSync(path.join(dir, 'changed.md'), 'old');
    fs.writeFileSync(path.join(dir, 'extra.md'), 'x');
    const stale = staleFiles(dir, { 'same.md': 'a', 'changed.md': 'new', 'missing.md': 'm' });
    assert.deepEqual(stale, ['changed.md', 'extra.md', 'missing.md']);
    fs.rmSync(dir, { recursive: true });
});
