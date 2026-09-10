<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# login

| URL | Method | Description |
|-----|--------|-------------|
| `/login/` | POST | Exchange email and password for an API token |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## POST /login/

Exchange email and password for an API token

> **Not verified against the live API.** The request shape is taken from the SDK. Contact Flyfish Europe before relying on it.

Only needed if you do not want to create a token in DealerWeb.
The returned apiToken is used as the Bearer token for all other calls.
Not yet verified against the live API; request encoding and response examples come from the PHP and Node SDKs.

### Parameters

_None._

### Request body

Content types: `application/json`, `application/x-www-form-urlencoded`

| Field | Type | Required |
|-------|------|----------|
| email | string | yes |
| pass | string | yes |

```json
{
  "email": "you@example.com",
  "pass": "your-password"
}
```


### Responses

**200** Login succeeded

```json
{
  "status": 200,
  "apiToken": "<jwt>",
  "message": "OK"
}
```

**401** Login failed

```json
{
  "status": 401,
  "message": "Login failed"
}
```

### Sample calls

**curl**

```bash
curl -X POST -H 'Content-Type: application/json' -d '{"email":"you@example.com","pass":"your-password"}' 'https://dealer.flyfisheurope.com/login/'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.login('you@example.com', 'password')
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->login('you@example.com', 'password');
print_r($result);
```
