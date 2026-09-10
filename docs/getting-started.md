# Getting started

This guide takes you from zero to your first product JSON in about 10 minutes. It assumes
you can run a `curl` command and, optionally, a small Node.js or PHP script.

## What you will have in 10 minutes

By the end of this page you will have made the same request three ways — with `curl`,
with the Node.js SDK, and with the PHP SDK — and seen one real product's JSON on your
screen each time.

## Step 1 — Create a token

Every request to the API needs a token. You create one in DealerWeb, under **My Account**,
at [dealer.flyfisheurope.com](https://dealer.flyfisheurope.com/).

There are two kinds of token:

- **Server-side token** — treat it as a secret: anyone who has it can read your data. Use
  it only in code that runs on your own server (a sync script, a backend job). Never put
  it in a web page.
- **Client-side token** — safe to embed in JavaScript that runs in a customer's browser.

For syncing your shop's catalog, use a **server-side token**. The rest of this guide uses
`<your token>` as a placeholder for it — replace it with the real value everywhere you see it.

## Step 2 — Your first request with curl

Run this, with your own token in place of `<your token>`:

```bash
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/brands/'
```

A good response is a JSON array of brand objects. The first two look like this:

```json
[
  {
    "id": 2,
    "brandno": "simms",
    "sort": 10,
    "name": "Simms",
    "fullName": "Simms",
    "count": 2457
  },
  {
    "id": 68,
    "brandno": "ahrex",
    "sort": 15,
    "name": "Ahrex",
    "fullName": "Ahrex",
    "count": 597
  }
]
```

A bad response depends on what's actually wrong. A malformed or invalid token gets you
HTTP 401:

```json
{
  "status": 401,
  "message": "Invalid JwtToken: UnauthorizedError",
  "reason": "jwt malformed"
}
```

Leaving the `Authorization` header off the request entirely gets you a different status,
HTTP 403 — observed 2026-09-10 on `/api/brands/`:

```json
{
  "status": 403,
  "message": "Forbidden! No access to this endpoint!"
}
```

An expired token hasn't been observed, so its exact status isn't confirmed either way —
see [Errors](./errors.md#status-codes).

The one-line fix: check that your `Authorization` header is present and exactly
`Bearer <your token>` (the word `Bearer`, one space, then the token, no quotes and no
line breaks).

## Step 3 — The same call from code

### Node.js

Install the SDK:

```bash
npm install @flyfisheurope/ffe-api-sdk --save
```

Save this as `first.js`. It reads your token from the `FFE_TOKEN` environment variable, so
the token itself never has to be typed into the file:

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');

// FFE_TOKEN holds your DealerWeb API token.
const ffe = new FFE(process.env.FFE_TOKEN);

ffe.brands()
    .then((brands) => console.log(brands))
    .catch((error) => console.error(error));
```

Run it:

```bash
FFE_TOKEN=<your token> node first.js
```

### PHP

Copy [`sdk/php/ffe.php`](../sdk/php/ffe.php) from this repository into your project (there
is no package registry install step — see [sdk/php/README.md](../sdk/php/README.md) for
the alternative Composer path-repository setup). Save this as `first.php` next to it:

```php
<?php
require 'ffe.php';

// FFE_TOKEN holds your DealerWeb API token.
$ffe = new FFE(getenv('FFE_TOKEN'));

$result = $ffe->brands();
print_r($result);
```

Run it:

```bash
FFE_TOKEN=<your token> php first.php
```

Both scripts print the same brand list you saw with `curl` in Step 2.

## Step 4 — Fetch one product

A product listing returns many items at once. Most integrations also need to fetch a
single, known product — for example to refresh stock and price for one article. Every
product is identified by its `articleno`.

**Node.js**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE(process.env.FFE_TOKEN);

ffe.product('1113000')
    .then((product) => console.log(product))
    .catch((error) => console.error(error));
```

**PHP**

```php
<?php
require 'ffe.php';
$ffe = new FFE(getenv('FFE_TOKEN'));

$result = $ffe->product('1113000');
print_r($result);
```

`articleno` `1113000` is a C&F article used to verify this page's examples; it exists in
the catalog this guide was written against, but your dealer account only sees the brands
you have access to, so you may get `{}` back for it instead — see
[Troubleshooting: I get `{}` for a product](./troubleshooting.md#i-get--for-a-product) if
that happens, and use one of your own `articleno` values instead.

Both return one JSON object. The fields a shop typically cares about most are:

| Field | Meaning |
|-------|---------|
| `articleno` | The exact variant (size/colour combination) you asked for. |
| `name` / `nameDisplay` | `name` is the variant's own name and can embed the size (e.g. "Bugstopper Hoody M"); `nameDisplay` is the shared family name across every size/colour ("Bugstopper Hoody") — see [Concepts: Variants](./concepts.md#variants). |
| `brand` | The brand this product belongs to. |
| `retailPrice` / `retailCurrency` | The recommended consumer price and its currency. |
| `availability` | Stock status — see [Concepts: Availability](./concepts.md#availability). |
| `images` | URLs for the product's images at several sizes — see [Concepts: Images](./concepts.md#images). |

## Where next

- [Concepts](./concepts.md) — the data model, availability, images, prices, pagination and
  rate limits, explained once so the recipes and reference don't have to repeat them.
- [Recipes: sync your catalog](./recipes/sync-catalog.md) — a complete script that pulls
  every product into a `catalog.json` file.
- [Platform guides](./platforms/) — where a sync script fits into WooCommerce, PrestaShop,
  Magento, Node.js and other setups.
- [Reference](./reference/) — every endpoint, parameter and response, generated from the
  API specification.
