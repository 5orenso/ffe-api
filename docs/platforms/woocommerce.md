# WooCommerce

This page shows where a sync script hooks into a WooCommerce store — it is not a full
plugin. You still write (or copy from the [recipes](../recipes/)) the loop that turns one
`catalog.json` product from the [catalog sync recipe](../recipes/sync-catalog.md) into
calls against the WooCommerce REST API.

## Where the sync runs

Two options, either of which uses the PHP SDK described in the
[PHP platform guide](./php.md):

- **A standalone PHP script**, run on a normal system cron schedule, the same way the
  [PHP platform guide](./php.md)'s cron skeleton does. It never has to load WordPress at
  all — it calls `ffe.php` to read the Flyfish Europe catalog, then calls the WooCommerce
  REST API over HTTPS to write the result, the same way any other external client would.
  This is the simpler option and the one this page's examples assume.
- **Inside WordPress**, using WP-Cron to schedule the job and WP-CLI (`wp cron event run
  <hook>`) to make sure it actually fires. WP-Cron alone only runs when a visitor loads a
  page, which is unreliable on a low-traffic dealer site, so a real system cron job calling
  `wp cron event run` is what makes the schedule dependable. A must-use plugin (a PHP file
  in `wp-content/mu-plugins/`) is where you'd register the cron hook and call `ffe.php`
  from inside WordPress.

Either way, the part that talks to Flyfish Europe is the same PHP SDK and recipe scripts
linked at the bottom of this page. Only the last step — what you do with the data — is
WooCommerce-specific.

## Field mapping

Map each field of a `catalog.json` shop product (see
[Recipe: sync your catalog](../recipes/sync-catalog.md)) onto a WooCommerce product:

| `catalog.json` field | WooCommerce field | Notes |
|---|---|---|
| `name` | `name` | The parent (variable) product's title. |
| `description` | `description` | Full HTML description. |
| `image` | `images` (`[{ src }]`) | One object per photo URL; `catalog.json` only carries one image per product. |
| `category` | not in this example | WooCommerce categories are their own resource (`/wp-json/wc/v3/products/categories`); create or look up the category id first, then set `categories: [{ id }]` on the product. |
| `variants[].articleno` | `sku` | Set on each **variation**, not the parent product. |
| `variants[].gtin` | no fixed core field across WooCommerce versions | Older WooCommerce releases have no built-in GTIN/barcode field on the REST API; store it in `meta_data` (`[{ key, value }]`) or check whether your installed version added a native one. |
| `variants[].size`, `variants[].color` | `attributes` | Define the attribute (e.g. "Size") once on the parent product with `variation: true`, then set the matching `option` on each variation. `size`/`color` can be `false` (no such attribute on this product) — skip that attribute for the variation rather than sending the literal value `false`. |
| `variants[].price`, `variants[].currency` (each falls back to the group's `price`/`currency`) | `regular_price`, set on each **variation** | Variants of the same shop product can have different prices (see [Recipe: sync your catalog](../recipes/sync-catalog.md#what-you-get)) — WooCommerce prices variations independently for exactly this reason, so set `regular_price` per variation, not once on the parent. WooCommerce takes a plain price string in whatever currency your store is configured for; there is no separate currency field — make sure your store currency matches `currency` before you sync. |
| `variants[].availability` | `stock_status`, `stock_quantity`, `manage_stock` | Set per variation too — see the mapping below. |

### Stock status

Map `availability` through [Concepts: Availability](../concepts.md#availability) first,
then onto WooCommerce's stock fields:

| Concepts status | WooCommerce fields |
|---|---|
| in-stock | `stock_status: "instock"` |
| out-of-stock | `stock_status: "outofstock"` |
| expected (on a date) | `stock_status: "onbackorder"` — WooCommerce has no long-standing native "restock date" field; store the date yourself if you want to display it. |
| in-stock with quantity | `stock_status: "instock"`, `manage_stock: true`, `stock_quantity: <n>` |

## Creating a product

Use `POST /wp-json/wc/v3/products` for the parent (variable) product — with no
`regular_price`, since that lives on each variation, not the parent — then
`POST /wp-json/wc/v3/products/<id>/variations` once per variant, carrying that variant's
own `regular_price`, `sku` and the chosen `attributes` option. The body for
`POST /wp-json/wc/v3/products`:

```json
{
  "name": "Example Fly Rod",
  "type": "variable",
  "description": "A description pulled from the catalog.json product.",
  "images": [
    { "src": "https://dealer.flyfisheurope.com/400x/example.jpg" }
  ],
  "attributes": [
    { "name": "Size", "visible": true, "variation": true, "options": ["M", "L"] }
  ]
}
```

Then, once per variant, the body for `POST /wp-json/wc/v3/products/<id>/variations`:

```json
{
  "sku": "EXAMPLE-001-M",
  "regular_price": "199.00",
  "attributes": [
    { "name": "Size", "option": "M" }
  ]
}
```

See your platform version's documentation for the current field list.

## This is not a plugin

Everything above is the mapping and the two REST calls a sync script needs — it is not a
ready-made WooCommerce plugin, an installer, or a settings screen. You still write the
loop that reads `catalog.json` and issues these requests, and you decide how updates,
retries and errors are handled in your own script.

## Where next

- [Recipe: sync your catalog](../recipes/sync-catalog.md) — build `catalog.json` first.
- [Recipe: keep content updated](../recipes/keep-content-updated.md) — refresh name,
  description and image fields without touching your own prices or stock.
- [Recipe: stock and price lookup](../recipes/stock-and-price-lookup.md) — refresh
  `availability` and `retailPrice` on their own, more frequent schedule.
- [PHP platform guide](./php.md) — installing the PHP SDK and a cron-driven script
  skeleton.
- [No code access to your platform?](./hosted-shops.md) — export a CSV instead.
- [WooCommerce REST API documentation](https://woocommerce.github.io/woocommerce-rest-api-docs/) —
  the current, authoritative field list for every endpoint mentioned on this page.
