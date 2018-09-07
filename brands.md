## brands

Returns json data about a brands.

### URL

| URL                         | Method  | Description
|-----------------------------|---------|----------------------------
| /api/brands/                | OPTIONS | CORS(Cross-Origin Resource Sharing) request.
| /api/brands/                | GET     | Get a list of brands.
| /api/brands/:brandno        | GET     | Get a specific brand.


### URL Params

- Required:
    None.

- Optional:

| Param      | Datatype     | Example value | Description
|------------|--------------|---------------|---------------------------------------
| brandno    | alphanumeric | simms         | brand number.


### Query string

- Required:
    None.
- Optional:
    None


### Data Params

None.


### Success Response

  * __Code:__ 200   
    __Content:__
```javascript
{
    "brandno": "simms",
    "sort": 1,
    "name": "Simms"
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
