# Flyfish Europe API guide overhaul — design

Date: 2026-09-09
Status: approved in chat, awaiting written review

## Goal

Turn this repo from an endpoint reference into the best possible introduction and integration guide for the Flyfish Europe Dealer API. The audience is less experienced developers at fly-fishing shops across Europe. They use PHP platforms (WooCommerce, PrestaShop, Magento, custom), Node.js, hosted shops with no code access (Shopify, Wix, Squarespace), and other languages (Python, C#, Java).

Use cases the guide must serve:

1. Sync the full product catalog into a webshop.
2. Keep product text and images up to date (pull FFE's latest content into the shop).
3. Look up stock and price for specific articles.
4. Ordering with baskets.

Not in scope: POS sales reporting guides (the endpoints stay in the reference), a hosted docs site (follow-up step B), new SDKs in other languages.

## Approach

Markdown in the repo, rendered by GitHub, plus a verified `openapi.yaml` as the single source of truth for the reference. The SDKs and examples are fixed so that everything the guide says is true. A test API token supplied by the owner is used to verify every endpoint live.

## 1. Repository layout

```
README.md                      landing page (short)
CLAUDE.md
docs/
  getting-started.md
  concepts.md
  errors.md
  troubleshooting.md
  faq.md
  recipes/
    sync-catalog.md
    keep-content-updated.md
    stock-and-price-lookup.md
    ordering-with-baskets.md
  platforms/
    php.md
    woocommerce.md
    prestashop.md
    magento.md
    nodejs.md
    browser.md
    hosted-shops.md
    other-languages.md
  reference/                   generated from openapi.yaml, do not edit by hand
    login.md
    brands.md
    categories.md
    products.md
    baskets.md
    dealers.md
    pos-sales.md
    pos-products.md
openapi.yaml
postman/ffe-api.postman_collection.json
scripts/
  gen-reference.js             openapi.yaml -> docs/reference/*.md
  gen-postman.js               openapi.yaml -> postman collection
  verify-examples.sh           runs every recipe script against the API
sdk/
  node.js/                     unchanged location
  php/                         unchanged location
  javascript/                  browser client moved here from example/javascript
example/
  node.js/
  php/
  javascript/                  html demo page only, loads ../../sdk/javascript/ffe-api-sdk.js
brands.md, categories.md, products.md, baskets.md
                               kept as one-line redirect stubs to docs/reference/
```

### README.md

- One paragraph: what the API is, who can use it, where to get a token (DealerWeb > My Account).
- "Your first product in 10 minutes": three steps (create token, one curl call, one SDK call), then a link to `docs/getting-started.md`.
- Table of contents in learning order: Getting started, Concepts, Recipes, Platforms, Reference, Errors, Troubleshooting, FAQ, SDKs.
- Support contact and links to consumer web and DealerWeb.

## 2. Guides

### getting-started.md

Token creation with the two token kinds explained in plain language (server-side = password, client-side = safe in browser JS). First curl call. First call with the Node SDK and with the PHP SDK. What the response looks like. Link to Concepts.

### concepts.md

- Authentication and tokens; `POST /login/` and when to use it instead of a pre-made token.
- Data model: brand -> main/intermediate/sub category -> product; `articleno` identifies a size/colour variant; `unique=true` groups variants into one product with `sizes`, `colors`, `imgRef`.
- Availability field semantics (yes / no / ISO date / "10+" / number) with the recommended colour mapping.
- Images: three sizes, protocol-relative URLs, `imageRefPrefixes`.
- Prices and currencies: `retailPrice` + `retailCurrency`, and the per-currency fields seen on basket lines.
- Pagination: `limit` and `offset`, default limit, how to page to the end.
- Rate limiting and status 429.

### recipes/

Every recipe has: what you get at the end, prerequisites, the full flow as numbered steps, a complete runnable script in PHP and in Node.js, how to run it on a schedule (cron / Task Scheduler), and common mistakes.

- `sync-catalog.md`: brands -> categories per brand -> products per brand with `unique=true` and paging -> map to shop fields -> images.
- `keep-content-updated.md`: re-run the sync on a schedule, update name/description/features/images only, do not overwrite the shop's own prices unless wanted, detect removed products.
- `stock-and-price-lookup.md`: single `GET /api/products/:articleno`, batch with `articleNoIn`, `gtin` lookup for barcode scanners, rendering availability.
- `ordering-with-baskets.md`: whatever the verified API supports. If the API only allows reading baskets, the page says so and explains the DealerWeb ordering flow. If write endpoints exist, they are documented from live verification.

### platforms/

- `php.md`: install SDK with Composer (path repository or Packagist if published), a cron-driven sync script skeleton, error handling with the SDK's exceptions.
- `woocommerce.md`, `prestashop.md`, `magento.md`: where a sync script hooks in (WP-CLI/cron, PrestaShop cron module, Magento cron), which product fields map to which FFE fields, links to the platform's product import API. Not full plugins.
- `nodejs.md`: npm install, sync script skeleton, running with cron/pm2.
- `browser.md`: client-side token, the browser client, CORS, what not to do (never a server-side token in the browser).
- `hosted-shops.md`: what is possible without code access: export a CSV feed from the sync script and import it into Shopify/Wix, or run a small middleware. Includes the CSV column layout the sync script can emit.
- `other-languages.md`: plain HTTP with curl, import the Postman collection, generate a client from `openapi.yaml` with openapi-generator (commands for Python, C#, Java).

### errors.md, troubleshooting.md, faq.md

- `errors.md`: every status the API returns with the exact JSON body, verified live.
- `troubleshooting.md`: 401 with a valid-looking token (wrong kind, expired, missing "Bearer "), CORS errors, http vs https, invalid JSON from server, 429.
- `faq.md`: collected questions; starts with the ones answered in the current README.

## 3. Reference and OpenAPI

- `openapi.yaml` (OpenAPI 3.0) describes `/login/`, `/api/brands/`, `/api/categories/`, `/api/products/`, `/api/baskets/`, `/api/dealers/info`, `/api/pos/sales/`, `/api/pos/products/`, including OPTIONS for CORS where relevant, all query parameters, response schemas with examples, and error responses.
- Every endpoint and parameter is verified live with the test token. Parameters the server ignores or rejects are removed or marked. Undocumented parameters seen in the codebase (for example `nameDisplay` on products) are tested and documented if they work.
- `scripts/gen-reference.js` renders `docs/reference/*.md` from the spec in the existing template (URL table, params, query string, success and error responses, curl + Node + PHP samples). The generated files carry a "generated, do not edit" header.
- `scripts/gen-postman.js` produces the Postman collection from the spec with a `{{token}}` variable.
- Root `brands.md`, `categories.md`, `products.md`, `baskets.md` become stubs linking to the generated pages.

## 4. SDK and example fixes

- Package name `@flyfisheurope/ffe-api-sdk` everywhere (Node README, demo.js, examples, root README).
- Node `login()` stores the returned `apiToken` on the instance, matching PHP.
- `baskets(opt)` and `dealerInfo()` in both SDKs. PHP POS methods remain not-implemented stubs and are documented as such.
- Node constructor: protocol only changes when `options.https === false` explicitly; documented in the SDK README.
- Node example requires the SDK by relative path (`../../sdk/node.js/ffe.js`) and reads the token from `FFE_TOKEN`; PHP example reads `FFE_TOKEN` from the environment (`getenv`).
- Browser client moves to `sdk/javascript/ffe-api-sdk.js`; the demo HTML stays in `example/javascript/` and loads it by relative path. README links become valid.
- SDK READMEs list every method with parameters and return shape, consistent with the reference.
- Bump `sdk/node.js/package.json` version and release with `npm-release.sh`.

## 5. Quality checks

- `scripts/verify-examples.sh`: runs each recipe script (Node and PHP) with `FFE_TOKEN` from the environment and fails on non-zero exit or on an error body. Run before every release.
- Spec validation: `npx @redocly/cli lint openapi.yaml` documented in CLAUDE.md.
- Link check: `npx markdown-link-check` over `README.md` and `docs/**/*.md`.
- Node SDK tests with the built-in `node:test` runner against a local stub HTTP server: query-string building, login token swap, JSON and invalid-JSON responses, http/https option. `npm test` runs them.
- CLAUDE.md updated with the new layout, the generate/verify commands, and the rule that `docs/reference/` is generated.

## Verification process with the test token

1. Owner provides a server-side test token via environment variable `FFE_TOKEN` (never committed).
2. For each endpoint: call it with the SDK and with curl, record the response shape, try each documented parameter and note whether it changes the result, try invalid input to record error bodies.
3. Real responses (with any customer-identifying data replaced) become the examples in `openapi.yaml`.

## Error handling in the guides

Every script in the recipes checks the response before using it: Node scripts check for a `status`/`code` field and non-array results; PHP scripts wrap calls in try/catch. Guides explain what each failure means and link to `troubleshooting.md`.

## Testing the deliverable

- All recipe scripts run green via `verify-examples.sh` against the live API.
- `openapi.yaml` passes lint; generated reference matches the spec (regenerate and diff is empty).
- Link check passes.
- Node SDK tests pass.
- A fresh reader can follow `getting-started.md` from zero to a product JSON using only the docs.

## Follow-up (not in this spec)

Step B: docs site (MkDocs Material or Docusaurus) on GitHub Pages with search, language tabs, and Redoc from `openapi.yaml`; GitHub Actions to run the quality checks in CI.
