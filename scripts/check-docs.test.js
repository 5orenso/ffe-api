'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { checkDocs, listMarkdown } = require('./check-docs');

const fixture = path.join(__dirname, 'fixtures', 'docs-check');

test('listMarkdown returns README.md and docs pages but not docs/superpowers', () => {
    assert.deepEqual(listMarkdown(fixture).sort(), [
        'README.md',
        path.join('docs', 'ok.md'),
        path.join('docs', 'reference', 'generated.md'),
    ]);
});

test('the four checks each report exactly the planted finding', () => {
    const findings = checkDocs(fixture);
    assert.deepEqual(findings.map((f) => [f.check, f.file, f.line, f.detail]).sort(), [
        ['banned', path.join('docs', 'ok.md'), 5, 'This line mentions a password.'],
        ['link', path.join('docs', 'ok.md'), 0, '../missing.md'],
        ['todo', path.join('docs', 'ok.md'), 4, 'TODO finish this'],
        ['token', path.join('docs', 'ok.md'), 6, 'Token: eyJhbGciOi'],
    ]);
});

test('the real repository is clean', () => {
    assert.deepEqual(checkDocs(path.join(__dirname, '..')), []);
});
