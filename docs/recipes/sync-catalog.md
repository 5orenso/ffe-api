# Recipe: sync your catalog

This recipe pulls your entire product catalog into one file you can feed into a shop
import, a database seed, or a CSV export.

## What you get

A `catalog.json` file with one entry per **shop product** — a brand plus a marketing
name — not one entry per variant. Each entry carries the fields a shop needs (name,
category, description, features, image, price) and a nested `variants` array with the
size/colour details (`articleno`, `gtin`, `size`, `color`, `availability`, `price`,
`currency`, `image`) for every variant that shares that name. The group-level `image`,
`price` and `currency` are copied from the **first** variant seen for that group — they're
a convenient fallback for a shop that only wants one price and one photo per shop product,
not a guarantee that every variant is the same. Live data shows variants of the same shop
product can carry different `retailPrice`, `retailCurrency` and `images.medium`: at the
time of writing, the AlumiBite Cleat sells at very different prices for a 10-pack versus a
100-pack, and in a sample of the Simms catalog, roughly a quarter of the multi-variant
products had a different image per colour, with a smaller number differing in price per
size — read the per-variant fields on `variants[]` whenever you need the exact price or
photo for one size/colour. See [Concepts: Variants](../concepts.md#variants) for why the
API doesn't group these for you and how the grouping works.

## Prerequisites

- A **server-side** token (see [Getting started, Step 1](../getting-started.md)) in the
  `FFE_TOKEN` environment variable. This script reads your whole catalog, so keep the
  token off any web page.
- Node.js 18+ and `npm install @flyfisheurope/ffe-api-sdk`, **or** PHP with the curl
  extension and `sdk/php/ffe.php` copied next to the script.
- A few minutes of run time. A full catalog has thousands of variants across dozens of
  brands; the script fetches them page by page.

## The flow

1. Fetch the list of brands with `GET /api/brands/`.
2. For each brand, fetch every product variant with `GET /api/products/?brand=<brandno>`,
   paging with `limit=200` and an increasing `offset` until a page comes back with fewer
   than 200 items — see [Concepts: Pagination](../concepts.md#pagination).
3. Group that brand's variants into shop products: two variants belong together when
   they share the same `brand` and the same `nameDisplay` (falling back to `name` when
   `nameDisplay` is missing).
4. For each group, map the fields a shop needs — name, category, description, features,
   image, recommended retail price and currency, each taken from the **first** variant in
   the group as a fallback — and collect the per-variant fields (`articleno`, `gtin`,
   `size`, `color`, `availability`, and that variant's own `price`, `currency` and `image`)
   into a `variants` list. Variants of the same shop product can have different prices and
   images (see [What you get](#what-you-get) above), so prefer the variant-level fields
   over the group-level fallback wherever you have a specific variant in hand.
5. Write every brand's grouped products into one `catalog.json` file.

## Node.js script

Save this as `sync-catalog.js`. It has no dependencies beyond the SDK.

```js
'use strict';
// Sync the Flyfish Europe catalog into catalog.json.
// Run: FFE_TOKEN=<server-side token> node sync-catalog.js
const fs = require('fs');
const FFE = require('@flyfisheurope/ffe-api-sdk');

const token = process.env.FFE_TOKEN;
if (!token) { console.error('Set FFE_TOKEN first.'); process.exit(1); }
const ffe = new FFE(token);
const PAGE = 200;

function fail(where, data) {
    console.error(`API error in ${where}:`, JSON.stringify(data).slice(0, 300));
    process.exit(1);
}

async function allProducts(brandno) {
    const out = [];
    for (let offset = 0; ; offset += PAGE) {
        const page = await ffe.products({ brand: brandno, limit: PAGE, offset });
        if (!Array.isArray(page)) fail(`products ${brandno}`, page);
        out.push(...page);
        if (page.length < PAGE) return out;
    }
}

function groupVariants(products) {
    const groups = new Map();
    for (const p of products) {
        const key = `${p.brand}|${p.nameDisplay || p.name}`;
        if (!groups.has(key)) {
            groups.set(key, {
                brand: p.brand,
                name: p.nameDisplay || p.name,
                category: [p.mainCategory, p.intermediateCategory, p.subCategory].filter(Boolean).join(' / '),
                description: p.description,
                features: p.features,
                image: p.images && p.images.medium ? p.images.medium : null,
                price: p.retailPrice,
                currency: p.retailCurrency,
                variants: [],
            });
        }
        groups.get(key).variants.push({
            articleno: p.articleno,
            gtin: p.tradeItemNumber,
            size: p.size,
            color: p.color,
            availability: p.availability,
            price: p.retailPrice,
            currency: p.retailCurrency,
            image: p.images && p.images.medium ? p.images.medium : null,
        });
    }
    return [...groups.values()];
}

(async () => {
    const brands = await ffe.brands();
    if (!Array.isArray(brands)) fail('brands', brands);
    const catalog = [];
    for (const brand of brands) {
        const products = await allProducts(brand.brandno);
        const grouped = groupVariants(products);
        console.log(`${brand.name}: ${products.length} variants -> ${grouped.length} products`);
        catalog.push(...grouped);
    }
    fs.writeFileSync('catalog.json', JSON.stringify(catalog, null, 2));
    console.log(`Wrote catalog.json with ${catalog.length} products`);
})().catch((err) => { console.error(err); process.exit(1); });
```

Run it:

```bash
FFE_TOKEN=<your token> node sync-catalog.js
```

## PHP script

Save this as `sync-catalog.php`, next to `ffe.php`.

```php
<?php
// Sync the Flyfish Europe catalog into catalog.json.
// Run: FFE_TOKEN=<server-side token> php sync-catalog.php
require 'ffe.php';

$token = getenv('FFE_TOKEN');
if (!$token) {
    fwrite(STDERR, "Set FFE_TOKEN first.\n");
    exit(1);
}
$ffe = new FFE($token);
$PAGE = 200;

function allProducts($ffe, $brandno, $page) {
    $out = [];
    $offset = 0;
    while (true) {
        $products = $ffe->products((object) ['brand' => $brandno, 'limit' => $page, 'offset' => $offset]);
        if (!is_array($products)) {
            throw new Exception("products $brandno: unexpected response");
        }
        $out = array_merge($out, $products);
        if (count($products) < $page) {
            return $out;
        }
        $offset += $page;
    }
}

function groupVariants($products) {
    $groups = [];
    foreach ($products as $p) {
        $name = !empty($p['nameDisplay']) ? $p['nameDisplay'] : $p['name'];
        $key = $p['brand'] . '|' . $name;
        if (!isset($groups[$key])) {
            $category = array_filter([
                isset($p['mainCategory']) ? $p['mainCategory'] : null,
                isset($p['intermediateCategory']) ? $p['intermediateCategory'] : null,
                isset($p['subCategory']) ? $p['subCategory'] : null,
            ]);
            $groups[$key] = [
                'brand' => $p['brand'],
                'name' => $name,
                'category' => implode(' / ', $category),
                'description' => isset($p['description']) ? $p['description'] : null,
                'features' => isset($p['features']) ? $p['features'] : null,
                'image' => !empty($p['images']['medium']) ? $p['images']['medium'] : null,
                'price' => isset($p['retailPrice']) ? $p['retailPrice'] : null,
                'currency' => isset($p['retailCurrency']) ? $p['retailCurrency'] : null,
                'variants' => [],
            ];
        }
        $groups[$key]['variants'][] = [
            'articleno' => $p['articleno'],
            'gtin' => isset($p['tradeItemNumber']) ? $p['tradeItemNumber'] : null,
            'size' => isset($p['size']) ? $p['size'] : null,
            'color' => isset($p['color']) ? $p['color'] : null,
            'availability' => isset($p['availability']) ? $p['availability'] : null,
            'price' => isset($p['retailPrice']) ? $p['retailPrice'] : null,
            'currency' => isset($p['retailCurrency']) ? $p['retailCurrency'] : null,
            'image' => !empty($p['images']['medium']) ? $p['images']['medium'] : null,
        ];
    }
    return array_values($groups);
}

try {
    $brands = $ffe->brands();
    if (!is_array($brands)) {
        throw new Exception('brands: unexpected response');
    }
    $catalog = [];
    foreach ($brands as $brand) {
        $products = allProducts($ffe, $brand['brandno'], $PAGE);
        $grouped = groupVariants($products);
        echo $brand['name'] . ': ' . count($products) . ' variants -> ' . count($grouped) . " products\n";
        $catalog = array_merge($catalog, $grouped);
    }
    file_put_contents('catalog.json', json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    echo 'Wrote catalog.json with ' . count($catalog) . " products\n";
} catch (Exception $e) {
    fwrite(STDERR, 'API error: ' . $e->getMessage() . "\n");
    exit(1);
}
```

Run it:

```bash
FFE_TOKEN=<your token> php sync-catalog.php
```

## Run it nightly

A full catalog changes slowly enough that once a night is plenty. For anything that
needs to be fresher within the day, see
[Recipe: keep content updated](./keep-content-updated.md) and
[Recipe: stock and price lookup](./stock-and-price-lookup.md).

**Linux/macOS (cron)** — add a line to `crontab -e` that runs the script at 03:00 every
night and appends output to a log file. An inline `FFE_TOKEN=<your token>` on the cron
line works, but it leaves the token sitting in your crontab and process list in plain
text; prefer a small env file (`chmod 600`, outside version control) or a wrapper shell
script that exports `FFE_TOKEN` before calling `node`, and point cron at that instead:

```
0 3 * * * cd /path/to/script && FFE_TOKEN=<your token> node sync-catalog.js >> sync.log 2>&1
```

```
# wrapper.sh, chmod +x, chmod 600 for the token env file it sources
0 3 * * * /path/to/script/wrapper.sh >> sync.log 2>&1
```

**Windows (Task Scheduler)** — create a task with a daily trigger (e.g. 03:00), action
"Start a program", program `node.exe` (or `php.exe`), argument `sync-catalog.js`
(or `sync-catalog.php`), and "Start in" set to the script's folder. Set the `FFE_TOKEN`
environment variable on the task's **Settings** tab, or in a wrapper `.bat` file that
sets it before calling the script, rather than typing the token into the task itself.

## Common mistakes

- **Forgetting pagination.** A single call to `GET /api/products/` without `limit`
  returns only 25 items. Always page with an increasing `offset` until a page comes back
  shorter than the `limit` you asked for — see
  [Concepts: Pagination](../concepts.md#pagination). Skipping this silently truncates
  your catalog to the first page of each brand.
- **Using `unique=true`.** It looks like the right way to get grouped products, but
  every observed call returns HTTP 504. Group variants yourself, as this script does —
  see [Concepts: Variants](../concepts.md#variants).
- **Displaying dealer prices.** `retailPrice` and `retailCurrency` are the only price
  fields to show a customer. The `dealerPrice`, `dealerCurrency` and `pricelist*` fields
  are your own cost figures — see [Concepts: Prices](../concepts.md#prices). This
  script never reads them.
- **Assuming every product has an image.** `images.medium` may be missing on some
  products. Check for `null` before using the `image` field — this script already writes
  `null` rather than a broken URL when there is no image, for both the group-level
  fallback and each variant's own `image`.
