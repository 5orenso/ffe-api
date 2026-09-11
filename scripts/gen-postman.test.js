'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { render, isStale } = require('./gen-postman');

const spec = yaml.load(fs.readFileSync(path.join(__dirname, 'fixtures', 'mini-spec.yaml'), 'utf8'));

test('collection has v2.1 schema, token and baseUrl variables', () => {
    const c = render(spec);
    assert.equal(c.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    assert.deepEqual(c.variable.map(v => v.key), ['baseUrl', 'token']);
    assert.equal(c.variable[0].value, 'https://dealer.flyfisheurope.com');
});

test('one folder per tag with one request per operation', () => {
    const c = render(spec);
    assert.deepEqual(c.item.map(f => f.name).sort(), ['brands', 'login', 'pos-sales']);
    const brands = c.item.find(f => f.name === 'brands');
    assert.deepEqual(brands.item.map(r => r.name), ['List brands', 'Get one brand', 'Patch brand', 'No SDK method']);
});

test('PATCH operations appear as a request in the collection', () => {
    const c = render(spec);
    const brands = c.item.find(f => f.name === 'brands');
    const req = brands.item.find(r => r.name === 'Patch brand');
    assert.ok(req, 'expected a "Patch brand" request in the brands folder');
    assert.equal(req.request.method, 'PATCH');
});

test('requests carry bearer header and path variables', () => {
    const c = render(spec);
    const brands = c.item.find(f => f.name === 'brands');
    const req = brands.item[1].request;
    assert.equal(req.method, 'GET');
    assert.deepEqual(req.header, [{ key: 'Authorization', value: 'Bearer {{token}}' }]);
    assert.equal(req.url.raw, '{{baseUrl}}/api/brands/:brandno');
    assert.deepEqual(req.url.variable, [{ key: 'brandno', value: 'simms', description: 'Brand id' }]);
});

test('isStale reports missing and differing files, and false when identical', () => {
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-postman-'));
    const same = path.join(dir, 'same.json');
    const changed = path.join(dir, 'changed.json');
    const missing = path.join(dir, 'missing.json');
    fs.writeFileSync(same, 'a');
    fs.writeFileSync(changed, 'old');
    assert.equal(isStale(same, 'a'), false);
    assert.equal(isStale(changed, 'new'), true);
    assert.equal(isStale(missing, 'a'), true);
    fs.rmSync(dir, { recursive: true });
});
