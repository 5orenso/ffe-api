# Flyfish Europe Dealer API

The Flyfish Europe Dealer API is a JSON REST API for dealers with access to our
DealerWeb. It gives you our brands, categories and products (plus your own basket),
so you can integrate our catalog into your web shop or point-of-sale system. You
create an API token in DealerWeb under **My Account**, at
[dealer.flyfisheurope.com](https://dealer.flyfisheurope.com/), before making your
first call.


## Your first product in 10 minutes

1. **Get a token.** In DealerWeb, under **My Account**, create a **server-side
   token** for code that runs on your own server, or a **client-side token** for
   JavaScript that runs in a customer's browser. Keep server-side tokens secret —
   anyone who has one can read your data with it.

2. **Make one request.**

    ```bash
    curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/brands/'
    ```

3. **Or use an SDK.**

    ```bash
    npm install @flyfisheurope/ffe-api-sdk --save
    ```
    ```javascript
    const FFE = require('@flyfisheurope/ffe-api-sdk');

    // FFE_TOKEN holds your DealerWeb API token.
    const ffe = new FFE(process.env.FFE_TOKEN);

    ffe.brands()
        .then((brands) => console.log(brands))
        .catch((error) => console.error(error));
    ```
    ```php
    <?php
    require 'ffe.php';

    // FFE_TOKEN holds your DealerWeb API token.
    $ffe = new FFE(getenv('FFE_TOKEN'));

    $result = $ffe->brands();
    print_r($result);
    ```

Full walkthrough — including fetching a single product by `articleno` — in
[Getting started](docs/getting-started.md).


## Learning path

1. [Getting started](docs/getting-started.md) — your first product in curl, Node.js
   and PHP, in about 10 minutes.
2. [Concepts](docs/concepts.md) — the data model: variants, availability, images,
   prices, pagination, rate limiting.
3. **Recipes** — complete, runnable scripts:
   - [Sync your catalog](docs/recipes/sync-catalog.md)
   - [Keep content updated](docs/recipes/keep-content-updated.md)
   - [Stock and price lookup](docs/recipes/stock-and-price-lookup.md)
   - [Ordering with baskets](docs/recipes/ordering-with-baskets.md)
4. **Platforms** — wiring a sync script into your shop:
   - [PHP](docs/platforms/php.md)
   - [Node.js](docs/platforms/nodejs.md)
   - [Browser](docs/platforms/browser.md)
   - [WooCommerce](docs/platforms/woocommerce.md)
   - [PrestaShop](docs/platforms/prestashop.md)
   - [Magento](docs/platforms/magento.md)
   - [Hosted shops (Shopify, Wix, and similar)](docs/platforms/hosted-shops.md)
   - [Other languages](docs/platforms/other-languages.md)
5. **Reference** — every endpoint, generated from [openapi.yaml](openapi.yaml):
   - [/login/](docs/reference/login.md)
   - [/api/brands/](docs/reference/brands.md)
   - [/api/categories/](docs/reference/categories.md)
   - [/api/products/](docs/reference/products.md)
   - [/api/baskets/](docs/reference/baskets.md)
   - [/api/dealers/info](docs/reference/dealers.md)
   - [/api/pos/sales/](docs/reference/pos-sales.md)
   - [/api/pos/products/](docs/reference/pos-products.md)
   - Prefer Postman? Import
     [postman/ffe-api.postman_collection.json](postman/ffe-api.postman_collection.json)
     and set the `token` variable.
6. [Errors](docs/errors.md) — every HTTP status the API is verified to return, the
   exact body, and what to do about it.
7. [Troubleshooting](docs/troubleshooting.md) — symptom-first fixes for the problems
   developers hit most often.
8. [FAQ](docs/faq.md) — short answers to the questions that come up most.


## SDKs

- [Node.js](sdk/node.js/) — published on npm as `@flyfisheurope/ffe-api-sdk`.
  ```bash
  npm install @flyfisheurope/ffe-api-sdk --save
  ```
- [PHP](sdk/php/) — one dependency-free file, `ffe.php` (PHP >= 5.4 with curl).
- [Browser JavaScript](sdk/javascript/) — demo client for a web page, not a
  general-purpose SDK.
- [Recipe scripts](example/recipes/) — runnable copies of every recipe script (Node.js and PHP).


## Authentication

Every request sends your token in the `Authorization` header:

```
Authorization: Bearer <your jwt token>
```

You create tokens in DealerWeb under **My Account**. There are two kinds:

- __Server-side token__ — use it only in code that runs on your own server, where no
  one but you has access. Keep it secret.
- __Client-side token__ — safe to embed in client-side code, such as a JavaScript
  component on a web page.


## HTTP status codes and rate limits

The API uses standard HTTP status codes. What's verified today:

- __200__ on every successful call — including a call for an id that doesn't exist,
  which comes back as 200 with `{}` rather than 404.
- __201__ on `PATCH /api/baskets/` (`setBasketLine`), for every add, update or remove of
  a basket line: `{"status":201,"message":"Basket update","data":{...,"id":<numeric
  product id or null>}}`. A `201` doesn't guarantee the write persisted — check
  `data.id` is not `null` and confirm with `GET /api/baskets/`; see
  [docs/reference/baskets.md](docs/reference/baskets.md).
- __400__ on an unsupported method/path under `/api/baskets/`, e.g. every observed
  `POST /api/baskets/`: `{"error":"No such route","status":400}`. Use `PATCH`, not
  `POST`.
- __401__ on a malformed or invalid token: `{"status":401,"message":"Invalid
  JwtToken: UnauthorizedError","reason":"jwt malformed"}`. An expired token has not
  been observed.
- __403__ when the `Authorization` header is missing entirely (observed 2026-09-10 on
  `/api/brands/`): `{"status":403,"message":"Forbidden! No access to this
  endpoint!"}`.
- __504__ on every observed call to `/api/products/?unique=true`; don't send
  `unique=true` today.
- __429__ is reserved for rate limiting ("Too many requests"), but rate limiting is
  not active yet, so it has not been observed.

Full table, bodies and what to do about each one: [Errors](docs/errors.md).


## Support

Questions, issues or feedback go through DealerWeb.

- [Consumer web](https://flyfisheurope.com/)
- [Dealer web](https://dealer.flyfisheurope.com/)
