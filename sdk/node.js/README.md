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
    Get a specific brand.
    ```javascript
        ffe.brand('simms')
            .then((brand) => {
                console.log(brand);
            });
    ```
- brands()
    Get a list of brands.
    ```javascript
        ffe.brands()
            .then((brands) => {
                console.log(brands);
            });
    ```
- category(<categoryno>)
- categories()
- product(<productno>)
- products()
