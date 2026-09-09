'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { render } = require('./gen-postman');

const spec = yaml.load(fs.readFileSync(path.join(__dirname, 'fixtures', 'mini-spec.yaml'), 'utf8'));

test('collection has v2.1 schema, token and baseUrl variables', () => {
    const c = render(spec);
    assert.equal(c.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    assert.deepEqual(c.variable.map(v => v.key), ['baseUrl', 'token']);
    assert.equal(c.variable[0].value, 'https://dealer.flyfisheurope.com');
});

test('one folder per tag with one request per operation', () => {
    const c = render(spec);
    assert.equal(c.item.length, 1);
    assert.equal(c.item[0].name, 'brands');
    assert.deepEqual(c.item[0].item.map(r => r.name), ['List brands', 'Get one brand', 'No SDK method']);
});

test('requests carry bearer header and path variables', () => {
    const c = render(spec);
    const req = c.item[0].item[1].request;
    assert.equal(req.method, 'GET');
    assert.deepEqual(req.header, [{ key: 'Authorization', value: 'Bearer {{token}}' }]);
    assert.equal(req.url.raw, '{{baseUrl}}/api/brands/:brandno');
    assert.deepEqual(req.url.variable, [{ key: 'brandno', value: 'simms', description: 'Brand id' }]);
});
