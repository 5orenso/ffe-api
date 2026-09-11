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

Response fields: see [Product](#fields-product).

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

Response fields: see [Product](#fields-product).

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

## Fields: Product

One product variant (a single articleno / colour / size combination),
as returned by GET /api/products/ and GET /api/products/{articleno}.
Field list is the observed union across every scripts/probes/prod-*.json
body, deduplicated by articleno (3024 distinct products; 4306 raw,
pre-dedup occurrences). Not every field is present on every item -
every percentage below was computed by a script over that
deduplicated corpus (a field counts as present for an articleno if
ANY probed occurrence of that articleno had it), not eyeballed. The
sizes, colors and imgRef fields are documented from the pre-existing
spec draft and from apiLinkToProductGroup's own use of unique=true,
but could NOT be verified live: every unique=true probe returned
HTTP 504.

| Field | Type | Description |
|-------|------|-------------|
| id | integer |  |
| articleno | string |  |
| tradeItemNumber | string | GTIN / barcode. Matches the gtin query parameter. |
| name | string |  |
| nameDisplay | string | Marketing name shared by all colour/size variants of a product family. Matches the nameDisplay query parameter. |
| productGroup | string |  |
| brand | string | Lowercase brand slug, e.g. "simms". |
| brandno | string | Brand identifier as seen elsewhere in the catalog, e.g. "Simms", "C&F", "Loon". Casing is inconsistent with Brand.brandno (which is lowercase); matching against the brand query parameter is case-insensitive. |
| vismaBrand | string | Brand name as stored in the upstream Visma ERP, e.g. "C&F Design". |
| itemCategory | string | Short internal category code/name. Often distinct from mainCategory (e.g. itemCategory "HEAD" alongside mainCategory "Headwear"), but not always: 522 of 4306 raw (non-deduplicated) occurrences had itemCategory equal to mainCategory (e.g. articleno F0281: itemCategory "Floatants", mainCategory "Floatants"). |
| mainCategory | string | Same value as maingroupname. |
| intermediateCategory | string | Same value as intermediategroupname. Present on 87.1% of probed products (2634/3024) - in every case but one, exactly when intermediategroupno is non-zero (see intermediategroupno). |
| subCategory | string | Same value as subgroupname. Present on 55.5% of probed products (1677/3024), exactly when subgroupno is non-zero (0 exceptions observed - see subgroupno). |
| maingroupno | integer | Matches the mainCat query parameter. |
| maingroupname | string |  |
| maingroupid | integer |  |
| maingroupsort | integer, nullable |  |
| intermediategroupno | integer | Matches the intCat query parameter. 0 when the product has no intermediate group, with one observed exception: articleno 12023-016-07 had intermediategroupno: 0 but a fully-populated intermediategroupname/intermediategroupid/intermediategroupsort/ intermediateCategory anyway. |
| intermediategroupname | string | Present on 87.1% of probed products (2634/3024) - in every case but one, exactly when intermediategroupno is non-zero (see intermediategroupno). |
| intermediategroupid | integer | Present on 87.1% of probed products (2634/3024); same conditions as intermediategroupname. |
| intermediategroupsort | integer, nullable | Present on 86.9% of probed products (2629/3024). Never present when intermediategroupno is 0, but not quite universal when it isn't either: of the 3417 raw (non-deduplicated) occurrences with a non-zero intermediategroupno, 5 were missing this field. |
| subgroupno | integer | Matches the subCat query parameter. 0 when the product has no sub group. |
| subgroupname | string | Present on 55.5% of probed products (1677/3024), exactly when subgroupno is non-zero (0 exceptions observed). |
| subgroupid | integer | Present on 55.5% of probed products (1677/3024); same conditions as subgroupname. |
| subgroupsort | integer, nullable | Present on 47.4% of probed products (1434/3024). Never present when subgroupno is 0, but far from universal when it isn't: of the 2004 raw (non-deduplicated) occurrences with a non-zero subgroupno, 243 (12%) were missing this field. |
| sort | integer, nullable | Present on 44.6% of probed products (1348/3024). |
| color | string |  |
| colorId | integer |  |
| size | string \| boolean | The variant's size label, or false (observed on 12.3% of probed products, 373/3024, and always false when boolean - never true) when the product has no size dimension. |
| sizeId | integer |  |
| option_1 | string | Free-form variant option (e.g. frame colour on sunglasses); empty string when unused. Not always paired with option_1_name: 95 raw occurrences had an empty option_1 with a non-empty option_1_name (e.g. articleno 13785-001-00: option_1: "", option_1_name: "color"). |
| option_1_name | string | Label for option_1, e.g. "frame color"; empty string when unused (see option_1 for observed pairing exceptions). |
| option_2 | string | Free-form variant option (e.g. lens colour on sunglasses); empty string when unused. Not always paired with option_2_name: 130 raw occurrences had a non-empty option_2 with an empty option_2_name (e.g. articleno C1195-10: option_2: "Black Nickel", option_2_name: ""). |
| option_2_name | string | Label for option_2, e.g. "lens color"; empty string when unused (see option_2 for observed pairing exceptions). |
| description | string | Present on 97.4% of probed products (2944/3024). |
| descriptionHtml | string | HTML version of description. Rare - present on only 1 of 3024 distinct products probed. |
| features | string | Bullet list as plain text. Present on 59.4% of probed products (1795/3024). |
| care | string | Care instructions as plain text. Present on 32.9% of probed products (996/3024). |
| tech | string | Free-form markdown, sometimes just an embedded image reference. Present on 27.6% of probed products (834/3024). |
| howtouse | string | Present on 8.0% of probed products (241/3024). |
| introYear | string | e.g. "S26" or "S22-S26" (a range), not always a plain year. |
| isActive | integer |  |
| is_new | integer | 0 or 1. Matches the isNew query parameter. |
| isMoving | boolean | Present on 32.7% of probed products (989/3024). |
| showonwebyesno | integer |  |
| showOnConsumerWeb | integer |  |
| preSale | integer |  |
| preSaleNew | integer |  |
| preSalePopular | integer |  |
| preSaleDiscontinued | integer |  |
| status | integer | Present on 15.4% of probed products (467/3024). |
| offline | integer | Present on 15.4% of probed products (467/3024). |
| availability | string \| number | Present on all 3024 distinct products probed (100%). Observed patterns: "Yes" = in stock; "No" = out of stock; a date string in D.M.YY / DD.MM.YY form (e.g. "02.01.27", "04.06.26", "15.12.26", "22.12.25", "01.01.40") = expected restock date; "20+" = in stock, at least 20 units; a plain number (1-19 observed) = in stock with that exact quantity. Note the date format is day.month.year, not ISO YYYY-MM-DD. |
| unitsInStock | integer |  |
| unitsInStockHasMore | boolean | Present on all 3024 distinct products probed (100%) by at least one occurrence. However, on the one single-item GET /api/products/{articleno} response probed (articleno 1113000), this field was absent from that specific response even though 9 other, list-endpoint occurrences of the same articleno all included it - the two endpoints may not return exactly the same field set. |
| weight | number |  |
| packingWeight | number |  |
| volume | number |  |
| length | number |  |
| width | number |  |
| height | number |  |
| countryOfOrigin | string | Numeric country code as a string, e.g. "392". |
| countryCode | string \| boolean | false on 84.6% of probed products (2557/3024); a 2-letter, uppercase ISO-3166-1-alpha-2-style country code string on the other 15.4% (467/3024). Observed string values: CN, JP, NZ, SV, TW, US, VN, ZA. Always paired with a matching country value (see below) - never a string on one and boolean on the other for the same product. |
| country | string \| boolean | false on 84.6% of probed products (2557/3024); an uppercase country name string on the other 15.4% (467/3024), paired 1:1 with countryCode. Observed string values: CHINA, EL SALVADOR, JAPAN, NEW ZEALAND, "SØR-AFRIKA" (Norwegian for South Africa, paired with countryCode ZA), TAIWAN, USA, VIETNAM. |
| commodityCode | string |  |
| retailCurrency | string |  |
| retailPrice | number | Present on ~99.9% of probed items. |
| psRetailCurrency | string | Pre-sale retail currency. |
| psRetailPrice | number | Pre-sale retail price. Present on ~99.9% of probed items. |
| priceNOK | number | Present on ~99.9% of probed items. |
| priceSEK | number | Present on ~99.9% of probed items. |
| priceDKK | number | Present on ~99.9% of probed items. |
| priceGBP | number | Present on ~99.9% of probed items. |
| priceEUR | number | Present on ~99.9% of probed items. |
| priceCHF | number | Present on ~99.9% of probed items. |
| psPriceNOK | number | Pre-sale price. Present on ~99.9% of probed items. |
| psPriceSEK | number | Pre-sale price. Present on ~99.9% of probed items. |
| psPriceDKK | number | Pre-sale price. Present on ~99.9% of probed items. |
| psPriceGBP | number | Pre-sale price. Present on ~99.9% of probed items. |
| psPriceEUR | number | Pre-sale price. Present on ~99.9% of probed items. |
| psPriceCHF | number | Pre-sale price. Present on ~99.9% of probed items. |
| dealerCurrency | string |  |
| dealerPrice | number | Dealer (wholesale) price. |
| dealerEurPrice | number |  |
| dealerRepairPrice | number |  |
| dealerPresaleCurrency | string \| boolean | Usually a currency code; observed as false (no presale currency set) on a small number of items. |
| dealerPresalePrice | number |  |
| dealerAsapCurrency | string | Present on 99.7% of probed products (3015/3024). |
| dealerAsapPrice | number | Present on 99.7% of probed products (3015/3024). |
| dealerPriceFull | number | Present on 2.0% of probed products (59/3024). |
| discountPercent | number | Present on 2.0% of probed products (59/3024). |
| pricelist | object | Internal price-list map, keyed by price-list number (e.g. "5", "44"). Entry shape varies - all 3 shapes were observed across the probed corpus: the full shape (prislistenr, artikkelnr, pris as a string e.g. "98.4", valutakode, startdato, sluttdato, hash), a partial shape with only prislistenr/pris/valutakode, or an empty object for a price list with no entry for this article. |
| pricelistAsap | object | Same key structure as pricelist. Every entry observed here was in the full shape (prislistenr, artikkelnr, pris, valutakode, startdato, sluttdato, hash) - the partial and empty shapes seen on pricelist were not observed here, though a larger sample might still show them. |
| pricelistPresale | object | Same key structure as pricelist. Entry shape varies: most entries carry only pris (a number here, not a string) and valutakode, but the full pricelist shape (prislistenr, artikkelnr, pris, valutakode, startdato, sluttdato, hash) was also observed here (e.g. articleno 12023-016-07's price-list 5 and 44 entries), as was an empty object. |
| pricelistPresaleAsap | object | Same key structure as pricelistPresale. Every entry observed here was either the pris+valutakode shape or an empty object - the full pricelist shape seen on pricelistPresale was not observed here. |
| pricelistCombo | object | Rare (present on 1.4% of probed products, 43/3024): a flat object mirroring priceNOK/priceSEK/priceDKK/priceGBP/priceEUR/ priceCHF, seen on combo/bundle articles. |
| images | Images | Present on all 3024 distinct products probed (100%) - every raw, non-deduplicated occurrence across all 42 probe files had this field. |
| images.small | string | 80x80 thumbnail URL. |
| images.medium | string | 400px-wide URL. |
| images.large | string | 800px-wide URL. |
| images.xlarge | string | 1024px-wide URL. |
| images.xxlarge | string | 1280px-wide URL. |
| images.list | array of object | Additional images beyond the primary one, each with the same 5 sizes. |
| imgs | object | Raw upload metadata for each image, keyed by a small integer id. Each entry has name, encoding, mimetype, ext, newFilename, s3Link, s3ThumbLink, bytes and sort. images is the derived, ready-to-use form of this data. Present on 95.7% of probed products (2894/3024) - note this is notably less than images (100%, see below), i.e. some products have images without raw imgs metadata. |
| files | object | Same shape as imgs, but for non-image attachments (video files were the only kind observed). Rare - present on 0.8% of probed products (24/3024). |
| imageRefPrefixes | object | URL prefix for each image size, without the filename. |
| imageRefPrefixes.small | string |  |
| imageRefPrefixes.medium | string |  |
| imageRefPrefixes.large | string |  |
| imageRefPrefixes.xlarge | string |  |
| imageRefPrefixes.xxlarge | string |  |
| youtubeNOK | string |  |
| youtubeSEK | string |  |
| youtubeDKK | string |  |
| youtubeGBP | string |  |
| youtubeEUR | string |  |
| youtubeCHF | string |  |
| youtube2NOK | string |  |
| youtube2SEK | string |  |
| youtube2DKK | string |  |
| youtube2GBP | string |  |
| youtube2EUR | string |  |
| youtube2CHF | string |  |
| youtube3NOK | string |  |
| youtube3SEK | string |  |
| youtube3DKK | string |  |
| youtube3GBP | string |  |
| youtube3EUR | string |  |
| youtube3CHF | string |  |
| link | string | DealerWeb product page URL. |
| linkConsumerWeb | string | Public flyfisheurope.com product page URL. |
| apiLinkToProductGroup | string | Self-referential /api/products/?nameDisplay=...&unique=true URL for this product's family. |
| apiLinkToProductMainCategory | string | Self-referential /api/products/?mainCat=...&unique=true URL for this product's main category. |
| related | object | Cross-references; empty object/empty arrays on most items, but all 3 sub-fields have real, non-empty data on a minority of products: articles on 6.5% (196/3024, e.g. a wader size-chart article), products on 1.4% (42/3024) and categories on 0.2% (7/3024). |
| related.articles | array of object | e.g. {"id": 3531, "title": "Simms G4Z_2024 Size Chart"} or {"id": 2963, "text": "2963: Simms Women's G3 Wader Size Chart", "title": "..."}. |
| related.products | array of object | e.g. {"id": 619648, "name": "Magnitude Infinity Buckskin/10' Clear Tip WF-3", "articleno": "145213"}. |
| related.categories | array of object | e.g. {"id": 7362, "text": "365: SA Accessories", "name": "SA Accessories"}. |
| articlesTech | array of object | Rare - present on only 1 of 3024 distinct products probed. |
| articlesTech[].id | integer |  |
| articlesTech[].text | string |  |
| articlesTech[].title | string |  |
| supplierOrderLines | array of array | Incoming purchase-order lines. Non-empty on 13.9% of probed products (419/3024); an empty array otherwise. Every non-empty entry observed was a 2-element [date string, integer] tuple, and the integer was always positive across every occurrence in the probed corpus (424 distinct entries; range 1-804, e.g. ["2027-01-02", 12]) - no negative or zero quantity was ever seen. |
| customerOrderLines | array of array | Outstanding customer-order lines. Non-empty on 13.6% of probed products (411/3024); an empty array otherwise. Same tuple shape as supplierOrderLines, but the integer was always negative across every occurrence in the probed corpus (513 distinct entries; range -50 to -1, e.g. ["2026-09-09", -1]) - no positive or zero quantity was ever seen. |
| warehouse | string |  |
| updatedFields | object | Internal change-tracking metadata: maps field names (including dotted paths like "pricelistPresale.5.pris") to a Unix timestamp of the last update. Not documented in detail; treat as opaque. |
| updatedLastValue | object | Internal change-tracking metadata: maps the same field names from updatedFields to their previous value. Not documented in detail; treat as opaque. |
| updatedDate | string |  |
| sizes | array of string | Documented as present only with unique=true. NOT verified live (see the unique parameter on listProducts). |
| colors | array of string | Documented as present only with unique=true. NOT verified live (see the unique parameter on listProducts). |
| imgRef | object | Documented as present only with unique=true, mapping colour name to an image reference id. NOT verified live (see the unique parameter on listProducts). |
