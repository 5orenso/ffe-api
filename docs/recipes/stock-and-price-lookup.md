# Recipe: stock and price lookup

This recipe is for looking up **known** products — items already in your shop, your cart,
or an order — rather than browsing the whole catalog. See
[Recipe: sync your catalog](./sync-catalog.md) for building that catalog in the first
place, and [Recipe: keep content updated](./keep-content-updated.md) for the slower-moving
name/description/image fields. This page covers the two fields that change constantly:
`availability` (stock) and `retailPrice`/`retailCurrency` (price).

## What you get

Three ways to fetch live stock and price for products you already know about — by a single
article number, by a batch of article numbers, or by barcode (GTIN) — plus a script that
refreshes `availability` and `retailPrice`/`retailCurrency` for every variant in your
`catalog.json` and reports what changed.

## Prerequisites

- A token in the `FFE_TOKEN` environment variable (see
  [Getting started, Step 1](../getting-started.md)). A server-side token is fine for a
  backend job; use a client-side token only if the lookup runs in a browser.
- Node.js 18+ and `npm install @flyfisheurope/ffe-api-sdk`, **or** PHP with the curl
  extension and `sdk/php/ffe.php` copied next to the script.
- For the refresh script: the `catalog.json` file from
  [Recipe: sync your catalog](./sync-catalog.md), in the same directory as the script.

## The flow

1. Pick the lookup that matches what you already know: one `articleno`, a list of
   `articleno` values, or a barcode.
2. Read `availability` and `retailPrice`/`retailCurrency` off the response — see
   [Concepts: Availability](../concepts.md#availability) and
   [Concepts: Prices](../concepts.md#prices).
3. For a whole catalog refresh, batch the lookup: collect every variant's `articleno` from
   `catalog.json`, fetch them `articleNoIn` batches of 50, and compare each one's
   `availability` and `retailPrice`/`retailCurrency` against what you already have.

## Look up one article number

Use this when you already know the exact variant, for example when refreshing a single
product page. An unknown `articleno` is not an error — it comes back as HTTP 200 with an
empty object `{}` — see [Errors: errors that look like success](../errors.md#errors-that-look-like-success).

**Node.js**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE(process.env.FFE_TOKEN);

ffe.product('1113000')
    .then((product) => {
        if (Object.keys(product).length === 0) {
            console.log('Unknown articleno.');
            return;
        }
        console.log(product.articleno, product.availability, product.retailPrice, product.retailCurrency);
    })
    .catch((error) => console.error(error));
```

Run live against a real `articleno`, this printed:

```
1113000 Yes 2199 NOK
```

**PHP**

```php
<?php
require 'ffe.php';
$ffe = new FFE(getenv('FFE_TOKEN'));

try {
    $product = $ffe->product('1113000');
    if (empty($product)) {
        echo "Unknown articleno.\n";
    } else {
        echo $product['articleno'], ' ', $product['availability'], ' ',
             $product['retailPrice'], ' ', $product['retailCurrency'], "\n";
    }
} catch (Exception $e) {
    echo 'API error: ', $e->getMessage(), "\n";
}
```

## Look up a batch of article numbers

Use this when you know several article numbers at once — the contents of a cart, or a
page of products you're refreshing — and want one request instead of many. Pass
`articleNoIn` as a comma-separated list, and always set `limit` to at least the number of
ids you sent; the default `limit` is 25, and a bigger batch with no `limit` silently drops
the rest instead of erroring — see
[Recipe: keep content updated, Common mistakes](./keep-content-updated.md#common-mistakes).
If you have more than 50 ids, split them into batches of 50 (the "Refresh stock every
hour" script below does this for a whole catalog).

**Node.js**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE(process.env.FFE_TOKEN);

const ids = ['1113000', '1113001', '1113002'];

ffe.products({ articleNoIn: ids.join(','), limit: ids.length })
    .then((products) => {
        for (const p of products) {
            console.log(p.articleno, p.retailPrice, p.retailCurrency, p.availability);
        }
    })
    .catch((error) => console.error(error));
```

Run live with those three ids, this printed:

```
1113000 2199 NOK Yes
1113001 1999 NOK Yes
1113002 599 NOK Yes
```

**PHP**

```php
<?php
require 'ffe.php';
$ffe = new FFE(getenv('FFE_TOKEN'));

$ids = ['1113000', '1113001', '1113002'];

try {
    $products = $ffe->products((object) ['articleNoIn' => implode(',', $ids), 'limit' => count($ids)]);
    foreach ($products as $p) {
        echo $p['articleno'], ' ', $p['retailPrice'], ' ', $p['retailCurrency'], ' ', $p['availability'], "\n";
    }
} catch (Exception $e) {
    echo 'API error: ', $e->getMessage(), "\n";
}
```

## Look up by barcode (GTIN)

Use this when a barcode scanner or a supplier feed only gives you a GTIN (the
`tradeItemNumber` field on a product). `gtin` is an exact match — no partial matching — and
returns a list, not a single object, because in principle more than one variant could share
a barcode. Pass `limit` here too, the same as any other list call — the default page size
(25) still applies even though a GTIN rarely matches more than a handful of variants. A
GTIN nobody recognizes returns an empty array `[]`, not an error — see
[Errors: errors that look like success](../errors.md#errors-that-look-like-success).

**Node.js**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE(process.env.FFE_TOKEN);

ffe.products({ gtin: '4560111388931', limit: 50 })
    .then((matches) => {
        if (matches.length === 0) {
            console.log('No product with that barcode.');
            return;
        }
        console.log(matches[0].articleno, matches[0].availability);
    })
    .catch((error) => console.error(error));
```

Run live, `gtin=4560111388931` printed `1113000 Yes` (this is the same product as
`articleno` `1113000` above); an unrecognized GTIN returned an empty array as expected.

**PHP**

```php
<?php
require 'ffe.php';
$ffe = new FFE(getenv('FFE_TOKEN'));

try {
    $matches = $ffe->products((object) ['gtin' => '4560111388931', 'limit' => 50]);
    if (count($matches) === 0) {
        echo "No product with that barcode.\n";
    } else {
        echo $matches[0]['articleno'], ' ', $matches[0]['availability'], "\n";
    }
} catch (Exception $e) {
    echo 'API error: ', $e->getMessage(), "\n";
}
```

## Rendering availability for display

`availability` isn't always a simple yes/no — it can also be a restock date or a unit
count. [Concepts: Availability](../concepts.md#availability) documents the five shapes and
gives a `shopAvailability()` mapping function for each SDK that collapses them into four
display states: `in-stock`, `out-of-stock`, `expected` (with a `date`), and `in-stock` with
a `quantity`. Reuse that function rather than writing your own regular expressions — run
live against a real product, `shopAvailability('Yes')` returned
`{"status":"in-stock"}`.

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE(process.env.FFE_TOKEN);

// Copy shopAvailability() from Concepts: Availability into your project.
function shopAvailability(value) {
  if (value === 'Yes') return { status: 'in-stock' };
  if (value === 'No') return { status: 'out-of-stock' };
  if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(value)) return { status: 'expected', date: value };
  const match = String(value).match(/^(\d+)(\+)?$/);
  if (match) return { status: 'in-stock', quantity: parseInt(match[1], 10), exact: !match[2] };
  return { status: 'unknown' };
}

ffe.product('1113000').then((product) => {
    console.log(shopAvailability(product.availability));
    // { status: 'in-stock' }
});
```

## Refresh stock every hour

A full catalog changes slowly, but stock and price change all day. Rather than re-syncing
everything, fetch just the `availability` and `retailPrice`/`retailCurrency` fields for
every variant you already know about and record what changed.

The script:

1. Reads `catalog.json` and collects every variant's `articleno`, `availability`, `price`
   and `currency` across every shop product (`price`/`currency` come from the sync
   recipe's per-variant fields — see
   [Recipe: sync your catalog](./sync-catalog.md#what-you-get)).
2. Fetches those variants from the API in batches of 50 using `articleNoIn`, always with
   `limit: 50` — see the batch section above for why `limit` matters.
3. Compares each variant's live `availability` and `retailPrice`/`retailCurrency` against
   the values already in `catalog.json`.
4. Prints every `articleno` whose availability or price changed, and writes the full list
   to `stock-updates.json`, with a separate entry per changed field so you can tell a
   stock change from a price change.

This script never writes back to `catalog.json`, for the same reason
[Recipe: keep content updated](./keep-content-updated.md#common-mistakes) doesn't: treat
`stock-updates.json` as a report to apply to your own shop's database, on your own terms,
not as a file to blindly copy over your catalog.

### Node.js script

Save this as `refresh-stock.js`, next to `catalog.json`. The same file is in this
repository at [example/recipes/node/refresh-stock.js](../../example/recipes/node/refresh-stock.js).

<!-- recipe: example/recipes/node/refresh-stock.js -->
```js
'use strict';
// Compare catalog.json's availability against the live API and record what changed.
// Run: FFE_TOKEN=<your token> node refresh-stock.js
const fs = require('fs');
const FFE = require('@flyfisheurope/ffe-api-sdk');

const token = process.env.FFE_TOKEN;
if (!token) { console.error('Set FFE_TOKEN first.'); process.exit(1); }
const ffe = new FFE(token);
const BATCH = 50;

function fail(where, data) {
    console.error(`API error in ${where}:`, JSON.stringify(data).slice(0, 300));
    process.exit(1);
}

function readCatalog() {
    if (!fs.existsSync('catalog.json')) {
        console.error('catalog.json not found. Run sync-catalog.js first.');
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync('catalog.json', 'utf8'));
}

function batches(items, size) {
    const out = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

async function fetchLive(articleNos) {
    const live = new Map();
    for (const batch of batches(articleNos, BATCH)) {
        // The default page size is 25; always pass limit when you ask for more.
        const page = await ffe.products({ articleNoIn: batch.join(','), limit: BATCH });
        if (!Array.isArray(page)) fail('products articleNoIn', page);
        for (const p of page) live.set(p.articleno, p);
    }
    return live;
}

(async () => {
    const catalog = readCatalog();
    const variants = catalog.reduce((acc, product) => acc.concat(
        product.variants.map((v) => ({
            articleno: v.articleno,
            availability: v.availability,
            price: v.price,
            currency: v.currency,
            brand: product.brand,
            name: product.name,
        }))
    ), []);
    const articleNos = variants.map((v) => v.articleno);
    const live = await fetchLive(articleNos);

    const changed = [];
    for (const v of variants) {
        const liveProduct = live.get(v.articleno);
        if (!liveProduct) continue; // not returned - see Common mistakes below
        const fields = {};
        if (liveProduct.availability !== v.availability) {
            fields.availability = { from: v.availability, to: liveProduct.availability };
        }
        if (liveProduct.retailPrice !== v.price || liveProduct.retailCurrency !== v.currency) {
            fields.price = {
                from: `${v.price} ${v.currency}`,
                to: `${liveProduct.retailPrice} ${liveProduct.retailCurrency}`,
            };
        }
        if (Object.keys(fields).length > 0) {
            changed.push({ articleno: v.articleno, brand: v.brand, name: v.name, fields });
        }
    }

    fs.writeFileSync('stock-updates.json', JSON.stringify(changed, null, 2));
    console.log(`${articleNos.length} variants checked, ${live.size} matched live, ${changed.length} changed`);
    for (const c of changed) {
        console.log(`${c.articleno} (${c.brand} ${c.name}): ${JSON.stringify(c.fields)}`);
    }
})().catch((err) => { console.error(err); process.exit(1); });
```

Run it:

```bash
FFE_TOKEN=<your token> node refresh-stock.js
```

Run live against a real `catalog.json` (one brand, 321 shop products, 2457 variants), this
printed:

```
2457 variants checked, 2457 matched live, 0 changed
```

Nothing had changed in the few seconds between building `catalog.json` and running the
script, which is the expected result — the script only lists changes when there are some.

PHP developers: this is the same `articleNoIn` batching pattern as
[Recipe: keep content updated](./keep-content-updated.md)'s PHP script — reuse its
`fetchByArticleNos()` helper and compare `availability` and `retailPrice`/`retailCurrency`
per variant instead of the content fields, as the Node script above does.

## Run it hourly

**Linux/macOS (cron)** — add a line to `crontab -e`:

```
0 * * * * cd /path/to/script && FFE_TOKEN=<your token> node refresh-stock.js >> stock.log 2>&1
```

**Windows (Task Scheduler)** — create a task with an hourly trigger, action "Start a
program", program `node.exe`, argument `refresh-stock.js`, "Start in" set to the script's
folder, and `FFE_TOKEN` set on the task's **Settings** tab — see
[Recipe: sync your catalog, Run it nightly](./sync-catalog.md#run-it-nightly) for the same
setup applied to a nightly job.

## Common mistakes

- **Forgetting `limit` on a batch.** With more ids in `articleNoIn` than the default
  `limit` of 25, the extra ones are silently dropped — no error, just a short response. The
  refresh script above always sets `limit: 50` to match its batch size of 50.
- **Treating a missing `articleno` as an error.** If a batch response doesn't include one
  of the ids you asked for, that usually means the product was discontinued, not that the
  request failed — see
  [Errors: errors that look like success](../errors.md#errors-that-look-like-success). The
  refresh script above skips these rather than treating them as a change.
- **Showing `dealerPrice` instead of `retailPrice`.** Every lookup on this page returns
  both. Only `retailPrice`/`retailCurrency` are meant for a customer to see — see
  [Concepts: Prices](../concepts.md#prices).
- **Parsing `availability` with your own regular expressions.** It's one of five different
  shapes (`"Yes"`, `"No"`, a date, `"20+"`, or a plain number) — use the `shopAvailability()`
  function from [Concepts: Availability](../concepts.md#availability) instead of
  re-deriving the logic.
- **Polling too aggressively.** Rate limiting isn't active today, but an hourly schedule
  with batches of 50 is polite regardless — see
  [Concepts: Rate limiting](../concepts.md#rate-limiting). Don't fetch stock for every
  variant every minute "just in case."
