# PrestaShop

This page shows where a sync script hooks into a PrestaShop store — it is not a full
module. You still write (or copy from the [recipes](../recipes/)) the loop that turns one
`catalog.json` product from the [catalog sync recipe](../recipes/sync-catalog.md) into
calls against the PrestaShop Webservice.

## Where the sync runs

Two options, either of which uses the PHP SDK described in the
[PHP platform guide](./php.md):

- **A standalone PHP script**, run on a normal system cron schedule, the same way the
  [PHP platform guide](./php.md)'s cron skeleton does. It calls `ffe.php` to read the
  Flyfish Europe catalog, then calls the PrestaShop Webservice over HTTPS to write the
  result — PrestaShop itself never has to be loaded.
- **A PrestaShop module with a cron controller**, if you want the schedule to live inside
  PrestaShop's own module system instead of a separate system cron job. The module
  registers a controller that PrestaShop's cron page (or an external scheduler hitting
  that controller's URL) calls on a schedule; the controller is where you'd call `ffe.php`
  and then the Webservice, the same way the standalone script does.

Either way, the part that talks to Flyfish Europe is the same PHP SDK and recipe scripts
linked at the bottom of this page. Only the last step — what you do with the data — is
PrestaShop-specific.

## Field mapping

Map each field of a `catalog.json` shop product (see
[Recipe: sync your catalog](../recipes/sync-catalog.md)) onto a PrestaShop product. The
Webservice speaks XML, and PrestaShop models one shop product with several sizes/colours
as a base product plus one **combination** per variant, rather than nesting variants
inside the product body the way WooCommerce does.

| `catalog.json` field | PrestaShop field | Notes |
|---|---|---|
| `name` | `name` (language-indexed) | PrestaShop multi-language stores need one `<language id="...">` entry per active language. |
| `description` | `description` (language-indexed) | Same language-indexed shape as `name`. |
| `category` | `id_category_default` | Takes a category id, not a name — look up or create the category first. |
| `price` (single-variant item), `variants[].price` (multi-variant item) | `price` on the base product, or the **combination**'s own price field when there is more than one size/colour | Tax-excluded price, in your shop's default currency; there is no separate currency field on the product — make sure your shop's currency matches `currency` before you sync. Variants of the same shop product can have different prices (see [Recipe: sync your catalog](../recipes/sync-catalog.md#what-you-get)); PrestaShop combinations don't carry a full replacement price the way a WooCommerce variation does — a combination's price field is an impact/delta relative to the base product's `price` — so if your variants' `price` values differ, compute that delta per combination rather than assuming one flat price for every variant. See your Webservice version's `combinations` resource docs for the current field name. |
| `variants[].articleno` | `reference` | Set on the base product for a single-variant item, or on each **combination** when there is more than one size/colour. |
| `variants[].gtin` | `ean13` | A long-standing native barcode field on both the product and combination resources. |
| `variants[].size`, `variants[].color` | combination attribute values | Each variant becomes one entry in the `combinations` resource, linked to attribute values (e.g. "Size", "Colour") you define once under PrestaShop's Attributes. `size`/`color` can be `false` (no such attribute on this product) — skip that attribute value for the combination rather than sending the literal value `false`. |
| `image` | not in this example | Images are their own resource (`/api/images/products/<id>`), uploaded separately from the product body — see the Webservice documentation linked below. |
| `variants[].availability` | `quantity` (on the `stock_availables` resource) | See the mapping below. |

### Stock status

Map `availability` through [Concepts: Availability](../concepts.md#availability) first,
then onto PrestaShop's stock field. `stock_availables` carries one `quantity` per product
(or per combination, via its `id_product_attribute`):

| Concepts status | PrestaShop field |
|---|---|
| in-stock | `quantity` set to a positive number |
| out-of-stock | `quantity: 0` |
| expected (on a date) | `quantity: 0` — PrestaShop's Webservice has no long-standing native "restock date" field; track the date yourself if you want to display it. |
| in-stock with quantity | `quantity` set to the known number |

## Creating a product

`POST /api/products` with an XML body. This example uses only the long-standing fields
above; combinations, `stock_availables` and images are separate requests once the base
product exists. The body below is illustrative, not a complete or guaranteed-valid
request — PrestaShop also usually requires a `link_rewrite` (the URL slug, language-indexed
like `name`) before it will save a product; check your installed version for the full set
of required fields. The body for `POST /api/products`:

```xml
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <product>
    <reference><![CDATA[EXAMPLE-001]]></reference>
    <ean13><![CDATA[4560111388931]]></ean13>
    <price><![CDATA[199.000000]]></price>
    <id_category_default><![CDATA[2]]></id_category_default>
    <active><![CDATA[1]]></active>
    <name>
      <language id="1"><![CDATA[Example Fly Rod]]></language>
    </name>
    <description>
      <language id="1"><![CDATA[A description pulled from the catalog.json product.]]></language>
    </description>
  </product>
</prestashop>
```

See your platform version's documentation for the current field list.

## This is not a module

Everything above is the mapping and the one Webservice call a sync script needs — it is
not a ready-made PrestaShop module, an installer, or a back-office settings page. You
still write the loop that reads `catalog.json` and issues these requests, and you decide
how updates, retries and errors are handled in your own script.

## Where next

- [Recipe: sync your catalog](../recipes/sync-catalog.md) — build `catalog.json` first.
- [Recipe: keep content updated](../recipes/keep-content-updated.md) — refresh name,
  description and image fields without touching your own prices or stock.
- [Recipe: stock and price lookup](../recipes/stock-and-price-lookup.md) — refresh
  `availability` and `retailPrice` on their own, more frequent schedule.
- [PHP platform guide](./php.md) — installing the PHP SDK and a cron-driven script
  skeleton.
- [No code access to your platform?](./hosted-shops.md) — export a CSV instead.
- [PrestaShop DevDocs](https://devdocs.prestashop-project.org/) — the current,
  authoritative field list for the Webservice, including the `products`, `combinations`
  and `stock_availables` resources mentioned on this page.
