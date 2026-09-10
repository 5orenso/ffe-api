# Recipe: keep content updated

Prices and stock levels change constantly and deserve their own, more frequent check —
see [Recipe: stock and price lookup](./stock-and-price-lookup.md). This recipe is about
the slower-moving text and images: product names, descriptions, feature lists and
photos. It tells you what changed without touching your shop's own data.

## What you get

A `content-updates.json` file listing which shop products have new name, description,
features or image content on the API, and which ones no longer come back at all
(discontinued). Your own prices and stock levels are never read or written by this
recipe — it only looks at content fields.

## Prerequisites

- The `catalog.json` file from [Recipe: sync your catalog](./sync-catalog.md), in the
  same directory as the script. This recipe treats it as a stand-in for "your shop" —
  in a real integration, the equivalent step reads product data out of your shop's own
  database instead.
- A **server-side** token in `FFE_TOKEN`.
- Node.js 18+ and the SDK installed, or PHP with `ffe.php` copied alongside the script.

## The flow

1. Load your product list (`catalog.json`) and collect every variant's `articleno`
   across every shop product.
2. Fetch those variants from the API in batches of 50 using `articleNoIn` — a
   comma-separated list of article numbers, sent as one request per batch instead of
   one request per article.
3. For each shop product, find one of its variants that is still returned by the API,
   and compare its `name`/`nameDisplay`, `description`, `features` and `images.medium`
   against what your catalog already has (the group-level `image` set by
   [Recipe: sync your catalog](./sync-catalog.md#what-you-get)). Record only the fields
   that differ. These group-level text fields are read from a single variant, not merged
   across the group — if two variants of the same shop product genuinely have different
   `description`, `features` or `images.medium` text on the API, you may see a "changed"
   entry even though nothing was actually updated. This recipe intentionally only tracks
   the shop-product-level `image`, not each variant's own `image` field — if you need to
   know when one specific variant's photo changed, compare `variants[].image` yourself the
   same way this script compares the group-level one.
4. A shop product whose variants are **all** missing from the API response is no longer
   sold — record it separately as discontinued rather than as "changed".
5. Write the results to `content-updates.json` and print how many products changed and
   how many are gone.

This recipe never overwrites `catalog.json` — see
[Common mistakes](#common-mistakes) below for why that matters.

## Node.js script

Save this as `keep-content-updated.js`, next to `catalog.json`.

```js
'use strict';
// Compare catalog.json against the live API and record content changes.
// Run: FFE_TOKEN=<server-side token> node keep-content-updated.js
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

async function fetchByArticleNos(articleNos) {
    const found = new Map();
    for (const batch of batches(articleNos, BATCH)) {
        // The default page size is 25; always pass limit when you ask for more.
        const page = await ffe.products({ articleNoIn: batch.join(','), limit: BATCH });
        if (!Array.isArray(page)) fail('products articleNoIn', page);
        for (const p of page) found.set(p.articleno, p);
    }
    return found;
}

(async () => {
    const catalog = readCatalog();
    const allArticleNos = catalog.reduce(
        (acc, product) => acc.concat(product.variants.map((v) => v.articleno)),
        []
    );
    const live = await fetchByArticleNos(allArticleNos);

    const changed = [];
    const missing = [];

    for (const product of catalog) {
        // Use whichever variant the API still knows about to represent the
        // shop-product-level fields (name, description, features, image).
        const liveVariant = product.variants.map((v) => live.get(v.articleno)).find(Boolean);
        if (!liveVariant) {
            missing.push({
                brand: product.brand,
                name: product.name,
                articlenos: product.variants.map((v) => v.articleno),
            });
            continue;
        }
        const liveName = liveVariant.nameDisplay || liveVariant.name;
        const liveImage = liveVariant.images && liveVariant.images.medium ? liveVariant.images.medium : null;

        const fields = {};
        if (liveName !== product.name) fields.name = { from: product.name, to: liveName };
        if (liveVariant.description !== product.description) fields.description = { from: product.description, to: liveVariant.description };
        if (liveVariant.features !== product.features) fields.features = { from: product.features, to: liveVariant.features };
        if (liveImage !== product.image) fields.image = { from: product.image, to: liveImage };

        if (Object.keys(fields).length > 0) {
            changed.push({ brand: product.brand, name: product.name, articleno: liveVariant.articleno, fields });
        }
    }

    fs.writeFileSync('content-updates.json', JSON.stringify({ changed, missing }, null, 2));
    console.log(`${catalog.length} products checked, ${live.size} variants matched live`);
    console.log(`${changed.length} products changed, ${missing.length} products no longer found (discontinued)`);
})().catch((err) => { console.error(err); process.exit(1); });
```

Run it:

```bash
FFE_TOKEN=<your token> node keep-content-updated.js
```

## PHP script

Save this as `keep-content-updated.php`, next to `ffe.php` and `catalog.json`.

```php
<?php
// Compare catalog.json against the live API and record content changes.
// Run: FFE_TOKEN=<server-side token> php keep-content-updated.php
require 'ffe.php';

$token = getenv('FFE_TOKEN');
if (!$token) {
    fwrite(STDERR, "Set FFE_TOKEN first.\n");
    exit(1);
}
$ffe = new FFE($token);
$BATCH = 50;

function readCatalog() {
    if (!file_exists('catalog.json')) {
        fwrite(STDERR, "catalog.json not found. Run sync-catalog.php first.\n");
        exit(1);
    }
    return json_decode(file_get_contents('catalog.json'), true);
}

function fetchByArticleNos($ffe, $articleNos, $batchSize) {
    $found = [];
    foreach (array_chunk($articleNos, $batchSize) as $batch) {
        // The default page size is 25; always pass limit when you ask for more.
        $page = $ffe->products((object) ['articleNoIn' => implode(',', $batch), 'limit' => $batchSize]);
        if (!is_array($page)) {
            throw new Exception('products articleNoIn: unexpected response');
        }
        foreach ($page as $p) {
            $found[$p['articleno']] = $p;
        }
    }
    return $found;
}

try {
    $catalog = readCatalog();
    $allArticleNos = [];
    foreach ($catalog as $product) {
        foreach ($product['variants'] as $v) {
            $allArticleNos[] = $v['articleno'];
        }
    }
    $live = fetchByArticleNos($ffe, $allArticleNos, $BATCH);

    $changed = [];
    $missing = [];

    foreach ($catalog as $product) {
        $liveVariant = null;
        foreach ($product['variants'] as $v) {
            if (isset($live[$v['articleno']])) {
                $liveVariant = $live[$v['articleno']];
                break;
            }
        }
        if ($liveVariant === null) {
            $articlenos = [];
            foreach ($product['variants'] as $v) {
                $articlenos[] = $v['articleno'];
            }
            $missing[] = ['brand' => $product['brand'], 'name' => $product['name'], 'articlenos' => $articlenos];
            continue;
        }

        $liveName = !empty($liveVariant['nameDisplay']) ? $liveVariant['nameDisplay'] : $liveVariant['name'];
        $liveImage = !empty($liveVariant['images']['medium']) ? $liveVariant['images']['medium'] : null;
        $liveDescription = isset($liveVariant['description']) ? $liveVariant['description'] : null;
        $liveFeatures = isset($liveVariant['features']) ? $liveVariant['features'] : null;

        $fields = [];
        if ($liveName !== $product['name']) {
            $fields['name'] = ['from' => $product['name'], 'to' => $liveName];
        }
        if ($liveDescription !== $product['description']) {
            $fields['description'] = ['from' => $product['description'], 'to' => $liveDescription];
        }
        if ($liveFeatures !== $product['features']) {
            $fields['features'] = ['from' => $product['features'], 'to' => $liveFeatures];
        }
        if ($liveImage !== $product['image']) {
            $fields['image'] = ['from' => $product['image'], 'to' => $liveImage];
        }
        if (count($fields) > 0) {
            $changed[] = ['brand' => $product['brand'], 'name' => $product['name'], 'articleno' => $liveVariant['articleno'], 'fields' => $fields];
        }
    }

    file_put_contents('content-updates.json', json_encode(['changed' => $changed, 'missing' => $missing], JSON_PRETTY_PRINT));
    echo count($catalog) . ' products checked, ' . count($live) . " variants matched live\n";
    echo count($changed) . ' products changed, ' . count($missing) . " products no longer found (discontinued)\n";
} catch (Exception $e) {
    fwrite(STDERR, 'API error: ' . $e->getMessage() . "\n");
    exit(1);
}
```

Run it:

```bash
FFE_TOKEN=<your token> php keep-content-updated.php
```

## Schedule

Content changes slower than stock or price, so once a week is usually enough:

```
0 4 * * 1 cd /path/to/script && FFE_TOKEN=<your token> node keep-content-updated.js >> content.log 2>&1
```

That runs every Monday at 04:00. On Windows, use Task Scheduler with a weekly trigger —
see [Recipe: sync your catalog, Run it nightly](./sync-catalog.md#run-it-nightly) for
the setup steps.

## Common mistakes

- **Overwriting your own edited texts.** If your shop staff rewrite a description or
  swap in a better photo, an automated sync that blindly applies every change from
  `content-updates.json` will erase that work the next time it runs. This script never
  writes back to `catalog.json` for that reason — it only reports differences. Add your
  own `locked` flag to a shop product (in your database, not in `catalog.json`) and skip
  applying `changed` entries for anything locked when you consume this file.
- **Image URL changes.** A product's `images.medium` URL can change even when the photo
  itself looks the same (a re-upload gets a new filename). Treat any `image` entry in
  `changed` as "fetch and store the new URL", not as a sign something is wrong.
- **Forgetting `limit` on `articleNoIn`.** With 50 ids and no `limit` you get 25 back
  and no error — the request still succeeds, it just silently drops the rest of the
  batch. Always pass `limit` at least as large as the batch size, as this script does.
- **Treating "missing" as an error — or as certain.** A variant that no longer comes
  back for `articleNoIn` usually means the product was discontinued, not that the
  request failed — see [Errors: errors that look like
  success](../errors.md#errors-that-look-like-success). But `missing` is only
  trustworthy when every request that could have returned that variant passed a `limit`
  at least as large as its batch (see the mistake above); a forgotten `limit` produces
  false "missing" entries that have nothing to do with discontinuation. Even with
  `limit` set correctly, treat a single missing run as provisional — mark a product
  discontinued only after it is missing on two consecutive runs, not the first time it
  disappears.
