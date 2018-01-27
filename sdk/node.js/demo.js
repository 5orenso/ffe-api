const FFE = require('ffe-api-sdk');
const ffe = new FFE('<your ffe token>');

ffe.products({ limit: 20, brand: 'simms' })
    .then((result) => {
        console.log(result);
    })
    .catch((error) => {
        console.error(error);
    });
