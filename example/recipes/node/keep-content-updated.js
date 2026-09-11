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
