# Phase 4: Tooling and quality checks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the guide self-checking: one copy of every recipe script that runs from the repository, a live verification script, a single `npm run check` command for the documentation rules, per-schema field tables in the generated reference, and a CI workflow that runs everything that needs no token.

**Architecture:** Recipe scripts move out of the Markdown pages into `example/recipes/` (Node and PHP) and the pages embed them through a marker comment that `scripts/sync-recipes.js` keeps in sync (file is the source, page is regenerated). `scripts/verify-examples.sh` runs the Node recipes end to end against the live API in a temporary directory and asserts on their outputs. `scripts/check-docs.js` implements the four doc-wide rules from `CLAUDE.md` in one Node script, wired together with the spec lint and the generator check as `npm run check`. `scripts/gen-reference.js` gains a `## Fields: <Schema>` table per response schema. A GitHub Actions workflow runs tests and `npm run check` on every push.

**Tech Stack:** Node 18 (`node:test`, no new dependencies), bash, the existing `@redocly/cli` and `js-yaml` dev dependencies, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-09-api-guide-overhaul-design.md` (section 5 "Quality checks", "Testing the deliverable", and the reviewer carry-over "per-schema Fields table in gen-reference.js" from the Phase 1 ledger). The spec's `markdown-link-check` line is satisfied by the in-repo link check (no network, no new dependency); the spec's Node SDK tests already exist from Phase 2.

## Global Constraints

- Version-control commands are blocked for the assistant; the human commits from printed commands. Never run `git`. Never write into `.git/`.
- `FFE_TOKEN` exists only in the environment. Never print it, never write it into any file, never put it in a report. Reports may contain script output only after checking it holds no token, email, customer number or company name.
- The only write the live API may receive is `PATCH /api/baskets/` from the basket demo, against the dealer's own basket, always followed by the `qty: 0` remove that restores it. Never call POS write operations. Never call any order, checkout or payment path.
- Nothing about credentials, password hashes or security findings goes into any repository file. The banned-word check in `CLAUDE.md` (`password|salt|hash|security`, case-insensitive, excluding `docs/reference/`) must stay clean.
- Every list request in recipe code passes `limit`; `unique=true` is never used; variants are grouped by brand + `nameDisplay`. Do not change what the recipe scripts do beyond the one optional brand argument this plan adds to `sync-catalog`.
- The recipe scripts in the pages and in `example/recipes/` must be byte-identical (that is what `scripts/sync-recipes.js --check` enforces). Node scripts keep `require('@flyfisheurope/ffe-api-sdk')`; PHP scripts keep `require 'ffe.php';`.
- `docs/reference/*.md` and `postman/` are generated: never hand-edit; change the generator or `openapi.yaml` and regenerate.
- Existing checks must stay green after every task: root `npm test`, `npm run lint:spec` (0 errors), `cd sdk/node.js && npm test` (18 tests), and the four doc-wide checks from `CLAUDE.md` (later: `npm run check`).
- PHP is not installed on this machine. PHP files are read carefully for syntax; `php -l` runs in CI (Task 6) and by the human.
- Out of scope: `sdk/node.js/npm-release.sh`, publishing, POS writes, the docs site.
- Node style in `scripts/`: `'use strict'`, 4-space indent, CommonJS, pure functions exported for tests and a `main()` guarded by `require.main === module`, matching `scripts/gen-reference.js`.

---

### Task 1: `scripts/sync-recipes.js` — embed recipe files into Markdown pages

**Files:**
- Create: `scripts/sync-recipes.js`
- Create: `scripts/sync-recipes.test.js`
- Modify: `package.json` (add `sync:recipes` script; add the test file to `test`)

**Interfaces:**
- Produces: marker syntax `<!-- recipe: <path relative to repo root> -->` on the line directly before a fenced code block. `syncMarkdown(markdown, readFile)` returns `{ output, blocks: [{ file, changed }], errors: [string] }`. `listPages(root)` returns every `.md` under `docs/` except `docs/superpowers/`, relative to `root`. CLI: `node scripts/sync-recipes.js` rewrites pages; `node scripts/sync-recipes.js --check` exits 1 and lists stale pages without writing.
- Consumed by: Task 2 (adds markers to the recipe pages), Task 4 (`npm run check`).

- [ ] **Step 1: Write the failing tests** in `scripts/sync-recipes.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/sync-recipes.test.js`
Expected: FAIL with `Cannot find module './sync-recipes'`.

- [ ] **Step 3: Write `scripts/sync-recipes.js`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/sync-recipes.test.js`
Expected: 6 passing.

- [ ] **Step 5: Wire it into `package.json`**

Change the `scripts` block to:

```json
"scripts": {
    "lint:spec": "redocly lint openapi.yaml",
    "gen:reference": "node scripts/gen-reference.js",
    "gen:postman": "node scripts/gen-postman.js",
    "sync:recipes": "node scripts/sync-recipes.js",
    "test": "node --test scripts/gen-reference.test.js scripts/gen-postman.test.js scripts/sync-recipes.test.js"
}
```

- [ ] **Step 6: Run the whole root suite and the check mode on the real repo**

Run: `npm test` — Expected: 20 passing (14 existing + 6 new).
Run: `node scripts/sync-recipes.js --check` — Expected: prints `recipe pages are in sync` and exits 0 (no page has a marker yet).

---

### Task 2: Extract the recipe scripts into `example/recipes/`

**Files:**
- Create: `example/recipes/README.md`
- Create: `example/recipes/package.json`
- Create: `example/recipes/node/sync-catalog.js`, `example/recipes/node/keep-content-updated.js`, `example/recipes/node/refresh-stock.js`, `example/recipes/node/catalog-to-csv.js`, `example/recipes/node/basket-demo.js`
- Create: `example/recipes/php/ffe.php` (one-line shim), `example/recipes/php/sync-catalog.php`, `example/recipes/php/keep-content-updated.php`, `example/recipes/php/basket-demo.php`
- Modify: `docs/recipes/sync-catalog.md`, `docs/recipes/keep-content-updated.md`, `docs/recipes/stock-and-price-lookup.md`, `docs/recipes/ordering-with-baskets.md`, `docs/platforms/hosted-shops.md` (markers + one sentence each)
- Modify: `example/README.md` (link the new directory)
- Modify: `.gitignore` (recipe output files)

**Interfaces:**
- Consumes: the marker syntax from Task 1.
- Produces: the file layout Task 3's shell script runs: `example/recipes/node/<name>.js` requiring `@flyfisheurope/ffe-api-sdk` resolved through `example/recipes/node_modules` (created by `npm install` in `example/recipes/`), and `example/recipes/php/<name>.php` requiring the sibling shim `ffe.php`. `sync-catalog.js` and `sync-catalog.php` accept one optional argument: a `brandno`; when given, only that brand is synced.

- [ ] **Step 1: Copy each script out of its page, verbatim**

Source blocks (fence line numbers as of the start of this task; re-check them, they move):

| File to create | Page and block |
|---|---|
| `example/recipes/node/sync-catalog.js` | `docs/recipes/sync-catalog.md`, the ```` ```js ```` block under "## Node.js script" |
| `example/recipes/php/sync-catalog.php` | same page, the ```` ```php ```` block under "## PHP script" |
| `example/recipes/node/keep-content-updated.js` | `docs/recipes/keep-content-updated.md`, ```` ```js ```` under "## Node.js script" |
| `example/recipes/php/keep-content-updated.php` | same page, ```` ```php ```` under "## PHP script" |
| `example/recipes/node/refresh-stock.js` | `docs/recipes/stock-and-price-lookup.md`, ```` ```js ```` under "### Node.js script" |
| `example/recipes/node/basket-demo.js` | `docs/recipes/ordering-with-baskets.md`, ```` ```javascript ```` under "## Node.js script" |
| `example/recipes/php/basket-demo.php` | same page, ```` ```php ```` under "## PHP script" |
| `example/recipes/node/catalog-to-csv.js` | `docs/platforms/hosted-shops.md`, ```` ```js ```` under "## `catalog-to-csv.js`" |

Each file's content is exactly the fence body plus one trailing newline. The short snippets in `stock-and-price-lookup.md` (look up one article, batch, GTIN, rendering availability) and the two one-line `presale` snippets stay inline; they are not scripts.

- [ ] **Step 2: Add the optional brand argument to both `sync-catalog` scripts**

In `example/recipes/node/sync-catalog.js`, change the header comment and the brand loop:

```js
// Run: FFE_TOKEN=<server-side token> node sync-catalog.js
// Optional: pass one brandno to sync only that brand, e.g. node sync-catalog.js simms
```

```js
const onlyBrand = process.argv[2];
```
(placed directly after `const PAGE = 200;`), and in the main loop:

```js
    for (const brand of brands) {
        if (onlyBrand && brand.brandno !== onlyBrand) continue;
        const products = await allProducts(brand.brandno);
```

In `example/recipes/php/sync-catalog.php`, the header comment gets the same second line (`php sync-catalog.php simms`), add `$onlyBrand = isset($argv[1]) ? $argv[1] : null;` directly after `$PAGE = 200;`, and in the loop:

```php
    foreach ($brands as $brand) {
        if ($onlyBrand !== null && $brand['brandno'] !== $onlyBrand) {
            continue;
        }
        $products = allProducts($ffe, $brand['brandno'], $PAGE);
```

- [ ] **Step 3: Create the PHP shim and the npm link**

`example/recipes/php/ffe.php`:

```php
<?php
// The recipe scripts do `require 'ffe.php';` so they run unchanged next to a
// copy of the SDK. In this repository that file is the SDK itself, one
// directory up.
require __DIR__ . '/../../../sdk/php/ffe.php';
```

`example/recipes/package.json`:

```json
{
  "name": "ffe-api-recipes",
  "private": true,
  "description": "Runnable copies of the recipe scripts in docs/recipes/. npm install links the SDK from ../../sdk/node.js.",
  "dependencies": {
    "@flyfisheurope/ffe-api-sdk": "file:../../sdk/node.js"
  }
}
```

Run `cd example/recipes && npm install --no-audit --no-fund` and confirm `ls -l example/recipes/node_modules/@flyfisheurope/` shows `ffe-api-sdk` as a symlink to `../../../../sdk/node.js`. Confirm `node -e "require('./example/recipes/node/sync-catalog.js')"` is NOT how to test (it would run); instead run `node --check` on every new `.js` file.

- [ ] **Step 4: Put markers in the pages and point at the files**

For every row of the table in Step 1, edit the page: keep the "Save this as `<name>`…" sentence, append one sentence `The same file is in this repository at [example/recipes/node/<name>.js](../../example/recipes/node/<name>.js).` (PHP: `example/recipes/php/<name>.php`; the link from `docs/platforms/hosted-shops.md` is also `../../example/recipes/node/catalog-to-csv.js`), then insert the marker line `<!-- recipe: example/recipes/<lang>/<name> -->` directly before the opening fence, with the blank line staying above the marker. In `docs/recipes/sync-catalog.md`, extend the two "Run it" blocks:

```bash
FFE_TOKEN=<your token> node sync-catalog.js
# Only one brand while you are testing:
FFE_TOKEN=<your token> node sync-catalog.js simms
```

and the PHP equivalent with `php sync-catalog.php simms`.

Then run `node scripts/sync-recipes.js`. Expected: it prints `updated …` for the two `sync-catalog` blocks (the brand argument) and nothing else changes. Run `node scripts/sync-recipes.js --check`: Expected `recipe pages are in sync`. Read the diff of each page to confirm only the sentence, the marker and the brand-argument lines changed.

- [ ] **Step 5: README, index and ignores**

`example/recipes/README.md`:

```markdown
# Recipe scripts

Runnable copies of the scripts embedded in the guide's recipe pages. The pages
are the documentation; these files are what you run. Each page embeds its file
verbatim (`npm run sync:recipes` at the repository root keeps them identical),
so edit the file here, not the page.

| Script | Page |
|---|---|
| [node/sync-catalog.js](node/sync-catalog.js), [php/sync-catalog.php](php/sync-catalog.php) | [Sync your catalog](../../docs/recipes/sync-catalog.md) |
| [node/keep-content-updated.js](node/keep-content-updated.js), [php/keep-content-updated.php](php/keep-content-updated.php) | [Keep content updated](../../docs/recipes/keep-content-updated.md) |
| [node/refresh-stock.js](node/refresh-stock.js) | [Stock and price lookup](../../docs/recipes/stock-and-price-lookup.md) |
| [node/basket-demo.js](node/basket-demo.js), [php/basket-demo.php](php/basket-demo.php) | [Ordering with baskets](../../docs/recipes/ordering-with-baskets.md) |
| [node/catalog-to-csv.js](node/catalog-to-csv.js) | [Hosted shops](../../docs/platforms/hosted-shops.md) |

## Run them from this repository

The Node scripts `require('@flyfisheurope/ffe-api-sdk')`. In your own project
you install that from npm; here, `npm install` links it to `../../sdk/node.js`:

```bash
cd example/recipes && npm install
mkdir -p /tmp/ffe-recipes && cd /tmp/ffe-recipes     # the scripts write catalog.json etc. into the current directory
FFE_TOKEN=<your token> node /path/to/ffe-api/example/recipes/node/sync-catalog.js simms
FFE_TOKEN=<your token> node /path/to/ffe-api/example/recipes/node/refresh-stock.js
```

The PHP scripts do `require 'ffe.php';`. Here `php/ffe.php` is a one-line file
that loads `../../sdk/php/ffe.php`; in your own project copy the SDK file next
to the script instead.

```bash
FFE_TOKEN=<your token> php /path/to/ffe-api/example/recipes/php/sync-catalog.php simms
```

`scripts/verify-examples.sh` at the repository root runs all of them against the
live API in one go.
```

Add to `example/README.md` under "Clients in different languages": `- [Recipe scripts](recipes/) — runnable copies of the guide's recipe scripts (Node.js and PHP)`. Add to `.gitignore` (one per line): `catalog.json`, `catalog.csv`, `content-updates.json`, `stock-updates.json`.

- [ ] **Step 6: Run every Node script live once, from a scratch directory**

From an empty directory outside the repo (for example `mktemp -d`), with `FFE_TOKEN` in the environment and `R=/Users/sorenso/Projects/ffe-api/example/recipes/node`:

```bash
node "$R/sync-catalog.js" simms          # expect "Simms: N variants -> M products" and "Wrote catalog.json with M products"
node "$R/keep-content-updated.js"        # expect content-updates.json with "missing": []
node "$R/refresh-stock.js"               # expect "N variants checked, N matched live, 0 changed"
node "$R/catalog-to-csv.js"              # expect "Wrote catalog.csv with N rows" where N = the variant count
node "$R/basket-demo.js" <id>            # id = variants[0].id from catalog.json; expect "Basket restored: YES"
```

Before the basket demo, run `node -e` with the SDK to print the current basket's `lines[].id` and pick an `id` that is NOT in it. Put the first line of each script's output in the report after checking it contains no token, email, company name or customer number (the basket demo prints those: quote only the `Basket restored: YES` line and the `setBasketLine qty 1 ->` line with `addedBy` removed).

- [ ] **Step 7: Doc-wide checks and tests**

Run the four checks from `CLAUDE.md` (they must print nothing) and `npm test` (20 passing). `node --check` every new `.js` file. Read each new `.php` file top to bottom once for syntax (PHP is not installed).

---

### Task 3: `scripts/verify-examples.sh` — live end-to-end run

**Files:**
- Create: `scripts/verify-examples.sh` (mode 755)
- Modify: `package.json` (add `"verify:examples": "bash scripts/verify-examples.sh"`)

**Interfaces:**
- Consumes: the layout from Task 2 and the scripts' printed lines: `Wrote catalog.json with N products`, `N variants checked, N matched live, 0 changed`, `Wrote catalog.csv with N rows`, `Basket restored: YES`, and `setBasketLine qty 1 -> {…"id":<id>…}`.
- Produces: an exit code (0 = every recipe ran and its output was what the pages claim) for humans and for the release checklist. Never run in CI (needs a token and writes to the basket).

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Runs every recipe script in example/recipes/ against the live API and checks
# that each one produced what its guide page says it produces.
#
#   FFE_TOKEN=<server-side token> scripts/verify-examples.sh
#
# Writes only into a temporary directory that is removed on exit. The basket
# demo adds one line to the dealer's own basket and removes it again; it picks
# a product that is not already in the basket so nothing of yours is touched.
# PHP recipes run when `php` is on PATH and are skipped otherwise.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RECIPES="$ROOT/example/recipes"
SDK="$ROOT/sdk/node.js/ffe.js"

if [ -z "${FFE_TOKEN:-}" ]; then
    echo "FFE_TOKEN is not set (create a server-side token in DealerWeb > My Account)" >&2
    exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ ! -e "$RECIPES/node_modules/@flyfisheurope/ffe-api-sdk" ]; then
    echo "== npm install in example/recipes (links the SDK)"
    (cd "$RECIPES" && npm install --no-audit --no-fund --loglevel=error)
fi

fail() { echo "FAIL: $*" >&2; exit 1; }

# run <label> <command...>: prints the output, fails on a non-zero exit.
run() {
    local label="$1"; shift
    echo "== $label"
    if ! "$@"; then
        fail "$label exited non-zero"
    fi
}

cd "$WORK"

echo "== first brand"
BRAND="$(node -e '
const FFE = require(process.argv[1]);
new FFE(process.env.FFE_TOKEN).brands().then((brands) => {
    if (!Array.isArray(brands) || brands.length === 0) {
        console.error("brands:", JSON.stringify(brands).slice(0, 300));
        process.exit(1);
    }
    console.log(brands[0].brandno);
});' "$SDK")"
echo "brand: $BRAND"

run "sync-catalog.js $BRAND" node "$RECIPES/node/sync-catalog.js" "$BRAND"
[ -s catalog.json ] || fail "catalog.json was not written"
VARIANTS="$(node -e '
const catalog = require(process.argv[1]);
if (!Array.isArray(catalog) || catalog.length === 0) { console.error("catalog.json is empty"); process.exit(1); }
console.log(catalog.reduce((n, p) => n + p.variants.length, 0));' "$WORK/catalog.json")"
PRODUCTS="$(node -e 'console.log(require(process.argv[1]).length)' "$WORK/catalog.json")"
echo "catalog.json: $PRODUCTS products, $VARIANTS variants"

run "keep-content-updated.js" node "$RECIPES/node/keep-content-updated.js"
node -e '
const r = require(process.argv[1]);
if (!Array.isArray(r.changed) || !Array.isArray(r.missing)) { console.error("content-updates.json has no changed/missing arrays"); process.exit(1); }
if (r.missing.length > 0) { console.error(r.missing.length + " variants missing: articleNoIn batches are being truncated"); process.exit(1); }
console.log("content-updates.json: " + r.changed.length + " changed, 0 missing");' "$WORK/content-updates.json"

echo "== refresh-stock.js"
STOCK_OUT="$(node "$RECIPES/node/refresh-stock.js")" || fail "refresh-stock.js exited non-zero"
echo "$STOCK_OUT"
CHECKED="$(sed -n -E 's/^([0-9]+) variants checked, ([0-9]+) matched live, .*/\1/p' <<<"$STOCK_OUT")"
MATCHED="$(sed -n -E 's/^([0-9]+) variants checked, ([0-9]+) matched live, .*/\2/p' <<<"$STOCK_OUT")"
[ -n "$CHECKED" ] || fail "refresh-stock.js did not print its summary line"
[ "$CHECKED" = "$VARIANTS" ] || fail "refresh-stock.js checked $CHECKED variants, catalog.json has $VARIANTS"
[ "$CHECKED" = "$MATCHED" ] || fail "refresh-stock.js matched $MATCHED of $CHECKED variants live"
[ -e stock-updates.json ] || fail "stock-updates.json was not written"

run "catalog-to-csv.js" node "$RECIPES/node/catalog-to-csv.js"
ROWS="$(($(wc -l < catalog.csv) - 1))"
[ "$ROWS" = "$VARIANTS" ] || fail "catalog.csv has $ROWS rows, expected $VARIANTS"

echo "== basket-demo.js"
PRODUCT_ID="$(node -e '
const FFE = require(process.argv[1]);
const catalog = require(process.argv[2]);
new FFE(process.env.FFE_TOKEN).baskets().then((basket) => {
    if (!basket || !Array.isArray(basket.lines)) {
        console.error("baskets:", JSON.stringify(basket).slice(0, 300));
        process.exit(1);
    }
    const inBasket = new Set(basket.lines.map((l) => l.id));
    for (const p of catalog) for (const v of p.variants) {
        if (Number.isInteger(v.id) && !inBasket.has(v.id)) { console.log(v.id); return; }
    }
    console.error("every catalog product is already in the basket");
    process.exit(1);
});' "$SDK" "$WORK/catalog.json")"
echo "product id: $PRODUCT_ID"
BASKET_OUT="$(node "$RECIPES/node/basket-demo.js" "$PRODUCT_ID")" || fail "basket-demo.js exited non-zero"
grep -q '^Basket restored: YES$' <<<"$BASKET_OUT" || fail "basket-demo.js did not restore the basket"
grep -E "^setBasketLine qty 1 -> .*\"id\":$PRODUCT_ID[,}]" <<<"$BASKET_OUT" >/dev/null || fail "setBasketLine did not persist product $PRODUCT_ID (data.id missing)"
grep -E "^Basket after adding qty 1: .*\"id\":$PRODUCT_ID[,}]" <<<"$BASKET_OUT" >/dev/null || fail "basket line for $PRODUCT_ID not found after adding"
echo "basket: added, updated and removed product $PRODUCT_ID; restored"

if command -v php >/dev/null 2>&1; then
    mkdir -p "$WORK/php" && cd "$WORK/php"
    run "sync-catalog.php $BRAND" php "$RECIPES/php/sync-catalog.php" "$BRAND"
    PHP_PRODUCTS="$(node -e 'console.log(require(process.argv[1]).length)' "$WORK/php/catalog.json")"
    [ "$PHP_PRODUCTS" = "$PRODUCTS" ] || fail "sync-catalog.php wrote $PHP_PRODUCTS products, Node wrote $PRODUCTS"
    run "keep-content-updated.php" php "$RECIPES/php/keep-content-updated.php"
    node -e '
const r = require(process.argv[1]);
if (r.missing.length > 0) { console.error(r.missing.length + " variants missing in the PHP run"); process.exit(1); }' "$WORK/php/content-updates.json"
    PHP_BASKET_OUT="$(php "$RECIPES/php/basket-demo.php" "$PRODUCT_ID")" || fail "basket-demo.php exited non-zero"
    grep -q 'Basket restored: YES' <<<"$PHP_BASKET_OUT" || fail "basket-demo.php did not restore the basket"
    echo "php: sync-catalog, keep-content-updated and basket-demo passed"
else
    echo "== SKIP php recipes (php is not on PATH)"
fi

echo "ALL RECIPES PASSED ($PRODUCTS products, $VARIANTS variants, brand $BRAND)"
```

Before finishing the script, open `example/recipes/php/basket-demo.php` and confirm the exact text it prints on success; if it is not `Basket restored: YES`, use the string it does print in the `grep`. Also confirm `refresh-stock.js`'s summary line format against `example/recipes/node/refresh-stock.js` and adjust the two `sed` expressions to match it exactly.

- [ ] **Step 2: `chmod +x scripts/verify-examples.sh`, add the npm script, run `bash -n scripts/verify-examples.sh`**

- [ ] **Step 3: Run it live**

Run: `FFE_TOKEN` already in the environment → `npm run verify:examples`.
Expected: ends with `ALL RECIPES PASSED (…)`, exit 0, and `SKIP php recipes` on this machine. Put the `==` lines, the `catalog.json:` line, the `content-updates.json:` line, the refresh-stock summary line, the `basket:` line and the final line in the report. Nothing else from the output goes in the report.

- [ ] **Step 4: Prove it fails when it should**

Run once with a broken token: `FFE_TOKEN=nope bash scripts/verify-examples.sh; echo "exit $?"`. Expected: fails at the `first brand` step with the 401 body printed and exit 1, and `catalog.json` etc. are not left behind in the repository (the temp dir is removed by the trap). Do not commit anything from that run.

---

### Task 4: `scripts/check-docs.js`, generator `--check`, and `npm run check`

**Files:**
- Create: `scripts/check-docs.js`
- Create: `scripts/check-docs.test.js`
- Create: fixture tree `scripts/fixtures/docs-check/` (files listed in Step 1)
- Modify: `scripts/gen-reference.js` (add `--check` mode; export `staleFiles`)
- Modify: `scripts/gen-reference.test.js` (one test for `staleFiles`)
- Modify: `package.json` (`check` script, test list)
- Modify: `CLAUDE.md` (commands and the "Guide layout" rules)

**Interfaces:**
- Produces: `checkDocs(root)` returns an array of findings `{ check: 'link'|'todo'|'banned'|'token', file, line, detail }` where `line` is 1-based (0 for `link` findings; the link check reports the target). `listMarkdown(root)` returns `README.md` plus every `.md` under `docs/` except `docs/superpowers/`. CLI `node scripts/check-docs.js` prints one `file:line: check: detail` line per finding and exits 1 if any. `staleFiles(dir, rendered)` in `gen-reference.js` returns the names whose on-disk content differs from `rendered` plus names on disk that `rendered` does not contain. `npm run check` = spec lint, generator check, recipe sync check, doc check.

- [ ] **Step 1: Create the fixture tree**

`scripts/fixtures/docs-check/README.md`:

```markdown
# Fixture

[Docs](docs/ok.md) and [an anchor](#fixture) and [external](https://example.com/x) and [mail](mailto:a@b.c).
```

`scripts/fixtures/docs-check/docs/ok.md`:

```markdown
# Ok

[Broken](../missing.md)
TODO finish this
This line mentions a password.
Token: eyJhbGciOi
[Back](../README.md)
```

`scripts/fixtures/docs-check/docs/reference/generated.md`:

```markdown
# Generated

The `pass` field is the password. Not a finding: reference pages are excluded from the banned-word check.
```

`scripts/fixtures/docs-check/docs/superpowers/plan.md`:

```markdown
TODO this whole directory is skipped
```

- [ ] **Step 2: Write the failing tests** in `scripts/check-docs.test.js`:

```js
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test scripts/check-docs.test.js` — Expected: FAIL, `Cannot find module './check-docs'`.

- [ ] **Step 4: Write `scripts/check-docs.js`**

```js
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test scripts/check-docs.test.js` — Expected: 3 passing. If "the real repository is clean" fails, the finding is real: fix the page (the four shell checks in `CLAUDE.md` must agree; run them to confirm) and record what it was in the report.

- [ ] **Step 6: Add `--check` to `scripts/gen-reference.js`**

Add above `main()`:

```js
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
```

Change `main()` so that, when `process.argv.includes('--check')`, it renders, calls `staleFiles(dir, files)`, prints `docs/reference/<name> is out of date (run npm run gen:reference)` per name to stderr and exits 1 if any, otherwise prints `docs/reference is up to date` and returns without deleting or writing anything. Export it: `module.exports = { render, staleFiles };`.

Add to `scripts/gen-reference.test.js`:

```js
test('staleFiles reports changed, missing and extra files', () => {
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-ref-'));
    fs.writeFileSync(path.join(dir, 'same.md'), 'a');
    fs.writeFileSync(path.join(dir, 'changed.md'), 'old');
    fs.writeFileSync(path.join(dir, 'extra.md'), 'x');
    const stale = staleFiles(dir, { 'same.md': 'a', 'changed.md': 'new', 'missing.md': 'm' });
    assert.deepEqual(stale, ['changed.md', 'extra.md', 'missing.md']);
    fs.rmSync(dir, { recursive: true });
});
```

and change the require line to `const { render, staleFiles } = require('./gen-reference');`.

Run: `node scripts/gen-reference.js --check` — Expected: `docs/reference is up to date`, exit 0.

- [ ] **Step 7: Wire `npm run check`**

`package.json` scripts become:

```json
"scripts": {
    "lint:spec": "redocly lint openapi.yaml",
    "gen:reference": "node scripts/gen-reference.js",
    "gen:postman": "node scripts/gen-postman.js",
    "sync:recipes": "node scripts/sync-recipes.js",
    "verify:examples": "bash scripts/verify-examples.sh",
    "check": "npm run lint:spec && node scripts/gen-reference.js --check && node scripts/sync-recipes.js --check && node scripts/check-docs.js",
    "test": "node --test scripts/gen-reference.test.js scripts/gen-postman.test.js scripts/sync-recipes.test.js scripts/check-docs.test.js"
}
```

Run `npm run check` — Expected: lint 0 errors (style warnings are fine), `docs/reference is up to date`, `recipe pages are in sync`, `doc checks clean`, exit 0. Run `npm test` — Expected: 24 passing.

- [ ] **Step 8: Update `CLAUDE.md`**

In the "Spec tooling (repo root)" block add, after `npm test`:

```
npm run check           # spec lint + generated reference up to date + recipe pages in sync + doc rules (links, TODO, banned words, tokens)
npm run sync:recipes    # re-embed example/recipes/* into the recipe pages after editing a script
FFE_TOKEN=... npm run verify:examples   # run every recipe script against the live API (writes one basket line and removes it)
```

In "Guide layout": replace the sentence "Doc-wide checks to run before merging a guide change:" and the whole bash block and the paragraph after it with:

```
- Doc-wide checks before merging a guide change: `npm run check` (from the repository root). It must exit 0. It runs the spec lint, confirms `docs/reference/` matches `openapi.yaml`, confirms every recipe page embeds its `example/recipes/` file unchanged, and applies the four rules implemented in `scripts/check-docs.js`: every relative link target exists, no `TODO`/`TBD`, no `password|salt|hash|security` outside `docs/reference/` (generated pages may name the `/login/` request's `pass` field or a checksum field), and no `eyJ` (a token). Fix the page, never the check.
- Recipe scripts live in `example/recipes/` (Node and PHP). A recipe page embeds a script through a `<!-- recipe: example/recipes/... -->` marker directly above the code fence; edit the file, then run `npm run sync:recipes`. Never edit the fenced copy in the page.
```

Also change the Guide layout bullet for `docs/recipes/` to mention `example/recipes/` holds the runnable copies, and replace the rule "Every Node script must be run live with `FFE_TOKEN` before a page edit is merged." with "Every recipe script change is run live with `FFE_TOKEN=... npm run verify:examples` before it is merged."

---

### Task 5: Fields table per schema in the generated reference

**Files:**
- Modify: `scripts/gen-reference.js`
- Modify: `scripts/fixtures/mini-spec.yaml` (add a `Brand` schema and reference it)
- Modify: `scripts/gen-reference.test.js` (two tests)
- Regenerate: `docs/reference/*.md` (`npm run gen:reference`)

**Interfaces:**
- Consumes: `resolveRef`, `responses`, `operationSection`, `render` in `scripts/gen-reference.js`; the `components.schemas` of `openapi.yaml` (`Brand`, `Category`, `Product`, `Images`, `Basket`, `BasketLine`, `BasketUpdateResponse`, `DealerInfo`, `PosSale`, `PosProduct`, `LoginResponse`).
- Produces: in every generated page, one `## Fields: <SchemaName>` section per distinct 2xx response schema (array item schemas unwrapped), appended after the operation sections in order of first use, with a table `| Field | Type | Description |` listing top-level properties and one level of nesting (`parent.child` for objects, `parent[].child` for arrays of objects). Each operation's "### Responses" section starts with `Response fields: see [<SchemaName>](#fields-<schemaname-lowercased>).` when it has a 2xx schema.

- [ ] **Step 1: Extend the fixture**

In `scripts/fixtures/mini-spec.yaml`, under `components:` add (keep the existing `responses:`):

```yaml
  schemas:
    Brand:
      type: object
      description: |
        One brand as the dealer sees it.
      properties:
        id:
          type: integer
        brandno:
          type: string
          description: "Lowercase brand id | used as the brand filter."
        counts:
          type: object
          properties:
            total:
              type: integer
              description: Number of products.
        images:
          type: array
          items:
            type: object
            properties:
              small:
                type: string
        status:
          type: string
          enum: [active, hidden]
          nullable: true
          description: |
            Multi-line
            description.
```

Give `listBrands`'s 200 response `schema: { type: array, items: { $ref: "#/components/schemas/Brand" } }` (above its `example:`) and `getBrand`'s 200 response `schema: { $ref: "#/components/schemas/Brand" }` (above its `examples:`). Leave `patchBrand`, `noSdkExample`, `login` and `addSale` without response schemas.

- [ ] **Step 2: Write the failing tests** (append to `scripts/gen-reference.test.js`):

```js
test('fields table is rendered once per schema and linked from every operation that returns it', () => {
    const md = render(spec)['brands.md'];
    assert.equal(md.split('## Fields: Brand\n').length - 1, 1);
    assert.equal((md.match(/Response fields: see \[Brand\]\(#fields-brand\)\./g) || []).length, 2);
    assert.match(md, /## Fields: Brand\n\nOne brand as the dealer sees it\.\n\n\| Field \| Type \| Description \|/);
    assert.match(md, /\| id \| integer \|  \|/);
    assert.match(md, /\| brandno \| string \| Lowercase brand id \\\| used as the brand filter\. \|/);
    assert.match(md, /\| counts \| object \|  \|/);
    assert.match(md, /\| counts\.total \| integer \| Number of products\. \|/);
    assert.match(md, /\| images \| array of object \|  \|/);
    assert.match(md, /\| images\[\]\.small \| string \|  \|/);
    assert.match(md, /\| status \| string \(active \\\| hidden\), nullable \| Multi-line description\. \|/);
    assert.ok(md.indexOf('## Fields: Brand') > md.lastIndexOf('### Sample calls'));
});

test('operations without a 2xx schema get no fields link or section', () => {
    const md = render(spec)['pos-sales.md'];
    assert.doesNotMatch(md, /Response fields/);
    assert.doesNotMatch(md, /## Fields:/);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test scripts/gen-reference.test.js` — Expected: the two new tests FAIL (no `## Fields:` output yet); the existing ones still pass.

- [ ] **Step 4: Implement in `scripts/gen-reference.js`**

Add these functions after `jsonBlock`:

```js
function refName(obj) {
    return obj && typeof obj.$ref === 'string' ? obj.$ref.split('/').pop() : null;
}

function cell(text) {
    return String(text || '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim();
}

function typeLabel(raw, spec) {
    const prop = resolveRef(spec, raw) || {};
    let type;
    if (refName(raw)) {
        type = refName(raw);
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
        const prop = resolveRef(spec, raw) || {};
        rows.push(`| ${prefix}${name} | ${typeLabel(raw, spec)} | ${cell(prop.description)} |`);
        if (prefix) continue;
        if (prop.type === 'array') {
            const items = resolveRef(spec, prop.items) || {};
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
```

In `operationSection`, replace `parts.push('### Responses\n');` with:

```js
    parts.push('### Responses\n');
    const schemaName = responseSchemaName(op, spec);
    if (schemaName) parts.push(`Response fields: see [${schemaName}](#fields-${schemaName.toLowerCase()}).\n`);
```

In `render`, after the loop that pushes `operationSection(...)` for a tag, add:

```js
        const schemaNames = [];
        for (const { op } of ops) {
            const name = responseSchemaName(op, spec);
            if (name && !schemaNames.includes(name)) schemaNames.push(name);
        }
        for (const name of schemaNames) lines.push(fieldsSection(name, spec));
```

Check `operationSection` still ends with `sampleCalls(...)` so the "### Sample calls" heading precedes the fields sections.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test` — Expected: 26 passing (24 + 2).

- [ ] **Step 6: Regenerate and inspect**

Run `npm run gen:reference` then `node scripts/gen-reference.js --check` (up to date). Open `docs/reference/products.md` and confirm: exactly one `## Fields: Product` section at the end; rows such as `images.medium`, `images.list`; no row deeper than one level; every `|` inside a description escaped; the `## GET /api/products/` section has the `Response fields: see [Product](#fields-product).` line. Confirm `docs/reference/baskets.md` has `## Fields: Basket` and `## Fields: BasketUpdateResponse`, with `lines[].` rows under Basket. Confirm `docs/reference/pos-sales.md` and `pos-products.md` render without errors (the POS write operations may have no 2xx schema; that is fine). Run `npm run check` — Expected exit 0. In particular the banned-word check ignores `docs/reference/`, but confirm by reading the new tables that no description mentions credentials in a way that contradicts the Global Constraints (the `DealerInfo` schema keeps `agent_dealers` opaque; if its description or any property text mentions anything beyond "opaque", stop and report).

- [ ] **Step 7: Link the tables from the guide**

In `docs/concepts.md`, in the Data model section (or wherever products fields are first discussed), add one sentence: `Every field of a product, with its type and meaning, is listed under [Fields: Product](./reference/products.md#fields-product) in the reference.` Do the same for the basket in `docs/recipes/ordering-with-baskets.md`'s "What the basket response contains" section: `The full list is under [Fields: Basket](../reference/baskets.md#fields-basket).` Run `npm run check` again.

---

### Task 6: CI workflow and final wiring

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (one line under the SDKs/examples section pointing at `example/recipes/`), `docs/README.md` (recipes intro mentions the runnable copies)
- Modify: `CLAUDE.md` (CI note under Commands)

**Interfaces:**
- Consumes: `npm test`, `npm run check` (Task 4), `sdk/node.js` tests, `example/recipes/php/*.php` (Task 2).

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install tooling
        run: npm install --no-audit --no-fund

      - name: Generator and doc tooling tests
        run: npm test

      - name: Spec lint, generated files, recipe pages, doc rules
        run: npm run check

      - name: Node SDK tests
        run: npm test
        working-directory: sdk/node.js

      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.2"

      - name: PHP syntax check
        run: |
          set -e
          php -l sdk/php/ffe.php
          php -l example/php/ffe.php
          for f in example/recipes/php/*.php; do php -l "$f"; done
```

No step runs `verify-examples.sh` (it needs a token and writes to a basket). Validate the YAML parses: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8')); console.log('ok')"`.

- [ ] **Step 2: Docs links**

In `README.md`, where the SDKs and examples are listed, add one bullet: `- [example/recipes/](example/recipes/) — runnable copies of every recipe script (Node.js and PHP)`. In `docs/README.md`, change the "**Recipes** — complete, runnable scripts:" line to "**Recipes** — complete, runnable scripts (the files live in [example/recipes/](../example/recipes/)):". In `CLAUDE.md` under Commands, add one sentence after the spec tooling block: "`.github/workflows/ci.yml` runs `npm test`, `npm run check`, the Node SDK tests and `php -l` on every push; the live `verify:examples` run is manual only."

- [ ] **Step 3: Full verification**

Run: `npm test` (26), `npm run check` (exit 0), `cd sdk/node.js && npm test` (18), and `FFE_TOKEN=... npm run verify:examples` one final time (ends with `ALL RECIPES PASSED`). Confirm no file in the repository contains `eyJ` outside `.gitignore`d paths: `grep -rl eyJ . --exclude-dir=node_modules --exclude-dir=.superpowers --exclude-dir=probes --exclude-dir=.git` prints nothing.

---

## Self-review

- Spec section 5 coverage: verify-examples.sh → Task 3; spec validation documented → Task 4 (`npm run check` + CLAUDE.md); link check → Task 4 (`check-docs.js`, in-repo instead of `markdown-link-check`); Node SDK tests → exist (Phase 2), run in CI (Task 6); CLAUDE.md updated → Tasks 4 and 6. "Testing the deliverable": recipes green via the script (Task 3), generated reference matches spec (`--check`, Task 4), link check (Task 4), SDK tests (Task 6). Phase 1 carry-over fields table → Task 5. Memory scope items (1)–(5) → Tasks 2, 3, 4, 5, 6.
- Placeholders: none; every script is given in full. The only "adjust to what the file prints" instructions (Task 3 Step 1) point at concrete files the implementer must read.
- Type consistency: `syncMarkdown`/`listPages` (Task 1) used by Task 4's `npm run check` through the CLI only; `checkDocs`/`listMarkdown` (Task 4) match their tests; `staleFiles(dir, rendered)` matches its test; `responseSchemaName`, `fieldsSection`, `fieldRows`, `typeLabel`, `refName`, `cell` (Task 5) are all defined in Step 4 and used only there. Marker path form `example/recipes/<lang>/<name>` is the same in Tasks 1, 2 and 4.
