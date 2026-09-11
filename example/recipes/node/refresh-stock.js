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
