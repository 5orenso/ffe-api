# Concepts

This page explains the ideas behind the API once, in one place, so the recipes and the
reference don't have to repeat them. Read [Getting started](./getting-started.md) first if
you haven't made a request yet.

## Authentication and tokens

Every request sends an HTTP header: `Authorization: Bearer <your token>`. There is no
session, cookie or API key query parameter — the token is the only thing that identifies
you. Create a token in DealerWeb under **My Account**; see
[Getting started, Step 1](./getting-started.md) for the difference
between server-side and client-side tokens.

There is also a `POST /login/` endpoint that exchanges your DealerWeb sign-in details for a
token, so you can obtain one without visiting DealerWeb:

```json
{
  "status": 200,
  "apiToken": "<jwt>",
  "message": "OK"
}
```

`/login/` is **not yet verified against the live API** — its request and response shapes
come from reading the SDK code, not from a confirmed live call. Prefer creating a token in
DealerWeb directly until this is verified. If you do use `/login/`, both the Node.js and
the PHP SDK switch the client to the returned `apiToken` automatically, so you don't have
to copy it yourself.

A malformed or invalid token gets you HTTP 401 on every endpoint, with this exact body:

```json
{
  "status": 401,
  "message": "Invalid JwtToken: UnauthorizedError",
  "reason": "jwt malformed"
}
```

Leaving the `Authorization` header off the request entirely gets you a *different*
status, HTTP 403 — observed 2026-09-10 on `/api/brands/`:

```json
{
  "status": 403,
  "message": "Forbidden! No access to this endpoint!"
}
```

An expired token hasn't been observed against the live API, so whether it behaves like a
malformed token (401) or a missing one (403) isn't confirmed either way. See
[Errors: Status codes](./errors.md#status-codes) for the full table.

## Data model

The catalog has three levels. A **brand** (identified by `brandno`, e.g. `simms`) is a
manufacturer. Each brand has **categories**, organized into three levels — `main`,
`intermediate` and `sub` — linked by a `parent` field that points at the `categoryno` of
the category one level up; a main-level category has `parent: null`. Under those
categories sit **products**.

What the API calls a "product" is really one variant: a single size/colour combination,
identified by `articleno`. A shop-facing "product" (one name, several sizes and colours)
is something you build yourself by grouping variants that share a name — see
[Variants](#variants) below. Every field of a product, with its type and meaning, is
listed under [Fields: Product](./reference/products.md#fields-product) in the reference.

Two real main-level categories look like this (trimmed):

```json
[
  {
    "categoryno": 101,
    "name": "Simms Waders",
    "level": "main",
    "parent": null
  },
  {
    "categoryno": 102,
    "name": "Simms Footwear",
    "level": "main",
    "parent": null
  }
]
```

Intermediate- and sub-level categories have the same shape, but `level` is `"intermediate"`
or `"sub"` and `parent` holds the `categoryno` of the category one level up instead of
`null`. To fetch the children of a category, call `categories({ parent: <categoryno> })` —
a verified filter: requesting `parent: 101` returns the 14 intermediate categories that sit
directly under category 101 ("Simms Waders"), every one of them carrying `parent: 101`.

## Variants

`/api/products/` returns one entry per variant, not one entry per shop product. Every
variant's own data includes a link that suggests grouping them with `unique=true`
(`apiLinkToProductGroup`), and the parameter is documented for exactly that purpose. It
does not currently work: every attempt to call `/api/products/?unique=true`, with or
without other filters, returned HTTP 504 Gateway Timeout with an empty body. Don't use it
today.

Instead, group variants yourself. Two variants belong to the same shop product when they
share the same `brand` and the same `nameDisplay`. For each group, collect the
per-variant fields you need — `size`, `color`, `articleno` and `tradeItemNumber` (the
barcode) — into a list:

```javascript
function groupVariants(products) {
  return Array.from(products.reduce((map, p) => {
    const key = `${p.brand}|${p.nameDisplay || p.name}`;
    const group = map.get(key) || { brand: p.brand, nameDisplay: p.nameDisplay || p.name, variants: [] };
    group.variants.push({ size: p.size, color: p.color, articleno: p.articleno, tradeItemNumber: p.tradeItemNumber });
    map.set(key, group);
    return map;
  }, new Map()).values());
}
```

Run against the 17 variants of one real product (`nameDisplay: "Bales Beach -
Polycarbonate"`), this returns one group containing all 17 `variants` entries.

## Availability

The `availability` field on a product is present on essentially every product, but its
value takes one of five shapes:

| Value | Meaning |
|-------|---------|
| `"Yes"` | In stock. |
| `"No"` | Out of stock. |
| A date like `"02.01.27"` | Expected back in stock on that date. Note the format is `D.M.YY` / `DD.MM.YY` (day first) — **not** ISO `YYYY-MM-DD`. |
| `"20+"` | In stock, at least 20 units. |
| A plain number, e.g. `5` | In stock, with exactly that many units. |

A shop typically only needs four states — in stock, out of stock, expected on a date, and
in stock with a known quantity — so the last two shapes collapse into one. Here is a
mapping function for each SDK.

**JavaScript**

```javascript
function shopAvailability(value) {
  if (value === 'Yes') return { status: 'in-stock' };
  if (value === 'No') return { status: 'out-of-stock' };
  if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(value)) return { status: 'expected', date: value };
  const match = String(value).match(/^(\d+)(\+)?$/);
  if (match) return { status: 'in-stock', quantity: parseInt(match[1], 10), exact: !match[2] };
  return { status: 'unknown' };
}
```

**PHP**

```php
function shopAvailability($value) {
    if ($value === 'Yes') {
        return ['status' => 'in-stock'];
    }
    if ($value === 'No') {
        return ['status' => 'out-of-stock'];
    }
    if (preg_match('/^\d{1,2}\.\d{1,2}\.\d{2}$/', $value)) {
        return ['status' => 'expected', 'date' => $value];
    }
    if (preg_match('/^(\d+)(\+)?$/', $value, $m)) {
        return ['status' => 'in-stock', 'quantity' => (int) $m[1], 'exact' => empty($m[2])];
    }
    return ['status' => 'unknown'];
}
```

## Images

Every product carries an `images` object with several pre-generated sizes, each a
complete, ready-to-use `https://` URL:

```json
{
  "small": "https://dealer.flyfisheurope.com/80x80/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
  "medium": "https://dealer.flyfisheurope.com/400x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg",
  "large": "https://dealer.flyfisheurope.com/800x/dealerweb-cms-50f660dc-2283-4544-bbb6-7e951bef1b46.jpg"
}
```

- `images.small` — an 80x80 thumbnail.
- `images.medium` — a 400px-wide image.
- `images.large` — an 800px-wide image.

Two further sizes, `images.xlarge` (1024px) and `images.xxlarge` (1280px), are also
present. A product with more than one photo also has `images.list`, an array of the same
five sizes for each additional image. Fetch the size you need directly — there is no need
to build the URL yourself.

## Prices

Use `retailPrice` together with `retailCurrency` as the price to show your customers —
this is the recommended consumer price, already in the currency configured on your dealer
account:

```json
{
  "retailPrice": 2199,
  "retailCurrency": "NOK"
}
```

The same product also carries dealer (wholesale) fields — `dealerCurrency`, `dealerPrice`,
`dealerEurPrice`, `dealerRepairPrice`, `dealerPresaleCurrency`, `dealerPresalePrice`,
`dealerAsapCurrency`, `dealerAsapPrice`, and the `pricelist`, `pricelistAsap`,
`pricelistPresale` and `pricelistPresaleAsap` maps (keyed by internal price-list number).
These are your own cost figures. Use them only for your own margin and cost calculations —
**never show a dealer price to a customer.**

The currency fields reflect your dealer account's price list.

## Pagination

List endpoints such as `/api/products/` accept `limit` and `offset` query parameters.
On `/api/products/`, the default `limit` is 25 when you don't send one, and there is no
observed upper cap — requesting `limit=1000` or more returns that many items in one call.
(`/api/categories/` behaves differently: its default limit appears to be 100, inferred from
`level=intermediate` returning exactly 100 items with no limit given — not directly
verified, per `docs/reference/categories.md` — so check the parameter table on each
endpoint's [reference page](./reference/) rather than assuming 25 everywhere.)

To fetch everything, keep requesting pages with an increasing `offset` until a page comes
back shorter than the `limit` you asked for:

```javascript
async function fetchAllProducts(ffe, brand) {
  const limit = 200;
  let offset = 0;
  let all = [];
  for (;;) {
    const page = await ffe.products({ brand, limit, offset });
    if (!Array.isArray(page)) throw new Error('API error: ' + JSON.stringify(page).slice(0, 300));
    all = all.concat(page);
    if (page.length < limit) break;
    offset += limit;
  }
  return all;
}
```

## Rate limiting

Rate limiting is not active today. The API reserves HTTP 429 ("Too many requests") for
when it is turned on, without further notice. Be polite regardless: make requests
sequentially rather than firing many at once, and for a full catalog sync use a `limit`
between 100 and 500 per page rather than the smallest possible page size.

## CORS

Before a browser lets a web page call another site's API with `fetch`, it first sends an
`OPTIONS` request of its own — a "preflight" — to ask whether the page is allowed to make
that call. `/api/brands/`, `/api/baskets/`, `/api/pos/sales/` and `/api/pos/products/` were
verified to answer this preflight correctly. The other endpoints are expected to behave the
same way but have not been checked individually.

If you call the API from a browser, use a **client-side token** (see
[Getting started, Step 1](./getting-started.md)) — never a server-side one, since anything
embedded in a web page is visible to anyone who views the page's source.
