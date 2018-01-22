'use strict';

const FFE = require('./ffe');
const ffe = new FFE('<your ffe token>');

Promise.all([
    ffe.products({ limit: 1, brand: 'scott' }),
    ffe.products({ limit: 1, brand: 'c&f' }),
    ffe.product('10443-233-20'),
    ffe.categories({ brand: 'scott' }),
    ffe.categories({ brand: 'c&f' }),
    ffe.category(101),
])
    .then((result) => {
        console.log(result);
    })
    .catch((error) => {
        console.error(error);
    });
