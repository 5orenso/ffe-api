<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# baskets

| URL | Method | Description |
|-----|--------|-------------|
| `/api/baskets/` | GET | Get your current basket |
| `/api/baskets/` | PATCH | Add, update or remove one basket line |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## GET /api/baskets/

Get your current basket

Returns the dealer's current basket in DealerWeb.

Verified live: `GET /api/baskets/` returned an empty basket
(zero lines, `qty: 0`, `total: 0`, `retailTotal: 0`) for the
test account; `GET /api/baskets/?presale=1` returned a
byte-identical response body - no observable difference with
the test account. The shape of a populated line was verified
separately, via PATCH /api/baskets/ (setBasketLine) - see the
live run in docs/recipes/ordering-with-baskets.md.

Both SDKs wrap this endpoint: Node ffe.baskets(opt) and PHP
$ffe->baskets($opt).

To add, update or remove lines use PATCH (see setBasketLine);
placing the order itself happens in DealerWeb and is not part of
this API.

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| presale | query | integer (1) | no |  | Enable pre-season mode. Verified: for the test account's (empty) basket, this returned a response identical to omitting the parameter. |

### Responses

Response fields: see [Basket](#fields-basket).

**200** The basket

```json
{
  "lines": [
    {
      "currency": null,
      "aPrice": 6599.6,
      "eurAPrice": 712.7,
      "discount": 0,
      "aFullPrice": "6599.6",
      "eurAFullPrice": "712.7",
      "retailPrice": null,
      "brandno": "Simms",
      "brand": "simms",
      "maingroupno": 101,
      "articleno": "13960-096-10",
      "fullPrice": 6599.6,
      "productName": "G4Z Stockingfoot Slate XS",
      "date": "2026-09-10T12:28:26+02:00",
      "productNo": null,
      "name": null,
      "qty": 1,
      "price": 6599.6,
      "id": 613599,
      "addedFrom": "api",
      "addedBy": "customer@example.com",
      "info": null,
      "total": 6599.6,
      "eurFullPrice": 712.7,
      "eurPrice": 712.7,
      "eurTotal": 712.7,
      "idx": 0,
      "sortIdx": 0,
      "object": {
        "id": 613599,
        "articleno": "13960-096-10",
        "name": "G4Z Stockingfoot Slate XS",
        "brand": "simms"
      }
    }
  ],
  "pricelistno": 44,
  "customerno": 999999,
  "emailaddress": "customer@example.com",
  "companyName": "Your customer name",
  "qty": 1,
  "total": 6599.6,
  "retailTotal": null,
  "summary": {
    "Simms": {
      "total": 6599.6,
      "categories": {
        "Waders": {
          "total": 6599.6
        }
      }
    }
  },
  "currency": "NOK"
}
```

**401** Malformed or invalid token. A request with no Authorization header returns 403 instead (see Forbidden).

```json
{
  "status": 401,
  "message": "Invalid JwtToken: UnauthorizedError",
  "reason": "jwt malformed"
}
```

### Sample calls

**curl**

```bash
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/baskets/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.baskets({ presale: 1 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->baskets((object) ['presale' => 1]);
print_r($result);
```

## PATCH /api/baskets/

Add, update or remove one basket line

Add, update or remove one line in your basket. Verified live
2026-09-10 against the test account's basket; see the live run
in docs/recipes/ordering-with-baskets.md for the full
request/response log.

The body field `id` is the numeric product `id` from
`GET /api/products/` (e.g. `613599`), NOT `articleno` (the SKU
string, e.g. "13960-096-10"). Sending `articleno` or `productNo`
instead of `id` still returns a `201` that looks successful, but
it's a silent no-op: `data.id` stays `null` and nothing is
persisted.

`qty: 0` removes the line. Any other `qty` upserts it in place -
sending this same call again with a new `qty` for an `id` already
in the basket updates that one line rather than adding a
duplicate. Add, update and remove are all the same call.

Always confirm the result with `GET /api/baskets/` rather than
trusting the status code alone: `POST /api/baskets/` (any body)
returns `400 {"error":"No such route","status":400}`, and
`PUT /api/baskets/` returns a deceptive `201
{"status":201,"message":"Basket updated"}` without changing
anything. Use `PATCH` only. The `Access-Control-Allow-Methods`
header on `OPTIONS /api/baskets/` lists `POST`, but the plain
`Allow` header (and this endpoint's actual behaviour) does not -
that CORS header is not a reliable route inventory.

### Parameters

_None._

### Request body

Content types: `application/json`

| Field | Type | Required |
|-------|------|----------|
| id | integer | yes |
| qty | integer | yes |

```json
{
  "id": 613599,
  "qty": 1
}
```


### Responses

Response fields: see [BasketUpdateResponse](#fields-basketupdateresponse).

**201** Basket line added, updated or removed

```json
{
  "status": 201,
  "message": "Basket update",
  "data": {
    "qty": 1,
    "price": null,
    "retailPrice": null,
    "id": 613599,
    "addedFrom": "api",
    "addedBy": "customer@example.com"
  }
}
```

**401** Malformed or invalid token. A request with no Authorization header returns 403 instead (see Forbidden).

```json
{
  "status": 401,
  "message": "Invalid JwtToken: UnauthorizedError",
  "reason": "jwt malformed"
}
```

**403** No Authorization header (observed 2026-09-10 on /api/brands/)

```json
{
  "status": 403,
  "message": "Forbidden! No access to this endpoint!"
}
```

### Sample calls

**curl**

```bash
curl -X PATCH -H 'Authorization: Bearer <your token>' -H 'Content-Type: application/json' -d '{"id":613599,"qty":1}' 'https://dealer.flyfisheurope.com/api/baskets/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.setBasketLine({ id: 613599, qty: 1 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->setBasketLine(613599, 1);
print_r($result);
```

## Fields: Basket

The dealer's current basket. Verified live via GET /api/baskets/
and GET /api/baskets/?presale=1 (identical response body) for an
empty basket, and via PATCH /api/baskets/ (setBasketLine) -
verified live 2026-09-10, twice independently, for a basket with
one line added, updated and removed; see the live run in
docs/recipes/ordering-with-baskets.md. Every before/after
GET /api/baskets/ pair across both runs was byte-for-byte
identical, confirming the basket is fully restored once a line
is removed with qty: 0.

| Field | Type | Description |
|-------|------|-------------|
| lines | array of BasketLine | The basket's line items. Empty ([]) between orders; see BasketLine for the verified shape of a populated line. |
| lines[].currency | string, nullable | Observed null on every line verified live. |
| lines[].aPrice | number | Dealer price per unit after discount, in the basket's currency. Unlike price/fullPrice below, this stays constant when qty changes (verified live: unchanged going from qty 1 to qty 2) - it is a genuine per-unit price. |
| lines[].eurAPrice | number | aPrice converted to EUR. |
| lines[].discount | number |  |
| lines[].aFullPrice | string | Dealer price per unit before discount, in the basket's currency, as a NUMERIC STRING (e.g. "6599.6") - verified live; note this differs from every other price-shaped field on this object, which are numbers. |
| lines[].eurAFullPrice | string | aFullPrice converted to EUR, also a numeric string (e.g. "712.7") - verified live. |
| lines[].retailPrice | number, nullable |  |
| lines[].brandno | string | Brand identifier as seen elsewhere in the catalog, e.g. "Simms". |
| lines[].brand | string | Lowercase brand slug, e.g. "simms". |
| lines[].maingroupno | integer |  |
| lines[].articleno | string |  |
| lines[].fullPrice | number | The line's extended dealer total before discount (unit price x qty) - verified live: 6599.6 at qty 1, 13199.2 at qty 2 for the same product, i.e. it scales with qty rather than staying a flat per-unit price. Equal to `total` when discount is 0. |
| lines[].productName | string |  |
| lines[].date | string |  |
| lines[].productNo | string, nullable | Observed null even on a successfully added line - not the same field as articleno, and not usable as a setBasketLine input (see setBasketLine's description). |
| lines[].name | string, nullable |  |
| lines[].qty | integer |  |
| lines[].price | number | Despite the name, this is the line's extended dealer total (unit price x qty), NOT a per-unit price - verified live: 6599.6 at qty 1, 13199.2 at qty 2 for the same product. Identical to `total` in every observation so far. For the true per-unit price, see aPrice. |
| lines[].id | integer | The numeric product id (matches Product.id) - the same value used to add, update or remove this line via setBasketLine. |
| lines[].addedFrom | string | e.g. "api" for a line added through this API. |
| lines[].addedBy | string |  |
| lines[].info | string, nullable |  |
| lines[].total | number | The line's extended dealer total (identical to `price` in every observation so far) - verified live: 6599.6 at qty 1, 13199.2 at qty 2 for the same product. |
| lines[].eurFullPrice | number |  |
| lines[].eurPrice | number |  |
| lines[].eurTotal | number |  |
| lines[].idx | integer |  |
| lines[].sortIdx | integer |  |
| lines[].object | object | Snapshot of the product at the time it was added. |
| pricelistno | integer |  |
| customerno | integer |  |
| emailaddress | string |  |
| companyName | string |  |
| qty | integer | Total quantity across all lines. Observed as 0 with an empty basket. |
| total | number | Dealer total. Observed as 0 with an empty basket; matches the sum of each line's `total` with lines in it. |
| retailTotal | number, nullable | Retail total. Observed as 0 with an empty basket, and as null on a populated basket whose line's retailPrice was itself null (the normal case for a line added via setBasketLine, which never sends a retail price). |
| currency | string, nullable | Absent (the key is not present at all) on an empty basket - not null, missing entirely. Present as the dealer account's currency code (e.g. "NOK") once the basket has a line in it. |
| summary | object | Observed as an empty object ({}) with an empty basket. With one line in it, observed as dealer totals grouped by brand and then by category, e.g. `{"Simms": {"total": 6599.6, "categories": {"Waders": {"total": 6599.6}}}}` - shape with multiple brands/categories not verified live. |

## Fields: BasketUpdateResponse

Response body for PATCH /api/baskets/ (setBasketLine). Verified
live 2026-09-10. A 201 here does not guarantee the write
persisted - always confirm with GET /api/baskets/, and check
data.id in particular (see its description below).

| Field | Type | Description |
|-------|------|-------------|
| status | integer |  |
| message | string |  |
| data | object |  |
| data.qty | integer |  |
| data.price | number, nullable |  |
| data.retailPrice | number, nullable |  |
| data.id | integer, nullable | The numeric product id the write applied to. null means nothing was persisted - typically because the request body sent articleno or productNo instead of the numeric id. |
| data.addedFrom | string |  |
| data.addedBy | string |  |
