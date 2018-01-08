## Products

Returns json data about a product.

### URL

| URL                        | Method | Description
|----------------------------|--------|----------------------------
| /api/products/             | GET    | Get a list of products.
| /api/products/:articleno   | GET    | Get a specific product.


### URL Params

- Required:
    None.

- Optional:

| Param     | Datatype     | Example value | Description
|-----------|--------------|---------------|---------------------------------------
| articleno | alphanumeric | 10328-033-20  | Product articleno.


### Query string

- Required:
    None.
- Optional:

| Param     | Datatype     | Example value | Description
|-----------|--------------|---------------|---------------------------------------
| limit     | integer      | 50            | Number of products you want in your result data.
| offset    | integer      | 50            | Pagination offset.


### Data Params

None.

### Success Response

  * __Code:__ 200   
    __Content:__
```javascript
{
    "articleno": "10328-033-20",
    "maingroupno": 101,
    "tradeItemNumber": "694264234051",
    "name": "G4Z Stockingfoot Greystone S",
    "color": "Greystone",
    "size": "S",
    "brand": "simms",
    "itemCategory": "WADERS",
    "nameDisplay": "G4Z® Stockingfoot",
    "newInfo": "",
    "description": "The angler evolution has been distilled to three simple steps: Catch a fish. Catch many fish. Catch the fish. Wise words, but limiting. In reality you define your fishing quest. And wherever it leads, G4Z® stockingfoots are built for the pinnacle with 5-layer GORE-TEX® PRO SHELL fabric that bolsters durability and enhances breathability by 25 percent. Powered by the most feature-rich mix on the market, G4Zs include YKK® waterproof center-front zipper for easy access/optimal ventilation, plush handwarmer pockets to toast frozen digits fast, and everything you need for an evolved wader that goes way beyond the basic.",
    "features": "Features\r\r•5-layer GORE -TEX® fabric - only featured in the G4Z & G4 Pro Waders - found in the seat, waist & throughout leg with 25% more breathability\r•Extended YKK® Aquaseal waterproof center-front zipper in the G4Z allows easy access for quick relief & additional ventilation; the center-front zip also allows for easy on/easy off\r•Most feature-rich wader in the Simms line:\r◦Large zippered chest pockets\r◦Comfortable lined hand warmer pockets provide room for heater packs, offer quick/easy hand warm-up & convenient hand placement\r◦Built-in low profile belt loops with high-quality 2” elastic belt featuring Simms Trout buckle\r◦2 Retractor docking stations; G4Z includes 1 Simms Retractor\r◦Included Super-fly Patch\r•Adjustable stretch spacer mesh/elastic suspenders provide the most advanced & comfortable suspender system available\r•Built-in Gravel Guards feature ultra abrasion-resistant material for added durability\r•Updated styling details set this wader apart from all others\r•Read more about Pro Shell \r FABRIC TECH: GORE-TEX® 3-layer Pro Shell Technology in upper/GORE-TEX ® 5-layer Pro Shell Technology in lower - 25% more breathable\rAPPROX. WEIGHT: 51 oz/1446 g\rSIZES: S, M, MS, MK, ML, L(9-11), LS, LK, LL(9-11), XL, XLS, XXL",
    "images": {
        "small": "//ffe-web-images-resized.s3-website-eu-west-1.amazonaws.com/80x80/product_1_4974.jpg",
        "medium": "//ffe-web-images-resized.s3-website-eu-west-1.amazonaws.com/400x/product_1_4974.jpg",
        "large": "//ffe-web-images-resized.s3-website-eu-west-1.amazonaws.com/800x/product_1_4974.jpg"
    }
}
```
### Error Response:

  * **Code:** 401 UNAUTHORIZED   
    **Content:** `{ "status": 401, "message": "Authentication Required" }`


### Sample Calls:

#### Specific product

* __curl:__
```bash
curl -H 'Authorization: Bearer <your jwt token>' 'http://localhost:8000/api/products/10328-033-20'
```

* __javascript:__

```javascript
const https = require('https');

https.get('https://dealer.flyfisheurope.com/api/products/10328-033-20', (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    res.on('data', (data) => {
        process.stdout.write(data);
    });
}).on('error', (err) => {
    console.error(err);
});
```

#### Product list

  * __curl:__
```bash
curl -H 'Authorization: Bearer <your jwt token>' 'http://localhost:8000/api/products/?limit=2&offset=0'
```

* __javascript:__

```javascript
const https = require('https');

https.get('https://dealer.flyfisheurope.com/api/products/?limit=10', (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    res.on('data', (data) => {
        process.stdout.write(data);
    });
}).on('error', (err) => {
    console.error(err);
});
```


### Notes:

If you have any questions please contact us :)
