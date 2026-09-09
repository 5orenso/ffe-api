# Phase 1: Verified OpenAPI Spec and Generated Reference — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a live-verified `openapi.yaml` for every Flyfish Europe Dealer API endpoint, and generate `docs/reference/*.md` and a Postman collection from it.

**Architecture:** A tiny dependency-free Node probe script records real requests and responses (never committed) so every path, parameter and error body in `openapi.yaml` is backed by evidence. Two small Node generators (`scripts/gen-reference.js`, `scripts/gen-postman.js`) read the spec with `js-yaml` and write derived files; both expose a pure `render()` function tested with `node:test` on a fixture spec. The old root endpoint docs become redirect stubs.

**Tech Stack:** Node.js 18 (built-in `https`, `node:test`), `js-yaml`, `@redocly/cli` for spec lint, OpenAPI 3.0.3, Postman Collection v2.1.

**Spec:** `docs/superpowers/specs/2026-09-09-api-guide-overhaul-design.md`

## Global Constraints

- The test token lives only in the `FFE_TOKEN` environment variable. Never write it into any file under the repo. `scripts/probes/` is gitignored and holds raw responses.
- Do not send POST/PUT requests to `/api/pos/*` or any basket write endpoint against production without the owner confirming in chat that the test account is safe to write to. Read-only probes are always fine.
- Replace customer-identifying data (email addresses, customer numbers, company names) in any example copied into `openapi.yaml` with `customer@example.com`, `999999`, `Your customer name`.
- `docs/reference/*.md` are generated. Never hand-edit them; edit `openapi.yaml` and regenerate.
- Workspace policy blocks the assistant from running version-control commands. Commit steps are for the human to run; the executor prints the command and moves on.
- Base URL for production is `https://dealer.flyfisheurope.com`. The probe honours `FFE_HOST`, `FFE_PORT`, `FFE_HTTPS=0` for a local server.

---

### Task 1: Root tooling package and spec skeleton that lints

**Files:**
- Create: `package.json` (repo root)
- Create: `.redocly.yaml`
- Create: `openapi.yaml`
- Modify: `.gitignore`

**Interfaces:**
- Produces: npm scripts `lint:spec`, `gen:reference`, `gen:postman`, `test` used by every later task.

- [ ] **Step 1: Create the root package.json**

```json
{
  "name": "ffe-api-docs-tooling",
  "private": true,
  "description": "Tooling for the Flyfish Europe API documentation (spec lint, generators, probes)",
  "scripts": {
    "lint:spec": "redocly lint openapi.yaml",
    "gen:reference": "node scripts/gen-reference.js",
    "gen:postman": "node scripts/gen-postman.js",
    "test": "node --test scripts/gen-reference.test.js scripts/gen-postman.test.js"
  },
  "devDependencies": {
    "@redocly/cli": "^1.25.0",
    "js-yaml": "^4.1.0"
  }
}
```

- [ ] **Step 2: Create .redocly.yaml with the lenient ruleset**

```yaml
extends:
  - minimal
rules:
  operation-operationId: error
  operation-summary: error
  no-unresolved-refs: error
```

- [ ] **Step 3: Create the openapi.yaml skeleton**

```yaml
openapi: 3.0.3
info:
  title: Flyfish Europe Dealer API
  version: "1.0.0"
  description: |
    JSON REST API for Flyfish Europe dealers with DealerWeb access.
    Create an API token in DealerWeb under My Account and send it as
    `Authorization: Bearer <token>` on every request.
servers:
  - url: https://dealer.flyfisheurope.com
    description: Production (DealerWeb)
tags:
  - name: login
  - name: brands
  - name: categories
  - name: products
  - name: baskets
  - name: dealers
  - name: pos-sales
  - name: pos-products
paths: {}
components:
  securitySchemes:
    bearerToken:
      type: http
      scheme: bearer
      bearerFormat: JWT
  responses:
    Unauthorized:
      description: Missing or invalid token
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            status: 401
            message: Authentication Required
  schemas:
    Error:
      type: object
      properties:
        status:
          type: integer
        message:
          type: string
security:
  - bearerToken: []
```

- [ ] **Step 4: Add probes and node_modules to .gitignore**

Append to `.gitignore`:

```
node_modules/
scripts/probes/
package-lock.json
```

- [ ] **Step 5: Install and lint**

Run: `npm install && npm run lint:spec`
Expected: install succeeds; lint reports 0 errors (a warning about empty `paths` is acceptable).

- [ ] **Step 6: Commit**

```bash
git add package.json .redocly.yaml openapi.yaml .gitignore
git commit -m "Add spec tooling and openapi.yaml skeleton"
```

---

### Task 2: Probe script for recording live API calls

**Files:**
- Create: `scripts/probe.js`

**Interfaces:**
- Produces: CLI `node scripts/probe.js <METHOD> <path> <name> [jsonBody] [--form]`. Writes `scripts/probes/<name>.json` with `{ request, status, headers, body }` and prints status plus the first 600 chars of the body. Used by Tasks 3–9.

- [ ] **Step 1: Write scripts/probe.js**

```js
#!/usr/bin/env node
'use strict';

// Records one live API call to scripts/probes/<name>.json so that every
// claim in openapi.yaml is backed by a real response. Token comes from
// the FFE_TOKEN environment variable and is never written to disk.

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const token = process.env.FFE_TOKEN;
if (!token) {
    console.error('FFE_TOKEN is not set. Run: FFE_TOKEN=... node scripts/probe.js GET /api/brands/ brands-list');
    process.exit(2);
}

const args = process.argv.slice(2);
const form = args.includes('--form');
const [method, urlPath, name, jsonBody] = args.filter(a => a !== '--form');
if (!method || !urlPath || !name) {
    console.error('Usage: node scripts/probe.js <METHOD> <path> <name> [jsonBody] [--form]');
    process.exit(2);
}

const useHttps = process.env.FFE_HTTPS !== '0';
const hostname = process.env.FFE_HOST || 'dealer.flyfisheurope.com';
const port = Number(process.env.FFE_PORT || (useHttps ? 443 : 80));
const client = useHttps ? https : http;

const options = {
    hostname,
    port,
    path: urlPath,
    method: method.toUpperCase(),
    headers: { Authorization: `Bearer ${token}` },
};

let payload;
if (jsonBody) {
    const parsed = JSON.parse(jsonBody);
    payload = form ? querystring.stringify(parsed) : JSON.stringify(parsed);
    options.headers['Content-Type'] = form
        ? 'application/x-www-form-urlencoded'
        : 'application/json';
    options.headers['Content-Length'] = Buffer.byteLength(payload);
}

const req = client.request(options, (res) => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body;
        try { body = JSON.parse(raw); } catch (e) { body = raw; }
        const record = {
            request: {
                method: options.method,
                path: urlPath,
                contentType: options.headers['Content-Type'] || null,
                body: jsonBody ? JSON.parse(jsonBody) : null,
            },
            status: res.statusCode,
            headers: res.headers,
            body,
        };
        const dir = path.join(__dirname, 'probes');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${name}.json`);
        fs.writeFileSync(file, JSON.stringify(record, null, 2));
        console.log(`${options.method} ${urlPath} -> ${res.statusCode}`);
        console.log(raw.slice(0, 600));
        console.log(`saved ${path.relative(process.cwd(), file)}`);
    });
});
req.on('error', (err) => {
    console.error('request failed:', err.message);
    process.exit(1);
});
if (payload) req.write(payload);
req.end();
```

- [ ] **Step 2: Verify it refuses to run without a token**

Run: `env -u FFE_TOKEN node scripts/probe.js GET /api/brands/ brands-list`
Expected: exit code 2 and the message `FFE_TOKEN is not set`.

- [ ] **Step 3: Verify a real call**

Run: `node scripts/probe.js GET /api/brands/ brands-list` (with `FFE_TOKEN` exported)
Expected: prints `GET /api/brands/ -> 200`, a JSON array whose objects contain `brandno`, `sort`, `name`, and `saved scripts/probes/brands-list.json`.

- [ ] **Step 4: Verify the unauthorized body**

Run: `FFE_TOKEN=invalid node scripts/probe.js GET /api/brands/ brands-401`
Expected: status 401. The docs claim the body is `{ "status": 401, "message": "Authentication Required" }`. If it differs, update the `Unauthorized` example under `components.responses` in `openapi.yaml` to the real body.

- [ ] **Step 5: Commit**

```bash
git add scripts/probe.js
git commit -m "Add probe script for recording live API responses"
```

---

### Task 3: Verify and document /login/

**Files:**
- Modify: `openapi.yaml` (add `paths./login/`, schemas `LoginRequest`, `LoginResponse`)

**Interfaces:**
- Produces: operation `login` with `x-sdk-node` and `x-sdk-php` extension strings consumed by `gen-reference.js` (Task 10).

- [ ] **Step 1: Probe login with both encodings the SDKs use**

Use the owner's test account credentials, passed only on the command line:

```bash
node scripts/probe.js POST /login/ login-json '{"email":"<test email>","pass":"<test pass>"}'
node scripts/probe.js POST /login/ login-form '{"email":"<test email>","pass":"<test pass>"}' --form
node scripts/probe.js POST /login/ login-bad '{"email":"<test email>","pass":"wrong"}'
```

Record status and body for each. The PHP SDK expects `{ status: 200, apiToken, message }` on success and `{ status: 401, message: 'Login failed' }` on failure. Note whether JSON and form encodings both work; if only one works, that decides the `requestBody.content` keys below and is a finding for Phase 2 (SDK fixes).

- [ ] **Step 2: Add the path to openapi.yaml**

Replace `paths: {}` with the block below, editing examples to match the probes:

```yaml
paths:
  /login/:
    post:
      tags: [login]
      operationId: login
      summary: Exchange email and password for an API token
      description: |
        Only needed if you do not want to create a token in DealerWeb.
        The returned apiToken is used as the Bearer token for all other calls.
      security: []
      x-sdk-node: "ffe.login('you@example.com', 'password')"
      x-sdk-php: "$ffe->login('you@example.com', 'password')"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/LoginRequest"
          application/x-www-form-urlencoded:
            schema:
              $ref: "#/components/schemas/LoginRequest"
      responses:
        "200":
          description: Login succeeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/LoginResponse"
              example:
                status: 200
                apiToken: "<jwt>"
                message: OK
        "401":
          description: Login failed
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
              example:
                status: 401
                message: Login failed
```

Under `components.schemas` add:

```yaml
    LoginRequest:
      type: object
      required: [email, pass]
      properties:
        email:
          type: string
          format: email
        pass:
          type: string
    LoginResponse:
      type: object
      properties:
        status:
          type: integer
        apiToken:
          type: string
        message:
          type: string
```

Remove the `application/x-www-form-urlencoded` entry if the form probe did not return 200.

- [ ] **Step 3: Lint**

Run: `npm run lint:spec`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add openapi.yaml
git commit -m "Document /login/ from live verification"
```

---

### Task 4: Verify and document /api/brands/

**Files:**
- Modify: `openapi.yaml`

- [ ] **Step 1: Probe**

```bash
node scripts/probe.js GET /api/brands/ brands-list
node scripts/probe.js GET /api/brands/simms brands-one
node scripts/probe.js GET /api/brands/does-not-exist brands-missing
node scripts/probe.js OPTIONS /api/brands/ brands-options
```

Record: the full field list of a brand object (docs say `brandno`, `sort`, `name`; add any extra fields seen), the status and body for an unknown brand, and the CORS headers returned by OPTIONS (`access-control-allow-origin`, `-methods`, `-headers`).

- [ ] **Step 2: Add to openapi.yaml under paths**

```yaml
  /api/brands/:
    get:
      tags: [brands]
      operationId: listBrands
      summary: List all brands available to your dealer account
      x-sdk-node: "ffe.brands()"
      x-sdk-php: "$ffe->brands()"
      responses:
        "200":
          description: Array of brands
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Brand"
              example:
                - brandno: simms
                  sort: 1
                  name: Simms
        "401":
          $ref: "#/components/responses/Unauthorized"
  /api/brands/{brandno}:
    get:
      tags: [brands]
      operationId: getBrand
      summary: Get one brand
      x-sdk-node: "ffe.brand('simms')"
      x-sdk-php: "$ffe->brand('simms')"
      parameters:
        - name: brandno
          in: path
          required: true
          schema:
            type: string
          example: simms
      responses:
        "200":
          description: The brand
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Brand"
              example:
                brandno: simms
                sort: 1
                name: Simms
        "401":
          $ref: "#/components/responses/Unauthorized"
```

Add the status observed for an unknown brand as an extra response (for example `"404"`, or `"200"` with an empty body if that is what the server does), with the real body as example. Under `components.schemas` add:

```yaml
    Brand:
      type: object
      properties:
        brandno:
          type: string
          description: Brand identifier used in the brand query parameter elsewhere
        sort:
          type: integer
        name:
          type: string
```

Add any extra fields the probe showed.

- [ ] **Step 3: Lint and commit**

Run: `npm run lint:spec` → 0 errors.

```bash
git add openapi.yaml
git commit -m "Document /api/brands/ from live verification"
```

---

### Task 5: Verify and document /api/categories/

**Files:**
- Modify: `openapi.yaml`

- [ ] **Step 1: Probe every documented parameter**

```bash
node scripts/probe.js GET '/api/categories/' cat-list
node scripts/probe.js GET '/api/categories/?limit=2&offset=0' cat-limit
node scripts/probe.js GET '/api/categories/?limit=2&offset=2' cat-offset
node scripts/probe.js GET '/api/categories/?brand=simms' cat-brand
node scripts/probe.js GET '/api/categories/?level=main' cat-level-main
node scripts/probe.js GET '/api/categories/?level=intermediate' cat-level-int
node scripts/probe.js GET '/api/categories/?level=sub' cat-level-sub
node scripts/probe.js GET '/api/categories/?parent=101' cat-parent
node scripts/probe.js GET '/api/categories/101' cat-one
node scripts/probe.js GET '/api/categories/999999999' cat-missing
node scripts/probe.js GET '/api/categories/?bogus=1' cat-unknown-param
```

Record: the number of items returned with no `limit` (the default page size), whether `offset` shifts results (compare `cat-limit` and `cat-offset`), the exact field names (docs show `categoryNo` in the response sample but `categoryno` in the PHP docblock; the probe decides), whether `brand` is case-sensitive, and whether unknown params are ignored or rejected.

- [ ] **Step 2: Add to openapi.yaml**

```yaml
  /api/categories/:
    get:
      tags: [categories]
      operationId: listCategories
      summary: List categories
      x-sdk-node: "ffe.categories({ brand: 'simms', level: 'main' })"
      x-sdk-php: "$ffe->categories((object) ['brand' => 'simms', 'level' => 'main'])"
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
          description: Number of categories to return
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
          description: Pagination offset
        - name: brand
          in: query
          schema: { type: string }
          example: simms
        - name: level
          in: query
          schema:
            type: string
            enum: [main, intermediate, sub]
        - name: parent
          in: query
          schema: { type: integer }
          example: 101
          description: Only categories whose parent is this categoryno
      responses:
        "200":
          description: Array of categories
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Category"
              example:
                - categoryno: 101
                  name: Simms Waders
                  level: main
                  parent: null
                  sort: 1
        "401":
          $ref: "#/components/responses/Unauthorized"
  /api/categories/{categoryno}:
    get:
      tags: [categories]
      operationId: getCategory
      summary: Get one category
      x-sdk-node: "ffe.category(101)"
      x-sdk-php: "$ffe->category(101)"
      parameters:
        - name: categoryno
          in: path
          required: true
          schema: { type: integer }
          example: 101
      responses:
        "200":
          description: The category
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Category"
        "401":
          $ref: "#/components/responses/Unauthorized"
```

Set `default` on `limit` to the number observed in `cat-list`. Use field names exactly as returned. Under `components.schemas`:

```yaml
    Category:
      type: object
      properties:
        categoryno:
          type: integer
        name:
          type: string
        level:
          type: string
          enum: [main, intermediate, sub]
        parent:
          type: integer
          nullable: true
        sort:
          type: integer
```

Rename `categoryno` to whatever the API actually returns.

- [ ] **Step 3: Lint and commit**

Run: `npm run lint:spec` → 0 errors.

```bash
git add openapi.yaml
git commit -m "Document /api/categories/ from live verification"
```

---

### Task 6: Verify and document /api/products/

**Files:**
- Modify: `openapi.yaml`

- [ ] **Step 1: Probe every documented and suspected parameter**

```bash
node scripts/probe.js GET '/api/products/' prod-list
node scripts/probe.js GET '/api/products/?limit=2&offset=0' prod-limit
node scripts/probe.js GET '/api/products/?limit=2&offset=2' prod-offset
node scripts/probe.js GET '/api/products/?brand=simms&limit=2' prod-brand
node scripts/probe.js GET '/api/products/?maingroup=simms%20headwear&limit=2' prod-maingroup
node scripts/probe.js GET '/api/products/?intgroup=fall%20headwear&limit=2' prod-intgroup
node scripts/probe.js GET '/api/products/?subgroup=visor%20beanie&limit=2' prod-subgroup
node scripts/probe.js GET '/api/products/?mainCat=101&limit=2' prod-maincat
node scripts/probe.js GET '/api/products/?intCat=1033&limit=2' prod-intcat
node scripts/probe.js GET '/api/products/?subCat=10096&limit=2' prod-subcat
node scripts/probe.js GET '/api/products/?gtin=782420002818' prod-gtin
node scripts/probe.js GET '/api/products/?articleNoIn=12023-016-07,10328-033-20' prod-articlenoin
node scripts/probe.js GET '/api/products/?search=simms%20waders&limit=2' prod-search
node scripts/probe.js GET '/api/products/?unique=true&limit=2' prod-unique
node scripts/probe.js GET '/api/products/?unique=false&limit=2' prod-notunique
node scripts/probe.js GET '/api/products/?isNew=1&limit=2' prod-isnew
node scripts/probe.js GET '/api/products/?nameDisplay=G4Z%C2%AE%20Stockingfoot&unique=true' prod-namedisplay
node scripts/probe.js GET '/api/products/10328-033-20' prod-one
node scripts/probe.js GET '/api/products/DOES-NOT-EXIST' prod-missing
node scripts/probe.js GET '/api/products/?limit=1000' prod-maxlimit
```

Record, per parameter: whether it filtered the result (compare against `prod-list`), the default page size, the maximum accepted `limit` (does `limit=1000` return 1000 or cap?), the full field list of a product with and without `unique=true` (docs list `sizes`, `colors`, `imgRef` only in the unique form; confirm), every distinct type seen in `availability`, and the price fields present (`retailPrice`, `retailCurrency`, and whether `priceNOK`/`priceEUR` etc. appear on products or only on basket lines). Record `link`, `linkConsumerWeb`, `apiLinkToProductGroup`, `imageRefPrefixes` if present.

- [ ] **Step 2: Add to openapi.yaml**

```yaml
  /api/products/:
    get:
      tags: [products]
      operationId: listProducts
      summary: List or search products
      x-sdk-node: "ffe.products({ brand: 'simms', unique: true, limit: 50, offset: 0 })"
      x-sdk-php: "$ffe->products((object) ['brand' => 'simms', 'unique' => 'true', 'limit' => 50, 'offset' => 0])"
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
          description: Number of products to return
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
        - name: brand
          in: query
          schema: { type: string }
          example: simms
          description: brandno from /api/brands/
        - name: maingroup
          in: query
          schema: { type: string }
          example: simms headwear
          description: Main category name
        - name: intgroup
          in: query
          schema: { type: string }
          example: fall headwear
          description: Intermediate category name
        - name: subgroup
          in: query
          schema: { type: string }
          example: visor beanie
          description: Sub category name
        - name: mainCat
          in: query
          schema: { type: integer }
          example: 101
          description: Main category number (categoryno with level main)
        - name: intCat
          in: query
          schema: { type: integer }
          example: 1033
          description: Intermediate category number
        - name: subCat
          in: query
          schema: { type: integer }
          example: 10096
          description: Sub category number
        - name: gtin
          in: query
          schema: { type: string }
          example: "782420002818"
          description: Global Trade Item Number (barcode)
        - name: articleNoIn
          in: query
          schema: { type: string }
          example: 12023-016-07,10328-033-20
          description: Comma-separated list of articleno values
        - name: search
          in: query
          schema: { type: string }
          example: simms waders
          description: Free-text search
        - name: unique
          in: query
          schema: { type: boolean, default: false }
          description: Group size/colour variants into one product with sizes, colors and imgRef arrays
        - name: isNew
          in: query
          schema: { type: integer, enum: [1] }
          description: Only products flagged as new
      responses:
        "200":
          description: Array of products
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Product"
        "401":
          $ref: "#/components/responses/Unauthorized"
  /api/products/{articleno}:
    get:
      tags: [products]
      operationId: getProduct
      summary: Get one product variant by articleno
      x-sdk-node: "ffe.product('10328-033-20')"
      x-sdk-php: "$ffe->product('10328-033-20')"
      parameters:
        - name: articleno
          in: path
          required: true
          schema: { type: string }
          example: 10328-033-20
      responses:
        "200":
          description: The product
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Product"
        "401":
          $ref: "#/components/responses/Unauthorized"
```

Set `default` and add `maximum` on `limit` from the probes. Remove any parameter the probe showed to have no effect, and add `nameDisplay` if `prod-namedisplay` filtered results. Add the `prod-missing` status as an extra response. Under `components.schemas`, build `Product` from the probed field list; start from this and adjust to what was returned:

```yaml
    Product:
      type: object
      properties:
        articleno: { type: string }
        maingroupno: { type: integer }
        tradeItemNumber: { type: string, description: GTIN / barcode }
        name: { type: string }
        nameDisplay: { type: string, description: Marketing name without size and colour }
        color: { type: string }
        size: { type: string }
        brand: { type: string }
        itemCategory: { type: string }
        mainCategory: { type: string }
        intermediateCategory: { type: string }
        availability:
          oneOf:
            - type: string
            - type: number
          description: |
            "Yes" = in stock; "No" = out of stock; "YYYY-MM-DD" = expected date;
            "10+" or a number = in stock with approximate quantity.
        retailCurrency: { type: string }
        retailPrice: { type: number }
        newInfo: { type: string }
        description: { type: string }
        features: { type: string }
        images:
          $ref: "#/components/schemas/Images"
        sizes:
          type: array
          items: { type: string }
          description: Only with unique=true
        colors:
          type: array
          items: { type: string }
          description: Only with unique=true
        imgRef:
          type: object
          additionalProperties: { type: integer }
          description: Only with unique=true. Colour name to image reference id.
    Images:
      type: object
      properties:
        small: { type: string, description: 80x80, protocol-relative URL }
        medium: { type: string, description: 400px wide }
        large: { type: string, description: 800px wide }
```

Paste the first item of `prod-unique` (trimmed description/features) as the `example` on the 200 response of `listProducts`, and `prod-one` as the example on `getProduct`.

- [ ] **Step 3: Lint and commit**

Run: `npm run lint:spec` → 0 errors.

```bash
git add openapi.yaml
git commit -m "Document /api/products/ from live verification"
```

---

### Task 7: Verify and document /api/baskets/

**Files:**
- Modify: `openapi.yaml`

- [ ] **Step 1: Probe read endpoints**

```bash
node scripts/probe.js GET '/api/baskets/' basket-list
node scripts/probe.js GET '/api/baskets/?presale=1' basket-presale
node scripts/probe.js OPTIONS '/api/baskets/' basket-options
```

Record the top-level shape (`lines`, `pricelistno`, `customerno`, `emailaddress`, `companyName`, `qty`, `total`, `retailTotal`, `currency`) and one line's shape. Note the `access-control-allow-methods` header from OPTIONS: it tells whether POST/PUT/DELETE exist on this path without sending a write.

- [ ] **Step 2: Ask the owner about write endpoints, then probe only if approved**

Print this question and stop until answered: "OPTIONS /api/baskets/ allows methods `<list>`. May I send a POST/PUT/DELETE to the test account's basket to document ordering? If yes, tell me a safe articleno and quantity." If approved, probe with the given values and record; if not approved or no write methods are allowed, document the basket as read-only in the spec description.

- [ ] **Step 3: Add to openapi.yaml**

```yaml
  /api/baskets/:
    get:
      tags: [baskets]
      operationId: getBasket
      summary: Get your current basket
      description: |
        Returns the dealer's current basket in DealerWeb.
      x-sdk-node: "ffe.baskets({ presale: 1 })"
      x-sdk-php: "$ffe->baskets((object) ['presale' => 1])"
      parameters:
        - name: presale
          in: query
          schema: { type: integer, enum: [1] }
          description: Enable pre-season mode
      responses:
        "200":
          description: The basket
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Basket"
        "401":
          $ref: "#/components/responses/Unauthorized"
```

After Step 2, append to the `description` either "This endpoint is read-only; orders are placed in DealerWeb." or the verified write operations (`post`/`put`/`delete` under the same path with the exact request body and response observed).

Schemas, adjusted to the probe:

```yaml
    Basket:
      type: object
      properties:
        lines:
          type: array
          items:
            $ref: "#/components/schemas/BasketLine"
        pricelistno: { type: integer }
        customerno: { type: integer }
        emailaddress: { type: string }
        companyName: { type: string }
        qty: { type: integer }
        total: { type: number }
        retailTotal: { type: number }
        currency: { type: string }
    BasketLine:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        qty: { type: integer }
        currency: { type: string }
        price: { type: number, description: Dealer price per unit after discount }
        fullPrice: { type: number, description: Dealer price per unit before discount }
        discount: { type: number }
        retailPrice: { type: number }
        total: { type: number }
        eurPrice: { type: number }
        eurFullPrice: { type: number }
        eurTotal: { type: number }
        date: { type: string, format: date-time }
        addedBy: { type: string }
        addedFrom: { type: string }
        info: { type: string, nullable: true }
        object:
          $ref: "#/components/schemas/Product"
```

Use the sanitised `basket-list` body as the 200 example (replace email, customerno, companyName per Global Constraints).

- [ ] **Step 4: Lint and commit**

Run: `npm run lint:spec` → 0 errors.

```bash
git add openapi.yaml
git commit -m "Document /api/baskets/ from live verification"
```

---

### Task 8: Verify and document /api/dealers/info

**Files:**
- Modify: `openapi.yaml`

- [ ] **Step 1: Probe**

```bash
node scripts/probe.js GET '/api/dealers/info' dealer-info
```

- [ ] **Step 2: Add to openapi.yaml**

```yaml
  /api/dealers/info:
    get:
      tags: [dealers]
      operationId: getDealerInfo
      summary: Information about the dealer account the token belongs to
      x-sdk-node: "ffe.dealerInfo()"
      x-sdk-php: "$ffe->dealerInfo()"
      responses:
        "200":
          description: Dealer information
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/DealerInfo"
        "401":
          $ref: "#/components/responses/Unauthorized"
```

Build `DealerInfo` under `components.schemas` from the exact fields returned, each as `{ type: <observed type> }`, and use the sanitised body as the example.

- [ ] **Step 3: Lint and commit**

Run: `npm run lint:spec` → 0 errors.

```bash
git add openapi.yaml
git commit -m "Document /api/dealers/info from live verification"
```

---

### Task 9: Verify and document /api/pos/sales/ and /api/pos/products/

**Files:**
- Modify: `openapi.yaml`

- [ ] **Step 1: Probe read endpoints only**

```bash
node scripts/probe.js GET '/api/pos/sales/' pos-sales-list
node scripts/probe.js GET '/api/pos/sales/?limit=2' pos-sales-limit
node scripts/probe.js GET '/api/pos/products/' pos-products-list
node scripts/probe.js GET '/api/pos/products/?limit=2' pos-products-limit
node scripts/probe.js OPTIONS '/api/pos/sales/' pos-sales-options
node scripts/probe.js OPTIONS '/api/pos/products/' pos-products-options
```

An empty array is a valid result for a test account. Record the allowed methods from OPTIONS.

- [ ] **Step 2: Ask before any write**

Print and stop: "May I POST a test sale and a test product to /api/pos/ on the test account, and PUT an update to that product, so the write operations are documented from real responses? If yes, give me the fields you want used." Only proceed with writes on an explicit yes.

- [ ] **Step 3: Add to openapi.yaml**

```yaml
  /api/pos/sales/:
    get:
      tags: [pos-sales]
      operationId: listPosSales
      summary: List sales reported from your point of sale
      x-sdk-node: "ffe.posSales({ limit: 50 })"
      x-sdk-php: "throw new Exception('Not implemented in the PHP SDK')"
      parameters:
        - name: limit
          in: query
          schema: { type: integer }
        - name: offset
          in: query
          schema: { type: integer }
      responses:
        "200":
          description: Array of sales
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/PosSale"
        "401":
          $ref: "#/components/responses/Unauthorized"
    post:
      tags: [pos-sales]
      operationId: addPosSale
      summary: Report a sale from your point of sale
      x-verified: false
      x-sdk-node: "ffe.posAddSale({ /* fields */ })"
      x-sdk-php: "throw new Exception('Not implemented in the PHP SDK')"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PosSale"
      responses:
        "201":
          description: Sale stored
        "401":
          $ref: "#/components/responses/Unauthorized"
  /api/pos/sales/{id}:
    get:
      tags: [pos-sales]
      operationId: getPosSale
      summary: Get one reported sale
      x-sdk-node: "ffe.posSales({}, { id: 123 })"
      x-sdk-php: "throw new Exception('Not implemented in the PHP SDK')"
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: The sale
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PosSale"
        "401":
          $ref: "#/components/responses/Unauthorized"
  /api/pos/products/:
    get:
      tags: [pos-products]
      operationId: listPosProducts
      summary: List your own point-of-sale products
      x-sdk-node: "ffe.posProducts({ limit: 50 })"
      x-sdk-php: "throw new Exception('Not implemented in the PHP SDK')"
      parameters:
        - name: limit
          in: query
          schema: { type: integer }
        - name: offset
          in: query
          schema: { type: integer }
      responses:
        "200":
          description: Array of products
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/PosProduct"
        "401":
          $ref: "#/components/responses/Unauthorized"
    post:
      tags: [pos-products]
      operationId: addPosProduct
      summary: Create a point-of-sale product
      x-verified: false
      x-sdk-node: "ffe.posAddProduct({ /* fields */ })"
      x-sdk-php: "throw new Exception('Not implemented in the PHP SDK')"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PosProduct"
      responses:
        "201":
          description: Product stored
        "401":
          $ref: "#/components/responses/Unauthorized"
  /api/pos/products/{id}:
    get:
      tags: [pos-products]
      operationId: getPosProduct
      summary: Get one point-of-sale product
      x-sdk-node: "ffe.posProducts({}, { id: 123 })"
      x-sdk-php: "throw new Exception('Not implemented in the PHP SDK')"
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: The product
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PosProduct"
        "401":
          $ref: "#/components/responses/Unauthorized"
    put:
      tags: [pos-products]
      operationId: updatePosProduct
      summary: Update a point-of-sale product
      x-verified: false
      x-sdk-node: "ffe.posEditProduct({ /* fields */ }, { id: 123 })"
      x-sdk-php: "throw new Exception('Not implemented in the PHP SDK')"
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/PosProduct"
      responses:
        "202":
          description: Product updated
        "401":
          $ref: "#/components/responses/Unauthorized"
```

Schemas: build `PosSale` and `PosProduct` from probed GET items if any exist. If the lists were empty and writes were not approved, define them as `type: object` with `additionalProperties: true` and `description: "Shape not verified; fields come from your own POS. Contact Flyfish Europe before integrating."` and keep `x-verified: false` on the write operations. If writes were approved and performed, record the exact bodies and status codes, replace `{ /* fields */ }` in `x-sdk-node` with the real fields used, and remove `x-verified: false`.

- [ ] **Step 4: Lint and commit**

Run: `npm run lint:spec` → 0 errors.

```bash
git add openapi.yaml
git commit -m "Document /api/pos/ endpoints from live verification"
```

---

### Task 10: Reference generator (openapi.yaml → docs/reference/*.md)

**Files:**
- Create: `scripts/gen-reference.js`
- Create: `scripts/gen-reference.test.js`
- Create: `scripts/fixtures/mini-spec.yaml`
- Create: `docs/reference/*.md` (generated output)

**Interfaces:**
- Consumes: `openapi.yaml` operations with `tags[0]`, `operationId`, `summary`, `description`, `parameters`, `requestBody`, `responses`, `x-sdk-node`, `x-sdk-php`, optional `x-verified: false`.
- Produces: `render(spec) -> { [filename: string]: markdownString }` where filename is `<tag>.md`; `main()` writes them to `docs/reference/`.

- [ ] **Step 1: Write the fixture spec**

`scripts/fixtures/mini-spec.yaml`:

```yaml
openapi: 3.0.3
info:
  title: Mini
  version: "1"
servers:
  - url: https://dealer.flyfisheurope.com
tags:
  - name: brands
paths:
  /api/brands/:
    get:
      tags: [brands]
      operationId: listBrands
      summary: List brands
      x-sdk-node: "ffe.brands()"
      x-sdk-php: "$ffe->brands()"
      responses:
        "200":
          description: Array of brands
          content:
            application/json:
              example:
                - brandno: simms
                  name: Simms
        "401":
          $ref: "#/components/responses/Unauthorized"
  /api/brands/{brandno}:
    get:
      tags: [brands]
      operationId: getBrand
      summary: Get one brand
      x-sdk-node: "ffe.brand('simms')"
      x-sdk-php: "$ffe->brand('simms')"
      parameters:
        - name: brandno
          in: path
          required: true
          schema: { type: string }
          example: simms
          description: Brand id
      responses:
        "200":
          description: The brand
          content:
            application/json:
              example:
                brandno: simms
                name: Simms
components:
  responses:
    Unauthorized:
      description: Missing or invalid token
      content:
        application/json:
          example:
            status: 401
            message: Authentication Required
```

- [ ] **Step 2: Write the failing test**

`scripts/gen-reference.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { render } = require('./gen-reference');

const spec = yaml.load(fs.readFileSync(path.join(__dirname, 'fixtures', 'mini-spec.yaml'), 'utf8'));

test('one file per tag with generated header', () => {
    const out = render(spec);
    assert.deepEqual(Object.keys(out), ['brands.md']);
    assert.ok(out['brands.md'].startsWith('<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->'));
});

test('URL table lists every operation', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\| `\/api\/brands\/` \| GET \| List brands \|/);
    assert.match(md, /\| `\/api\/brands\/\{brandno\}` \| GET \| Get one brand \|/);
});

test('path parameters are rendered with example and description', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\| brandno \| path \| string \| yes \| simms \| Brand id \|/);
});

test('responses resolve $ref and print JSON examples', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /\*\*401\*\* Missing or invalid token/);
    assert.match(md, /"message": "Authentication Required"/);
    assert.match(md, /"brandno": "simms"/);
});

test('sample calls include curl, Node SDK and PHP SDK', () => {
    const md = render(spec)['brands.md'];
    assert.match(md, /curl -H 'Authorization: Bearer <your token>' 'https:\/\/dealer\.flyfisheurope\.com\/api\/brands\/simms'/);
    assert.match(md, /ffe\.brand\('simms'\)/);
    assert.match(md, /\$ffe->brand\('simms'\)/);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test scripts/gen-reference.test.js`
Expected: FAIL with `Cannot find module './gen-reference'`.

- [ ] **Step 4: Write scripts/gen-reference.js**

```js
#!/usr/bin/env node
'use strict';

// Renders docs/reference/<tag>.md from openapi.yaml. Pure render(spec)
// is exported for tests; main() does file IO.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const HEADER = '<!-- Generated from openapi.yaml by scripts/gen-reference.js. Do not edit. -->';
const METHOD_ORDER = ['get', 'post', 'put', 'delete', 'options'];

function resolveRef(spec, obj) {
    if (obj && typeof obj.$ref === 'string') {
        const parts = obj.$ref.replace(/^#\//, '').split('/');
        return parts.reduce((acc, key) => acc[key], spec);
    }
    return obj;
}

function baseUrl(spec) {
    return (spec.servers && spec.servers[0] && spec.servers[0].url) || 'https://dealer.flyfisheurope.com';
}

function examplePath(op, urlPath) {
    let out = urlPath;
    for (const p of op.parameters || []) {
        if (p.in === 'path') {
            out = out.replace(`{${p.name}}`, String(p.example !== undefined ? p.example : `<${p.name}>`));
        }
    }
    return out;
}

function paramTable(params, spec) {
    if (!params || params.length === 0) return '_None._\n';
    const rows = params.map(resolveRef.bind(null, spec)).map((p) => {
        const schema = p.schema || {};
        let type = schema.type || 'string';
        if (schema.enum) type += ` (${schema.enum.join(' \\| ')})`;
        if (schema.default !== undefined) type += `, default ${schema.default}`;
        const ex = p.example !== undefined ? String(p.example) : '';
        return `| ${p.name} | ${p.in} | ${type} | ${p.required ? 'yes' : 'no'} | ${ex} | ${(p.description || '').replace(/\n/g, ' ').trim()} |`;
    });
    return ['| Name | In | Type | Required | Example | Description |', '|------|----|------|----------|---------|-------------|', ...rows].join('\n') + '\n';
}

function jsonBlock(value) {
    return '```json\n' + JSON.stringify(value, null, 2) + '\n```\n';
}

function responses(op, spec) {
    const out = [];
    for (const [code, raw] of Object.entries(op.responses || {})) {
        const res = resolveRef(spec, raw);
        out.push(`**${code}** ${res.description || ''}\n`);
        const json = res.content && res.content['application/json'];
        if (json && json.example !== undefined) out.push(jsonBlock(json.example));
    }
    return out.join('\n');
}

function requestBody(op, spec) {
    const body = resolveRef(spec, op.requestBody);
    if (!body) return '';
    const types = Object.keys(body.content || {});
    const json = body.content && body.content['application/json'];
    const schema = json && resolveRef(spec, json.schema);
    const lines = [`### Request body\n`, `Content types: ${types.map(t => '`' + t + '`').join(', ')}\n`];
    if (schema && schema.properties) {
        lines.push('| Field | Type | Required |', '|-------|------|----------|');
        for (const [name, prop] of Object.entries(schema.properties)) {
            const required = (schema.required || []).includes(name) ? 'yes' : 'no';
            lines.push(`| ${name} | ${prop.type || 'object'} | ${required} |`);
        }
        lines.push('');
    }
    if (json && json.example !== undefined) lines.push(jsonBlock(json.example));
    return lines.join('\n') + '\n';
}

function sampleCalls(op, method, urlPath, spec) {
    const url = baseUrl(spec) + examplePath(op, urlPath);
    const curl = method === 'get'
        ? `curl -H 'Authorization: Bearer <your token>' '${url}'`
        : `curl -X ${method.toUpperCase()} -H 'Authorization: Bearer <your token>' -H 'Content-Type: application/json' -d '{}' '${url}'`;
    const node = op['x-sdk-node'] || `// no SDK method; use https.request against ${url}`;
    const php = op['x-sdk-php'] || `// no SDK method; use curl against ${url}`;
    return [
        '### Sample calls\n',
        '**curl**\n', '```bash\n' + curl + '\n```\n',
        '**Node.js SDK**\n',
        '```javascript\n' +
        "const FFE = require('@flyfisheurope/ffe-api-sdk');\n" +
        "const ffe = new FFE('<your token>');\n" +
        `${node}\n` +
        '    .then((result) => console.log(result))\n' +
        '    .catch((error) => console.error(error));\n' +
        '```\n',
        '**PHP SDK**\n',
        '```php\n' +
        "<?php\nrequire 'ffe.php';\n" +
        "$ffe = new FFE('<your token>');\n" +
        `$result = ${php};\n` +
        'print_r($result);\n' +
        '```\n',
    ].join('\n');
}

function operationSection(method, urlPath, op, spec) {
    const parts = [];
    parts.push(`## ${method.toUpperCase()} ${urlPath}\n`);
    parts.push(`${op.summary}\n`);
    if (op['x-verified'] === false) {
        parts.push('> **Not verified against the live API.** The request shape is taken from the SDK. Contact Flyfish Europe before relying on it.\n');
    }
    if (op.description) parts.push(op.description.trim() + '\n');
    parts.push('### Parameters\n');
    parts.push(paramTable(op.parameters, spec));
    const body = requestBody(op, spec);
    if (body) parts.push(body);
    parts.push('### Responses\n');
    parts.push(responses(op, spec));
    parts.push(sampleCalls(op, method, urlPath, spec));
    return parts.join('\n');
}

function render(spec) {
    const byTag = {};
    for (const [urlPath, item] of Object.entries(spec.paths || {})) {
        for (const method of METHOD_ORDER) {
            const op = item[method];
            if (!op) continue;
            const tag = (op.tags && op.tags[0]) || 'other';
            (byTag[tag] = byTag[tag] || []).push({ method, urlPath, op });
        }
    }
    const out = {};
    for (const [tag, ops] of Object.entries(byTag)) {
        const lines = [HEADER, '', `# ${tag}`, ''];
        lines.push('| URL | Method | Description |', '|-----|--------|-------------|');
        for (const { method, urlPath, op } of ops) {
            lines.push(`| \`${urlPath}\` | ${method.toUpperCase()} | ${op.summary} |`);
        }
        lines.push('');
        lines.push('All requests need the header `Authorization: Bearer <your token>`. See [Getting started](../getting-started.md).', '');
        for (const { method, urlPath, op } of ops) {
            lines.push(operationSection(method, urlPath, op, spec));
        }
        out[`${tag}.md`] = lines.join('\n');
    }
    return out;
}

function main() {
    const root = path.join(__dirname, '..');
    const spec = yaml.load(fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8'));
    const dir = path.join(root, 'docs', 'reference');
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.md')) fs.unlinkSync(path.join(dir, f));
    }
    const files = render(spec);
    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, name), content);
        console.log(`wrote docs/reference/${name}`);
    }
}

module.exports = { render };
if (require.main === module) main();
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test scripts/gen-reference.test.js`
Expected: 5 passing tests.

- [ ] **Step 6: Generate the real reference and read it**

Run: `npm run gen:reference && ls docs/reference && sed -n '1,80p' docs/reference/products.md`
Expected: one file per tag (`login.md`, `brands.md`, `categories.md`, `products.md`, `baskets.md`, `dealers.md`, `pos-sales.md`, `pos-products.md`); the products page shows the parameter table with all verified query params and the JSON examples.

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-reference.js scripts/gen-reference.test.js scripts/fixtures/mini-spec.yaml docs/reference
git commit -m "Generate docs/reference from openapi.yaml"
```

---

### Task 11: Postman collection generator

**Files:**
- Create: `scripts/gen-postman.js`
- Create: `scripts/gen-postman.test.js`
- Create: `postman/ffe-api.postman_collection.json` (generated)

**Interfaces:**
- Consumes: same spec fields as Task 10.
- Produces: `render(spec) -> collectionObject` (Postman Collection v2.1); `main()` writes `postman/ffe-api.postman_collection.json`.

- [ ] **Step 1: Write the failing test**

`scripts/gen-postman.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { render } = require('./gen-postman');

const spec = yaml.load(fs.readFileSync(path.join(__dirname, 'fixtures', 'mini-spec.yaml'), 'utf8'));

test('collection has v2.1 schema, token and baseUrl variables', () => {
    const c = render(spec);
    assert.equal(c.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    assert.deepEqual(c.variable.map(v => v.key), ['baseUrl', 'token']);
    assert.equal(c.variable[0].value, 'https://dealer.flyfisheurope.com');
});

test('one folder per tag with one request per operation', () => {
    const c = render(spec);
    assert.equal(c.item.length, 1);
    assert.equal(c.item[0].name, 'brands');
    assert.deepEqual(c.item[0].item.map(r => r.name), ['List brands', 'Get one brand']);
});

test('requests carry bearer header and path variables', () => {
    const c = render(spec);
    const req = c.item[0].item[1].request;
    assert.equal(req.method, 'GET');
    assert.deepEqual(req.header, [{ key: 'Authorization', value: 'Bearer {{token}}' }]);
    assert.equal(req.url.raw, '{{baseUrl}}/api/brands/:brandno');
    assert.deepEqual(req.url.variable, [{ key: 'brandno', value: 'simms', description: 'Brand id' }]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/gen-postman.test.js`
Expected: FAIL with `Cannot find module './gen-postman'`.

- [ ] **Step 3: Write scripts/gen-postman.js**

```js
#!/usr/bin/env node
'use strict';

// Renders a Postman Collection v2.1 from openapi.yaml.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const METHOD_ORDER = ['get', 'post', 'put', 'delete'];

function resolveRef(spec, obj) {
    if (obj && typeof obj.$ref === 'string') {
        const parts = obj.$ref.replace(/^#\//, '').split('/');
        return parts.reduce((acc, key) => acc[key], spec);
    }
    return obj;
}

function requestFor(spec, method, urlPath, op) {
    const params = (op.parameters || []).map(resolveRef.bind(null, spec));
    const postmanPath = urlPath.replace(/\{([^}]+)\}/g, ':$1');
    const query = params.filter(p => p.in === 'query').map(p => ({
        key: p.name,
        value: p.example !== undefined ? String(p.example) : '',
        disabled: true,
        description: p.description || '',
    }));
    const variable = params.filter(p => p.in === 'path').map(p => ({
        key: p.name,
        value: p.example !== undefined ? String(p.example) : '',
        description: p.description || '',
    }));
    const request = {
        method: method.toUpperCase(),
        header: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
        url: {
            raw: `{{baseUrl}}${postmanPath}`,
            host: ['{{baseUrl}}'],
            path: postmanPath.replace(/^\//, '').split('/'),
        },
    };
    if (query.length) request.url.query = query;
    if (variable.length) request.url.variable = variable;
    const body = resolveRef(spec, op.requestBody);
    const json = body && body.content && body.content['application/json'];
    if (json) {
        const schema = resolveRef(spec, json.schema) || {};
        const example = json.example !== undefined
            ? json.example
            : Object.fromEntries(Object.keys(schema.properties || {}).map(k => [k, '']));
        request.header.push({ key: 'Content-Type', value: 'application/json' });
        request.body = { mode: 'raw', raw: JSON.stringify(example, null, 2) };
    }
    return { name: op.summary, request };
}

function render(spec) {
    const folders = {};
    for (const [urlPath, item] of Object.entries(spec.paths || {})) {
        for (const method of METHOD_ORDER) {
            const op = item[method];
            if (!op) continue;
            const tag = (op.tags && op.tags[0]) || 'other';
            (folders[tag] = folders[tag] || []).push(requestFor(spec, method, urlPath, op));
        }
    }
    const baseUrl = (spec.servers && spec.servers[0] && spec.servers[0].url) || 'https://dealer.flyfisheurope.com';
    return {
        info: {
            name: spec.info.title,
            description: 'Set the token variable to your DealerWeb API token.',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        variable: [
            { key: 'baseUrl', value: baseUrl },
            { key: 'token', value: '' },
        ],
        item: Object.entries(folders).map(([name, item]) => ({ name, item })),
    };
}

function main() {
    const root = path.join(__dirname, '..');
    const spec = yaml.load(fs.readFileSync(path.join(root, 'openapi.yaml'), 'utf8'));
    const dir = path.join(root, 'postman');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'ffe-api.postman_collection.json');
    fs.writeFileSync(file, JSON.stringify(render(spec), null, 2) + '\n');
    console.log(`wrote ${path.relative(root, file)}`);
}

module.exports = { render };
if (require.main === module) main();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all gen-reference and gen-postman tests pass.

- [ ] **Step 5: Generate and smoke-test the collection**

Run: `npm run gen:postman && node -e "const c=require('./postman/ffe-api.postman_collection.json'); console.log(c.item.map(f=>f.name+':'+f.item.length).join(', '))"`
Expected: a folder per tag with the expected request counts (login:1, brands:2, categories:2, products:2, baskets:1 or more, dealers:1, pos-sales:3, pos-products:4).

Then import the file into Postman, set `token`, and run "List all brands available to your dealer account". Expected: 200 with the brand array.

- [ ] **Step 6: Commit**

```bash
git add scripts/gen-postman.js scripts/gen-postman.test.js postman/ffe-api.postman_collection.json
git commit -m "Generate Postman collection from openapi.yaml"
```

---

### Task 12: Replace root endpoint docs with redirect stubs and point README at the reference

**Files:**
- Modify: `brands.md`, `categories.md`, `products.md`, `baskets.md` (replace contents)
- Modify: `README.md` (the "API endpoints" section only; the full README rewrite is Phase 3)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace each root doc with a stub**

`brands.md`:

```markdown
This page has moved to [docs/reference/brands.md](docs/reference/brands.md).
```

`categories.md`:

```markdown
This page has moved to [docs/reference/categories.md](docs/reference/categories.md).
```

`products.md`:

```markdown
This page has moved to [docs/reference/products.md](docs/reference/products.md).
```

`baskets.md`:

```markdown
This page has moved to [docs/reference/baskets.md](docs/reference/baskets.md).
```

- [ ] **Step 2: Update the README endpoint list**

Replace the section starting at `# API endpoints` through the line `You can create an API token on the DealerWeb under My Account.` with:

```markdown
# API endpoints

Full reference, generated from [openapi.yaml](openapi.yaml):

- [/login/](docs/reference/login.md)
- [/api/brands/](docs/reference/brands.md)
- [/api/categories/](docs/reference/categories.md)
- [/api/products/](docs/reference/products.md)
- [/api/baskets/](docs/reference/baskets.md)
- [/api/dealers/info](docs/reference/dealers.md)
- [/api/pos/sales/](docs/reference/pos-sales.md)
- [/api/pos/products/](docs/reference/pos-products.md)

Prefer Postman? Import [postman/ffe-api.postman_collection.json](postman/ffe-api.postman_collection.json) and set the `token` variable.

You can create an API token on the DealerWeb under My Account.
```

- [ ] **Step 3: Verify every link target exists**

Run:

```bash
for f in docs/reference/login.md docs/reference/brands.md docs/reference/categories.md docs/reference/products.md docs/reference/baskets.md docs/reference/dealers.md docs/reference/pos-sales.md docs/reference/pos-products.md postman/ffe-api.postman_collection.json openapi.yaml; do test -f "$f" && echo "ok $f" || echo "MISSING $f"; done
```

Expected: every line starts with `ok`.

- [ ] **Step 4: Update CLAUDE.md**

In `CLAUDE.md`, add under "## Commands":

```markdown
# Spec tooling (repo root)
npm install
npm run lint:spec       # validate openapi.yaml
npm run gen:reference   # regenerate docs/reference/*.md (never edit those by hand)
npm run gen:postman     # regenerate postman/ffe-api.postman_collection.json
npm test                # generator unit tests
FFE_TOKEN=... node scripts/probe.js GET /api/brands/ brands-list   # record a live call to scripts/probes/ (gitignored)
```

Under "## Architecture" add this paragraph:

"`openapi.yaml` is the single source of truth for endpoints. `docs/reference/` and `postman/` are generated from it by the scripts in `scripts/`; edit the spec and regenerate. Operations carry `x-sdk-node` and `x-sdk-php` strings used as the SDK sample call in the generated pages, and `x-verified: false` marks operations not confirmed against the live API."

Remove the "Known inconsistencies" bullet about `baskets.md` sample calls, since the file is now a stub.

- [ ] **Step 5: Commit**

```bash
git add brands.md categories.md products.md baskets.md README.md CLAUDE.md
git commit -m "Point root docs and README at generated reference"
```

---

## Self-review

- Spec coverage: section 3 (OpenAPI, verification, generated reference, Postman, root stubs) is covered by Tasks 1–12. Section 4 (SDK fixes) is Phase 2. Sections 1, 2, 5 (guides, README rewrite, verify-examples, link check, Node SDK tests) are Phases 3 and 4.
- Placeholders: the only intentionally open values are those that must come from live probes (default limits, unknown-id status codes, DealerInfo/PosSale/PosProduct fields); each task says exactly which probe decides them. `{ /* fields */ }` in Task 9 is replaced or explicitly kept with `x-verified: false`.
- Type consistency: `render(spec)` returns an object keyed by filename in `gen-reference.js` and a collection object in `gen-postman.js`; both are exercised by their tests. Extension names `x-sdk-node`, `x-sdk-php`, `x-verified` are used identically in Tasks 3–10.
