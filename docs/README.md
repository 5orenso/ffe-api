# Docs

Guides for integrating the Flyfish Europe Dealer API, roughly in the order most
people read them. Start at the root [README](../README.md) if you haven't made a
request yet.

1. [Getting started](getting-started.md) — your first product in curl, Node.js and
   PHP, in about 10 minutes.
2. [Concepts](concepts.md) — the data model: variants, availability, images, prices,
   pagination, rate limiting.
3. **Recipes** — complete, runnable scripts:
   - [Sync your catalog](recipes/sync-catalog.md) — pull your entire product catalog
     into one file.
   - [Keep content updated](recipes/keep-content-updated.md) — detect changed
     names, descriptions and images without touching your shop's own data.
   - [Stock and price lookup](recipes/stock-and-price-lookup.md) — refresh stock and
     price for known products.
   - [Ordering with baskets](recipes/ordering-with-baskets.md) — read the dealer's
     current DealerWeb basket.
4. **Platforms** — where a sync script fits into your shop or language of choice:
   - [PHP](platforms/php.md) — installing the PHP SDK and wiring a sync script into
     a cron job.
   - [Node.js](platforms/nodejs.md) — installing the Node SDK and running a script
     on a schedule.
   - [Browser](platforms/browser.md) — the demo client-side script and its
     limitations.
   - [WooCommerce](platforms/woocommerce.md) — hooking a sync script into a
     WooCommerce store.
   - [PrestaShop](platforms/prestashop.md) — hooking a sync script into a
     PrestaShop store.
   - [Magento](platforms/magento.md) — hooking a sync script into a Magento (Adobe
     Commerce) store.
   - [Hosted shops (Shopify, Wix, and similar)](platforms/hosted-shops.md) — CSV
     import for shops with no server-side code access.
   - [Other languages](platforms/other-languages.md) — calling the API directly,
     in Postman, or from a generated OpenAPI client.
5. **Reference** — every endpoint, generated from [openapi.yaml](../openapi.yaml):
   - [/login/](reference/login.md) — exchange your DealerWeb credentials for an API
     token.
   - [/api/brands/](reference/brands.md) — list and look up brands.
   - [/api/categories/](reference/categories.md) — list and look up categories.
   - [/api/products/](reference/products.md) — list, search and look up products.
   - [/api/baskets/](reference/baskets.md) — the dealer's current DealerWeb basket.
   - [/api/dealers/info](reference/dealers.md) — the authenticated dealer account.
   - [/api/pos/sales/](reference/pos-sales.md) — point-of-sale sales.
   - [/api/pos/products/](reference/pos-products.md) — point-of-sale products.
   - Prefer Postman? Import
     [postman/ffe-api.postman_collection.json](../postman/ffe-api.postman_collection.json)
     and set the `token` variable.
6. [Errors](errors.md) — every HTTP status the API is verified to return, the exact
   body, and what to do about it.
7. [Troubleshooting](troubleshooting.md) — symptom-first fixes for the problems
   developers hit most often.
8. [FAQ](faq.md) — short answers to the questions that come up most.
