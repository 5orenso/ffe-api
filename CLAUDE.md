# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Public documentation and client SDKs for the Flyfish Europe Dealer JSON REST API. **There is no server code here.** The API itself is served by DealerWeb at `https://dealer.flyfisheurope.com` (a separate, private codebase). Do not look for route handlers, models or database code in this repo.

Three things live here:

- **Endpoint docs**: `README.md` (auth, status codes, index), `openapi.yaml` (source of truth) and the generated per-resource pages in `docs/reference/`. The root `brands.md`, `categories.md`, `products.md`, `baskets.md` are redirect stubs kept for old links.
- **SDKs** in `sdk/`: `sdk/node.js/ffe.js` (published to npm as `@flyfisheurope/ffe-api-sdk`) and `sdk/php/ffe.php` (composer name `ffe/api`).
- **Examples** in `example/`: browser JavaScript, Node.js and PHP.

## Commands

Root tooling (spec lint, generators, generator tests) lives in the root `package.json`; see the spec tooling block below. `npm test` in `sdk/node.js` is still a placeholder that exits 1 (SDK tests are added in Phase 2).

```bash
# Sanity-check the Node SDK loads
node -e "require('./sdk/node.js/ffe.js')"

# Lint the PHP SDK / example (requires php with the curl extension)
php -l sdk/php/ffe.php
php -l example/php/ffe.php

# Run the PHP example (edit $token/$email/$password in the file first)
cd example/php && php ffe.php

# Run the browser example (from example/javascript/README.md)
cd example/javascript && python -m SimpleHTTPServer 9999   # or: python3 -m http.server 9999
open http://localhost:9999/html-client.html
```

The Node example `example/node.js/simple-dist.js` does `require('./ffe')`, which is not checked in. Copy `sdk/node.js/ffe.js` into `example/node.js/` (or point the require at `../../sdk/node.js/ffe.js`) before running it. `example/node.js/simple.js` is gitignored for a local copy that holds a real token.

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
FFE_TOKEN=... node scripts/probe.js GET /api/brands/ brands-list   # record a live call to scripts/probes/ (gitignored)
```

## Architecture

### Authentication model

Every request sends `Authorization: Bearer <jwt>`. Dealers create tokens in DealerWeb under My Account. There are two kinds: server-side tokens (secret, for backends) and client-side tokens (safe to embed in browser JS). `POST /login/` with `{ email, pass }` returns `{ status, apiToken, message }`; the returned `apiToken` is what should be used for subsequent API calls.

### The two SDKs mirror each other

Both SDKs are a single dependency-free class named `FFE` with the same constructor and the same core method names: `login`, `brand`/`brands`, `category`/`categories`, `product`/`products`. The Node SDK additionally has `dealerInfo` (`/api/dealers/info`) and POS methods (`posAddSale`, `posSales`, `posAddProduct`, `posEditProduct`, `posProducts` on `/api/pos/...`); in the PHP SDK the POS methods exist but throw `Not implemented`. When adding an endpoint, add it to both SDKs (or an explicit not-implemented stub in PHP), add the operation to `openapi.yaml` with `x-sdk-node`/`x-sdk-php` strings, run `npm run gen:reference` and `npm run gen:postman`, and link the generated page from `README.md`.

Constructor: `new FFE(jwtToken, options)` where `options` may set `hostname`, `port`, `https` (PHP also `debug`). This is how you point the SDK at a local API server (the docs' curl samples use `http://localhost:8000`).

Behavioural differences to keep in mind when touching either side:

- **Login token swap**: PHP `login()` replaces the instance token with the returned `apiToken`. Node `login()` only returns the response; the caller must construct a new client with `apiToken`.
- **Node `https` option**: if any `options` object is passed and `options.https` is falsy, the client silently switches to plain `http`. PHP only changes protocol when `https` is explicitly set.
- **Error handling**: Node resolves with whatever JSON the server returned for any HTTP status and only rejects on network errors; a non-JSON body resolves to `{ code: 500, error: 'Invalid JSON from server', ... }`. PHP throws an `Exception` on any non-200 response or curl failure and returns associative arrays.
- **POST encoding**: Node sends `application/json`; PHP sends `application/x-www-form-urlencoded` via `http_build_query`.
- **Query strings**: Node's `makeQueryString` drops keys with falsy values (so `{ isNew: 0 }` is omitted); PHP includes every key.

### Browser client

`example/javascript/ffe-api-sdk.js` is an IIFE that uses `fetch` and is configured through globals set before the script tag: `FFE_TOKEN` (required), `FFE_URL` (default `https://dealer.flyfisheurope.com/api`), `FFE_IMAGE_DOMAIN`. It is demo code tightly coupled to the element ids in `html-client.html` (`#productList`, `#categoryList`, `#product...`, `#productPagination`), not a reusable SDK. It also contains an availability mapping (yes / no / date / "10+" / number), but its date branch expects ISO `YYYY-MM-DD` while the live API returns `D.M.YY`, so that branch never matches; the verified field semantics are in `docs/reference/products.md`.

### Endpoint doc template

The per-resource pages are now generated into `docs/reference/` by `scripts/gen-reference.js`: URL table, parameter table, request body, responses with examples, then curl/Node/PHP sample calls. The template lives in that script, not in Markdown — do not hand-edit the generated pages.

### OpenAPI spec is the source of truth

`openapi.yaml` is the single source of truth for endpoints. `docs/reference/` and `postman/` are generated from it by the scripts in `scripts/`; edit the spec and regenerate. Operations carry `x-sdk-node` and `x-sdk-php` strings used as the SDK sample call in the generated pages, and `x-verified: false` marks operations not confirmed against the live API.

### Known inconsistencies

- `README.md` and `example/javascript/README.md` link to `./sdk/javascript/` and a rawgit URL under `sdk/javascript/`; that directory does not exist. The browser client lives in `example/javascript/`.
- `sdk/node.js/README.md` and `demo.js` still reference the unscoped package name `ffe-api-sdk`; `package.json` publishes as `@flyfisheurope/ffe-api-sdk`.

### Verified API behaviour (2026-09)

- Unknown ids on every by-id endpoint return HTTP 200 with `{}` (never 404).
- Products default page size is 25 with no cap observed up to 3000.
- `unique=true` on `/api/products/` returned HTTP 504 in every attempt, so its output shape is unverified.
- `availability` dates are `D.M.YY`/`DD.MM.YY`, not ISO.
- `/login/` and the POS write operations are marked `x-verified: false` in the spec.
- The test dealer account only sees Simms categories, so brand-filter behaviour on categories is unverified.
