# Magento

This page shows where a sync script hooks into a Magento (Adobe Commerce) store — it is
not a full module. You still write (or copy from the [recipes](../recipes/)) the loop that
turns one `catalog.json` product from the [catalog sync recipe](../recipes/sync-catalog.md)
into calls against the Magento REST API.

## Where the sync runs

Two options, either of which uses the PHP SDK described in the
[PHP platform guide](./php.md):

- **A standalone PHP script**, run on a normal system cron schedule, the same way the
  [PHP platform guide](./php.md)'s cron skeleton does. It calls `ffe.php` to read the
  Flyfish Europe catalog, then calls the Magento REST API over HTTPS to write the result —
  Magento itself never has to be loaded.
- **A cron job defined in a Magento module's `crontab.xml`**, if you want the schedule to
  live inside Magento's own module system instead of a separate system cron job. The job
  entry points at a PHP class inside your module, which is where you'd call `ffe.php` and
  then the REST API, the same way the standalone script does. Either way, Magento's own
  cron still has to be running (`bin/magento cron:run`, itself normally driven by a system
  cron job) for a `crontab.xml` job to fire at all.

Either way, the part that talks to Flyfish Europe is the same PHP SDK and recipe scripts
linked at the bottom of this page. Only the last step — what you do with the data — is
Magento-specific.

## Field mapping

Map each field of a `catalog.json` shop product (see
[Recipe: sync your catalog](../recipes/sync-catalog.md)) onto a Magento product. Magento
models one shop product with several sizes/colours as a **configurable product** (the
parent) plus one **simple product** per variant, linked together — closer to PrestaShop's
combinations than to WooCommerce's variations nested in one call.

| `catalog.json` field | Magento field | Notes |
|---|---|---|
| `name` | `product.name` | |
| `description` | a `description` entry in `custom_attributes` (`[{ attribute_code, value }]`) | `description` is part of Magento's default attribute set; confirm it's on yours before relying on this. |
| `category` | `category_links` | Not covered in this example, since Magento versions differ on the exact assignment shape — see your version's docs (`category_links` on the product, or a separate category-assignment endpoint). |
| `variants[].price` | `product.price`, set on each **simple product** | A plain number in your store's base currency; there is no separate currency field — currency is a store-view/website setting, so make sure it matches `currency` before you sync. Variants of the same shop product can have different prices (see [Recipe: sync your catalog](../recipes/sync-catalog.md#what-you-get)) — Magento already prices each simple product independently, so set `price` per simple product, falling back to the group-level `price` only when a variant doesn't carry its own. |
| `variants[].articleno` | `sku` | Each variant is its own simple product with its own `sku`, linked to the parent configurable product. |
| `variants[].gtin` | no fixed core field across Magento versions | Store it as a custom attribute if your attribute set has one, or check your version's field list for a native GTIN/UPC/EAN attribute. |
| `variants[].size`, `variants[].color` | configurable attributes | Defined once as attributes (e.g. "Size", "Colour") on the parent configurable product; each simple product carries its own value for each. `size`/`color` can be `false` (no such attribute on this product) — omit that attribute for the simple product rather than sending the literal value `false`. |
| `image` | `media_gallery_entries` | A separate array on the product, each entry carrying the image data; see the field list below rather than guessing the exact shape. |
| `variants[].availability` | `extension_attributes.stock_item` (`qty`, `is_in_stock`) | See the mapping below. |

### Stock status

Map `availability` through [Concepts: Availability](../concepts.md#availability) first,
then onto Magento's stock item fields:

| Concepts status | Magento fields |
|---|---|
| in-stock | `is_in_stock: true` |
| out-of-stock | `is_in_stock: false` |
| expected (on a date) | `is_in_stock: false` — Magento's core stock item has no long-standing native "restock date" field; track the date yourself if you want to display it. |
| in-stock with quantity | `is_in_stock: true`, `qty: <n>` |

## Creating a product

`POST /rest/V1/products` with a JSON body. This example uses only the most basic,
long-standing fields; description, images and stock are set through the additional fields
noted in the mapping table above, in the same request or a follow-up one. The body for
`POST /rest/V1/products`:

```json
{
  "product": {
    "sku": "EXAMPLE-001",
    "name": "Example Fly Rod",
    "price": 199.00,
    "attribute_set_id": 4,
    "type_id": "simple",
    "status": 1,
    "visibility": 4
  }
}
```

`attribute_set_id` is whichever attribute set your catalog uses (commonly `4`, the
"Default" set on a stock Magento install — check your own store rather than assuming).
`visibility: 4` is Magento's own "Catalog, Search" constant. See your platform version's
documentation for the current field list.

## This is not a module

Everything above is the mapping and the one REST call a sync script needs — it is not a
ready-made Magento module, an installer, or an admin settings page. You still write the
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
- [Adobe Commerce REST API documentation](https://developer.adobe.com/commerce/webapi/rest/) —
  the current, authoritative field list for every endpoint mentioned on this page (Adobe
  Commerce and Magento Open Source share the same REST API).
