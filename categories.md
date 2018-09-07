## categories

Returns json data about a categories.

### URL

| URL                         | Method  | Description
|-----------------------------|---------|----------------------------
| /api/categories/            | OPTIONS | CORS(Cross-Origin Resource Sharing) request.
| /api/categories/            | GET     | Get a list of categories.
| /api/categories/:categoryno | GET     | Get a specific category.


### URL Params

- Required:
    None.

- Optional:

| Param      | Datatype     | Example value | Description
|------------|--------------|---------------|---------------------------------------
| categoryno | integer      | 101           | Category number.


### Query string

- Required:
    None.
- Optional:

| Param     | Datatype     | Example value | Description
|-----------|--------------|---------------|---------------------------------------
| limit     | integer      | 50            | Number of categories you want in your result data.
| offset    | integer      | 50            | Pagination offset.
| parent    | integer      | 101           | Filter by parent categoryno. Ie. 101 for 'Simms Waders'.
| brand     | alphanumeric | Simms         | Filter by brand name.
| level     | alphanumeric | main          | Filter by category level. Possible values are: 'main', 'intermediate', 'sub'.


### Data Params

None.

### Success Response

  * __Code:__ 200   
    __Content:__
```javascript
{
    "categoryNo": 101,
    "name": "Simms Waders",
    "level": "main",
    "parent": null,
    "sort": 1
}
```
### Error Response:

  * **Code:** 401 UNAUTHORIZED   
    **Content:** `{ "status": 401, "message": "Authentication Required" }`


### Sample Calls:

#### Specific category

* __curl:__
```bash
curl -H 'Authorization: Bearer <your jwt token>' 'http://localhost:8000/api/categories/101'
```

* __javascript:__

```javascript
const https = require('https');
const jwtToken = '<your jwt token>';

const options = {
    hostname: 'dealer.flyfisheurope.com',
    port: 443,
    path: '/api/categories/101',
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

#### Category list

  * __curl:__
```bash
curl -H 'Authorization: Bearer <your jwt token>' 'http://localhost:8000/api/categories/?limit=2&offset=0'
```

* __javascript:__

```javascript
const https = require('https');
const jwtToken = '<your jwt token>';

const options = {
    hostname: 'dealer.flyfisheurope.com',
    port: 443,
    path: '/api/categories/?limit=2&offset=0',
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
