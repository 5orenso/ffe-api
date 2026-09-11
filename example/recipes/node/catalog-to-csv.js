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
