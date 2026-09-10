<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# baskets

| URL | Method | Description |
|-----|--------|-------------|
| `/api/baskets/` | GET | Get your current basket |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## GET /api/baskets/

Get your current basket

Returns the dealer's current basket in DealerWeb.

Verified live: `GET /api/baskets/` returned an empty basket
(zero lines, `qty: 0`, `total: 0`, `retailTotal: 0`) for the
test account; `GET /api/baskets/?presale=1` returned a
byte-identical response body - no observable difference with
the test account. Because the basket had no lines, the shape of
a populated line could not be verified live - see the
`BasketLine` schema's own description.

Both SDKs wrap this endpoint: Node ffe.baskets(opt) and PHP
$ffe->baskets($opt).

Write operations (adding lines, placing orders) are not
documented here yet; the OPTIONS response advertises methods
GET,HEAD,PUT,PATCH,POST,DELETE, but they have not been
verified. (The plain `Allow` header on that same OPTIONS
response omitted POST: `GET,HEAD,PUT,PATCH,DELETE`.)

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| presale | query | integer (1) | no |  | Enable pre-season mode. Verified: for the test account's (empty) basket, this returned a response identical to omitting the parameter. |

### Responses

**200** The basket

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

**401** Missing or invalid token

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
