'use strict';
// Live demo: add, update and remove one basket line, then confirm the
// basket matches how it started.
// Run: FFE_TOKEN=<your token> node basket-demo.js <numeric product id>
const FFE = require('@flyfisheurope/ffe-api-sdk');

const token = process.env.FFE_TOKEN;
if (!token) { console.error('Set FFE_TOKEN first.'); process.exit(1); }
const id = Number(process.argv[2]);
if (!Number.isFinite(id)) {
    console.error('Usage: FFE_TOKEN=<token> node basket-demo.js <numeric product id>');
    process.exit(1);
}
const ffe = new FFE(token);

(async () => {
    const before = await ffe.baskets();
    console.log('Basket before:', JSON.stringify(before));

    const added = await ffe.setBasketLine({ id, qty: 1 });
    console.log('setBasketLine qty 1 ->', JSON.stringify(added));
    const afterAdd = await ffe.baskets();
    console.log('Basket after adding qty 1:', JSON.stringify(afterAdd));

    const updated = await ffe.setBasketLine({ id, qty: 2 });
    console.log('setBasketLine qty 2 ->', JSON.stringify(updated));
    const afterUpdate = await ffe.baskets();
    console.log('Basket after updating to qty 2:', JSON.stringify(afterUpdate));

    const removed = await ffe.setBasketLine({ id, qty: 0 });
    console.log('setBasketLine qty 0 ->', JSON.stringify(removed));
    const after = await ffe.baskets();
    console.log('Basket after removing:', JSON.stringify(after));

    const restored = JSON.stringify(before) === JSON.stringify(after);
    console.log(restored ? 'Basket restored: YES' : 'Basket restored: NO');
    if (!restored) process.exit(1);
})().catch((err) => { console.error(err); process.exit(1); });
