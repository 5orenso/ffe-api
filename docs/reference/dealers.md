<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->

# dealers

| URL | Method | Description |
|-----|--------|-------------|
| `/api/dealers/info` | GET | Information about the dealer account the token belongs to |

All requests need the header `Authorization: Bearer <your token>`. See [Authentication](../../README.md#authentication).

## GET /api/dealers/info

Information about the dealer account the token belongs to

Verified live: `GET /api/dealers/info` returned HTTP 200 with a large
(~2.4 MB) JSON body describing the authenticated dealer account -
contact/store details, notification and CSV-download settings, the
current terms-and-conditions acceptance record, saved shipping
addresses/contacts, a favourites map, and (for this "agent" test
account) 165 sub-dealer records the account manages, under
`data.agent_dealers`. `data.agent_dealers[]` structure is
intentionally not documented in detail - see the schema.

Several sub-objects are per-account maps keyed by a dynamic value
(login email address, brand slug, terms-and-conditions id, etc.)
rather than a fixed set of field names - see each property's
description below.

### Parameters

_None._

### Responses

**200** Dealer information. Example trimmed for readability (long lists
cut, agent_dealers omitted); the schema is authoritative.


```json
{
  "status": 200,
  "message": "DealerList",
  "data": {
    "customerno": 999999,
    "name": "Jane Dealer",
    "country": "NORWAY",
    "email": "customer@example.com",
    "store": {
      "name": "Your customer name",
      "address1": "Example Street 1",
      "address2": "",
      "zip": "0000",
      "city": "Example City",
      "country": "Sweden",
      "phone": "+47 00000000",
      "fax": "",
      "email": "customer@example.com",
      "url": "https://example.com",
      "opening_hours_mon": "08-17",
      "opening_hours_tue": "08-17",
      "opening_hours_wed": "08-17",
      "opening_hours_thu": "08-17",
      "opening_hours_fri": "08-17",
      "opening_hours_sat": "09 - 13",
      "opening_hours_sun": "closed",
      "google_maps_lookup": {
        "street_number": "1",
        "route": "Example Street",
        "postal_town": "Example City",
        "administrative_area_level_2": "Example County",
        "administrative_area_level_1": "Example Region",
        "country": "NO",
        "postal_code": "0000",
        "geometry": {
          "location": {
            "lat": 59.9,
            "lng": 10.7
          },
          "location_type": "ROOFTOP",
          "viewport": {
            "northeast": {
              "lat": 59.91,
              "lng": 10.71
            },
            "southwest": {
              "lat": 59.89,
              "lng": 10.69
            }
          }
        },
        "updated": "2014-08-07T15:06:23.402Z"
      }
    },
    "deliveryaddress1": "Example Street 1",
    "deliveryname": "Your customer name",
    "deliverypostcode": "0000",
    "deliverypostoffice": "Example City",
    "currency": "NOK",
    "agent_dealers": [],
    "emails": {
      "customer_example_com": {
        "activity": 42,
        "forgotten": [],
        "forgottens": 0,
        "last_activity": 1787643625,
        "last_forgotten": 0,
        "last_login": 1787643625,
        "login": 12,
        "login_failed": 0,
        "logins": [
          1787643625
        ],
        "logins_failed": [],
        "newsletter": 0,
        "newsletter_subscribed": "0",
        "newsletter_subscribed_from": "",
        "newsletter_subscribed_user_agent": "",
        "visits": 100,
        "last_login_failed": 0,
        "current_login_failed": 0,
        "isOnline": false,
        "api_activity": 5,
        "last_api_activity": 1765896519,
        "isOnlineApi": false
      }
    },
    "isAdmin": true,
    "is_agent": 1,
    "isDealerAdmin": true,
    "hasAccessToCombos": 1,
    "acceptConsumerOrders": 0,
    "settings": {
      "inboxEmailNotifications": false,
      "darkmode": 1,
      "language": "en",
      "display": "normal",
      "receiveDailyAvailabilityFiles": true,
      "receiveDailyAvailabilityFilesEmail": "customer@example.com",
      "notificationEmail1": "customer@example.com",
      "notificationEmail2": "customer@example.com",
      "notificationEmail3": "customer@example.com"
    },
    "favorite": {
      "product": {
        "4263": 1,
        "4265": 1,
        "4978": 1
      }
    },
    "brands": {
      "simms": {
        "allowed": true
      },
      "ahrex": {
        "allowed": true
      }
    },
    "backorders": {},
    "backorderDeleteReq": {
      "999999": {
        "111111": 1557298284
      }
    },
    "currentEmail": "customer@example.com",
    "inboxSignature": "Mvh, \nJane Dealer",
    "shipping": {
      "addresses": [
        {
          "customerno": "999999",
          "id": "<redacted>",
          "recipient": "Your customer name",
          "street": "Example Street",
          "street2": "",
          "streetNumber": "1",
          "postalCode": "0000",
          "city": "Example City",
          "country": "AT",
          "selectedAddress": 1,
          "created": "2020-05-11T06:58:26.552Z",
          "log": [
            {
              "action": "create",
              "dealer": 999999,
              "dealerName": "Jane Dealer",
              "dealerEmail": "customer@example.com"
            }
          ]
        }
      ],
      "contacts": [
        {
          "customerno": "999999",
          "id": "<redacted>",
          "name": "Jane Dealer",
          "phone": "",
          "email": "",
          "selectedContact": 1,
          "created": "2020-05-11T06:58:41.392Z",
          "log": [
            {
              "action": "create",
              "dealer": 999999,
              "dealerName": "Jane Dealer",
              "dealerEmail": "customer@example.com"
            }
          ]
        }
      ]
    },
    "termsAndConditions": {
      "1": {
        "article": {
          "id": 3164,
          "title": "Terms and Conditions",
          "body": "PRE-SEASON PRICING... (truncated for brevity)",
          "create_date": "2020-01-27T12:24:36.953Z",
          "updated": "2020-05-26T11:25:37+02:00",
          "tag": 407,
          "tags": [
            {
              "id": 407,
              "name": "terms-and-conditions"
            }
          ],
          "status": 2,
          "version": 1,
          "images": {}
        },
        "acceptedTerms": "PRE-SEASON PRICING... (truncated for brevity)",
        "acceptedDate": "2020-05-26T09:30:28.154Z"
      }
    },
    "csvDownloads": {
      "sa": 1,
      "regal": 1,
      "simms": 22
    },
    "csvAdminDownloads": {
      "simms": 13,
      "whiting": 2
    },
    "useragent": {
      "isYaBrowser": false,
      "isAuthoritative": true,
      "isMobile": false,
      "isMobileNative": false,
      "isTablet": false,
      "isiPad": false,
      "isiPod": false,
      "isiPhone": false,
      "isiPhoneNative": false,
      "isAndroid": false,
      "isAndroidNative": false,
      "isBlackberry": false,
      "isOpera": false,
      "isIE": false,
      "isEdge": false,
      "isIECompatibilityMode": false,
      "isSafari": false,
      "isFirefox": false,
      "isWebkit": false,
      "isChrome": false,
      "isKonqueror": false,
      "isOmniWeb": false,
      "isSeaMonkey": false,
      "isFlock": false,
      "isAmaya": false,
      "isPhantomJS": false,
      "isEpiphany": false,
      "isDesktop": false,
      "isWindows": false,
      "isLinux": false,
      "isLinux64": false,
      "isMac": false,
      "isChromeOS": false,
      "isBada": false,
      "isSamsung": false,
      "isRaspberry": false,
      "isBot": false,
      "isCurl": false,
      "isAndroidTablet": false,
      "isWinJs": false,
      "isKindleFire": false,
      "isSilk": false,
      "isCaptive": false,
      "isSmartTV": false,
      "isUC": false,
      "isFacebook": false,
      "isAlamoFire": false,
      "isElectron": false,
      "silkAccelerated": false,
      "browser": "unknown",
      "version": "unknown",
      "os": "unknown",
      "platform": "unknown",
      "geoIp": {},
      "source": "Amazon CloudFront",
      "isWechat": false
    }
  }
}
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
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/dealers/info'
```

**Node.js SDK**

```javascript
const FFE = require('@flyfisheurope/ffe-api-sdk');
const ffe = new FFE('<your token>');
ffe.dealerInfo()
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
```

**PHP SDK**

```php
<?php
require 'ffe.php';
$ffe = new FFE('<your token>');
$result = $ffe->dealerInfo();
print_r($result);
```
