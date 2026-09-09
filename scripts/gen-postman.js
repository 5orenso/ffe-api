#!/usr/bin/env node
'use strict';

// Renders a Postman Collection v2.1 from openapi.yaml.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const METHOD_ORDER = ['get', 'post', 'put', 'delete'];

function resolveRef(spec, obj) {
    if (obj && typeof obj.$ref === 'string') {
        const parts = obj.$ref.replace(/^#\//, '').split('/');
        return parts.reduce((acc, key) => acc[key], spec);
    }
    return obj;
}

function requestFor(spec, method, urlPath, op) {
    const params = (op.parameters || []).map(resolveRef.bind(null, spec));
    const postmanPath = urlPath.replace(/\{([^}]+)\}/g, ':$1');
    const query = params.filter(p => p.in === 'query').map(p => ({
        key: p.name,
        value: p.example !== undefined ? String(p.example) : '',
        disabled: true,
        description: p.description || '',
    }));
    const variable = params.filter(p => p.in === 'path').map(p => ({
        key: p.name,
        value: p.example !== undefined ? String(p.example) : '',
        description: p.description || '',
    }));
    const request = {
        method: method.toUpperCase(),
        header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
        url: {
            raw: `{{baseUrl}}${postmanPath}`,
            host: ['{{baseUrl}}'],
            path: postmanPath.replace(/^\//, '').split('/'),
        },
    };
    if (query.length) request.url.query = query;
    if (variable.length) request.url.variable = variable;
    const body = resolveRef(spec, op.requestBody);
    const json = body && body.content && body.content['application/json'];
    if (json) {
        const schema = resolveRef(spec, json.schema) || {};
        const example = json.example !== undefined
            ? json.example
            : Object.fromEntries(Object.keys(schema.properties || {}).map(k => [k, '']));
        request.header.push({ key: 'Content-Type', value: 'application/json' });
        request.body = { mode: 'raw', raw: JSON.stringify(example, null, 2) };
    }
    return { name: op.summary, request };
}

function render(spec) {
    const folders = {};
    for (const [urlPath, item] of Object.entries(spec.paths || {})) {
        for (const method of METHOD_ORDER) {
            const op = item[method];
            if (!op) continue;
            const tag = (op.tags && op.tags[0]) || 'other';
            (folders[tag] = folders[tag] || []).push(requestFor(spec, method, urlPath, op));
        }
    }
    const baseUrl = (spec.servers && spec.servers[0] && spec.servers[0].url) || 'https://dealer.flyfisheurope.com';
    return {
        info: {
            name: spec.info.title,
            description: 'Set the token variable to your DealerWeb API token.',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        variable: [
            { key: 'baseUrl', value: baseUrl },
            { key: 'token', value: '' },
        ],
        item: Object.entries(folders).map(([name, item]) => ({ name, item })),
    };
}

function main() {
    const root = path.join(__dirname, '..');
    const spec = yaml.load(fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8'));
    const dir = path.join(root, 'postman');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'ffe-api.postman_collection.json');
    fs.writeFileSync(file, JSON.stringify(render(spec), null, 2) + '\n');
    console.log(`wrote ${path.relative(root, file)}`);
}

module.exports = { render };
if (require.main === module) main();
