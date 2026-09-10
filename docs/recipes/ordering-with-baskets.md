# Recipe: ordering with baskets

## Scope: what this covers (and what it doesn't)

**Reading your basket is verified and documented.** `GET /api/baskets/` returns the
dealer's current basket in DealerWeb, and this recipe shows how to fetch and print it.

**Adding lines to a basket, and placing an order, are not yet documented or verified
against the live API.** The basket's `OPTIONS` response advertises `PUT`, `PATCH`, `POST`
and `DELETE` in addition to `GET`, but none of those write methods has been tried against
the live API for this guide, and neither SDK exposes a method for them. Nothing below
describes how to call them, and you shouldn't guess at the request shape yourself.

**Place orders in DealerWeb** until write access to baskets is documented and verified.
See [FAQ: Can I place orders through the API?](../faq.md#can-i-place-orders-through-the-api)
and [What to do when write access is documented](#what-to-do-when-write-access-is-documented)
below.

## What you get

Code that reads your current basket — its lines, quantities and totals — so you can, for
example, show a customer service rep what's already in a customer's basket before they
finish the order in DealerWeb. This is a read-only recipe.

## Prerequisites

- A token in the `FFE_TOKEN` environment variable (see
  [Getting started, Step 1](../getting-started.md)).
- Node.js 18+ and `npm install @flyfisheurope/ffe-api-sdk`, **or** PHP with the curl
  extension and `sdk/php/ffe.php` copied next to the script.

## The flow

1. Call `GET /api/baskets/` (through the SDK's `baskets()` method).
2. Check whether `lines` is empty before assuming there's anything to print — an empty
   basket is a normal, common response, not an error.
3. If there are lines, print each one; otherwise say so.

## What the basket response contains

Verified live: `GET /api/baskets/` returned this for a basket with nothing in it
(`GET /api/baskets/?presale=1` returned a byte-identical response):

```json
{
  "lines": [],
  "pricelistno": 44,
  "customerno": 999999,
  "emailaddress": "customer@example.com",
  "companyName": "Your customer name",
  "qty": 0,
  "total": 0,
  "retailTotal": 0,
  "summary": {}
}
```

- `lines` — the basket's line items. See below for the (unverified) shape of a populated
  line.
- `pricelistno`, `customerno`, `emailaddress`, `companyName` — identify which dealer
  account and price list the basket belongs to.
- `qty` — total quantity across all lines.
- `total` — the dealer (wholesale) total. This is your own cost figure, not a customer
  price — see [Concepts: Prices](../concepts.md#prices).
- `retailTotal` — the retail total. Use this one if you show a total to a customer.
- `summary` — empty on an empty basket; its shape with a populated basket wasn't observed.

Because the test basket used to verify this page was empty, **the shape of a populated
line (`BasketLine`) is not verified live.** It's documented in
[docs/reference/baskets.md](../reference/baskets.md) from the previous version of these
docs, and carries fields you'd expect — `id`, `name`, `qty`, `currency`, `price`
(dealer price per unit), `retailPrice`, `total`, `date`, and a nested `object` holding the
full product — but treat the exact field names as provisional until someone verifies them
against a basket that actually has lines in it.

## Node.js script

Save this as `read-basket.js`.

```javascript
'use strict';
// Read your current basket and print its lines.
// Run: FFE_TOKEN=<your token> node read-basket.js
const FFE = require('@flyfisheurope/ffe-api-sdk');

const token = process.env.FFE_TOKEN;
if (!token) { console.error('Set FFE_TOKEN first.'); process.exit(1); }
const ffe = new FFE(token);

ffe.baskets()
    .then((basket) => {
        if (!basket.lines || basket.lines.length === 0) {
            console.log('Basket is empty.');
            return;
        }
        for (const line of basket.lines) {
            console.log(`${line.qty} x ${line.name} - ${line.retailPrice} per unit`);
        }
        console.log(`Total items: ${basket.qty}, retail total: ${basket.retailTotal}`);
    })
    .catch((error) => console.error(error));
```

Run live, against a basket with nothing in it, this printed:

```
Basket is empty.
```

The `for` loop that prints each line did not run in this test, since the basket was
empty — see [Scope](#scope-what-this-covers-and-what-it-doesnt) above for why the line
shape isn't independently verified.

Run it:

```bash
FFE_TOKEN=<your token> node read-basket.js
```

## PHP script

Save this as `read-basket.php`, next to `ffe.php`.

```php
<?php
// Read your current basket and print its lines.
// Run: FFE_TOKEN=<your token> php read-basket.php
require 'ffe.php';

$token = getenv('FFE_TOKEN');
if (!$token) {
    fwrite(STDERR, "Set FFE_TOKEN first.\n");
    exit(1);
}
$ffe = new FFE($token);

try {
    $basket = $ffe->baskets();
    if (empty($basket['lines'])) {
        echo "Basket is empty.\n";
    } else {
        foreach ($basket['lines'] as $line) {
            echo $line['qty'], ' x ', $line['name'], ' - ', $line['retailPrice'], " per unit\n";
        }
        echo 'Total items: ', $basket['qty'], ', retail total: ', $basket['retailTotal'], "\n";
    }
} catch (Exception $e) {
    fwrite(STDERR, 'API error: ' . $e->getMessage() . "\n");
    exit(1);
}
```

Run it:

```bash
FFE_TOKEN=<your token> php read-basket.php
```

## The `presale` parameter

`GET /api/baskets/` accepts `?presale=1` to enable pre-season mode. In testing, this made
no observable difference — the response with `presale=1` was byte-identical to the one
without it, for the same (empty) test basket. Because of that, the scripts above call
`baskets()` plainly, with no `presale` argument, by default. It may still matter for a
dealer account that actually uses pre-season ordering — pass it explicitly to compare the
two responses for your own account:

```javascript
ffe.baskets({ presale: 1 }).then((basket) => console.log(basket));
```

```php
$basket = $ffe->baskets((object) ['presale' => 1]);
```

## What to do when write access is documented

Adding basket lines and placing orders through the API aren't ruled out — they're simply
not confirmed yet. When that changes, it will show up as new content on
[docs/reference/baskets.md](../reference/baskets.md) (new operations beyond
`GET /api/baskets/`, with request/response examples, once `openapi.yaml` marks them
verified against the live API) and a corresponding SDK method (`ffe.baskets(...)` growing
a write mode, or a new method alongside it) in both SDK READMEs. Check that reference page, or ask Flyfish
Europe through DealerWeb, before writing your own request against the advertised
`PUT`/`PATCH`/`POST`/`DELETE` methods — an unverified write call can succeed against the
wrong shape and silently create bad data in your dealer account.

## Common mistakes

- **Treating an empty `lines` array as an error.** An empty basket is the normal state
  between orders, not a failure — check `lines.length` before assuming something broke.
- **Showing `total` to a customer.** `total` is the dealer (wholesale) total; `retailTotal`
  is the one a customer should see — the same distinction as `dealerPrice` versus
  `retailPrice` on a product, see [Concepts: Prices](../concepts.md#prices).
- **Assuming a top-level `currency` field.** An earlier version of this documentation
  showed one on the basket response; it did not appear in the verified (empty) response
  above and hasn't been confirmed live. Don't rely on it without checking your own
  account's response first.
- **Trying to add lines or place an order through the SDK.** Neither SDK has a method for
  it, and guessing at the raw HTTP call is exactly what this recipe tells you not to do —
  see [Scope](#scope-what-this-covers-and-what-it-doesnt) above. Use DealerWeb.
