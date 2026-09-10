<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# categories

| URL | Method | Description |
|-----|--------|-------------|
| `/api/categories/` | GET | List categories |
| `/api/categories/{categoryno}` | GET | Get one category |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## GET /api/categories/

List categories

Without a `level` filter, this dealer account's response is identical (same 13
items, same order) to `level=main` and to `brand=simms`: every category this
token can see by default is a main-level Simms category. Intermediate and sub
categories are only returned when `level=intermediate` or `level=sub` is
requested explicitly.

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| limit | query | integer, default 100 | no |  | Maximum number of categories to return. The default of 100 is inferred: `level=intermediate` (170+ candidate categories) returned exactly 100 items with no limit given, a round number consistent with a page-size cap, while `level=sub` (57 total) and the unfiltered/`level=main` call (13 total) both came back under 100 and were not capped. |
| offset | query | integer, default 0 | no |  | Pagination offset into the result list (ordered by `sort`). Verified: `limit=2&offset=0` returned categoryno 101, 102; `limit=2&offset=2` returned categoryno 104, 105 - the next two items in `sort` order. |
| brand | query | string | no | simms | Intended to filter by brand identifier (matches Brand.brandno). Not conclusively verified: `brand=simms` returned results byte-identical to the unfiltered list (same 13 categories), but every category this dealer account can see is already brand simms, so this probe cannot distinguish "brand filters and simms matched everything" from "brand has no effect". Case-sensitivity was not tested. |
| level | query | string (main \| intermediate \| sub) | no |  | main returned 13 categories (parent: null), intermediate returned 100 (likely capped by the default limit - see limit), sub returned 57, all with a non-null parent. |
| parent | query | integer | no | 101 | Only categories whose parent equals this categoryno. Verified: parent=101 returned 14 categories, all level intermediate and all with parent: 101. |

### Responses

**200** Array of categories

```json
[
  {
    "categoryno": 101,
    "id": 7321,
    "groupno": 101,
    "name": "Simms Waders",
    "level": "main",
    "parent": null,
    "sort": 1,
    "status": 2,
    "showOnConsumerWeb": 1,
    "preSale": 1,
    "products": [],
    "articles": [
      {
        "id": 2937,
        "text": "2937: Simms Wader Sizechart",
        "title": "Simms Wader Sizechart"
      }
    ],
    "categories": [],
    "offline": 0,
    "count": 159,
    "countPresale": 0,
    "countNew": 0,
    "countPsNew": 0,
    "countSpring": 139,
    "countFall": 20,
    "countPsSpring": 0,
    "countPsFall": 0,
    "countNewSpring": 0,
    "countNewFall": 0,
    "countPsNewSpring": 0,
    "countPsNewFall": 0,
    "brand": "simms",
    "linkname": "Waders"
  },
  {
    "categoryno": 102,
    "id": 7320,
    "groupno": 102,
    "name": "Simms Footwear",
    "level": "main",
    "parent": null,
    "sort": 2,
    "status": 2,
    "showOnConsumerWeb": 1,
    "preSale": 1,
    "hasNewProducts": 1,
    "hasPresaleProducts": 1,
    "articles": [],
    "offline": 0,
    "count": 207,
    "countPresale": 32,
    "countNew": 8,
    "countPsNew": 0,
    "countSpring": 152,
    "countFall": 55,
    "countPsSpring": 10,
    "countPsFall": 22,
    "countNewSpring": 8,
    "countNewFall": 0,
    "countPsNewSpring": 0,
    "countPsNewFall": 0,
    "brand": "simms",
    "linkname": "Footwear"
  }
]
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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/categories/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.categories({ brand: 'simms', level: 'main' })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->categories((object) ['brand' => 'simms', 'level' => 'main']);
print_r($result);
```

## GET /api/categories/{categoryno}

Get one category

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| categoryno | path | integer | yes | 101 |  |

### Responses

**200** The category. An unknown categoryno also returns HTTP 200 (not 404), but with
an empty object body — see the unknownCategoryno example. Note the by-id
response has no `brand` field, unlike list responses.


**Known categoryno**

```json
{
  "categoryno": 101,
  "id": 7321,
  "groupno": 101,
  "name": "Simms Waders",
  "level": "main",
  "parent": null,
  "sort": 1,
  "status": 2,
  "showOnConsumerWeb": 1,
  "preSale": 1,
  "products": [],
  "articles": [
    {
      "id": 2937,
      "text": "2937: Simms Wader Sizechart",
      "title": "Simms Wader Sizechart"
    }
  ],
  "categories": [],
  "offline": 0,
  "count": 159,
  "countPresale": 0,
  "countNew": 0,
  "countPsNew": 0,
  "countSpring": 139,
  "countFall": 20,
  "countPsSpring": 0,
  "countPsFall": 0,
  "countNewSpring": 0,
  "countNewFall": 0,
  "countPsNewSpring": 0,
  "countPsNewFall": 0
}
```

**Unknown categoryno returns an empty object**

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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/categories/101'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.category(101)
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->category(101);
print_r($result);
```
