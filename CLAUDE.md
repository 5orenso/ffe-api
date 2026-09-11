# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Public documentation and client SDKs for the Flyfish Europe Dealer JSON REST API. **There is no server code here.** The API itself is served by DealerWeb at `https://dealer.flyfisheurope.com` (a separate, private codebase). Do not look for route handlers, models or database code in this repo.

Three things live here:

- **Endpoint docs**: `README.md` (auth, status codes, index), `openapi.yaml` (source of truth) and the generated per-resource pages in `docs/reference/`. The root `brands.md`, `categories.md`, `products.md`, `baskets.md` are redirect stubs kept for old links. The guide for dealers lives in `docs/` (see Guide layout below).
- **SDKs** in `sdk/`: `sdk/node.js/ffe.js` (published to npm as `@flyfisheurope/ffe-api-sdk`) and `sdk/php/ffe.php` (composer name `ffe/api`).
- **Examples** in `example/`: browser JavaScript, Node.js and PHP.

## Commands

Root tooling (spec lint, generators, generator tests) lives in the root `package.json`; see the spec tooling block below. Node SDK tests: `cd sdk/node.js && npm test` (stub HTTP server, no token needed).

```bash
# Sanity-check the Node SDK loads
node -e "require('./sdk/node.js/ffe.js')"

# Lint the PHP SDK / example (requires php with the curl extension)
php -l sdk/php/ffe.php
php -l example/php/ffe.php

# Run the examples (token from the environment)
FFE_TOKEN=<token> node example/node.js/simple-dist.js
FFE_TOKEN=<token> php example/php/ffe.php

# Run the browser example (from example/javascript/README.md)
python3 -m http.server 9999   # from the repo root
open http://localhost:9999/example/javascript/html-client.html
```

Examples read the token from `FFE_TOKEN` and require the SDK by relative path, so they run as-is.

### Releasing the Node SDK

```bash
# 1. Bump "version" in sdk/node.js/package.json, commit, and push to master
# 2. Then:
cd sdk/node.js && ./npm-release.sh
```

`npm-release.sh` needs `jq` (`brew install jq`) and reads a GitHub token from a `token = ...` line in `~/.gitconfig`. It creates a GitHub release tagged with the package version against the remote `master` branch, then runs `npm publish`. It does not bump the version or commit anything itself.

```bash
# Spec tooling (repo root)
npm install
npm run lint:spec       # validate openapi.yaml
npm run gen:reference   # regenerate docs/reference/*.md (never edit those by hand)
npm run gen:postman     # regenerate postman/ffe-api.postman_collection.json
npm test                # generator unit tests
npm run check           # spec lint + generated reference and Postman collection up to date + recipe pages in sync + doc rules (links, TODO, banned words, tokens)
npm run sync:recipes    # re-embed example/recipes/* into the recipe pages after editing a script
FFE_TOKEN=... npm run verify:examples   # run every recipe script against the live API (writes one basket line and removes it)
FFE_TOKEN=... node scripts/probe.js GET /api/brands/ brands-list   # record a live call to scripts/probes/ (gitignored)
```

`.github/workflows/ci.yml` runs `npm test`, `npm run check`, the Node SDK tests and `php -l` on every push; the live `verify:examples` run is manual only.

## Architecture

### Authentication model

Every request sends `Authorization: Bearer <jwt>`. Dealers create tokens in DealerWeb under My Account. There are two kinds: server-side tokens (secret, for backends) and client-side tokens (safe to embed in browser JS). `POST /login/` with `{ email, pass }` returns `{ status, apiToken, message }`; the returned `apiToken` is what should be used for subsequent API calls.

### The two SDKs mirror each other

Both SDKs are a single dependency-free class named `FFE` with the same constructor and the same core method names: `login`, `brand`/`brands`, `category`/`categories`, `product`/`products`, `baskets`, `setBasketLine`, `dealerInfo`, and the POS methods (`posAddSale`, `posSales`, `posAddProduct`, `posEditProduct`, `posProducts`), which are implemented in Node and are throwing `Not implemented` stubs in PHP. When adding an endpoint, add it to both SDKs (or an explicit not-implemented stub in PHP), add the operation to `openapi.yaml` with `x-sdk-node`/`x-sdk-php` strings, run `npm run gen:reference` and `npm run gen:postman`, and link the generated page from `README.md`.

Constructor: `new FFE(jwtToken, options)` where `options` may set `hostname`, `port`, `https` (PHP also `debug`). This is how you point the SDK at a local API server (the docs' curl samples use `http://localhost:8000`).

Behavioural differences to keep in mind when touching either side:

- **Protocol**: both SDKs use https unless `https` is explicitly set to `false` (Node) or `0` (PHP).
- **Error handling**: Node resolves with whatever JSON the server returned for any HTTP status and only rejects on network errors; a non-JSON body resolves to `{ code: 500, error: 'Invalid JSON from server', ... }`. PHP throws an `Exception` on any non-200 response or curl failure and returns associative arrays.
- **POST encoding**: Node sends `application/json`; PHP sends `application/x-www-form-urlencoded` via `http_build_query`.
- **Query strings**: Node omits undefined/null/'' values; PHP includes every key.

### Browser client

`sdk/javascript/ffe-api-sdk.js` is an IIFE that uses `fetch` and is configured through globals set before the script tag: `FFE_TOKEN` (required), `FFE_URL` (default `https://dealer.flyfisheurope.com/api`). The demo page `example/javascript/html-client.html` loads it by relative path and is tightly coupled to its element ids (`#productList`, `#categoryList`, `#product...`, `#productPagination`), not a reusable SDK. Its availability mapping (yes / no / `D.M.YY` date / "10+" / number) matches the live API; the verified field semantics are in the `Product` schema in `openapi.yaml`.

### Endpoint doc template

The per-resource pages are now generated into `docs/reference/` by `scripts/gen-reference.js`: URL table, parameter table, request body, responses with examples, then curl/Node/PHP sample calls. The template lives in that script, not in Markdown — do not hand-edit the generated pages.

### OpenAPI spec is the source of truth

`openapi.yaml` is the single source of truth for endpoints. `docs/reference/` and `postman/` are generated from it by the scripts in `scripts/`; edit the spec and regenerate. Operations carry `x-sdk-node` and `x-sdk-php` strings used as the SDK sample call in the generated pages, and `x-verified: false` marks operations not confirmed against the live API.

### Node SDK tests

`sdk/node.js/test/ffe.test.js` spins up a local `http` stub server (`server.unref()` + `closeAllConnections()` so `node --test` exits) and asserts the exact request path, headers and body the SDK sends, plus the resolved value. Add a test there for every SDK behaviour change.

### Verified API behaviour (2026-09)

- Unknown ids on every by-id endpoint return HTTP 200 with `{}` (never 404).
- Products default page size is 25 with no cap observed up to 3000.
- `unique=true` on `/api/products/` returned HTTP 504 in every attempt, so its output shape is unverified.
- `availability` dates are `D.M.YY`/`DD.MM.YY`, not ISO.
- `/login/` and the POS write operations are marked `x-verified: false` in the spec.
- The test dealer account only sees Simms categories, so brand-filter behaviour on categories is unverified.
- Basket writes (2026-09-10, verified live twice, including a real add/update/remove against the dealer's own basket): `PATCH /api/baskets/` with JSON `{id, qty}` — `id` must be the numeric product id from `/api/products/`, NOT `articleno`/`productNo` (those are silently accepted but leave `data.id` null, and nothing is persisted); `qty: 0` removes the line, any other value upserts it in place (no duplicate). `POST /api/baskets/` returns `400 {"error":"No such route","status":400}` and `PUT /api/baskets/` returns a deceptive `201` that changes nothing — PATCH is the only write method that works. `OPTIONS /api/baskets/`'s `Access-Control-Allow-Methods` header lists `POST`, but the plain `Allow` header (and the route table) does not — the CORS header is not a reliable route inventory. See `openapi.yaml`'s `setBasketLine` operation and `docs/recipes/ordering-with-baskets.md`.

### Guide layout

The dealer-facing guide lives in `docs/`:

- `docs/getting-started.md` — first request walkthrough (curl, Node, PHP).
- `docs/concepts.md` — data model, variants, availability, images, prices, pagination, rate limiting.
- `docs/recipes/` — recipe pages (sync catalog, keep content updated, stock and price lookup, ordering with baskets) that embed the runnable scripts kept in `example/recipes/`.
- `docs/platforms/` — where a sync script fits into a given shop or language.
- `docs/reference/` — generated per-resource pages; do not hand-edit (see Endpoint doc template above).
- `docs/errors.md`, `docs/troubleshooting.md`, `docs/faq.md`.
- `docs/README.md` — index of the above.

Rules for touching the guide:

- Recipe pages embed complete Node and PHP scripts. Every recipe script change is run live with `FFE_TOKEN=... npm run verify:examples` before it is merged.
- Every list request in guide code passes `limit`: the default page size is 25 and `articleNoIn` batches are silently truncated without it.
- `unique=true` is never used in guide code — it returns HTTP 504 in every observed call. Variants are grouped client-side by brand + `nameDisplay` instead.
- Facts in the guide come only from `openapi.yaml` and `docs/reference/`, never assumption.
- Doc-wide checks before merging a guide change: `npm run check` (from the repository root). It must exit 0. It runs the spec lint, confirms `docs/reference/` matches `openapi.yaml`, confirms every recipe page embeds its `example/recipes/` file unchanged, and applies the four rules implemented in `scripts/check-docs.js`: every relative link target exists, no `TODO`/`TBD`, no `password|salt|hash|security` outside `docs/reference/` (generated pages may name the `/login/` request's `pass` field or a checksum field), and no `eyJ` (a token). Fix the page, never the check.
- Recipe scripts live in `example/recipes/` (Node and PHP). A recipe page embeds a script through a `<!-- recipe: example/recipes/... -->` marker directly above the code fence; edit the file, then run `npm run sync:recipes`. Never edit the fenced copy in the page.
