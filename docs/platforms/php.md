# PHP

The PHP SDK is one dependency-free file, [`sdk/php/ffe.php`](../../sdk/php/ffe.php). It
needs PHP >= 5.4 with the curl extension — nothing else. This page covers installing it
and wiring a sync script into a cron job. For the full method list, constructor options
and exceptions, see [sdk/php/README.md](../../sdk/php/README.md).

If you're on WooCommerce, PrestaShop or Magento, the platform guides for those show where
this fits into each one: [WooCommerce](./woocommerce.md), [PrestaShop](./prestashop.md),
[Magento](./magento.md).

## Install

**Option 1 — copy the file.** Copy `sdk/php/ffe.php` into your project and `require` it.
This is the fastest way to get started and what [Getting started](../getting-started.md)
uses.

**Option 2 — Composer path repository.** There is no packagist entry, but the SDK's
`composer.json` names it `ffe/api`, so you can point Composer at this repository as a path
repository and install it like any other dependency:

```json
{
    "repositories": [
        { "type": "path", "url": "path/to/ffe-api/sdk/php" }
    ],
    "require": { "ffe/api": "*" }
}
```

`path/to/ffe-api` is wherever you keep a checkout of this repository (or a submodule of
it) relative to your project's `composer.json`. Run `composer install` afterwards and
`require 'vendor/autoload.php';` instead of `require 'ffe.php';`.

## A cron-driven sync skeleton

A scheduled script differs from the one in [Getting started](../getting-started.md) in two
ways: there's no interactive user to type a token, and there's no terminal to read errors
from, so both the token and every error need to go somewhere durable.

- **Token.** Read it from an environment variable set on the cron job itself, or from a
  small config file kept outside the web root (so a browser can never fetch it directly).
  Never hard-code it into a script that also lives under a public directory.
- **Errors.** Wrap every SDK call in `try`/`catch` — the PHP SDK throws an `Exception` on
  any response outside the 2xx range or curl failure (`Not authorized` for 401; see
  [sdk/php/README.md](../../sdk/php/README.md#usage)) — and write what happened to a log
  file instead of letting it vanish.

```php
<?php
// sync-cron.php - runs unattended, on a schedule, with no terminal watching it.
require '/path/outside/webroot/ffe.php';

function syncLog($message) {
    $line = '[' . date('c') . '] ' . $message . "\n";
    file_put_contents('/path/outside/webroot/sync.log', $line, FILE_APPEND);
}

// Token from the environment first, falling back to a config file kept outside the web
// root. Either way, keep the token secret and never commit it.
$token = getenv('FFE_TOKEN');
if (!$token) {
    $config = include '/path/outside/webroot/ffe-config.php'; // returns ['token' => '...']
    $token = isset($config['token']) ? $config['token'] : null;
}
if (!$token) {
    syncLog('No token configured, aborting.');
    exit(1);
}

$ffe = new FFE($token);

try {
    $brands = $ffe->brands();
    if (!is_array($brands)) {
        throw new Exception('brands: unexpected response');
    }
    syncLog(count($brands) . ' brands fetched.');
    // ... loop brands, fetch products, write them into your shop here.
} catch (Exception $e) {
    syncLog('API error: ' . $e->getMessage());
    exit(1);
}

syncLog('Sync finished.');
```

Add it to `crontab -e`, running once a night and keeping its own output as a second log:

```
0 3 * * * php /path/outside/webroot/sync-cron.php >> /path/outside/webroot/cron.log 2>&1
```

For a complete, working version of the fetch-and-group logic instead of the `// ...`
placeholder above, use one of the recipe scripts directly:

- [Recipe: sync your catalog — PHP script](../recipes/sync-catalog.md#php-script) — the
  full nightly catalog pull.
- [Recipe: keep content updated — PHP script](../recipes/keep-content-updated.md#php-script) —
  batches lookups with `articleNoIn` and reports what text/image content changed; the
  [stock and price lookup recipe](../recipes/stock-and-price-lookup.md) reuses the same
  batching helper for `availability`.

Both are written to run as standalone scripts — copy one next to `ffe.php`, adjust the
`require` path, and drop it into the skeleton above in place of the `try` block.

## PHP version and dependencies

The SDK targets PHP >= 5.4 and needs the curl extension enabled (`php -m | grep curl` to
check). It has no Composer dependencies of its own — even when installed through Composer,
`ffe.php` is the only file that ships.

## Debugging

Pass `(object) ['debug' => 1]` as the constructor's second argument to echo every request
and response while you develop, and call `lastCurlInfo()` after a failed call for the raw
`curl_getinfo()` details — see
[Troubleshooting: PHP: `No data from API`](../troubleshooting.md#php-no-data-from-api).
Turn `debug` off again before the script runs unattended; it writes to standard output,
not the log file.

## Where next

- [sdk/php/README.md](../../sdk/php/README.md) — full method table, constructor options,
  exception behaviour.
- [Recipes](../recipes/) — sync your catalog, keep content updated, stock and price
  lookup, ordering with baskets.
- [Errors](../errors.md) and [Troubleshooting](../troubleshooting.md) — what a failed
  call looks like and how to fix it.
