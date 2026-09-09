#!/usr/bin/env node
'use strict';

// Renders docs/reference/<tag>.md from openapi.yaml. Pure render(spec)
// is exported for tests; main() does file IO.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const HEADER = '<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->';
const METHOD_ORDER = ['get', 'post', 'put', 'delete', 'options'];

function resolveRef(spec, obj) {
    if (obj && typeof obj.$ref === 'string') {
        const parts = obj.$ref.replace(/^#\//, '').split('/');
        return parts.reduce((acc, key) => acc[key], spec);
    }
    return obj;
}

function baseUrl(spec) {
    return (spec.servers && spec.servers[0] && spec.servers[0].url) || 'https://dealer.flyfisheurope.com';
}

function examplePath(op, urlPath) {
    let out = urlPath;
    for (const p of op.parameters || []) {
        if (p.in === 'path') {
            out = out.replace(`{${p.name}}`, String(p.example !== undefined ? p.example : `<${p.name}>`));
        }
    }
    return out;
}

function paramTable(params, spec) {
    if (!params || params.length === 0) return '_None._\n';
    const rows = params.map(resolveRef.bind(null, spec)).map((p) => {
        const schema = p.schema || {};
        let type = schema.type || 'string';
        if (schema.enum) type += ` (${schema.enum.join(' \\| ')})`;
        if (schema.default !== undefined) type += `, default ${schema.default}`;
        const ex = p.example !== undefined ? String(p.example) : '';
        return `| ${p.name} | ${p.in} | ${type} | ${p.required ? 'yes' : 'no'} | ${ex} | ${(p.description || '').replace(/\n/g, ' ').trim()} |`;
    });
    return ['| Name | In | Type | Required | Example | Description |', '|------|----|------|----------|---------|-------------|', ...rows].join('\n') + '\n';
}

function jsonBlock(value) {
    return '```json\n' + JSON.stringify(value, null, 2) + '\n```\n';
}

function responses(op, spec) {
    const out = [];
    for (const [code, raw] of Object.entries(op.responses || {})) {
        const res = resolveRef(spec, raw);
        out.push(`**${code}** ${res.description || ''}\n`);
        const json = res.content && res.content['application/json'];
        if (json && json.example !== undefined) out.push(jsonBlock(json.example));
        if (json && json.examples) {
            for (const [name, ex] of Object.entries(json.examples)) {
                out.push(`**${ex.summary || name}**\n`);
                out.push(jsonBlock(ex.value));
            }
        }
    }
    return out.join('\n');
}

function requestBody(op, spec) {
    const body = resolveRef(spec, op.requestBody);
    if (!body) return '';
    const types = Object.keys(body.content || {});
    const json = body.content && body.content['application/json'];
    const schema = json && resolveRef(spec, json.schema);
    const lines = [`### Request body\n`, `Content types: ${types.map(t => '`' + t + '`').join(', ')}\n`];
    if (schema && schema.properties) {
        lines.push('| Field | Type | Required |', '|-------|------|----------|');
        for (const [name, prop] of Object.entries(schema.properties)) {
            const required = (schema.required || []).includes(name) ? 'yes' : 'no';
            lines.push(`| ${name} | ${prop.type || 'object'} | ${required} |`);
        }
        lines.push('');
    }
    if (json && json.example !== undefined) lines.push(jsonBlock(json.example));
    return lines.join('\n') + '\n';
}

function sampleCalls(op, method, urlPath, spec) {
    const url = baseUrl(spec) + examplePath(op, urlPath);
    const curl = method === 'get'
        ? `curl -H 'Authorization: Bearer <your token>' '${url}'`
        : `curl -X ${method.toUpperCase()} -H 'Authorization: Bearer <your token>' -H 'Content-Type: application/json' -d '{}' '${url}'`;
    const node = op['x-sdk-node'];
    const php = op['x-sdk-php'];

    const nodeBlock = node
        ? "const FFE = require('@flyfisheurope/ffe-api-sdk');\n" +
          "const ffe = new FFE('<your token>');\n" +
          `${node}\n` +
          '    .then((result) => console.log(result))\n' +
          '    .catch((error) => console.error(error));\n'
        : `// No Node.js SDK method for this endpoint; use https.request against ${url}.\n`;

    const phpBlock = php
        ? "<?php\nrequire 'ffe.php';\n" +
          "$ffe = new FFE('<your token>');\n" +
          `$result = ${php};\n` +
          'print_r($result);\n'
        : `// No PHP SDK method for this endpoint; use curl against ${url}.\n`;

    return [
        '### Sample calls\n',
        '**curl**\n', '```bash\n' + curl + '\n```\n',
        '**Node.js SDK**\n',
        '```javascript\n' + nodeBlock + '```\n',
        '**PHP SDK**\n',
        '```php\n' + phpBlock + '```\n',
    ].join('\n');
}

function operationSection(method, urlPath, op, spec) {
    const parts = [];
    parts.push(`## ${method.toUpperCase()} ${urlPath}\n`);
    parts.push(`${op.summary}\n`);
    if (op['x-verified'] === false) {
        parts.push('> **Not verified against the live API.** The request shape is taken from the SDK. Contact Flyfish Europe before relying on it.\n');
    }
    if (op.description) parts.push(op.description.trim() + '\n');
    parts.push('### Parameters\n');
    parts.push(paramTable(op.parameters, spec));
    const body = requestBody(op, spec);
    if (body) parts.push(body);
    parts.push('### Responses\n');
    parts.push(responses(op, spec));
    parts.push(sampleCalls(op, method, urlPath, spec));
    return parts.join('\n');
}

function render(spec) {
    const byTag = {};
    for (const [urlPath, item] of Object.entries(spec.paths || {})) {
        for (const method of METHOD_ORDER) {
            const op = item[method];
            if (!op) continue;
            const tag = (op.tags && op.tags[0]) || 'other';
            (byTag[tag] = byTag[tag] || []).push({ method, urlPath, op });
        }
    }
    const out = {};
    for (const [tag, ops] of Object.entries(byTag)) {
        const lines = [HEADER, '', `# ${tag}`, ''];
        lines.push('| URL | Method | Description |', '|-----|--------|-------------|');
        for (const { method, urlPath, op } of ops) {
            lines.push(`| \`${urlPath}\` | ${method.toUpperCase()} | ${op.summary} |`);
        }
        lines.push('');
        lines.push('All requests need the header `Authorization: Bearer <your token>`. See [Getting started](../getting-started.md).', '');
        for (const { method, urlPath, op } of ops) {
            lines.push(operationSection(method, urlPath, op, spec));
        }
        out[`${tag}.md`] = lines.join('\n');
    }
    return out;
}

function main() {
    const root = path.join(__dirname, '..');
    const spec = yaml.load(fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8'));
    const dir = path.join(root, 'docs', 'reference');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.md')) fs.unlinkSync(path.join(dir, f));
    }
    const files = render(spec);
    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), content);
        console.log(`wrote docs/reference/${name}`);
    }
}

module.exports = { render };
if (require.main === module) main();
