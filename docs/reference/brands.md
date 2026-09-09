<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# brands

| URL | Method | Description |
|-----|--------|-------------|
| `/api/brands/` | GET | List all brands available to your dealer account |
| `/api/brands/{brandno}` | GET | Get one brand |

All requests need the header `Authorization: Bearer <your token>`. See [Getting started](../getting-started.md).

## GET /api/brands/

List all brands available to your dealer account

Supports CORS preflight (OPTIONS): allowed methods GET, HEAD, PUT, PATCH, POST, DELETE.
The live OPTIONS probe did not return an access-control-allow-headers value
(no Access-Control-Request-Headers was sent on the preflight request).

### Parameters

_None._

### Responses

**200** Array of brands

```json
[
  {
    "id": 2,
    "brandno": "simms",
    "sort": 10,
    "name": "Simms",
    "fullName": "Simms",
    "count": 2457,
    "countPresale": 514,
    "updatedDate": "2023-06-20T12:33:51.583Z",
    "showOnConsumerWeb": 1,
    "showOnDealerWeb": 1,
    "countNew": 1095,
    "countPsNew": 163,
    "countSpring": 1459,
    "countFall": 1163,
    "countPsSpring": 30,
    "countPsFall": 484,
    "countNewSpring": 498,
    "countNewFall": 597,
    "countPsNewSpring": 0,
    "countPsNewFall": 163
  },
  {
    "id": 68,
    "brandno": "ahrex",
    "sort": 15,
    "name": "Ahrex",
    "fullName": "Ahrex",
    "count": 597,
    "countPresale": 609,
    "updatedDate": "2023-10-17T11:09:47.679Z",
    "showOnConsumerWeb": 1,
    "showOnDealerWeb": 1,
    "countNew": 35,
    "countPsNew": 12,
    "countSpring": 609,
    "countFall": 0,
    "countPsSpring": 609,
    "countPsFall": 0,
    "countNewSpring": 35,
    "countNewFall": 0,
    "countPsNewSpring": 12,
    "countPsNewFall": 0
  }
]
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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/brands/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.brands()
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->brands();
print_r($result);
```

## GET /api/brands/{brandno}

Get one brand

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| brandno | path | string | yes | simms |  |

### Responses

**200** The brand. An unknown brandno also returns HTTP 200 (not 404), but with
an empty object body — see the unknownBrandno example.


**Known brandno**

```json
{
  "id": 2,
  "brandno": "simms",
  "sort": 10,
  "name": "Simms",
  "fullName": "Simms",
  "count": 2457,
  "countPresale": 514,
  "updatedDate": "2023-06-20T12:33:51.583Z",
  "showOnConsumerWeb": 1,
  "showOnDealerWeb": 1,
  "countNew": 1095,
  "countPsNew": 163,
  "countSpring": 1459,
  "countFall": 1163,
  "countPsSpring": 30,
  "countPsFall": 484,
  "countNewSpring": 498,
  "countNewFall": 597,
  "countPsNewSpring": 0,
  "countPsNewFall": 163
}
```

**Unknown brandno returns an empty object**

```json
{}
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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/brands/simms'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.brand('simms')
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->brand('simms');
print_r($result);
```
