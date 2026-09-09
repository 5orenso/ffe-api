# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Public documentation and client SDKs for the Flyfish Europe Dealer JSON REST API. **There is no server code here.** The API itself is served by DealerWeb at `https://dealer.flyfisheurope.com` (a separate, private codebase). Do not look for route handlers, models or database code in this repo.

Three things live here:

- **Endpoint docs** at the repo root: `README.md` (auth, status codes, index) plus one file per resource (`brands.md`, `categories.md`, `products.md`, `baskets.md`).
- **SDKs** in `sdk/`: `sdk/node.js/ffe.js` (published to npm as `@flyfisheurope/ffe-api-sdk`) and `sdk/php/ffe.php` (composer name `ffe/api`).
- **Examples** in `example/`: browser JavaScript, Node.js and PHP.

## Commands

There is no build, lint or test suite. `npm test` in `sdk/node.js` is a placeholder that exits 1.

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

## Architecture

### Authentication model

Every request sends `Authorization: Bearer <jwt>`. Dealers create tokens in DealerWeb under My Account. There are two kinds: server-side tokens (secret, for backends) and client-side tokens (safe to embed in browser JS). `POST /login/` with `{ email, pass }` returns `{ status, apiToken, message }`; the returned `apiToken` is what should be used for subsequent API calls.

### The two SDKs mirror each other

Both SDKs are a single dependency-free class named `FFE` with the same constructor and the same core method names: `login`, `brand`/`brands`, `category`/`categories`, `product`/`products`. The Node SDK additionally has `dealerInfo` (`/api/dealers/info`) and POS methods (`posAddSale`, `posSales`, `posAddProduct`, `posEditProduct`, `posProducts` on `/api/pos/...`); in the PHP SDK the POS methods exist but throw `Not implemented`. When adding an endpoint, add it to both SDKs (or an explicit not-implemented stub in PHP), add a doc file at the root, and link it from `README.md`.

Constructor: `new FFE(jwtToken, options)` where `options` may set `hostname`, `port`, `https` (PHP also `debug`). This is how you point the SDK at a local API server (the docs' curl samples use `http://localhost:8000`).

Behavioural differences to keep in mind when touching either side:

- **Login token swap**: PHP `login()` replaces the instance token with the returned `apiToken`. Node `login()` only returns the response; the caller must construct a new client with `apiToken`.
- **Node `https` option**: if any `options` object is passed and `options.https` is falsy, the client silently switches to plain `http`. PHP only changes protocol when `https` is explicitly set.
- **Error handling**: Node resolves with whatever JSON the server returned for any HTTP status and only rejects on network errors; a non-JSON body resolves to `{ code: 500, error: 'Invalid JSON from server', ... }`. PHP throws an `Exception` on any non-200 response or curl failure and returns associative arrays.
- **POST encoding**: Node sends `application/json`; PHP sends `application/x-www-form-urlencoded` via `http_build_query`.
- **Query strings**: Node's `makeQueryString` drops keys with falsy values (so `{ isNew: 0 }` is omitted); PHP includes every key.

### Browser client

`example/javascript/ffe-api-sdk.js` is an IIFE that uses `fetch` and is configured through globals set before the script tag: `FFE_TOKEN` (required), `FFE_URL` (default `https://dealer.flyfisheurope.com/api`), `FFE_IMAGE_DOMAIN`. It is demo code tightly coupled to the element ids in `html-client.html` (`#productList`, `#categoryList`, `#product...`, `#productPagination`), not a reusable SDK. It also contains the reference implementation of the `availability` field mapping (yes / no / ISO date / "10+" / number) described in `products.md`.

### Endpoint doc template

Each resource file follows the same layout: URL table (OPTIONS for CORS, GET list, GET by id), URL params, query string params, success response JSON, 401 error response, then curl and Node `https` sample calls. Follow this layout for new resources. `products.md` has the richest query-param table (brand/maingroup/intgroup/subgroup names, `mainCat`/`intCat`/`subCat` numbers, `gtin`, `articleNoIn`, `search`, `unique`, `isNew`).

### Known inconsistencies

- `README.md` and `example/javascript/README.md` link to `./sdk/javascript/` and a rawgit URL under `sdk/javascript/`; that directory does not exist. The browser client lives in `example/javascript/`.
- `sdk/node.js/README.md` and `demo.js` still reference the unscoped package name `ffe-api-sdk`; `package.json` publishes as `@flyfisheurope/ffe-api-sdk`.
- `baskets.md` documents `/api/baskets/` but no SDK wraps it, and its sample calls were copied from `brands.md`. Conversely `/api/dealers/info` and `/api/pos/*` are in the Node SDK but have no doc file.
