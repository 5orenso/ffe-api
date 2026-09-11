#!/usr/bin/env node
'use strict';

// The doc-wide rules from CLAUDE.md as one command. Checks README.md and every
// Markdown page under docs/ (except docs/superpowers/):
//   link    every relative link target exists (http(s), mailto and pure anchors are skipped)
//   todo    no TODO or TBD
//   banned  no password / salt / hash / security (case-insensitive; docs/reference/ is
//           generated and may name the login request's pass field or a checksum field)
//   token   no "eyJ" (the start of a base64 JSON web token)
// Exit 1 when anything is found.

const fs = require('fs');
const path = require('path');

const LINK = /\]\(([^)#]*)/g;
const BANNED = /password|salt|hash|security/i;

function listMarkdown(root) {
    const files = [];
    if (fs.existsSync(path.join(root, 'README.md'))) files.push('README.md');
    (function walk(dir) {
        if (!fs.existsSync(path.join(root, dir))) return;
        for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
            const rel = path.join(dir, entry.name);
            if (rel === path.join('docs', 'superpowers')) continue;
            if (entry.isDirectory()) walk(rel);
            else if (entry.name.endsWith('.md')) files.push(rel);
        }
    })('docs');
    return files;
}

function checkFile(root, rel) {
    const findings = [];
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    const dir = path.dirname(rel);
    const generated = rel.startsWith(path.join('docs', 'reference') + path.sep);
    for (const match of text.matchAll(LINK)) {
        const target = match[1];
        if (target === '' || /^(https?:|mailto:)/.test(target)) continue;
        if (!fs.existsSync(path.join(root, dir, target))) {
            findings.push({ check: 'link', file: rel, line: 0, detail: target });
        }
    }
    text.split('\n').forEach((raw, index) => {
        const line = raw.trim();
        const at = index + 1;
        if (/TODO|TBD/.test(line)) findings.push({ check: 'todo', file: rel, line: at, detail: line });
        if (!generated && BANNED.test(line)) findings.push({ check: 'banned', file: rel, line: at, detail: line });
        if (/eyJ/.test(line)) findings.push({ check: 'token', file: rel, line: at, detail: line });
    });
    return findings;
}

function checkDocs(root) {
    return listMarkdown(root).flatMap((rel) => checkFile(root, rel));
}

function main() {
    const findings = checkDocs(path.join(__dirname, '..'));
    for (const f of findings) console.error(`${f.file}:${f.line}: ${f.check}: ${f.detail}`);
    if (findings.length > 0) {
        console.error(`${findings.length} doc check finding(s)`);
        process.exit(1);
    }
    console.log('doc checks clean');
}

module.exports = { checkDocs, listMarkdown };
if (require.main === module) main();
