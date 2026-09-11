#!/usr/bin/env node
'use strict';

// Renders docs/reference/<tag>.md from openapi.yaml. Pure render(spec)
// is exported for tests; main() does file IO.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const HEADER = '<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->';
const METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete', 'options'];

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

function refName(obj) {
    return obj && typeof obj.$ref === 'string' ? obj.$ref.split('/').pop() : null;
}

// If schema has allOf, merge every member's resolved properties (in order,
// recursing through any nested allOf) into one object schema; otherwise
// return schema unchanged.
function flattenAllOf(schema, spec) {
    if (!schema || !schema.allOf) return schema;
    const properties = {};
    let memberDescription;
    for (const raw of schema.allOf) {
        const member = flattenAllOf(resolveRef(spec, raw), spec) || {};
        if (member.properties) Object.assign(properties, member.properties);
        if (!memberDescription && member.description) memberDescription = member.description;
    }
    return { type: 'object', properties, description: schema.description || memberDescription };
}

function cell(text) {
    return String(text || '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim();
}

function typeLabel(raw, spec) {
    const prop = flattenAllOf(resolveRef(spec, raw), spec) || {};
    let type;
    const union = prop.oneOf || prop.anyOf;
    if (refName(raw)) {
        type = refName(raw);
    } else if (Array.isArray(union)) {
        type = union.map((m) => typeLabel(m, spec)).join(' \\| ');
    } else if (prop.type === 'array') {
        const items = prop.items || {};
        type = 'array of ' + (refName(items) || items.type || 'object');
    } else {
        type = prop.type || 'object';
    }
    if (prop.enum) type += ` (${prop.enum.join(' \\| ')})`;
    if (prop.nullable) type += ', nullable';
    return type;
}

// One row per property; one level of nesting below the top level.
function fieldRows(schema, spec, prefix) {
    const rows = [];
    for (const [name, raw] of Object.entries(schema.properties || {})) {
        const prop = flattenAllOf(resolveRef(spec, raw), spec) || {};
        rows.push(`| ${prefix}${name} | ${typeLabel(raw, spec)} | ${cell(prop.description)} |`);
        if (prefix) continue;
        if (prop.type === 'array') {
            const items = flattenAllOf(resolveRef(spec, prop.items), spec) || {};
            if (items.properties) rows.push(...fieldRows(items, spec, `${name}[].`));
        } else if (prop.properties) {
            rows.push(...fieldRows(prop, spec, `${name}.`));
        }
    }
    return rows;
}

function fieldsSection(name, spec) {
    const schema = spec.components.schemas[name];
    const lines = [`## Fields: ${name}\n`];
    if (schema.description) lines.push(schema.description.trim() + '\n');
    lines.push('| Field | Type | Description |', '|-------|------|-------------|', ...fieldRows(schema, spec, ''), '');
    return lines.join('\n');
}

// Schema name of the first 2xx JSON response (array items unwrapped), or null.
function responseSchemaName(op, spec) {
    for (const [code, raw] of Object.entries(op.responses || {})) {
        if (!/^2/.test(code)) continue;
        const res = resolveRef(spec, raw);
        const json = res && res.content && res.content['application/json'];
        let schema = json && json.schema;
        if (!schema) continue;
        if (schema.type === 'array' && schema.items) schema = schema.items;
        if (refName(schema)) return refName(schema);
    }
    return null;
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

function shellSingleQuote(str) {
    return `'${str.replace(/'/g, "'\\''")}'`;
}

function sampleCalls(op, method, urlPath, spec) {
    const url = baseUrl(spec) + examplePath(op, urlPath);
    const includeAuth = !(Array.isArray(op.security) && op.security.length === 0);
    const authFlag = includeAuth ? `-H 'Authorization: Bearer <your token>' ` : '';
    let curl;
    if (method === 'get') {
        curl = `curl ${authFlag}'${url}'`;
    } else {
        const body = resolveRef(spec, op.requestBody);
        const json = body && body.content && body.content['application/json'];
        const bodyArg = json && json.example !== undefined
            ? shellSingleQuote(JSON.stringify(json.example))
            : "'<json body>'";
        curl = `curl -X ${method.toUpperCase()} ${authFlag}-H 'Content-Type: application/json' -d ${bodyArg} '${url}'`;
    }
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
    const schemaName = responseSchemaName(op, spec);
    if (schemaName) parts.push(`Response fields: see [${schemaName}](#fields-${schemaName.toLowerCase()}).\n`);
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
        lines.push('All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).', '');
        for (const { method, urlPath, op } of ops) {
            lines.push(operationSection(method, urlPath, op, spec));
        }
        const schemaNames = [];
        for (const { op } of ops) {
            const name = responseSchemaName(op, spec);
            if (name && !schemaNames.includes(name)) schemaNames.push(name);
        }
        for (const name of schemaNames) lines.push(fieldsSection(name, spec));
        out[`${tag}.md`] = lines.join('\n');
    }
    return out;
}

// Names in `rendered` whose file in `dir` differs, plus .md files in `dir`
// that `rendered` does not produce.
function staleFiles(dir, rendered) {
    const stale = [];
    for (const [name, content] of Object.entries(rendered)) {
        const file = path.join(dir, name);
        if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== content) stale.push(name);
    }
    for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
        if (name.endsWith('.md') && !(name in rendered)) stale.push(name);
    }
    return stale.sort();
}

function main() {
    const root = path.join(__dirname, '..');
    const spec = yaml.load(fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8'));
    const dir = path.join(root, 'docs', 'reference');
    const files = render(spec);
    if (process.argv.includes('--check')) {
        const stale = staleFiles(dir, files);
        if (stale.length > 0) {
            for (const name of stale) console.error(`docs/reference/${name} is out of date (run npm run gen:reference)`);
            process.exit(1);
        }
        console.log('docs/reference is up to date');
        return;
    }
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.md')) fs.unlinkSync(path.join(dir, f));
    }
    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), content);
        console.log(`wrote docs/reference/${name}`);
    }
}

module.exports = { render, staleFiles };
if (require.main === module) main();
