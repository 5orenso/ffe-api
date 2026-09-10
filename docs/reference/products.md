<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# products

| URL | Method | Description |
|-----|--------|-------------|
| `/api/products/` | GET | List or search products |
| `/api/products/{articleno}` | GET | Get one product variant by articleno |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## GET /api/products/

List or search products

Returns individual product variants (one entry per articleno / colour /
size combination), not grouped product families - see the unique
parameter below. The default, unfiltered response is not scoped to one
brand: 22 different brandno values were observed across a single
1000-item probe.

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| limit | query | integer, default 25 | no |  | Number of products to return. Verified default is 25: an unfiltered request with no limit given returned exactly 25 items. No upper cap was found - limit=1000 returned 1000 items and limit=3000 returned 3000 items, both un-truncated. |
| offset | query | integer, default 0 | no |  | Pagination offset. Verified: limit=2&offset=0 returned articleno 1113000, 1113001; limit=2&offset=2 returned 1113002, 1113003 - the next two items in the same order. |
| brand | query | string | no | simms | brandno from /api/brands/. Verified: brand=simms returned only brandno "Simms" items, a strict subset of the multi-brand unfiltered list. |
| maingroup | query | string | no | simms headwear | Case-insensitive exact match against "<brandno> <maingroupname>" (e.g. brand simms + maingroupname "Headwear" -> "simms headwear"). Verified: maingroup=simms%20headwear and maingroup=Simms%20Headwear both returned the same 2 Headwear/Simms items; maingroup=headwear (no brand prefix) returned zero results, so the brand prefix is required for this parameter (unlike intgroup/subgroup below). |
| intgroup | query | string | no | beanies | Case-insensitive exact match against intermediategroupname, with no brand prefix. Verified: intgroup=beanies and intgroup=BEANIES both matched the Simms Headwear > Beanies group; the partial value intgroup=bean matched nothing (exact match, not substring); the brand-prefixed intgroup=simms%20beanies also matched nothing. |
| subgroup | query | string | no | wms g3 stockingfoots | Case-insensitive exact match against subgroupname, with no brand prefix - same pattern as intgroup. Verified: subgroup=wms%20g3%20stockingfoots matched all 13 items of that Simms Women's > Waders > Wms G3 Stockingfoots sub-group. |
| mainCat | query | integer | no | 101 | maingroupno. Verified: mainCat=101 returned only maingroupno 101 (Simms Waders) items. |
| intCat | query | integer | no | 1033 | intermediategroupno. Verified: intCat=1033 returned only intermediategroupno 1033 (Simms Headwear > Beanies) items. |
| subCat | query | integer | no | 10096 | subgroupno. Verified: subCat=10096 returned only subgroupno 10096 (Simms Women's > Waders > Wms G3 Stockingfoots) items. |
| gtin | query | string | no | 4560111388931 | tradeItemNumber (barcode), exact match. Verified with two real values: gtin=782420002818 returned exactly the one Loon item with that tradeItemNumber, and gtin=4560111388931 returned exactly the one C&F item (articleno 1113000) with that tradeItemNumber. |
| articleNoIn | query | string | no | 1113000,1113001 | Comma-separated list of articleno values. Verified: articleNoIn=1113000,1113001 returned both matching items, in that order. |
| search | query | string | no | simms waders | Free-text search. Verified: search=simms%20waders returned a different, narrower result set than the unfiltered list (a Simms wader product, versus the unfiltered list's unrelated top items). |
| unique | query | boolean, default false | no |  | Documented (and implied by every product's own apiLinkToProductGroup, which always appends &unique=true) to group size/colour variants into one product with sizes, colors and imgRef arrays. NOT verified live: every combination tried (unique=true alone; with limit=1; narrowed to a single item via mainCat, brand, gtin, articleNoIn or nameDisplay) consistently returned HTTP 504 Gateway Timeout with an empty body. unique=false was verified to behave identically to omitting the parameter. |
| isNew | query | integer (0 \| 1) | no |  | Filters on the is_new flag. Verified in both directions: isNew=1 returned only is_new: 1 items and isNew=0 returned only is_new: 0 items. |
| nameDisplay | query | string | no | 30th Anniversary Boat Box | Exact match against nameDisplay. Works without unique=true, and returns every colour/size variant sharing that marketing name (not just one). Verified: nameDisplay=Bales%20Beach%20-%20Polycarbonate returned all 17 variants sharing that nameDisplay. |

### Responses

**200** Array of product variants (not grouped into product families -
see the unique parameter). Example trimmed for readability (long
text fields shortened, large maps/lists cut); the schema is
authoritative.


```json
[
  {
    "id": 701646,
    "articleno": "1113000",
    "tradeItemNumber": "4560111388931",
    "name": "30th Anniversary Boat Box",
    "nameDisplay": "30th Anniversary Boat Box",
    "brand": "c&f",
    "brandno": "C&F",
    "vismaBrand": "C&F Design",
    "itemCategory": "Fly Cases",
    "mainCategory": "30th Anniversary Series",
    "maingroupno": 519,
    "maingroupname": "30th Anniversary Series",
    "maingroupid": 10826,
    "intermediategroupno": 0,
    "subgroupno": 0,
    "productGroup": "Professional Guide",
    "color": "Black",
    "colorId": 4000,
    "size": "XX-Large",
    "sizeId": 11029,
    "option_1": "",
    "option_1_name": "",
    "option_2": "",
    "option_2_name": "",
    "description": "Boat box features a black exterior and C&F's iconic silver foam changer. (trimmed to one sentence for this example)",
    "countryOfOrigin": "392",
    "countryCode": false,
    "country": false,
    "commodityCode": "4202990090",
    "introYear": "S26",
    "weight": 0.9625,
    "packingWeight": 0,
    "volume": 6744,
    "length": 31,
    "width": 22.2,
    "height": 9.8,
    "isActive": 0,
    "is_new": 1,
    "showonwebyesno": 1,
    "showOnConsumerWeb": 1,
    "preSale": 1,
    "preSaleNew": 0,
    "preSalePopular": 0,
    "preSaleDiscontinued": 0,
    "availability": "Yes",
    "unitsInStock": 66,
    "unitsInStockHasMore": false,
    "retailCurrency": "NOK",
    "retailPrice": 2199,
    "psRetailCurrency": "NOK",
    "psRetailPrice": 2199,
    "priceNOK": 2199,
    "priceSEK": 2199,
    "priceDKK": 1499,
    "priceGBP": 169.9,
    "priceEUR": 199.9,
    "priceCHF": 169,
    "psPriceNOK": 2199,
    "psPriceSEK": 2199,
    "psPriceDKK": 1499,
    "psPriceGBP": 169.9,
    "psPriceEUR": 199.9,
    "psPriceCHF": 169,
    "dealerCurrency": "NOK",
    "dealerPrice": 967.6,
    "dealerEurPrice": 98.4,
    "dealerRepairPrice": 0,
    "dealerPresaleCurrency": "NOK",
    "dealerPresalePrice": 967.6,
    "dealerAsapCurrency": "NOK",
    "dealerAsapPrice": 967.6,
    "pricelist": {
      "44": {
        "prislistenr": "44",
        "artikkelnr": "1113000",
        "pris": "967.6",
        "valutakode": "NOK",
        "startdato": "2025-09-16T00:00:00+02:00",
        "sluttdato": "2026-12-31T00:00:00+01:00",
        "hash": "88700436fda51b7d382fdd65ae130485"
      }
    },
    "images": {
      "small": "https://dealer.flyfisheurope.com/80x80/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
      "medium": "https://dealer.flyfisheurope.com/400x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
      "large": "https://dealer.flyfisheurope.com/800x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
      "xlarge": "https://dealer.flyfisheurope.com/1024x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
      "xxlarge": "https://dealer.flyfisheurope.com/1280x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg"
    },
    "link": "https://dealer.flyfisheurope.com/c%26f/30th%20anniversary%20series/product/1113000",
    "linkConsumerWeb": "https://www.flyfisheurope.com/c%26f/30th%20anniversary%20series/product/1113000",
    "apiLinkToProductGroup": "https://dealer.flyfisheurope.com/api/products/?nameDisplay=30th%20Anniversary%20Boat%20Box&unique=true",
    "apiLinkToProductMainCategory": "https://dealer.flyfisheurope.com/api/products/?mainCat=519&unique=true",
    "imageRefPrefixes": {
      "small": "https://dealer.flyfisheurope.com/80x80/",
      "medium": "https://dealer.flyfisheurope.com/400x/",
      "large": "https://dealer.flyfisheurope.com/800x/",
      "xlarge": "https://dealer.flyfisheurope.com/1024x/",
      "xxlarge": "https://dealer.flyfisheurope.com/1280x/"
    },
    "related": {},
    "supplierOrderLines": [],
    "customerOrderLines": [],
    "warehouse": "",
    "updatedDate": "2026-09-09T19:12:57.803Z"
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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/products/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.products({ brand: 'simms', limit: 50, offset: 0 })
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->products((object) ['brand' => 'simms', 'limit' => 50, 'offset' => 0]);
print_r($result);
```

## GET /api/products/{articleno}

Get one product variant by articleno

### Parameters

| Name | In | Type | Required | Example | Description |
|------|----|------|----------|---------|-------------|
| articleno | path | string | yes | 1113000 |  |

### Responses

**200** The product variant. An unknown articleno also returns HTTP 200
(not 404), but with an empty object body - see the
unknownArticleno example. Verified with two different unknown
values: a made-up one (DOES-NOT-EXIST) and a plausible-looking one
copied from an earlier draft of this spec (10328-033-20, which is
simply not present in this dealer's current catalog) - both
returned {}. The found example is trimmed for readability (long
text fields shortened, large maps/lists cut); the schema is
authoritative.


**Known articleno**

```json
{
  "id": 701646,
  "articleno": "1113000",
  "tradeItemNumber": "4560111388931",
  "name": "30th Anniversary Boat Box",
  "nameDisplay": "30th Anniversary Boat Box",
  "brand": "c&f",
  "brandno": "C&F",
  "vismaBrand": "C&F Design",
  "itemCategory": "Fly Cases",
  "mainCategory": "30th Anniversary Series",
  "maingroupno": 519,
  "maingroupname": "30th Anniversary Series",
  "maingroupid": 10826,
  "intermediategroupno": 0,
  "subgroupno": 0,
  "productGroup": "Professional Guide",
  "color": "Black",
  "colorId": 4000,
  "size": "XX-Large",
  "sizeId": 11029,
  "option_1": "",
  "option_1_name": "",
  "option_2": "",
  "option_2_name": "",
  "description": "Boat box features a black exterior and C&F's iconic silver foam changer. (trimmed to one sentence for this example)",
  "descriptionHtml": "<p>Boat box features a black exterior and C&amp;F's iconic silver foam changer. (trimmed to one sentence for this example)</p>",
  "countryOfOrigin": "392",
  "countryCode": false,
  "country": false,
  "commodityCode": "4202990090",
  "introYear": "S26",
  "weight": 0.9625,
  "packingWeight": 0,
  "volume": 6744,
  "length": 31,
  "width": 22.2,
  "height": 9.8,
  "isActive": 0,
  "is_new": 1,
  "showonwebyesno": 1,
  "showOnConsumerWeb": 1,
  "preSale": 1,
  "preSaleNew": 0,
  "preSalePopular": 0,
  "preSaleDiscontinued": 0,
  "availability": "Yes",
  "unitsInStock": 66,
  "retailCurrency": "NOK",
  "retailPrice": 2199,
  "psRetailCurrency": "NOK",
  "psRetailPrice": 2199,
  "priceNOK": 2199,
  "priceSEK": 2199,
  "priceDKK": 1499,
  "priceGBP": 169.9,
  "priceEUR": 199.9,
  "priceCHF": 169,
  "psPriceNOK": 2199,
  "psPriceSEK": 2199,
  "psPriceDKK": 1499,
  "psPriceGBP": 169.9,
  "psPriceEUR": 199.9,
  "psPriceCHF": 169,
  "dealerCurrency": "NOK",
  "dealerPrice": 967.6,
  "dealerEurPrice": 98.4,
  "dealerRepairPrice": 0,
  "dealerPresaleCurrency": "NOK",
  "dealerPresalePrice": 967.6,
  "dealerAsapCurrency": "NOK",
  "dealerAsapPrice": 967.6,
  "pricelist": {
    "5": {
      "prislistenr": "5",
      "artikkelnr": "1113000",
      "pris": "98.4",
      "valutakode": "EUR",
      "startdato": "2025-09-16T00:00:00+02:00",
      "sluttdato": "2026-12-31T00:00:00+01:00",
      "hash": "9703ddc639da18c445f33c2f764db526"
    },
    "15": {},
    "44": {
      "prislistenr": "44",
      "artikkelnr": "1113000",
      "pris": "967.6",
      "valutakode": "NOK",
      "startdato": "2025-09-16T00:00:00+02:00",
      "sluttdato": "2026-12-31T00:00:00+01:00",
      "hash": "88700436fda51b7d382fdd65ae130485"
    }
  },
  "pricelistAsap": {
    "44": {
      "prislistenr": "44",
      "artikkelnr": "1113000",
      "pris": "967.6",
      "valutakode": "NOK",
      "startdato": "2025-09-16T00:00:00+02:00",
      "sluttdato": "2026-12-31T00:00:00+01:00",
      "hash": "88700436fda51b7d382fdd65ae130485"
    }
  },
  "pricelistPresale": {
    "5": {
      "pris": 90.2,
      "valutakode": "EUR"
    },
    "15": {},
    "44": {
      "pris": 967.6,
      "valutakode": "NOK"
    }
  },
  "pricelistPresaleAsap": {
    "5": {
      "pris": 98.4,
      "valutakode": "EUR"
    },
    "15": {},
    "44": {
      "pris": 967.6,
      "valutakode": "NOK"
    }
  },
  "images": {
    "small": "https://dealer.flyfisheurope.com/80x80/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
    "medium": "https://dealer.flyfisheurope.com/400x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
    "large": "https://dealer.flyfisheurope.com/800x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
    "xlarge": "https://dealer.flyfisheurope.com/1024x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
    "xxlarge": "https://dealer.flyfisheurope.com/1280x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
    "list": [
      {
        "small": "https://dealer.flyfisheurope.com/80x80/dealerweb-cms-ba4993b2-b83f-4409-8251-c7afe0391531.jpg",
        "medium": "https://dealer.flyfisheurope.com/400x/dealerweb-cms-ba4993b2-b83f-4409-8251-c7afe0391531.jpg",
        "large": "https://dealer.flyfisheurope.com/800x/dealerweb-cms-ba4993b2-b83f-4409-8251-c7afe0391531.jpg",
        "xlarge": "https://dealer.flyfisheurope.com/1024x/dealerweb-cms-ba4993b2-b83f-4409-8251-c7afe0391531.jpg",
        "xxlarge": "https://dealer.flyfisheurope.com/1280x/dealerweb-cms-ba4993b2-b83f-4409-8251-c7afe0391531.jpg"
      }
    ]
  },
  "imgs": {
    "1": {
      "name": "1113000-1.jpg",
      "encoding": "7bit",
      "mimetype": "image/jpeg",
      "ext": ".jpg",
      "newFilename": "dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
      "s3Link": "https://dealer.flyfisheurope.com/original/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
      "s3ThumbLink": "https://dealer.flyfisheurope.com/80x80/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
      "bytes": 183473,
      "sort": 1
    }
  },
  "link": "https://dealer.flyfisheurope.com/c%26f/30th%20anniversary%20series/product/1113000",
  "linkConsumerWeb": "https://www.flyfisheurope.com/c%26f/30th%20anniversary%20series/product/1113000",
  "apiLinkToProductGroup": "https://dealer.flyfisheurope.com/api/products/?nameDisplay=30th%20Anniversary%20Boat%20Box&unique=true",
  "apiLinkToProductMainCategory": "https://dealer.flyfisheurope.com/api/products/?mainCat=519&unique=true",
  "imageRefPrefixes": {
    "small": "https://dealer.flyfisheurope.com/80x80/",
    "medium": "https://dealer.flyfisheurope.com/400x/",
    "large": "https://dealer.flyfisheurope.com/800x/",
    "xlarge": "https://dealer.flyfisheurope.com/1024x/",
    "xxlarge": "https://dealer.flyfisheurope.com/1280x/"
  },
  "related": {},
  "supplierOrderLines": [],
  "customerOrderLines": [],
  "warehouse": "",
  "updatedFields": {
    "unitsInStock": 1788415984,
    "priceNOK": 1770383646,
    "maingroupname": 1788645469
  },
  "updatedLastValue": {
    "unitsInStock": 67,
    "priceNOK": false,
    "maingroupname": null
  },
  "updatedDate": "2026-09-09T19:12:57.803Z"
}
```

**Unknown articleno returns an empty object**

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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/products/1113000'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.product('1113000')
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->product('1113000');
print_r($result);
```
