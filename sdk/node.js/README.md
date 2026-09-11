# FFE API SDK - Node.js

Flyfish Europe Dealer API SDK for Node.js. No dependencies.

## Install

```bash
npm install @flyfisheurope/ffe-api-sdk --save
```

## Usage

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE(process.env.FFE_TOKEN);

ffe.products({ limit: 20, brand: 'simms' })
    .then((products) => console.log(products))
    .catch((error) => console.error(error));
```

Every method returns a Promise that resolves with the parsed JSON from the API.
The Promise only rejects on network errors; an HTTP error such as 401 resolves
with the API's error body (`{ status: 401, message: 'Invalid JwtToken: UnauthorizedError', reason: 'jwt malformed' }`).
If the server returns something that is not JSON you get
`{ code: 500, error: 'Invalid JSON from server', message: '<raw body>', ... }`.
Always check the result before using it.

## Constructor

```javascript
new FFE(token, options)
```

| Option     | Default                     | Description |
|------------|-----------------------------|-------------|
| `hostname` | `dealer.flyfisheurope.com`  | API host |
| `port`     | `443`                       | API port |
| `https`    | `true`                      | Set to `false` to use plain http (local development only). Set `port` too (e.g. 8000); it does not change automatically. |

## Methods

| Method | Endpoint | Notes |
|--------|----------|-------|
| `login(email, pass)` | `POST /login/` | On success the instance switches to the returned `apiToken`. Not yet verified against the live API (Node sends a JSON body); see [docs/reference/login.md](../../docs/reference/login.md). |
| `brands()` | `GET /api/brands/` | |
| `brand(brandno)` | `GET /api/brands/:brandno` | |
| `categories(opt)` | `GET /api/categories/` | `opt`: `limit`, `offset`, `brand`, `level`, `parent` |
| `category(categoryno)` | `GET /api/categories/:categoryno` | |
| `products(opt)` | `GET /api/products/` | `opt`: `limit`, `offset`, `brand`, `maingroup`, `intgroup`, `subgroup`, `mainCat`, `intCat`, `subCat`, `gtin`, `articleNoIn`, `search`, `nameDisplay`, `unique`, `isNew` (`unique` is currently unreliable on the live API; see [docs/reference/products.md](../../docs/reference/products.md)) |
| `product(articleno)` | `GET /api/products/:articleno` | |
| `baskets(opt)` | `GET /api/baskets/` | `opt`: `presale` |
| `setBasketLine({ id, qty })` | `PATCH /api/baskets/` | `id` must be the numeric product `id` from `products()`/`product()` (not `articleno`); `qty: 0` removes the line, any other value upserts it in place. Throws `TypeError` if `id` isn't a number. Always confirm the result with `baskets()` — see [docs/reference/baskets.md](../../docs/reference/baskets.md). |
| `dealerInfo()` | `GET /api/dealers/info` | |
| `posSales(opt, { id })` | `GET /api/pos/sales/[:id]` | |
| `posAddSale(body)` | `POST /api/pos/sales/` | |
| `posProducts(opt, { id })` | `GET /api/pos/products/[:id]` | |
| `posAddProduct(body)` | `POST /api/pos/products/` | |
| `posEditProduct(body, { id })` | `PUT /api/pos/products/:id` | Returns `false` if `id` is missing |

Query options with `undefined`, `null` or `''` values are omitted from the query
string; `0` and `false` are sent.

Full parameter and response documentation: [docs/reference](../../docs/reference/).

## Development

```bash
npm test
```

Tests run against a local stub server; no token needed.
