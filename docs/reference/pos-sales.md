<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# pos-sales

| URL | Method | Description |
|-----|--------|-------------|
| `/api/pos/sales/` | GET | List sales reported from your point of sale |
| `/api/pos/sales/` | POST | Report a sale from your point of sale |
| `/api/pos/sales/{id}` | GET | Get one reported sale |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## GET /api/pos/sales/

List sales reported from your point of sale

Verified live: `GET /api/pos/sales/` returned HTTP 200 with an array
of 15 sale records for the test account; `GET /api/pos/sales/?limit=2`
returned the same shape truncated to 2 records (the limit parameter
is honoured).

Supports CORS preflight (OPTIONS): the `access-control-allow-methods`
header advertises GET, HEAD, PUT, PATCH, POST, DELETE. The plain
`Allow` header on the same OPTIONS response is narrower and reflects
what this collection path actually implements: POST, GET, HEAD.

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| limit | query | integer | no |  |  |
| offset | query | integer | no |  |  |

### Responses

Response fields: see [PosSale](#fields-possale).

**200** Array of sales

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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/pos/sales/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.posSales({ limit: 50 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
// No PHP SDK method for this endpoint; use curl against https://dealer.flyfisheurope.com/api/pos/sales/.
```

## POST /api/pos/sales/

Report a sale from your point of sale

> **Not verified against the live API.** The request shape is taken from the SDK. Contact Flyfish Europe before relying on it.

Not verified against the live API. Request shape taken from the Node
SDK method; confirm with Flyfish Europe before integrating.

### Parameters

_None._

### Request body

Content types: `application/json`

| Field | Type | Required |
|-------|------|----------|
| id | integer | no |
| dealer | integer | no |
| products | array | no |
| totals | object | no |
| total | number | no |
| tax | number | no |
| currency | string | no |
| discountAmount | number | no |
| discount | number | no |
| email | string | no |
| fname | string | no |
| lname | string | no |
| cellphone | string | no |
| note | string | no |
| paymentMethod | string | no |
| paymentMethods | array | no |
| created | string | no |
| updated | string | no |
| createdDate | string | no |
| updatedDate | string | no |


### Responses

**201** Sale stored

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
curl -X POST -H 'Authorization: Bearer <your token>' -H 'Content-Type: application/json' -d '<json body>' 'https://dealer.flyfisheurope.com/api/pos/sales/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.posAddSale({ ... })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
// No PHP SDK method for this endpoint; use curl against https://dealer.flyfisheurope.com/api/pos/sales/.
```

## GET /api/pos/sales/{id}

Get one reported sale

Verified live: `GET /api/pos/sales/158` returned HTTP 200 with a
body byte-identical to that sale's entry in the `GET /api/pos/sales/`
list. An unknown id also returns HTTP 200 (not 404), with an empty
object body - verified twice with `GET /api/pos/sales/999999999`,
both times returning `{}` - see the unknownId example.

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| id | path | integer | yes | 158 |  |

### Responses

Response fields: see [PosSale](#fields-possale).

**200** The sale

**Known id**

```json
{
  "id": 158,
  "dealer": 999999,
  "products": [
    {
      "id": 23446,
      "dealer": 999999,
      "articleno": "R8554",
      "tradeItemNumber": "816428012996",
      "brand": "scott",
      "name": "Scott Radian 8'6''",
      "inStock": -1,
      "retailPrice": 7999,
      "retailCurrency": "NOK",
      "tax": 25,
      "costPrice": 3839.5,
      "category": "Radian Series",
      "images": {
        "small": "https://dealer.flyfisheurope.com/80x80/product_1_21721.jpg",
        "medium": "https://dealer.flyfisheurope.com/400x/product_1_21721.jpg",
        "large": "https://dealer.flyfisheurope.com/800x/product_1_21721.jpg"
      },
      "uploadedFiles": [],
      "color": null,
      "size": null,
      "itemCategory": "Radian Series",
      "mainCategory": "Radian Series",
      "intermediateCategory": null,
      "favorite": false
    }
  ],
  "totals": {
    "subTotal": 7999,
    "total": 7999,
    "qty": 1,
    "discountAmount": 0,
    "discount": 0,
    "tax": 1599.8,
    "currency": "NOK",
    "totalPaid": 7999
  },
  "total": 7999,
  "tax": 1599.8,
  "currency": "NOK",
  "discountAmount": 0,
  "discount": 0,
  "email": null,
  "fname": null,
  "lname": null,
  "cellphone": null,
  "note": null,
  "paymentMethod": "cash",
  "paymentMethods": [
    {
      "paymentMethod": "cash",
      "total": 7999
    }
  ],
  "created": "2019-03-22T11:00:43.804Z",
  "updated": "2019-03-22T11:00:43.804Z",
  "createdDate": "2019-03-22T11:00:43.804Z",
  "updatedDate": "2019-03-22T11:00:43.804Z"
}
```

**Unknown id returns an empty object**

```json
{}
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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/pos/sales/158'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.posSales({}, { id: 123 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
// No PHP SDK method for this endpoint; use curl against https://dealer.flyfisheurope.com/api/pos/sales/158.
```

## Fields: PosSale

Verified live from GET /api/pos/sales/ (15 records for the test
account) and GET /api/pos/sales/?limit=2 (same shape, truncated).
Properties are exactly the fields observed on every one of the 15
records; none were missing across the set. Used both as the
response shape for listPosSales/getPosSale and, per the Node SDK's
posAddSale/posSales(add) usage, as the request body shape for the
unverified addPosSale operation - see that operation's description.

| Field | Type | Description |
|-------|------|-------------|
| id | integer |  |
| dealer | integer | Your dealer/account id. |
| products | array of object | Line items included in the sale. Each item has the same shape as PosProduct, plus up to four sale-line-specific fields (qty, return, discount, comment) that were present on only 1 of the 44 line items observed across the 15 probed sales - see each property's description below. |
| products[].id | integer | Point-of-sale product id (distinct from the catalog articleno). |
| products[].dealer | integer | Your dealer/account id. |
| products[].articleno | string |  |
| products[].tradeItemNumber | string | GTIN/EAN barcode. |
| products[].brand | string |  |
| products[].name | string |  |
| products[].inStock | integer | Observed only as negative integers (-1 to -7) across the 17 probed records; the meaning is not documented by Flyfish Europe - do not assume this is a literal stock count. |
| products[].retailPrice | number |  |
| products[].retailCurrency | string |  |
| products[].tax | integer | Tax rate in percent. |
| products[].costPrice | number, nullable | Absent on 3 of the 17 probed records. |
| products[].category | string, nullable | Null on 1 of the 17 probed records. |
| products[].images | object, nullable | Absent on 1 and null on 2 of the 17 probed records (3 non-object cases in total). Unlike this API's shared Images schema, only small/medium/large were observed here - no xlarge, xxlarge or list. |
| products[].uploadedFiles | array of object | Observed as an empty array ([]) on every probed record; item shape not verified. |
| products[].color | string, nullable |  |
| products[].size | string, nullable |  |
| products[].itemCategory | string, nullable | Null on 1 of the 17 probed records. |
| products[].mainCategory | string, nullable | Null on 5 of the 17 probed records. |
| products[].intermediateCategory | string, nullable |  |
| products[].favorite | boolean |  |
| products[].qty | string | Observed once, as the string "2". Not present on the other 43 observed line items (each of those represented a quantity of 1 as its own array entry instead). |
| products[].return | boolean | Observed once, as false. Not present on the other 43 observed line items. |
| products[].discount | string | Observed once, as an empty string (""). Not present on the other 43 observed line items. |
| products[].comment | string | Observed once, as an empty string (""). Not present on the other 43 observed line items. |
| totals | object | Per-sale totals, distinct from the top-level total/tax/currency/discount* fields below. |
| totals.subTotal | number |  |
| totals.total | number |  |
| totals.qty | number |  |
| totals.discountAmount | number |  |
| totals.discount | number |  |
| totals.tax | number |  |
| totals.currency | string |  |
| totals.totalPaid | number |  |
| total | number |  |
| tax | number |  |
| currency | string |  |
| discountAmount | number |  |
| discount | number |  |
| email | string, nullable | Observed as null on all 15 probed records. |
| fname | string, nullable | Observed as null on all 15 probed records. |
| lname | string, nullable | Observed as null on all 15 probed records. |
| cellphone | string, nullable | Observed as null on all 15 probed records. |
| note | string, nullable | Observed as null on all 15 probed records. |
| paymentMethod | string | Observed values: cash, card. |
| paymentMethods | array of object |  |
| paymentMethods[].paymentMethod | string |  |
| paymentMethods[].total | number |  |
| created | string |  |
| updated | string |  |
| createdDate | string |  |
| updatedDate | string |  |
