# FFE API SDK - PHP

Flyfish Europe Dealer API SDK for PHP (>= 5.4, curl extension). One file, no
dependencies.

## Install

Copy `ffe.php` into your project and `require` it, or add this repository as a
Composer path repository:

```json
{
    "repositories": [
        { "type": "path", "url": "path/to/ffe-api/sdk/php" }
    ],
    "require": { "ffe/api": "*" }
}
```

## Usage

```php
<?php
require 'ffe.php';
$ffe = new FFE(getenv('FFE_TOKEN'));

try {
    $products = $ffe->products((object) ['brand' => 'simms', 'limit' => 20]);
    foreach ($products as $product) {
        echo $product['name'], "\n";
    }
} catch (Exception $e) {
    echo 'API error: ', $e->getMessage(), "\n";
}
```

Methods return associative arrays for any 2xx response (200, 201, ...). Any
other response or connection problem throws an `Exception` (`Not authorized`
for 401), so wrap calls in `try/catch`. `lastCurlInfo()` returns
`curl_getinfo()` for the last request when debugging.

## Constructor

```php
new FFE($token, $options)
```

`$options` is an object with optional `hostname` (default `dealer.flyfisheurope.com`),
`port` (443), `https` (1) and `debug` (0, set to 1 to echo requests and responses).

## Methods

| Method | Endpoint | Notes |
|--------|----------|-------|
| `login($email, $pass)` | `POST /login/` | On success the instance switches to the returned `apiToken`. Not yet verified against the live API (PHP sends a form-encoded body); see [docs/reference/login.md](../../docs/reference/login.md). |
| `brands()` | `GET /api/brands/` | |
| `brand($brandno)` | `GET /api/brands/:brandno` | |
| `categories($opt)` | `GET /api/categories/` | `$opt` object or array: `limit`, `offset`, `brand`, `level`, `parent` |
| `category($categoryno)` | `GET /api/categories/:categoryno` | |
| `products($opt)` | `GET /api/products/` | `$opt` object or array: `limit`, `offset`, `brand`, `maingroup`, `intgroup`, `subgroup`, `mainCat`, `intCat`, `subCat`, `gtin`, `articleNoIn`, `search`, `nameDisplay`, `unique`, `isNew` (`unique` is currently unreliable on the live API; see [docs/reference/products.md](../../docs/reference/products.md)) |
| `product($articleno)` | `GET /api/products/:articleno` | |
| `baskets($opt)` | `GET /api/baskets/` | `$opt` object or array: `presale` |
| `setBasketLine($id, $qty)` | `PATCH /api/baskets/` | `$id` must be the numeric product `id` from `products()`/`product()` (not `articleno`); `$qty` 0 removes the line, any other value upserts it in place. Throws `InvalidArgumentException` if `$id` isn't a positive integer (or digit-only string) or `$qty` isn't a non-negative integer (or digit-only string) — this catches, for example, passing an `articleno` string straight through, which `(int)` casting would otherwise silently truncate to the wrong id. Always confirm the result with `baskets()` — see [docs/reference/baskets.md](../../docs/reference/baskets.md). |
| `dealerInfo()` | `GET /api/dealers/info` | |
| `posAddSale`, `posSales`, `posAddProduct`, `posEditProduct`, `posProducts` | `/api/pos/*` | Not implemented; throw `Exception('Not implemented')` |

Full parameter and response documentation: [docs/reference](../../docs/reference/).
