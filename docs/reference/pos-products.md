<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# pos-products

| URL | Method | Description |
|-----|--------|-------------|
| `/api/pos/products/` | GET | List your own point-of-sale products |
| `/api/pos/products/` | POST | Create a point-of-sale product |
| `/api/pos/products/{id}` | GET | Get one point-of-sale product |
| `/api/pos/products/{id}` | PUT | Update a point-of-sale product |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## GET /api/pos/products/

List your own point-of-sale products

Verified live: `GET /api/pos/products/` returned HTTP 200 with an
array of 17 product records for the test account; `GET
/api/pos/products/?limit=2` returned the same shape truncated to 2
records (the limit parameter is honoured).

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

**200** Array of products

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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/pos/products/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.posProducts({ limit: 50 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
// No PHP SDK method for this endpoint; use curl against https://dealer.flyfisheurope.com/api/pos/products/.
```

## POST /api/pos/products/

Create a point-of-sale product

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
| articleno | string | no |
| tradeItemNumber | string | no |
| brand | string | no |
| name | string | no |
| inStock | integer | no |
| retailPrice | number | no |
| retailCurrency | string | no |
| tax | integer | no |
| costPrice | number | no |
| category | string | no |
| images | object | no |
| uploadedFiles | array | no |
| color | string | no |
| size | string | no |
| itemCategory | string | no |
| mainCategory | string | no |
| intermediateCategory | string | no |
| favorite | boolean | no |


### Responses

**201** Product stored

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
curl -X POST -H 'Authorization: Bearer <your token>' -H 'Content-Type: application/json' -d '<json body>' 'https://dealer.flyfisheurope.com/api/pos/products/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.posAddProduct({ ... })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
// No PHP SDK method for this endpoint; use curl against https://dealer.flyfisheurope.com/api/pos/products/.
```

## GET /api/pos/products/{id}

Get one point-of-sale product

Verified live: `GET /api/pos/products/23446` returned HTTP 200 with
a body byte-identical to that product's entry in the `GET
/api/pos/products/` list. An unknown id also returns HTTP 200 (not
404), with an empty object body - verified twice with `GET
/api/pos/products/999999999`, both returning `{}` - see the
unknownId example. One earlier attempt at the same unknown-id call
returned HTTP 504 Gateway Timeout with an empty body and CloudFront
error headers before the two 200/{} responses; treated as a
transient gateway blip rather than the documented behaviour, since
it did not reproduce.

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| id | path | integer | yes | 23446 |  |

### Responses

**200** The product

**Known id**

```json
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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/pos/products/23446'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.posProducts({}, { id: 123 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
// No PHP SDK method for this endpoint; use curl against https://dealer.flyfisheurope.com/api/pos/products/23446.
```

## PUT /api/pos/products/{id}

Update a point-of-sale product

> **Not verified against the live API.** The request shape is taken from the SDK. Contact Flyfish Europe before relying on it.

Not verified against the live API. Request shape taken from the Node
SDK method; confirm with Flyfish Europe before integrating.

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| id | path | integer | yes | 23446 |  |

### Request body

Content types: `application/json`

| Field | Type | Required |
|-------|------|----------|
| id | integer | no |
| dealer | integer | no |
| articleno | string | no |
| tradeItemNumber | string | no |
| brand | string | no |
| name | string | no |
| inStock | integer | no |
| retailPrice | number | no |
| retailCurrency | string | no |
| tax | integer | no |
| costPrice | number | no |
| category | string | no |
| images | object | no |
| uploadedFiles | array | no |
| color | string | no |
| size | string | no |
| itemCategory | string | no |
| mainCategory | string | no |
| intermediateCategory | string | no |
| favorite | boolean | no |


### Responses

**202** Product updated

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
curl -X PUT -H 'Authorization: Bearer <your token>' -H 'Content-Type: application/json' -d '<json body>' 'https://dealer.flyfisheurope.com/api/pos/products/23446'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.posEditProduct({ ... }, { id: 123 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
// No PHP SDK method for this endpoint; use curl against https://dealer.flyfisheurope.com/api/pos/products/23446.
```
