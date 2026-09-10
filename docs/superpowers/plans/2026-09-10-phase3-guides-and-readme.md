# Phase 3: Guides and README — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the verified reference into a guide a less experienced shop developer can follow from zero to a working integration, and make the README the landing page for it.

**Architecture:** Hand-written Markdown under `docs/` in the learning order the spec defines (getting started → concepts → recipes → platforms → reference → errors/troubleshooting/FAQ). Every factual claim comes from `openapi.yaml`, `docs/reference/*.md`, the SDK READMEs or the SDK source; nothing is invented. Every recipe page embeds a complete Node.js and PHP script; the Node script is run live with `FFE_TOKEN` before the page is finished. The README becomes a short landing page that links into the learning path.

**Tech Stack:** Markdown on GitHub; Node 18 for live verification of recipe scripts; the two SDKs (`@flyfisheurope/ffe-api-sdk` 1.1.0, `sdk/php/ffe.php`).

**Spec:** `docs/superpowers/specs/2026-09-09-api-guide-overhaul-design.md` (sections 1 and 2; section 3's reference already exists)

## Global Constraints

- Sources of truth, in this order: `openapi.yaml` (field names, types, verified behaviour), `docs/reference/*.md`, `sdk/node.js/README.md`, `sdk/php/README.md`, `sdk/javascript/README.md`, `CLAUDE.md` "Verified API behaviour". A page may not state anything these do not support. Where behaviour is unverified (`/login/`, basket/POS writes, `unique=true`), the page says so plainly.
- Audience: developers with little API experience. Every page starts with what the reader gets at the end, uses short sentences, shows complete copy-pasteable code, and explains each step before the code. Expand acronyms on first use (JSON, HTTP, JWT, CORS, GTIN, POS).
- Verified facts that pages must respect: base URL `https://dealer.flyfisheurope.com`; header `Authorization: Bearer <token>`; tokens are created in DealerWeb under My Account (server-side and client-side kinds); default page size 25 with no cap seen up to 3000; unknown ids return HTTP 200 with `{}`; `unique=true` returns HTTP 504, so variants are grouped client-side by `nameDisplay` within a brand; `availability` is `"Yes"`, `"No"`, a `D.M.YY` date, `"20+"`, or an integer; the real 401 body is `{ "status": 401, "message": "Invalid JwtToken: UnauthorizedError", "reason": "jwt malformed" }`; `maingroup` filter needs `<brandno> <maingroupname>`; the Node SDK omits `undefined`/`null`/`''` query values.
- Recipe scripts: Node scripts use `require('@flyfisheurope/ffe-api-sdk')`, read `process.env.FFE_TOKEN`, exit 1 with a clear message if missing, print progress, and exit non-zero on an API error body (`status`/`code` field or non-array where an array is expected). PHP scripts use `require 'ffe.php'`, `getenv('FFE_TOKEN')`, and wrap calls in `try/catch`. Each Node script is extracted from its page and run live before the task is reported done; the run's first lines go in the report (never a token).
- Never mention credentials, password hashes, or security issues in any page. Never put a real token, email, customer number or company name in a page.
- Links: relative, and every link target must exist (`docs/reference/*.md` pages exist; `docs/getting-started.md` etc. are created here). Root `docs/` pages link to each other with `./`, recipes/platforms to siblings with `../`.
- Version-control commands are blocked for the assistant; the human commits from printed commands. PHP is not installed here; PHP scripts are syntax-read carefully and the human runs `php -l` later.
- Out of scope for this phase: generator changes, verify-examples script, CI, link-check tooling (Phase 4).

---

### Task 1: Getting started and Concepts

**Files:**
- Create: `docs/getting-started.md`
- Create: `docs/concepts.md`

**Interfaces:**
- Produces: the two pages every other page links to; the anchor `docs/concepts.md#availability`, `#images`, `#prices`, `#pagination`, `#variants` used by recipes.

- [ ] **Step 1: Write `docs/getting-started.md`** with these sections, in order:
  1. "What you will have in 10 minutes": one product's JSON on your screen, from curl and from an SDK.
  2. "Step 1 — Create a token": DealerWeb → My Account; the two kinds (server-side = keep secret, use on your server; client-side = safe to embed in a web page); which to pick for a shop sync (server-side).
  3. "Step 2 — Your first request with curl": the exact command `curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/brands/'`, what a good response looks like (the first two brand objects from `docs/reference/brands.md`), and what a bad one looks like (the real 401 body) with a one-line fix.
  4. "Step 3 — The same call from code": Node (npm install line, 8-line script reading `FFE_TOKEN`) and PHP (copy `ffe.php`, 8-line script) side by side; how to run each (`FFE_TOKEN=… node first.js`, `FFE_TOKEN=… php first.php`).
  5. "Step 4 — Fetch one product": `ffe.product('1113000')` and `$ffe->product('1113000')`; point at the fields a shop cares about (`articleno`, `name`, `nameDisplay`, `brand`, `retailPrice`, `retailCurrency`, `availability`, `images`).
  6. "Where next": links to `./concepts.md`, `./recipes/sync-catalog.md`, `./platforms/`, `./reference/`.
- [ ] **Step 2: Write `docs/concepts.md`** with these sections (each 5–15 sentences plus one JSON or code example, all values taken from `openapi.yaml` examples):
  - Authentication and tokens (incl. `/login/` exists but is not yet verified; prefer a DealerWeb token).
  - Data model: brand → category (levels main/intermediate/sub, `categoryno`, `parent`) → product; `articleno` is one size/colour variant.
  - `#variants`: why `unique=true` cannot be used today (HTTP 504) and how to group variants yourself: same `brand` + same `nameDisplay` = one shop product; collect `size`, `color`, `articleno`, `tradeItemNumber` per variant. Show a 10-line JS grouping function (reduce into a Map keyed by `brand + '|' + nameDisplay`).
  - `#availability`: the five value shapes and the recommended shop mapping (in stock / out of stock / expected on date / in stock with quantity), with a JS and a PHP function.
  - `#images`: `images.small/medium/large`, protocol-relative URLs (prefix `https:`), sizes 80x80/400/800.
  - `#prices`: `retailPrice` + `retailCurrency` are the recommended consumer price; dealer prices exist in other fields (name them exactly as in the `Product` schema, e.g. the `pricelist*` maps) and are only for your own cost calculations, never display them; currencies are per dealer account.
  - `#pagination`: `limit` and `offset`, default 25, loop until a page returns fewer than `limit` items; example loop in JS.
  - Rate limiting: not active today, 429 reserved; be polite (sequential requests, `limit` 100–500 for syncs).
  - CORS: `/api/*` answers OPTIONS; client-side tokens for browser use.
- [ ] **Step 3: Verify** every code sample in both pages: extract each Node snippet to `/tmp`-free scratch under `.superpowers/` or the OS temp dir, run with `FFE_TOKEN`, confirm it prints what the page says; for PHP snippets do a careful syntax read. Run a link check: every `](…)` relative target in both pages exists.
- [ ] **Step 4: Commit** (human): `git add docs/getting-started.md docs/concepts.md && git commit -m "Guide: getting started and concepts"`

---

### Task 2: Errors, Troubleshooting, FAQ

**Files:**
- Create: `docs/errors.md`
- Create: `docs/troubleshooting.md`
- Create: `docs/faq.md`

- [ ] **Step 1: `docs/errors.md`**: a table of every status the API is verified to return (200, 401, 504 on `unique=true`, 429 reserved) with the exact JSON body where verified, what it means, and what to do; a section "Errors that look like success": unknown id → 200 `{}`, empty array for a filter with no matches, `Invalid JSON from server` from the Node SDK (what it wraps), PHP SDK exceptions `Not authorized` and `No data from API`.
- [ ] **Step 2: `docs/troubleshooting.md`**: one H2 per symptom, each with cause and fix: "401 but my token is right" (missing `Bearer `, wrong token kind, token created for another account, pasted with whitespace); "I get `{}` for a product" (unknown articleno; use `articleNoIn` or `search` to find it); "`unique=true` returns 504" (group client-side, link concepts); "CORS error in the browser" (client-side token, OPTIONS, serve over http(s) not `file://`); "Node SDK connects to http instead of https" (only when `https: false`; set `port`); "PHP: `Not authorized`" (token) and "PHP: `No data from API`" (network/curl; enable `debug`); "Dates look strange" (`D.M.YY`); "My sync is slow" (use `limit` 100–500, `articleNoIn` batches).
- [ ] **Step 3: `docs/faq.md`**: 10–15 questions with two-to-four-sentence answers, including: is there a sandbox (no; use your own account); can I resell the data (point to DealerWeb terms, do not invent terms); how often to sync (daily catalog, hourly stock via `articleNoIn`); can I place orders via the API (basket reading works; writes not yet documented, use DealerWeb); which SDK for WooCommerce (PHP); is there Postman (`postman/ffe-api.postman_collection.json`); what about other languages (`openapi.yaml` + `docs/platforms/other-languages.md`).
- [ ] **Step 4: Verify** link targets exist; every status/body quoted matches `openapi.yaml`.
- [ ] **Step 5: Commit** (human): `git add docs/errors.md docs/troubleshooting.md docs/faq.md && git commit -m "Guide: errors, troubleshooting, FAQ"`

---

### Task 3: Recipes — catalog sync and keeping content updated

**Files:**
- Create: `docs/recipes/sync-catalog.md`
- Create: `docs/recipes/keep-content-updated.md`

- [ ] **Step 1: `docs/recipes/sync-catalog.md`** sections: what you get (a `catalog.json` with one entry per shop product, variants nested); prerequisites; the flow as numbered steps (brands → for each brand, products paged with `limit=200` → group variants by `nameDisplay` → map to shop fields → write JSON); the complete Node script (below); the complete PHP script (same logic with the PHP SDK, `json_encode` output, `try/catch`); "Run it nightly" (cron line for Linux/macOS, Task Scheduler note for Windows); "Common mistakes" (forgetting pagination, using `unique=true`, displaying dealer prices, protocol-relative image URLs).

  Node script to embed verbatim (then run live):
  ```js
  'use strict';
  // Sync the Flyfish Europe catalog into catalog.json.
  // Run: FFE_TOKEN=<server-side token> node sync-catalog.js
  const fs = require('fs');
  const FFE = require('@flyfisheurope/ffe-api-sdk');

  const token = process.env.FFE_TOKEN;
  if (!token) { console.error('Set FFE_TOKEN first.'); process.exit(1); }
  const ffe = new FFE(token);
  const PAGE = 200;

  function fail(where, data) {
      console.error(`API error in ${where}:`, JSON.stringify(data).slice(0, 300));
      process.exit(1);
  }

  async function allProducts(brandno) {
      const out = [];
      for (let offset = 0; ; offset += PAGE) {
          const page = await ffe.products({ brand: brandno, limit: PAGE, offset });
          if (!Array.isArray(page)) fail(`products ${brandno}`, page);
          out.push(...page);
          if (page.length < PAGE) return out;
      }
  }

  function groupVariants(products) {
      const groups = new Map();
      for (const p of products) {
          const key = `${p.brand}|${p.nameDisplay || p.name}`;
          if (!groups.has(key)) {
              groups.set(key, {
                  brand: p.brand,
                  name: p.nameDisplay || p.name,
                  category: [p.mainCategory, p.intermediateCategory, p.subCategory].filter(Boolean).join(' / '),
                  description: p.description,
                  features: p.features,
                  image: p.images && p.images.medium ? `https:${p.images.medium}` : null,
                  price: p.retailPrice,
                  currency: p.retailCurrency,
                  variants: [],
              });
          }
          groups.get(key).variants.push({
              articleno: p.articleno,
              gtin: p.tradeItemNumber,
              size: p.size,
              color: p.color,
              availability: p.availability,
          });
      }
      return [...groups.values()];
  }

  (async () => {
      const brands = await ffe.brands();
      if (!Array.isArray(brands)) fail('brands', brands);
      const catalog = [];
      for (const brand of brands) {
          const products = await allProducts(brand.brandno);
          const grouped = groupVariants(products);
          console.log(`${brand.name}: ${products.length} variants -> ${grouped.length} products`);
          catalog.push(...grouped);
      }
      fs.writeFileSync('catalog.json', JSON.stringify(catalog, null, 2));
      console.log(`Wrote catalog.json with ${catalog.length} products`);
  })().catch((err) => { console.error(err); process.exit(1); });
  ```
  Before embedding, check every field name used above against the `Product` schema in `openapi.yaml` (`subCategory`, `tradeItemNumber`, `nameDisplay`, `images.medium`, `retailPrice`, `retailCurrency`, `availability`, `mainCategory`, `intermediateCategory`); if a name differs, fix the script and say so in the report.
- [ ] **Step 2: `docs/recipes/keep-content-updated.md`**: what you get (only text and images refreshed, your prices and stock untouched); the flow (load your product list → for each shop product, fetch its variants with `articleNoIn` in batches of 50 → update name/description/features/images only → mark products that no longer come back as discontinued); Node script (reads `catalog.json` from the previous recipe as the stand-in for "your shop", writes `content-updates.json` with changed fields per articleno, using `articleNoIn` batches); PHP equivalent; schedule (weekly); pitfalls (overwriting your own edited texts — keep a "locked" flag; image URL changes).
- [ ] **Step 3: Verify**: extract and run both Node scripts live (`sync-catalog` will take a while with all brands; it is acceptable to run it with the brands loop limited to the first brand for verification — say so — but the embedded script must be the full version); check output files; PHP scripts syntax-read; links resolve.
- [ ] **Step 4: Commit** (human): `git add docs/recipes && git commit -m "Guide: catalog sync and content update recipes"`

---

### Task 4: Recipes — stock and price lookup, ordering with baskets

**Files:**
- Create: `docs/recipes/stock-and-price-lookup.md`
- Create: `docs/recipes/ordering-with-baskets.md`

- [ ] **Step 1: `docs/recipes/stock-and-price-lookup.md`**: three lookups with Node and PHP code each: single article (`product(articleno)`, handle `{}`), batch (`products({ articleNoIn: 'a,b,c' })`, batches of 50), barcode (`products({ gtin })`); a section on rendering `availability` reusing the concept-page mapping; a "refresh stock every hour" script (Node) that reads `catalog.json` variants and prints changed availabilities. Run live.
- [ ] **Step 2: `docs/recipes/ordering-with-baskets.md`**: honest scope statement first: reading your basket is verified; adding lines and placing orders through the API are not yet verified or documented, so orders are placed in DealerWeb; what the basket response contains (from `docs/reference/baskets.md`), Node and PHP code to read it and print lines; `presale=1` note; a "What to do when write access is documented" paragraph telling readers to watch the reference page.
- [ ] **Step 3: Verify** live runs of the Node snippets; links.
- [ ] **Step 4: Commit** (human): `git add docs/recipes && git commit -m "Guide: stock lookup and basket recipes"`

---

### Task 5: Platform pages — PHP, Node.js, browser, other languages

**Files:**
- Create: `docs/platforms/php.md`, `docs/platforms/nodejs.md`, `docs/platforms/browser.md`, `docs/platforms/other-languages.md`

- [ ] **Step 1: `php.md`**: install options (copy `ffe.php`; Composer path repository snippet from `sdk/php/README.md`); a cron-driven sync skeleton (`require`, token from env or a config file outside the web root, `try/catch`, logging); PHP version note (>= 5.4, curl extension); link to the two PHP recipe scripts.
- [ ] **Step 2: `nodejs.md`**: `npm install @flyfisheurope/ffe-api-sdk`; skeleton with `async/await`; running under cron or pm2; environment variables for the token; link to recipes.
- [ ] **Step 3: `browser.md`**: client-side token only; loading `sdk/javascript/ffe-api-sdk.js` via jsDelivr; the three functions; CORS; the demo page; the `unique` caveat; never a server-side token in a page.
- [ ] **Step 4: `other-languages.md`**: plain HTTP with curl (three examples); Postman import steps; generating a client from `openapi.yaml` with openapi-generator for Python, C#, Java (exact `openapi-generator-cli generate -i openapi.yaml -g <python|csharp|java> -o out/<lang>` commands, with the Docker form `docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate -i /local/openapi.yaml -g python -o /local/out/python`); a note that generated clients need the `Authorization: Bearer` header configured (`bearerToken` security scheme).
- [ ] **Step 5: Verify** links; `node --check` on any JS block; PHP syntax read.
- [ ] **Step 6: Commit** (human): `git add docs/platforms && git commit -m "Guide: platform pages (PHP, Node, browser, other languages)"`

---

### Task 6: Platform pages — WooCommerce, PrestaShop, Magento, hosted shops

**Files:**
- Create: `docs/platforms/woocommerce.md`, `docs/platforms/prestashop.md`, `docs/platforms/magento.md`, `docs/platforms/hosted-shops.md`

- [ ] **Step 1**: each of the three platform pages has: where the sync runs (WooCommerce: WP-Cron or WP-CLI `wp cron event run`, a mu-plugin or a standalone script using the PHP SDK; PrestaShop: a module's cron controller or a standalone script; Magento: a cron job in `crontab.xml` or a standalone script); a field-mapping table from the recipe's grouped product to the platform's product fields (name, description, SKU = `articleno`, GTIN, price = `retailPrice`, image URL, variants = size/colour attributes, stock status from `availability`); which platform API/import to use (WooCommerce REST API `POST /wp-json/wc/v3/products` and variations; PrestaShop Webservice; Magento REST `POST /V1/products`) with one example request body; explicit "this is where the sync script hooks in, not a full plugin" statement; links to the PHP recipe scripts.
- [ ] **Step 2: `hosted-shops.md`**: what is possible without code access: run the Node or PHP sync on any machine and export a CSV; the CSV column layout (name, sku, gtin, price, currency, image, category, size, colour, stock_status); a 25-line Node script that converts `catalog.json` into `catalog.csv` with that layout (run it live on the catalog from Task 3); pointers to Shopify's and Wix's CSV product import (link only to their official help centers' top-level product-import pages).
- [ ] **Step 3: Verify** links; the CSV script live.
- [ ] **Step 4: Commit** (human): `git add docs/platforms && git commit -m "Guide: WooCommerce, PrestaShop, Magento, hosted shops"`

---

### Task 7: README landing page, docs index, CLAUDE.md layout note

**Files:**
- Modify: `README.md` (full rewrite)
- Create: `docs/README.md` (table of contents for the docs folder)
- Modify: `CLAUDE.md` ("What this repo is" bullets and a new "### Guide layout" subsection)

- [ ] **Step 1: Rewrite `README.md`** to: title; one paragraph (what the API is, who can use it, where to get a token); "Your first product in 10 minutes" (three steps with the curl command and the Node/PHP one-liners, then a link to `docs/getting-started.md`); "Learning path" list in order: Getting started, Concepts, Recipes (four links), Platforms (eight links), Reference (`docs/reference/` eight links + `openapi.yaml` + Postman), Errors, Troubleshooting, FAQ; "SDKs" (three links with the npm install line); "Support" (contact via DealerWeb; consumer web and DealerWeb links). Keep the HTTP status code and rate-limit facts from the old README but corrected (204 nowhere claimed; 401 body real; 429 reserved). Remove the duplicated "401 for forbidden" typo.
- [ ] **Step 2: `docs/README.md`**: the same learning-path list with one-line descriptions, relative links.
- [ ] **Step 3: CLAUDE.md**: update the "Endpoint docs" bullet to mention `docs/` guides; add "### Guide layout" listing the docs folders and the rule that recipe pages embed complete scripts that must run live before edits are merged.
- [ ] **Step 4: Verify**: every relative link in `README.md`, `docs/README.md`, and all `docs/**/*.md` resolves (shell loop over `grep -o '](\([^)#]*\)'`); no `TODO`/`TBD` anywhere under `docs/`; `grep -rn -i 'password\|salt\|hash\|security' docs/ README.md` shows nothing related to credentials.
- [ ] **Step 5: Commit** (human): `git add README.md docs/README.md CLAUDE.md && git commit -m "README landing page and docs index"`

---

## Self-review

- Spec coverage: section 1 (layout, README) → Tasks 1–7; section 2 (getting-started, concepts, recipes ×4, platforms ×8, errors/troubleshooting/faq) → Tasks 1–6. `docs/reference/` already exists from Phase 1. Ordering recipe follows the spec's "if the API only allows reading" branch.
- Placeholders: page contents are specified as required sections and facts, not prose, by design (the prose is the deliverable); the sync script is complete; other scripts are specified by behaviour and must be run live, which is the acceptance test.
- Consistency: anchors `#variants`, `#availability`, `#images`, `#prices`, `#pagination` defined in Task 1 and used by Tasks 3–4; `catalog.json` produced by Task 3 is consumed by Tasks 3 (content update), 4 (stock refresh) and 6 (CSV).
