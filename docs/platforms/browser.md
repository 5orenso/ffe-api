# Browser

`sdk/javascript/ffe-api-sdk.js` is a small script that calls the API directly from a web
page with `fetch` and writes the result into fixed HTML elements. It's demo code, not a
general-purpose SDK — read it as a starting point to copy and adapt, not a library to
depend on unmodified. This page covers loading it, its three functions, and the two things
that catch people out: CORS and the token type.

## Use a client-side token, never a server-side one

Create a **client-side token** for this in DealerWeb under My Account — see
[Getting started, Step 1](../getting-started.md). Anything in a web page's JavaScript is
visible to anyone who views the page's source, so a server-side token embedded here is as
exposed as if you'd published it. Save server-side tokens for code that runs on your own
server, such as the scripts in the [Node.js](./nodejs.md) and [PHP](./php.md) guides.

## Loading the script

Set `FFE_TOKEN` (and optionally `FFE_URL`) as globals before the script tag, then load the
file from jsDelivr:

```html
<script>
    FFE_TOKEN = '<your client-side token>';
    // Optional: point at a different API host, e.g. for local development.
    // FFE_URL = 'https://dealer.flyfisheurope.com/api';
</script>
<script src="https://cdn.jsdelivr.net/gh/5orenso/ffe-api@master/sdk/javascript/ffe-api-sdk.js"></script>
```

`FFE_TOKEN` is required — the script logs an error to the console if it's missing.
`FFE_URL` defaults to `https://dealer.flyfisheurope.com/api` if you don't set it.

Pinning `@master` in that URL always gets the latest version on the default branch. For a
page you don't control the deploy timing of, consider vendoring a copy of the file instead
of pointing at a moving branch.

## The three functions

Once the script has loaded, call these from your own page code (typically from an
`onclick` handler, as the [demo page](#the-demo-page) does):

| Function | Renders into | What it does |
|----------|---------------|---------------|
| `FFE.getProductList(brand, maingroup, limit, offset)` | `#productList`, `#productPagination` | Fetches a page of products for a brand (optionally narrowed to one `maingroup`/`mainCat`) and builds the list and its pagination links. If `maingroup` is omitted it also calls `getCategoryList` for you. |
| `FFE.getCategoryList(brand)` | `#categoryList` | Fetches and renders a brand's main categories as links, each wired to call `getProductList`. |
| `FFE.getProduct(articleno)` | `#product` and its child elements (`#productName`, `#productBrand`, ...) | Fetches and renders one product's detail fields. |

All three expect specific element ids to already exist on the page — see
[example/javascript/html-client.html](../../example/javascript/html-client.html) for the
full set. Copy that markup (or your own equivalent ids) rather than calling the functions
against a blank page.

## The demo page

[example/javascript/html-client.html](../../example/javascript/html-client.html) is a
complete, working page built on this script. Serve it over HTTP — don't open the file
directly from disk, since browsers restrict `fetch` from a `file://` origin. Serve it from
the **repository root**, not from `example/javascript/`: the browser resolves the SDK's
`<script src>` relative to the page's own URL (`../../sdk/javascript/ffe-api-sdk.js`), and
that only lands on the real file when the page itself is reachable at
`/example/javascript/html-client.html` under a server rooted at the repository root — serve
from any other directory and that path 404s.

```bash
# From the repository root:
python3 -m http.server 9999
# Then open:
open http://localhost:9999/example/javascript/html-client.html
```

Edit the `FFE_TOKEN` line near the bottom of the file (just above the SDK's `<script
src>` tag) to your own client-side token before serving it.

## CORS

A browser sends a preflight `OPTIONS` request before the actual `fetch` call, to check
whether the API allows cross-origin requests from your page's origin. `/api/brands/`,
`/api/baskets/`, `/api/pos/sales/` and `/api/pos/products/` were verified to answer this
preflight correctly. The other endpoints — including `/api/products/` and
`/api/categories/`, which this script calls — are expected to behave the same way but
haven't been checked individually. If you see a CORS error in the console, first rule out
the `file://` cause above; if it persists on a checked endpoint, treat it as worth a report
to Flyfish Europe. See [Concepts: CORS](../concepts.md#cors) and
[Troubleshooting: CORS error in the browser](../troubleshooting.md#cors-error-in-the-browser).

## The `unique` caveat

`getProductList` does not request `unique=true`, and you shouldn't add it. Every observed
call to `GET /api/products/?unique=true` returns HTTP 504, so the script renders one row
per variant (per size/colour) instead of one row per shop product. See
[Concepts: Variants](../concepts.md#variants) for why, and the
[sync your catalog recipe](../recipes/sync-catalog.md) for how a server-side script groups
variants into shop products — that grouping has to happen in your own code, not in a
single API call.

## Where next

- [sdk/javascript/README.md](../../sdk/javascript/README.md) — the script's own README.
- [Concepts](../concepts.md) — variants, availability, images, CORS.
- [Troubleshooting](../troubleshooting.md) — CORS errors and other symptom-first fixes.
