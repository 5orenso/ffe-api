# Hosted shops (Shopify, Wix, and similar)

A hosted shop like Shopify or Wix doesn't give you a server to run code on or a REST API
you can freely write products to from a script the way WooCommerce, PrestaShop and Magento
do. What you do have is a **CSV import** screen in the shop's own admin. This page covers
what's possible without any code access to the shop itself: run the catalog sync
[recipe](../recipes/sync-catalog.md) somewhere you control — your laptop, a small server,
a scheduled task — convert the resulting `catalog.json` into a CSV file, and upload that
file through the shop's admin.

This page shows where the sync script hooks in — converting `catalog.json` into a CSV
file — and stops there; it is not a full import tool or a connection to any specific
hosted platform's import screen.

## The flow

1. Run the Node or PHP script from [Recipe: sync your catalog](../recipes/sync-catalog.md)
   on any machine with `FFE_TOKEN` set. Nothing about that script depends on WooCommerce,
   PrestaShop or Magento — it only needs Node.js or PHP and a network connection.
2. Convert the resulting `catalog.json` into a CSV file with the script below.
3. Upload the CSV through your shop's own product import screen (see
   [Shopify](#shopify) and [Wix](#wix) below).
4. Repeat on a schedule — nightly for the catalog, as in the sync recipe — and re-upload.
   Each hosted platform's own import screen decides whether a re-upload updates existing
   products or adds duplicates; check its CSV import documentation before scheduling
   repeat uploads.

## The CSV column layout

One row per **variant** (not per shop product), so a product with three sizes produces
three rows that share the same `name` but each carry their own `price` and `image` — a
shop product's variants aren't guaranteed to share either. Live data shows both can differ
within the same shop product: at the time of writing, the AlumiBite Cleat sells at very
different prices for a 10-pack versus a 100-pack, and in a sample of the Simms catalog,
roughly a quarter of the multi-variant products had a different image per colour, with a
smaller number differing in price per size — see
[Recipe: sync your catalog](../recipes/sync-catalog.md#what-you-get):

| Column | From `catalog.json` |
|---|---|
| `name` | the shop product's `name` |
| `sku` | the variant's `articleno` |
| `gtin` | the variant's `gtin` |
| `price` | the variant's `price`, falling back to the shop product's `price` if the variant has none |
| `currency` | the variant's `currency`, falling back to the shop product's `currency` |
| `image` | the variant's `image`, falling back to the shop product's `image` |
| `category` | the shop product's `category` |
| `size` | the variant's `size` (`false` means the product has no size attribute — written as an empty column, not the literal word `false`) |
| `colour` | the variant's `color` (same `false` handling as `size`) |
| `stock_status` | the variant's `availability`, mapped through [Concepts: Availability](../concepts.md#availability) |

`stock_status` collapses the four states from
[Concepts: Availability](../concepts.md#availability) into three plain values: `in_stock`
(in stock, or in stock with a known quantity), `out_of_stock`, and `expected` (expected
back on a date — the date itself isn't in this CSV; add your own column if you need it
displayed).

## `catalog-to-csv.js`

A complete script — nothing beyond Node's built-in `fs` module. Save it as
`catalog-to-csv.js` next to `catalog.json` and run `node catalog-to-csv.js`.

```js
'use strict';
// Convert catalog.json into catalog.csv for a hosted shop's CSV import.
const fs = require('fs');

const HEADER = ['name', 'sku', 'gtin', 'price', 'currency', 'image', 'category', 'size', 'colour', 'stock_status'];

function csvField(value) {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function stockStatus(a) {
    if (a === 'Yes') return 'in_stock';
    if (a === 'No') return 'out_of_stock';
    if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(a)) return 'expected';
    if (/^\d+\+?$/.test(String(a))) return 'in_stock';
    return '';
}

function orFalse(value) {
    // false means "no size/colour attribute on this product" - write it as an empty
    // column, not the literal word "false".
    return value === false ? '' : value;
}

const catalog = JSON.parse(fs.readFileSync('catalog.json', 'utf8'));
const rows = [HEADER];
for (const product of catalog) {
    for (const v of product.variants) {
        // A variant's own price/currency/image can differ from the rest of its shop
        // product (see Recipe: sync your catalog); fall back to the group-level value
        // only when the variant doesn't carry its own.
        rows.push([product.name, v.articleno, v.gtin, v.price ?? product.price,
            v.currency ?? product.currency, v.image ?? product.image, product.category,
            orFalse(v.size), orFalse(v.color), stockStatus(v.availability)]);
    }
}

fs.writeFileSync('catalog.csv', rows.map((r) => r.map(csvField).join(',')).join('\n') + '\n');
console.log(`Wrote catalog.csv with ${rows.length - 1} rows`);
```

`csvField` quotes any value that contains a comma, a double quote or a newline, and
doubles up any `"` inside it (`He said "go"` becomes `"He said ""go"""`) — the same
escaping rule spreadsheet software and every hosted shop's CSV importer expects.
`stockStatus` reuses the same four cases as
[Concepts: Availability](../concepts.md#availability)'s `shopAvailability()`, just
returning the plain string this CSV layout needs instead of an object.

Run live against a real `catalog.json` (one brand, 321 shop products, 2457 variants), this
produced a header line plus one row per variant — including two rows below for the same
shop product (`G4z Stockingfoot - NEW`) whose `price` genuinely differs by size, XS at
14999 NOK versus 4XL at 16490 NOK, exactly the kind of per-variant difference described in
[Recipe: sync your catalog](../recipes/sync-catalog.md#what-you-get):

```
name,sku,gtin,price,currency,image,category,size,colour,stock_status
G4z Stockingfoot - NEW,13960-096-10,694264648223,14999,NOK,https://dealer.flyfisheurope.com/400x/dealerweb-cms-4ac14e46-5122-41d9-94f2-1c64b7fc2227.jpg,Waders / G4Z Stockingfoot NEW,XS,Slate,in_stock
G4z Stockingfoot - NEW,13960-096-80,694264648438,16490,NOK,https://dealer.flyfisheurope.com/400x/dealerweb-cms-4ac14e46-5122-41d9-94f2-1c64b7fc2227.jpg,Waders / G4Z Stockingfoot NEW,4XL,Slate,out_of_stock
```

`Wrote catalog.csv with 2457 rows` matched the 2457 variants in that brand's `catalog.json`
exactly, every `stock_status` value came back as one of `in_stock`, `out_of_stock` or
`expected` — none were left blank — and 11 of the 321 shop products in this run had at
least one variant whose row `price` differed from its siblings, confirming the per-variant
`price` (not one flat price per shop product) actually reached the CSV.

## Shopify

Shopify Stores import products from a CSV file with a fixed column layout of its own,
different from the one above — see the
[Shopify Help Center: Import and export products](https://help.shopify.com/en/manual/products/import-export/import-products)
for the current column names and how to map fields like `sku`, `price` and `image` onto
them.

## Wix

Wix Stores imports and exports products as a CSV file from the store dashboard — see
[Wix Help Center: Exporting and Importing Your Products](https://support.wix.com/en/article/wix-stores-updating-products-by-exporting-and-importing-them)
for the current column names and format.

## Where next

- [Recipe: sync your catalog](../recipes/sync-catalog.md) — build `catalog.json` first.
- [Recipe: keep content updated](../recipes/keep-content-updated.md) and
  [Recipe: stock and price lookup](../recipes/stock-and-price-lookup.md) — the same
  `catalog.json` this script reads is also what those recipes refresh; re-run
  `catalog-to-csv.js` after either one if you want the CSV to reflect the update.
- [WooCommerce](./woocommerce.md), [PrestaShop](./prestashop.md), [Magento](./magento.md) —
  if you do have code access to your platform, these cover calling its API directly
  instead of a CSV upload.
