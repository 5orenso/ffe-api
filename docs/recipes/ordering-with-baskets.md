# Recipe: ordering with baskets

## Scope: what this covers (and what it doesn't)

**Reading, adding, updating and removing basket lines are all verified against the live
API.** `GET /api/baskets/` reads the dealer's current basket in DealerWeb, and
`PATCH /api/baskets/` (`setBasketLine` in both SDKs) adds, updates or removes one line —
verified live 2026-09-10 across two independent runs (see
[docs/reference/baskets.md](../reference/baskets.md) and the live run further down this
page).

**Placing the order itself is not part of this API.** No API call that places, checks
out or confirms an order was found or tried — the basket write spike deliberately stayed
inside `/api/baskets/`; nothing under `/api/pos/` or any order/checkout/confirm-shaped
path was called. Once a customer's basket has what you want in it, finish the order in
DealerWeb. See
[FAQ: Can I place orders through the API?](../faq.md#can-i-place-orders-through-the-api).

## What you get

Code that reads a basket, and code that adds, updates and removes one line in it —
enough to build things like "add this product to the customer's basket from our shop" or
"clear this line before I hand off to DealerWeb to finish the order." Every example below
writes to and then restores the same basket it started with, so it's safe to run against
your own account.

## Prerequisites

- A **server-side** token in the `FFE_TOKEN` environment variable (see
  [Getting started, Step 1](../getting-started.md)) — the write scripts below change your
  own basket, so keep the token off any web page.
- Node.js 18+ and `npm install @flyfisheurope/ffe-api-sdk`, **or** PHP with the curl
  extension and `sdk/php/ffe.php` copied next to the script.
- The numeric product **`id`** you want to add — not the `articleno` string. Get it from
  a `catalog.json` built by the [sync catalog recipe](./sync-catalog.md) (`variants[].id`)
  or from a live lookup, e.g. `GET /api/products/?articleNoIn=<articleno>` and read `id`
  off the one result. See [Common mistakes](#common-mistakes) below for what happens if
  you send `articleno` instead.

## The flow

1. Find the product's numeric `id` (see Prerequisites above) — this is the only field
   `PATCH /api/baskets/` accepts to identify a product; `articleno` and `productNo` are
   silently ignored.
2. Call `setBasketLine({ id, qty: 1 })` (Node) / `setBasketLine($id, 1)` (PHP) to add the
   line.
3. Confirm with `baskets()` / `baskets($opt)` — check that a line with that `id` exists
   in `lines[]` and its `qty` matches what you sent. Don't trust the `PATCH` response's
   status code alone; see [What the write actually does](#what-the-write-actually-does).
4. To change the quantity, call `setBasketLine` again with the same `id` and a new `qty`
   — it updates the existing line in place, it does not add a duplicate.
5. To remove the line, call `setBasketLine` again with `qty: 0`.
6. Finish the order in DealerWeb — that step is outside this API.

## What the write actually does

Verified live on 2026-09-10; the run below is the evidence:

- **The body field is the numeric product `id`, not `articleno`.** `PATCH /api/baskets/`
  with `{"id": 613599, "qty": 1}` adds/updates/removes the line for that product.
  Sending `{"articleno": "13960-096-10", "qty": 1}` or `{"productNo": "...", "qty": 1}`
  instead still returns a `201` that looks successful, but it's a silent no-op:
  `data.id` stays `null` and nothing is persisted. This is the single most important
  thing to get right — see [Common mistakes](#common-mistakes).
- **`qty: 0` removes the line; any other `qty` upserts it in place.** Sending the same
  call again with a different `qty` for an `id` already in the basket updates that one
  line rather than creating a duplicate. Add, update and remove are all the same call.
- **Only `PATCH` works.** `POST /api/baskets/` (any body, any encoding) returns
  `400 {"error":"No such route","status":400}`. `PUT /api/baskets/` returns a deceptive
  `201 {"status":201,"message":"Basket updated"}` **without changing anything** — a naive
  integration that only checks the status code would believe this succeeded. Use `PATCH`.
- **The CORS header is not a route inventory.** `OPTIONS /api/baskets/`'s
  `Access-Control-Allow-Methods` header lists `POST`, but the plain `Allow` header (and
  the route's actual behaviour) does not — there is no `POST` route.

## Node.js script

Save this as `basket-demo.js`. The same file is in this repository at
[example/recipes/node/basket-demo.js](../../example/recipes/node/basket-demo.js).

<!-- recipe: example/recipes/node/basket-demo.js -->
```javascript
'use strict';
// Live demo: add, update and remove one basket line, then confirm the
// basket matches how it started.
// Run: FFE_TOKEN=<your token> node basket-demo.js <numeric product id>
const FFE = require('@flyfisheurope/ffe-api-sdk');

const token = process.env.FFE_TOKEN;
if (!token) { console.error('Set FFE_TOKEN first.'); process.exit(1); }
const id = Number(process.argv[2]);
if (!Number.isFinite(id)) {
    console.error('Usage: FFE_TOKEN=<token> node basket-demo.js <numeric product id>');
    process.exit(1);
}
const ffe = new FFE(token);

(async () => {
    const before = await ffe.baskets();
    console.log('Basket before:', JSON.stringify(before));

    const added = await ffe.setBasketLine({ id, qty: 1 });
    console.log('setBasketLine qty 1 ->', JSON.stringify(added));
    const afterAdd = await ffe.baskets();
    console.log('Basket after adding qty 1:', JSON.stringify(afterAdd));

    const updated = await ffe.setBasketLine({ id, qty: 2 });
    console.log('setBasketLine qty 2 ->', JSON.stringify(updated));
    const afterUpdate = await ffe.baskets();
    console.log('Basket after updating to qty 2:', JSON.stringify(afterUpdate));

    const removed = await ffe.setBasketLine({ id, qty: 0 });
    console.log('setBasketLine qty 0 ->', JSON.stringify(removed));
    const after = await ffe.baskets();
    console.log('Basket after removing:', JSON.stringify(after));

    const restored = JSON.stringify(before) === JSON.stringify(after);
    console.log(restored ? 'Basket restored: YES' : 'Basket restored: NO');
    if (!restored) process.exit(1);
})().catch((err) => { console.error(err); process.exit(1); });
```

Run it:

```bash
FFE_TOKEN=<your token> node basket-demo.js <numeric product id>
```

### Run live

Run live 2026-09-10 against product id `613599` (the same article used in the write
spike, `13960-096-10`, a Simms G4Z Stockingfoot Slate XS). Output below is the script's
actual console output, sanitized: `<EMAIL>`, `<COMPANY>` and `<CUSTNO>` replace the
account's real email, company name and customer number (no token appears in the script's
output or anywhere in this repository), and each line's embedded `object` field (a full
denormalized product snapshot, hundreds of fields) is collapsed to `"object": "(full
product snapshot, omitted here for length)"` for readability — the exact shape of that
field is in the `BasketLine` schema in [openapi.yaml](../../openapi.yaml).

```
Basket before: {"lines":[],"pricelistno":44,"customerno":<CUSTNO>,"emailaddress":"<EMAIL>","companyName":"<COMPANY>","qty":0,"total":0,"retailTotal":0,"summary":{}}
setBasketLine qty 1 -> {"status":201,"message":"Basket update","data":{"qty":1,"price":null,"retailPrice":null,"id":613599,"addedFrom":"api","addedBy":"<EMAIL>"}}
Basket after adding qty 1: {"lines":[{"currency":null,"aPrice":6599.6,"eurAPrice":712.7,"object":"(full product snapshot, omitted here for length)","discount":0,"aFullPrice":"6599.6","eurAFullPrice":"712.7","retailPrice":null,"brandno":"Simms","brand":"simms","maingroupno":101,"articleno":"13960-096-10","fullPrice":6599.6,"productName":"G4Z Stockingfoot Slate XS","date":"2026-09-10T12:39:33+02:00","productNo":null,"name":null,"qty":1,"price":6599.6,"id":613599,"addedFrom":"api","addedBy":"<EMAIL>","info":null,"total":6599.6,"eurFullPrice":712.7,"eurPrice":712.7,"eurTotal":712.7,"idx":0,"sortIdx":0}],"pricelistno":44,"customerno":<CUSTNO>,"emailaddress":"<EMAIL>","companyName":"<COMPANY>","qty":1,"total":6599.6,"retailTotal":null,"currency":"NOK","summary":{"Simms":{"total":6599.6,"categories":{"Waders":{"total":6599.6}}}}}
setBasketLine qty 2 -> {"status":201,"message":"Basket update","data":{"qty":2,"price":null,"retailPrice":null,"id":613599,"addedFrom":"api","addedBy":"<EMAIL>"}}
Basket after updating to qty 2: {"lines":[{"currency":null,"aPrice":6599.6,"eurAPrice":712.7,"object":"(full product snapshot, omitted here for length)","discount":0,"aFullPrice":"6599.6","eurAFullPrice":"712.7","retailPrice":null,"brandno":"Simms","brand":"simms","maingroupno":101,"articleno":"13960-096-10","fullPrice":13199.2,"productName":"G4Z Stockingfoot Slate XS","date":"2026-09-10T12:39:33+02:00","productNo":null,"name":null,"qty":2,"price":13199.2,"id":613599,"addedFrom":"api","addedBy":"<EMAIL>","info":null,"total":13199.2,"eurFullPrice":1425.4,"eurPrice":1425.4,"eurTotal":1425.4,"idx":0,"sortIdx":0}],"pricelistno":44,"customerno":<CUSTNO>,"emailaddress":"<EMAIL>","companyName":"<COMPANY>","qty":2,"total":13199.2,"retailTotal":null,"currency":"NOK","summary":{"Simms":{"total":13199.2,"categories":{"Waders":{"total":13199.2}}}}}
setBasketLine qty 0 -> {"status":201,"message":"Basket update","data":{"qty":0,"price":null,"retailPrice":null,"id":613599,"addedFrom":"api","addedBy":"<EMAIL>"}}
Basket after removing: {"lines":[],"pricelistno":44,"customerno":<CUSTNO>,"emailaddress":"<EMAIL>","companyName":"<COMPANY>","qty":0,"total":0,"retailTotal":0,"summary":{}}
Basket restored: YES
```

The basket at the end (`lines:[]`, `qty:0`, `total:0`, `retailTotal:0`, `summary:{}`) is
byte-for-byte identical to the basket at the start, and the script's own
before/after comparison agrees (`Basket restored: YES`, exit code `0`) — confirming the
qty-0 remove step leaves nothing behind. Two more things stand out in this output beyond
what the write spike documented, both folded into the `BasketLine` schema in
[openapi.yaml](../../openapi.yaml): `aFullPrice`/`eurAFullPrice` come back as numeric
*strings* (`"6599.6"`), not numbers, unlike every other price-shaped field on the line;
and `price`/`fullPrice`/`total` (and their `eur*` counterparts) are the line's *extended*
total (unit price × qty — 6599.6 at qty 1, 13199.2 at qty 2), not a per-unit price
despite the field name `price` — `aPrice` is the one field that stays flat at 6599.6
regardless of qty and is the true per-unit price.

## PHP script

Save this as `basket-demo.php`, next to `ffe.php`. The same file is in this repository at
[example/recipes/php/basket-demo.php](../../example/recipes/php/basket-demo.php).

<!-- recipe: example/recipes/php/basket-demo.php -->
```php
<?php
// Add, update and remove one basket line, then confirm the basket
// matches how it started.
// Run: FFE_TOKEN=<your token> php basket-demo.php <numeric product id>
require 'ffe.php';

$token = getenv('FFE_TOKEN');
if (!$token) {
    fwrite(STDERR, "Set FFE_TOKEN first.\n");
    exit(1);
}
$id = isset($argv[1]) && ctype_digit($argv[1]) ? (int) $argv[1] : 0;
if (!$id) {
    fwrite(STDERR, "Usage: FFE_TOKEN=<token> php basket-demo.php <numeric product id>\n");
    exit(1);
}
$ffe = new FFE($token);

try {
    $before = $ffe->baskets();
    echo 'Basket before: ', json_encode($before), "\n";

    $added = $ffe->setBasketLine($id, 1);
    echo 'setBasketLine qty 1 -> ', json_encode($added), "\n";
    $afterAdd = $ffe->baskets();
    echo 'Basket after adding qty 1: ', json_encode($afterAdd), "\n";

    $updated = $ffe->setBasketLine($id, 2);
    echo 'setBasketLine qty 2 -> ', json_encode($updated), "\n";
    $afterUpdate = $ffe->baskets();
    echo 'Basket after updating to qty 2: ', json_encode($afterUpdate), "\n";

    $removed = $ffe->setBasketLine($id, 0);
    echo 'setBasketLine qty 0 -> ', json_encode($removed), "\n";
    $after = $ffe->baskets();
    echo 'Basket after removing: ', json_encode($after), "\n";

    $restored = json_encode($before) === json_encode($after);
    echo $restored ? "Basket restored: YES\n" : "Basket restored: NO\n";
    if (!$restored) {
        exit(1);
    }
} catch (Exception $e) {
    fwrite(STDERR, 'API error: ' . $e->getMessage() . "\n");
    exit(1);
}
```

Run it:

```bash
FFE_TOKEN=<your token> php basket-demo.php <numeric product id>
```

`ffe.php` was updated for this recipe so its underlying `curlExec()` accepts any `2xx`
status (previously only `200`) — without that change every successful `201` from
`setBasketLine()` would have been thrown as an `Exception`. See
[sdk/php/README.md](../../sdk/php/README.md).

## What the basket response contains

`GET /api/baskets/` returns an object with `lines` (array), `pricelistno`, `customerno`,
`emailaddress`, `companyName`, `qty` (total quantity across all lines), `total` (dealer
total), `retailTotal`, `currency` and `summary`. Verified live: an empty basket has
`retailTotal: 0` and no `currency` key at all; once a line is added, `currency` becomes the
account's currency code (e.g. `"NOK"`), `retailTotal` becomes `null` for a line added
via `setBasketLine` (which never sends a retail price), and `summary` becomes dealer
totals grouped by brand and then category. See the live run above for a full example and
[docs/reference/baskets.md](../reference/baskets.md) for the complete `Basket` and
`BasketLine` schemas. The full list is under [Fields: Basket](../reference/baskets.md#fields-basket).

## The `presale` parameter

`GET /api/baskets/` accepts `?presale=1` to enable pre-season mode. In testing, this made
no observable difference — the response with `presale=1` was byte-identical to the one
without it, for the same (empty) test basket. Because of that, the read side of this
recipe calls `baskets()` plainly, with no `presale` argument, by default. It may still
matter for a dealer account that actually uses pre-season ordering — pass it explicitly
to compare the two responses for your own account:

```javascript
ffe.baskets({ presale: 1 }).then((basket) => console.log(basket));
```

```php
$basket = $ffe->baskets((object) ['presale' => 1]);
```

## Common mistakes

- **Sending `articleno` instead of the numeric `id`.** `{"articleno": "13960-096-10",
  "qty": 1}` still gets a `201` back, but it's a silent no-op — `data.id` is `null` and
  nothing is added. Always send the numeric product `id` from `products()`/`product()`
  (or your `catalog.json`'s `variants[].id`), never the `articleno` SKU string.
- **Trusting a `201` without checking `data.id`.** Both `PATCH /api/baskets/` (with a bad
  body) and `PUT /api/baskets/` (always) return `201` without actually changing the
  basket. Check `data.id` is not `null` in the `PATCH` response, and confirm with
  `GET /api/baskets/` (`baskets()`) before assuming a write succeeded.
- **Using `POST` or `PUT` instead of `PATCH`.** `POST /api/baskets/` returns
  `400 {"error":"No such route","status":400}` regardless of body shape, and `PUT
  /api/baskets/` returns a deceptive `201` that changes nothing. `setBasketLine` in both
  SDKs already sends `PATCH` — don't hand-build the request with a different method.
- **Treating an empty `lines` array as an error.** An empty basket is the normal state
  between orders, not a failure — check `lines.length` before assuming something broke.
- **Showing `total` to a customer.** `total` is the dealer (wholesale) total; a line
  added via `setBasketLine` has `retailPrice: null` and the basket's `retailTotal` is
  `null` along with it, since this API never sends a retail price when adding a line —
  see [Concepts: Prices](../concepts.md#prices).
- **Expecting `price` to be a per-unit price.** On a `BasketLine`, `price`, `fullPrice`
  and `total` (and their `eur*` counterparts) scale with `qty` — they're the line's
  extended total, not a per-unit price. `aPrice` (and `aFullPrice`, `eurAPrice`,
  `eurAFullPrice`) are the fields that stay flat per unit.
- **Calling this recipe's scripts against a basket you care about, without reading them
  first.** Both scripts add qty 1, then qty 2, then remove the line (qty 0) for whatever
  product `id` you pass on the command line — run them against a product you're fine
  seeing briefly appear in your own basket, and pass your own token, not anyone else's.
