# Recipe scripts

Runnable copies of the scripts embedded in the guide's recipe pages. The pages
are the documentation; these files are what you run. Each page embeds its file
verbatim (`npm run sync:recipes` at the repository root keeps them identical),
so edit the file here, not the page.

| Script | Page |
|---|---|
| [node/sync-catalog.js](node/sync-catalog.js), [php/sync-catalog.php](php/sync-catalog.php) | [Sync your catalog](../../docs/recipes/sync-catalog.md) |
| [node/keep-content-updated.js](node/keep-content-updated.js), [php/keep-content-updated.php](php/keep-content-updated.php) | [Keep content updated](../../docs/recipes/keep-content-updated.md) |
| [node/refresh-stock.js](node/refresh-stock.js) | [Stock and price lookup](../../docs/recipes/stock-and-price-lookup.md) |
| [node/basket-demo.js](node/basket-demo.js), [php/basket-demo.php](php/basket-demo.php) | [Ordering with baskets](../../docs/recipes/ordering-with-baskets.md) |
| [node/catalog-to-csv.js](node/catalog-to-csv.js) | [Hosted shops](../../docs/platforms/hosted-shops.md) |

## Run them from this repository

The Node scripts `require('@flyfisheurope/ffe-api-sdk')`. In your own project
you install that from npm; here, `npm install` links it to `../../sdk/node.js`:

Node.js 18 or newer.

```bash
cd example/recipes && npm install
mkdir -p /tmp/ffe-recipes && cd /tmp/ffe-recipes     # the scripts write catalog.json etc. into the current directory
R=/path/to/ffe-api/example/recipes/node
FFE_TOKEN=<your token> node $R/sync-catalog.js simms      # one brand while testing; omit the argument for all brands
FFE_TOKEN=<your token> node $R/keep-content-updated.js    # needs catalog.json
FFE_TOKEN=<your token> node $R/refresh-stock.js           # needs catalog.json
node $R/catalog-to-csv.js                                 # needs catalog.json, no token
FFE_TOKEN=<your token> node $R/basket-demo.js <numeric product id>   # id = a variants[].id from catalog.json; adds one line to your basket and removes it
```

The PHP scripts do `require 'ffe.php';`. Here `php/ffe.php` is a one-line file
that loads `../../sdk/php/ffe.php`; in your own project copy the SDK file next
to the script instead.

```bash
FFE_TOKEN=<your token> php /path/to/ffe-api/example/recipes/php/sync-catalog.php simms
```

`scripts/verify-examples.sh` at the repository root runs all of them against the
live API in one go.
