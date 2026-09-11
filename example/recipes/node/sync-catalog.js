'use strict';
// Sync the Flyfish Europe catalog into catalog.json.
// Run: FFE_TOKEN=<server-side token> node sync-catalog.js
// Optional: pass one brandno to sync only that brand, e.g. node sync-catalog.js simms
const fs = require('fs');
const FFE = require('@flyfisheurope/ffe-api-sdk');

const token = process.env.FFE_TOKEN;
if (!token) { console.error('Set FFE_TOKEN first.'); process.exit(1); }
const ffe = new FFE(token);
const PAGE = 200;
const onlyBrand = process.argv[2];

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
            id: p.id,
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
        if (onlyBrand && brand.brandno !== onlyBrand) continue;
        const products = await allProducts(brand.brandno);
        const grouped = groupVariants(products);
        console.log(`${brand.name}: ${products.length} variants -> ${grouped.length} products`);
        catalog.push(...grouped);
    }
    if (onlyBrand && catalog.length === 0) {
        console.error(`No brand with brandno "${onlyBrand}". Run without an argument to list every brand.`);
        process.exit(1);
    }
    fs.writeFileSync('catalog.json', JSON.stringify(catalog, null, 2));
    console.log(`Wrote catalog.json with ${catalog.length} products`);
})().catch((err) => { console.error(err); process.exit(1); });
