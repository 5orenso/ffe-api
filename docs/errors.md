# Errors

This page lists every HTTP status the API is verified to return, the exact body you get
back where one has been observed, and what to do about it. Read
[Getting started](./getting-started.md) first if you haven't made a request yet, and see
[Concepts](./concepts.md) for the ideas (tokens, variants, rate limiting) referenced below.

## Status codes

| Status | When | Body | What to do |
|--------|------|------|------------|
| 200 | Every successful call — including a call for an id that does not exist. | Varies by endpoint: an array for list endpoints, an object for single-resource endpoints. An unknown id still comes back as 200 with `{}` — see [Errors that look like success](#errors-that-look-like-success) below. | Treat 200 as "the server answered," not "the thing you asked for exists." Check whether the body is actually empty. |
| 201 | `PATCH /api/baskets/` (`setBasketLine`), on every add, update or remove — observed 2026-09-10, verified live twice. | `{"status": 201, "message": "Basket update", "data": {"qty": <n>, "price": null, "retailPrice": null, "id": <numeric product id or null>, "addedFrom": "api", "addedBy": "<your email>"}}`. `PUT /api/baskets/` also returns `201` (`{"status": 201, "message": "Basket updated"}`) but never actually changes anything — see the row below and [Errors that look like success](#errors-that-look-like-success). | A `201` alone doesn't mean the write persisted — check `data.id` is not `null`, and confirm with `GET /api/baskets/`. See [docs/reference/baskets.md](./reference/baskets.md) and the [ordering with baskets recipe](./recipes/ordering-with-baskets.md). |
| 400 | An unsupported method/path under `/api/baskets/` — observed 2026-09-10 on every `POST /api/baskets/` attempt (any body, any encoding), regardless of the body shape. | `{"error": "No such route", "status": 400}`. | Use `PATCH /api/baskets/`, not `POST` — see the [ordering with baskets recipe](./recipes/ordering-with-baskets.md#what-the-write-actually-does). |
| 401 | A malformed or invalid token — present but not one the server accepts — on every endpoint. Expired token: not observed (no token old enough to test this was available). | Documented in `openapi.yaml` as the `Unauthorized` response: `{"status": 401, "message": "Invalid JwtToken: UnauthorizedError", "reason": "jwt malformed"}`. `POST /login/` uses a different 401 body when the login itself fails: `{"status": 401, "message": "Login failed"}` (documented from the SDKs, not yet verified against the live API). | Check your `Authorization` header — see [Troubleshooting: 401 but my token is right](./troubleshooting.md#401-but-my-token-is-right). |
| 403 | No `Authorization` header at all, on every endpoint — observed 2026-09-10 on `/api/brands/`. | Documented in `openapi.yaml` as the `Forbidden` response: `{"status": 403, "message": "Forbidden! No access to this endpoint!"}`. | Send the header — see [Troubleshooting: 403 Forbidden! No access to this endpoint!](./troubleshooting.md#403-forbidden-no-access-to-this-endpoint). |
| 504 | Every observed call to `GET /api/products/?unique=true`, with or without other filters (`limit=1`, a single `mainCat`, `brand`, `gtin`, `articleNoIn` or `nameDisplay` narrowing it to one item — all still 504). | Empty body — not JSON, so no schema is documented for it. | Do not send `unique=true` today. Group variants yourself — see [Concepts: Variants](./concepts.md#variants). |
| 429 | Reserved for rate limiting ("Too many requests"), per the root [README](../README.md). Rate limiting is **not active today**, so this status has not been observed. | Not observed — no body has been documented. | Be polite pre-emptively: make requests one at a time and use a larger `limit` for bulk syncs — see [Concepts: Rate limiting](./concepts.md#rate-limiting). |

Other statuses that appear in `openapi.yaml` — for example 202 on the point-of-sale write
operations, which are marked `x-verified: false` in the spec — have not been observed
against the live API. If you hit one that isn't in the table above, treat its body as
unconfirmed rather than assuming it matches the spec, and consider it worth a report to
Flyfish Europe through DealerWeb.

## Errors that look like success

Some responses carry HTTP 200 or 201 (or, for one SDK, a resolved Promise) while still
meaning "this didn't work the way you expected." Watch for these:

- **`PATCH /api/baskets/` with the wrong id field, and `PUT /api/baskets/` entirely, →
  HTTP 201 that changes nothing.** Sending `articleno` or `productNo` instead of the
  numeric product `id` to `setBasketLine`/`PATCH /api/baskets/` returns a `201` with a
  `data` object that looks successful, but `data.id` is `null` and the basket is
  unchanged. `PUT /api/baskets/` returns `201 {"status": 201, "message": "Basket
  updated"}` for any body, with no effect at all. Always confirm with
  `GET /api/baskets/` — see the [ordering with baskets
  recipe](./recipes/ordering-with-baskets.md#what-the-write-actually-does).
- **Unknown id → HTTP 200 with `{}`.** Every by-id endpoint (`GET /api/brands/:brandno`,
  `GET /api/categories/:categoryno`, `GET /api/products/:articleno`, `GET
  /api/pos/sales/:id`, `GET /api/pos/products/:id`) returns HTTP 200 with an empty object
  body for an id it doesn't recognize — never HTTP 404. This is documented and verified for
  each of those endpoints in `openapi.yaml` (the `unknownBrandno`, `unknownCategoryno`,
  `unknownArticleno` and `unknownId` examples). Always check whether the object you got
  back is empty before reading fields off it.
- **An empty array for a filter with no matches.** A list endpoint (`GET /api/products/`,
  `GET /api/categories/`, ...) that matches nothing still returns HTTP 200 with `[]`. That
  is not an error — it means your filter was valid and simply matched zero rows. Check the
  array's length before assuming something is broken.
- **Node SDK: `Invalid JSON from server`.** The Node SDK's Promise only *rejects* on a
  network error. If the server's response body isn't valid JSON — which happens, for
  example, with the empty body that comes back on the `unique=true` 504 above — the
  Promise still *resolves*, but with `{ code: 500, error: 'Invalid JSON from server',
  message: '<raw response body>', hostname, port, path, method }` instead of the data you
  asked for (see [sdk/node.js/README.md](../sdk/node.js/README.md)). A bare
  `.then((result) => ...)` handler will treat this as success unless you check the shape of
  `result` yourself.
- **PHP SDK: `Not authorized`.** The PHP SDK throws an `Exception` with this exact message
  whenever the HTTP status is 401, instead of returning a value (see
  `curlExec()` in [sdk/php/ffe.php](../sdk/php/ffe.php)). Code that doesn't wrap SDK calls
  in `try`/`catch` will crash here rather than receiving an error value to check.
- **PHP SDK: `No data from API`.** The same `Exception` is thrown, with this message
  instead, for any other status outside the 2xx range (200, 201, ...) or when the
  underlying curl request itself fails (a network problem, not an HTTP response at all).
  If curl reported its own error text,
  the PHP SDK appends it after a colon — see
  [Troubleshooting: PHP: `No data from API`](./troubleshooting.md#php-no-data-from-api).
