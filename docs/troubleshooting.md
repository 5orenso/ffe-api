# Troubleshooting

Symptom-first fixes for the problems developers hit most often. If you want the full list
of status codes and bodies instead, see [Errors](./errors.md). Background on tokens,
variants, dates and rate limiting is in [Concepts](./concepts.md).

## 401 but my token is right

**Cause.** A 401 means the server received an `Authorization` header but couldn't
validate the token inside it — a request with no `Authorization` header at all gets a
different status, HTTP 403; see
[403 Forbidden! No access to this endpoint!](#403-forbidden-no-access-to-this-endpoint)
below for that case. A 401 with a header present happens for a few reasons that all look
like "but I definitely have a token":

- The `Authorization` header is missing the word `Bearer ` (with the trailing space), or
  spells it differently. The header must be exactly `Bearer <your token>`.
- You pasted something that isn't an API token at all — for example your DealerWeb sign-in
  details instead of a token created under My Account. A value like that doesn't parse as a
  token, so it will most likely be rejected with the same 401 body:
  `{"status": 401, "message": "Invalid JwtToken: UnauthorizedError", "reason": "jwt
  malformed"}` (see [Errors](./errors.md)).
- The token was created for a different DealerWeb account than the one whose data you
  expect to see.
- The token has stray whitespace or a line break around it, picked up when copying it out
  of DealerWeb or out of a `.env` file. A trailing newline is invisible in most editors but
  breaks the header value.

**Fix.** Rebuild the header from scratch: copy the token fresh from DealerWeb under My
Account, and set the header to `Bearer <token>` with nothing else around it. Confirm with
the plain `curl` call from [Getting started, Step 2](./getting-started.md) before moving
back to your own code — if that call works, the problem is in how your code builds the
header, not the token itself.

## 403 Forbidden! No access to this endpoint!

**Cause.** No `Authorization` header was sent with the request at all — not a malformed
or wrong token (see [401 but my token is right](#401-but-my-token-is-right) above for
that), but the header missing entirely. Observed 2026-09-10 on `/api/brands/`:

```json
{
  "status": 403,
  "message": "Forbidden! No access to this endpoint!"
}
```

This is easy to hit by accident: a typo in the header name (`Authorisation` instead of
`Authorization`), an HTTP client or library that needs headers set a different way than
you expect, or a request sent from a quick test (`curl` without `-H`, a bare `fetch` with
no `headers` option) before the header was wired in.

**Fix.** Confirm the header is actually going out on the wire — `curl -v` prints every
request header it sends, and most language HTTP clients/proxies let you inspect the
outgoing request the same way — and that its name is exactly `Authorization`. If a header
is present but still rejected, that's the 401 case above, not this one.

## I get `{}` for a product

**Cause.** The `articleno` you asked for doesn't exist for your dealer account.
`GET /api/products/:articleno` returns HTTP 200 with an empty object for an unknown
`articleno` instead of HTTP 404 — see [Errors: Errors that look like
success](./errors.md#errors-that-look-like-success).

**Fix.** Don't guess article numbers. Use `articleNoIn` (a comma-separated list) or
`search` (free text) on `GET /api/products/` to find the right value first, then fetch it
by id. See [docs/reference/products.md](./reference/products.md) for both parameters.

## I got 201 from the basket but nothing was added

**Cause.** `PATCH /api/baskets/` (`setBasketLine`) returns HTTP 201 with a `data` object
that *looks* successful even when the write didn't identify a product. The most common
reason: the request body used `articleno` (or `productNo`) instead of the numeric product
`id` — `articleno` is the SKU string documented on [products.md](./reference/products.md)
(e.g. `"13960-096-10"`), but `PATCH /api/baskets/` only accepts the numeric `id` field
(e.g. `613599`) from `GET /api/products/`. Sending the wrong field is silently accepted;
nothing in the request is rejected, and the response's `data.id` is simply `null`.

**Fix.** Send `{"id": <numeric product id>, "qty": <n>}`, not `{"articleno": ...}`. Get
the numeric `id` from `products()`/`product()` (or your `catalog.json`'s
`variants[].id` — see the [sync catalog recipe](./recipes/sync-catalog.md)), and always
check `data.id` in the `PATCH` response (and confirm with `GET /api/baskets/`,
`baskets()`) rather than trusting the `201` status code alone. See the [ordering with
baskets recipe](./recipes/ordering-with-baskets.md) for the full verified flow.

## `unique=true` returns 504

**Cause.** Every observed call to `GET /api/products/?unique=true` — alone, with `limit=1`,
or narrowed to a single item with `mainCat`, `brand`, `gtin`, `articleNoIn` or
`nameDisplay` — returned HTTP 504 Gateway Timeout with an empty body. This is not something
in your request; it reproduces every time.

**Fix.** Don't send `unique=true`. Group variants into shop products yourself, using
`brand` and `nameDisplay` — see [Concepts: Variants](./concepts.md#variants) for the
grouping code.

## CORS error in the browser

**Cause.** Two unrelated things commonly show up as a CORS error in the browser console:

- Opening your HTML file directly from disk (a `file://` URL) instead of serving it over
  `http://` or `https://`. Browsers handle `fetch` and the CORS preflight differently — or
  block it outright — from a `file://` origin.
  `/api/brands/`, `/api/baskets/`, `/api/pos/sales/` and `/api/pos/products/` were verified
  to answer the browser's `OPTIONS` preflight request correctly — see
  [Concepts: CORS](./concepts.md#cors). The other endpoints are expected to behave the same
  way but haven't been checked individually, so an unexpected CORS failure on one of them
  is worth a report to Flyfish Europe through DealerWeb rather than assuming it's your code.

**Fix.** Serve the page over HTTP instead of opening the file, for example
`python3 -m http.server 9999` from the directory holding your page, then open
`http://localhost:9999/...`. Use a **client-side** token in browser code — never a
server-side one, since anything embedded in a page is visible to anyone who views its
source (see [Getting started, Step 1](./getting-started.md)).

## Node SDK connects to http instead of https

**Cause.** The Node SDK uses `https` by default. It only switches to plain `http` when you
explicitly pass `{ https: false }` in the constructor's `options`. When you do that, the
`port` does **not** change automatically — it stays at the default, 443 — so an `http`
request can end up pointed at a port that isn't serving plain `http`.

**Fix.** Whenever you set `https: false` (for example, to point the SDK at a local API
server for development), also set `port` explicitly to match, e.g.
`new FFE(token, { hostname: 'localhost', port: 8000, https: false })`. See
[sdk/node.js/README.md](../sdk/node.js/README.md) for the full constructor option table.

## PHP: `Not authorized`

**Cause.** The PHP SDK throws `new Exception('Not authorized')` specifically when the HTTP
status of a response is 401 (see `curlExec()` in
[sdk/php/ffe.php](../sdk/php/ffe.php)).

**Fix.** Same underlying problem as [401 but my token is right](#401-but-my-token-is-right)
above — check the token you passed into `new FFE(...)`. Wrap SDK calls in `try`/`catch` so
this exception doesn't crash your script; the `catch` block is where you'll see it.

## PHP: `No data from API`

**Cause.** The PHP SDK throws `new Exception('No data from API')` for any HTTP status
outside the 2xx range other than 401 (which gets the `Not authorized` message above), and
also when the underlying curl request fails outright (a network problem — no HTTP
response was received at all). When curl reports its own error text, the PHP SDK appends
it after a colon, e.g. `No data from API: Could not resolve host`.

**Fix.** Catch the `Exception` and read its message — it tells you whether this was a
network problem or an unexpected status. Turn on the constructor's `debug` option
(`new FFE($token, (object) ['debug' => 1])`) to echo each request and response while you
diagnose it, and call `lastCurlInfo()` after a failed call for the raw `curl_getinfo()`
details. See [sdk/php/README.md](../sdk/php/README.md).

## Dates look strange

**Cause.** Dates inside the `availability` field are not ISO `YYYY-MM-DD`. They use
`D.M.YY` / `DD.MM.YY` — day first, then month, then a two-digit year, e.g. `"02.01.27"`
for 2 January 2027 (only zero-padded examples have been observed live). Code that parses
them as ISO or as month-first will read the wrong date.

**Fix.** Parse `availability` with the day-first format in mind. See
[Concepts: Availability](./concepts.md#availability) for a mapping function, in both
JavaScript and PHP, that handles this shape along with the other `availability` values.

## My sync is slow

**Cause.** The most common reason is requesting data in pieces that are too small: paging
`GET /api/products/` with a small `limit`, or fetching one `articleno` per request when you
already know which ones you need.

**Fix.** Use a `limit` between 100 and 500 per page for a full catalog pull — see
[Concepts: Rate limiting](./concepts.md#rate-limiting). When you already have a list of
article numbers to refresh (for example, a nightly stock check), fetch them in batches with
`articleNoIn` — a comma-separated list — instead of one request per article. See
[docs/reference/products.md](./reference/products.md) for the parameter.
