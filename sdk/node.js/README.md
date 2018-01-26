# FFE API SDK - Node.js

Flyfish Europe REST API SDK for Node.js

## Getting started

Install library:
```bash
$ npm install ffe-api-sdk --save
```

Example code usage:
```javascript
const FFE = require('ffe-api-sdk');
const ffe = new FFE('<your ffe token>');

ffe.products({ limit: 20, brand: 'simms' })
    .then((result) => {
        console.log(result);
    })
    .catch((error) => {
        console.error(error);
    });
```

That's it!


## Methods

- brand(&lt;brandno&gt;)
    ```javascript
    // Get a specific brand.
    ffe.brand('simms')
        .then((brand) => {
            console.log(brand);
        });
    ```
- brands()
    ```javascript
    // Get a list of brands.
    ffe.brands()
        .then((brands) => {
            console.log(brands);
        });
    ```
- category(&lt;catgeoryno&gt;)
    ```javascript
    // Get a specific brand.
    ffe.category(1004)
        .then((category) => {
            console.log(category);
        });
    ```
- categories()
    ```javascript
    // Get a list of brands.
    ffe.categories()
        .then((categories) => {
            console.log(categories);
        });
    ```
- product(&lt;productno&gt;)
    ```javascript
    // Get a specific brand.
    ffe.product('11446-031-07')
        .then((product) => {
            console.log(product);
        });
    ```
- products()
    ```javascript
    // Get a list of brands.
    ffe.products()
        .then((products) => {
            console.log(products);
        });
    ```
