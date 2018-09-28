## baskets

Returns json data about you baskets.

### URL

| URL                         | Method  | Description
|-----------------------------|---------|----------------------------
| /api/baskets/               | OPTIONS | CORS(Cross-Origin Resource Sharing) request.
| /api/baskets/               | GET     | Get a list of brands.


### URL Params

- Required:
    None.

- Optional:
    None.


### Query string

- Required:
    None.
- Optional:

| Param     | Datatype     | Example value | Description
|-----------|--------------|---------------|---------------------------------------
| presale   | integer      | 1             | Enable Pre-season mode.


### Data Params

None.


### Success Response

  * __Code:__ 200   
    __Content:__
```javascript
{
    "lines": [
        {
            "aPrice": 215.5,
            "eurAPrice": 25.2,
            "object": {
                "id": 10101010,
                "articleno": "LSTSHIRT",
                "maingroupno": 439,
                "tradeItemNumber": "816428015980",
                "name": "Scott T-shirt",
                "brand": "scott",
                "mainCategory": "Accessories",
                "intermediateCategory": "Sportswear",
                "nameDisplay": "",
                "availability": "Yes",
                "retailPrice": "215,50",
                "description": "Standard fit, pre-shrunk, moisture management, antimicrobial and UPF 30+. \r\nSilver Longsleeve with Scott Oval on front and back.\r\n\r\nAvailable in size S, M, L, XL, XXL",
                "features": "",
                "priceNOK": 449,
                "priceSEK": 499,
                "priceDKK": 399,
                "priceGBP": 39.99,
                "priceEUR": 49.95,
                "priceCHF": 49,
                "tech": "",
                "care": "",
                "howtouse": "",
                "images": {
                    "small": "//ffe-web-images-resized.s3-website-eu-west-1.amazonaws.com/80x80/product_1_30050.jpg",
                    "medium": "//ffe-web-images-resized.s3-website-eu-west-1.amazonaws.com/400x/product_1_30050.jpg",
                    "large": "//ffe-web-images-resized.s3-website-eu-west-1.amazonaws.com/800x/product_1_30050.jpg"
                },
                "link": "https://dealer.flyfisheurope.com/scott/accessories/sportswear/product/LS18SILVERMD",
                "linkConsumerWeb": "https://www.flyfisheurope.com/scott/accessories/sportswear/product/LS18SILVERMD",
                "apiLinkToProductGroup": "http://localhost:8000/api/products/?nameDisplay=&unique=true",
                "apiLinkToProductMainCategory": "http://localhost:8000/api/products/?mainCat=439&unique=true",
                "imageRefPrefixes": {
                    "small": "https://dealer.flyfisheurope.com/80x80/",
                    "medium": "https://dealer.flyfisheurope.com/400x/",
                    "large": "https://dealer.flyfisheurope.com/800x/"
                }
            },
            "discount": 0,
            "retailPrice": 300,
            "date": "2018-09-07T13:26:26+02:00",
            "name": "Scott T-shirt",
            "qty": 1,
            "currency": "NOK",
            "price": 215.5,
            "id": 10101010,
            "addedFrom": "",
            "addedBy": "customer@example.com",
            "info": null,
            "fullPrice": 215.5,
            "total": 215.5,
            "eurFullPrice": 25.2,
            "eurPrice": 25.2,
            "eurTotal": 25.2
        }
    ],
    "pricelistno": 41,
    "customerno": 999999,
    "emailaddress": "customer@example.com",
    "companyName": "Your customer name",
    "qty": 1,
    "total": 215.5,
    "retailTotal": 449,
    "currency": "NOK"
}
```
### Error Response:

  * **Code:** 401 UNAUTHORIZED   
    **Content:** `{ "status": 401, "message": "Authentication Required" }`


### Sample Calls:

#### Specific brand

* __curl:__
```bash
curl -H 'Authorization: Bearer <your jwt token>' 'http://localhost:8000/api/brands/simms'
```

* __javascript:__

```javascript
const https = require('https');
const jwtToken = '<your jwt token>';

const options = {
    hostname: 'dealer.flyfisheurope.com',
    port: 443,
    path: '/api/brands/simms',
    method: 'GET',
    headers: {
        Authorization: `Bearer ${jwtToken}`
    }
};

const req = https.request(options, (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    res.on('data', (data) => {
        process.stdout.write(data);
    });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
```

#### brand list

  * __curl:__
```bash
curl -H 'Authorization: Bearer <your jwt token>' 'http://localhost:8000/api/brands/'
```

* __javascript:__

```javascript
const https = require('https');
const jwtToken = '<your jwt token>';

const options = {
    hostname: 'dealer.flyfisheurope.com',
    port: 443,
    path: '/api/brands/',
    method: 'GET',
    headers: {
        Authorization: `Bearer ${jwtToken}`
    }
};

const req = https.request(options, (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);
    res.on('data', (data) => {
        process.stdout.write(data);
    });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
```


### Notes:

If you have any questions please contact us :)
