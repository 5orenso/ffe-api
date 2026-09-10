'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { render } = require('./gen-reference');

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
