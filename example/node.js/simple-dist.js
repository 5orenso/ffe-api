'use strict';

// Run with:  FFE_TOKEN=<your token> node simple-dist.js
// When installed from npm use: const FFE = require('@flyfisheurope/ffe-api-sdk');
const FFE = require('../../sdk/node.js/ffe');

const token = process.env.FFE_TOKEN;
if (!token) {
    console.error('Set FFE_TOKEN to your DealerWeb API token first.');
    process.exit(1);
}
const ffe = new FFE(token);

Promise.all([
    ffe.brands(),
    ffe.products({ limit: 1, brand: 'simms' }),
    ffe.product('1113000'),
    ffe.categories({ brand: 'simms', level: 'main' }),
    ffe.category(101),
])
    .then((result) => {
        console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
