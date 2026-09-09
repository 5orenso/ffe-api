#!/usr/bin/env node
'use strict';

// Records one live API call to scripts/probes/<name>.json so that every
// claim in openapi.yaml is backed by a real response. Token comes from
// the FFE_TOKEN environment variable and is never written to disk.

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const token = process.env.FFE_TOKEN;
if (!token) {
    console.error('FFE_TOKEN is not set. Run: FFE_TOKEN=... node scripts/probe.js GET /api/brands/ brands-list');
    process.exit(2);
}

const args = process.argv.slice(2);
const form = args.includes('--form');
const [method, urlPath, name, jsonBody] = args.filter(a => a !== '--form');
if (!method || !urlPath || !name) {
    console.error('Usage: node scripts/probe.js <METHOD> <path> <name> [jsonBody] [--form]');
    process.exit(2);
}

const useHttps = process.env.FFE_HTTPS !== '0';
const hostname = process.env.FFE_HOST || 'dealer.flyfisheurope.com';
const port = Number(process.env.FFE_PORT || (useHttps ? 443 : 80));
const client = useHttps ? https : http;

const options = {
    hostname,
    port,
    path: urlPath,
    method: method.toUpperCase(),
    headers: { Authorization: `Bearer ${token}` },
};

let payload;
if (jsonBody) {
    const parsed = JSON.parse(jsonBody);
    payload = form ? querystring.stringify(parsed) : JSON.stringify(parsed);
    options.headers['Content-Type'] = form
        ? 'application/x-www-form-urlencoded'
        : 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(payload);
}

const req = client.request(options, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body;
        try { body = JSON.parse(raw); } catch (e) { body = raw; }
        const record = {
            request: {
                method: options.method,
                path: urlPath,
                contentType: options.headers['Content-Type'] || null,
                body: jsonBody ? JSON.parse(jsonBody) : null,
            },
            status: res.statusCode,
            headers: res.headers,
            body,
        };
        const dir = path.join(__dirname, 'probes');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${name}.json`);
        fs.writeFileSync(file, JSON.stringify(record, null, 2));
        console.log(`${options.method} ${urlPath} -> ${res.statusCode}`);
        console.log(raw.slice(0, 600));
        console.log(`saved ${path.relative(process.cwd(), file)}`);
    });
});
req.on('error', (err) => {
    console.error('request failed:', err.message);
    process.exit(1);
});
if (payload) req.write(payload);
req.end();
