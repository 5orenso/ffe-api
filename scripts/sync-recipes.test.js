'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { syncMarkdown, listPages } = require('./sync-recipes');

const files = {
    'example/recipes/node/hello.js': "'use strict';\nconsole.log('hi');\n",
};
const readFile = (file) => {
    if (!(file in files)) throw new Error('ENOENT');
    return files[file];
};

test('replaces a stale fence body with the file content', () => {
    const page = [
        '# Page', '', 'Intro.', '',
        '<!-- recipe: example/recipes/node/hello.js -->',
        '```js', 'old', '```', '', 'Outro.', '',
    ].join('\n');
    const result = syncMarkdown(page, readFile);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.blocks, [{ file: 'example/recipes/node/hello.js', changed: true }]);
    assert.equal(result.output, [
        '# Page', '', 'Intro.', '',
        '<!-- recipe: example/recipes/node/hello.js -->',
        '```js', "'use strict';", "console.log('hi');", '```', '', 'Outro.', '',
    ].join('\n'));
});

test('reports changed: false when the page is already in sync', () => {
    const page = [
        '<!-- recipe: example/recipes/node/hello.js -->',
        '```js', "'use strict';", "console.log('hi');", '```', '',
    ].join('\n');
    const result = syncMarkdown(page, readFile);
    assert.deepEqual(result.blocks, [{ file: 'example/recipes/node/hello.js', changed: false }]);
    assert.equal(result.output, page);
});

test('leaves fences without a marker untouched', () => {
    const page = ['```js', 'keep me', '```', ''].join('\n');
    const result = syncMarkdown(page, readFile);
    assert.deepEqual(result.blocks, []);
    assert.equal(result.output, page);
});

test('errors when the marker is not followed by a fence', () => {
    const page = ['<!-- recipe: example/recipes/node/hello.js -->', 'not a fence', ''].join('\n');
    const result = syncMarkdown(page, readFile);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /not followed by a code fence/);
    assert.equal(result.output, page);
});

test('errors when the file cannot be read', () => {
    const page = ['<!-- recipe: example/recipes/node/missing.js -->', '```js', 'x', '```', ''].join('\n');
    const result = syncMarkdown(page, readFile);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /cannot read example\/recipes\/node\/missing\.js/);
    assert.equal(result.output, page);
});

test('listPages finds docs pages and skips docs/superpowers', () => {
    const pages = listPages(path.join(__dirname, '..'));
    assert.ok(pages.includes(path.join('docs', 'recipes', 'sync-catalog.md')));
    assert.ok(pages.every((p) => !p.startsWith(path.join('docs', 'superpowers'))));
});
