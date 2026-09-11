#!/usr/bin/env node
'use strict';

// Keeps the recipe scripts embedded in the Markdown pages identical to the
// files under example/recipes/. A page marks a block with
//   <!-- recipe: example/recipes/node/sync-catalog.js -->
// on the line directly before a fenced code block; the fence body is
// replaced with that file's content. The file is the source of truth.
//   node scripts/sync-recipes.js          rewrite stale pages
//   node scripts/sync-recipes.js --check  list stale pages, exit 1, write nothing

const fs = require('fs');
const path = require('path');

const MARKER = /^<!-- recipe: (\S+) -->\s*$/;

function syncMarkdown(markdown, readFile) {
    const lines = markdown.split('\n');
    const out = [];
    const blocks = [];
    const errors = [];
    for (let i = 0; i < lines.length; i++) {
        out.push(lines[i]);
        const m = lines[i].match(MARKER);
        if (!m) continue;
        const file = m[1];
        const open = lines[i + 1];
        if (open === undefined || !/^```/.test(open)) {
            errors.push(`marker for ${file} is not followed by a code fence`);
            continue;
        }
        let close = i + 2;
        while (close < lines.length && lines[close] !== '```') close++;
        if (close >= lines.length) {
            errors.push(`unterminated code fence after marker for ${file}`);
            continue;
        }
        let content;
        try {
            content = readFile(file);
        } catch (err) {
            errors.push(`cannot read ${file}: ${err.message}`);
            continue;
        }
        const body = content.replace(/\n$/, '');
        const current = lines.slice(i + 2, close).join('\n');
        blocks.push({ file, changed: current !== body });
        out.push(open, ...body.split('\n'), '```');
        i = close;
    }
    return { output: out.join('\n'), blocks, errors };
}

function listPages(root) {
    const pages = [];
    (function walk(dir) {
        for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
            const rel = path.join(dir, entry.name);
            if (rel === path.join('docs', 'superpowers')) continue;
            if (entry.isDirectory()) walk(rel);
            else if (entry.name.endsWith('.md')) pages.push(rel);
        }
    })('docs');
    return pages.sort();
}

function main() {
    const root = path.join(__dirname, '..');
    const check = process.argv.includes('--check');
    const readFile = (file) => fs.readFileSync(path.join(root, file), 'utf8');
    let stale = 0;
    let failed = 0;
    for (const page of listPages(root)) {
        const markdown = fs.readFileSync(path.join(root, page), 'utf8');
        const result = syncMarkdown(markdown, readFile);
        for (const err of result.errors) {
            failed++;
            console.error(`${page}: ${err}`);
        }
        const changed = result.blocks.filter((b) => b.changed);
        if (changed.length === 0) continue;
        stale++;
        if (check) {
            console.error(`${page}: out of date for ${changed.map((b) => b.file).join(', ')}`);
        } else {
            fs.writeFileSync(path.join(root, page), result.output);
            console.log(`updated ${page} (${changed.map((b) => b.file).join(', ')})`);
        }
    }
    if (failed > 0 || (check && stale > 0)) process.exit(1);
    if (check) console.log('recipe pages are in sync');
}

module.exports = { syncMarkdown, listPages };
if (require.main === module) main();
