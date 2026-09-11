#!/usr/bin/env bash
# Runs every recipe script in example/recipes/ against the live API and checks
# that each one produced what its guide page says it produces.
#
#   FFE_TOKEN=<server-side token> scripts/verify-examples.sh
#
# Writes only into a temporary directory that is removed on exit. The basket
# demo adds one line to the dealer's own basket and removes it again; it picks
# a product that is not already in the basket so nothing of yours is touched.
# PHP recipes run when `php` is on PATH and are skipped otherwise.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RECIPES="$ROOT/example/recipes"
SDK="$ROOT/sdk/node.js/ffe.js"

if [ -z "${FFE_TOKEN:-}" ]; then
    echo "FFE_TOKEN is not set (create a server-side token in DealerWeb > My Account)" >&2
    exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT INT TERM

if [ ! -e "$RECIPES/node_modules/@flyfisheurope/ffe-api-sdk" ]; then
    echo "== npm install in example/recipes (links the SDK)"
    (cd "$RECIPES" && npm install --no-audit --no-fund --loglevel=error)
fi

fail() { echo "FAIL: $*" >&2; exit 1; }

# run <label> <command...>: prints the output, fails on a non-zero exit.
run() {
    local label="$1"; shift
    echo "== $label"
    if ! "$@"; then
        fail "$label exited non-zero"
    fi
}

cd "$WORK"

echo "== first brand"
BRAND="$(node -e '
const FFE = require(process.argv[1]);
new FFE(process.env.FFE_TOKEN).brands().then((brands) => {
    if (!Array.isArray(brands) || brands.length === 0) {
        console.error("brands:", JSON.stringify(brands).slice(0, 300));
        process.exit(1);
    }
    console.log(brands[0].brandno);
});' "$SDK")"
echo "brand: $BRAND"

run "sync-catalog.js $BRAND" node "$RECIPES/node/sync-catalog.js" "$BRAND"
[ -s catalog.json ] || fail "catalog.json was not written"
VARIANTS="$(node -e '
const catalog = require(process.argv[1]);
if (!Array.isArray(catalog) || catalog.length === 0) { console.error("catalog.json is empty"); process.exit(1); }
console.log(catalog.reduce((n, p) => n + p.variants.length, 0));' "$WORK/catalog.json")"
PRODUCTS="$(node -e 'console.log(require(process.argv[1]).length)' "$WORK/catalog.json")"
echo "catalog.json: $PRODUCTS products, $VARIANTS variants"

run "keep-content-updated.js" node "$RECIPES/node/keep-content-updated.js"
node -e '
const r = require(process.argv[1]);
if (!Array.isArray(r.changed) || !Array.isArray(r.missing)) { console.error("content-updates.json has no changed/missing arrays"); process.exit(1); }
if (r.missing.length > 0) { console.error(r.missing.length + " products missing: articleNoIn batches are being truncated"); process.exit(1); }
console.log("content-updates.json: " + r.changed.length + " changed, 0 missing");' "$WORK/content-updates.json"

echo "== refresh-stock.js"
STOCK_OUT="$(node "$RECIPES/node/refresh-stock.js")" || fail "refresh-stock.js exited non-zero"
echo "$STOCK_OUT"
CHECKED="$(sed -n -E 's/^([0-9]+) variants checked, ([0-9]+) matched live, .*/\1/p' <<<"$STOCK_OUT")"
MATCHED="$(sed -n -E 's/^([0-9]+) variants checked, ([0-9]+) matched live, .*/\2/p' <<<"$STOCK_OUT")"
[ -n "$CHECKED" ] || fail "refresh-stock.js did not print its summary line"
[ "$CHECKED" = "$VARIANTS" ] || fail "refresh-stock.js checked $CHECKED variants, catalog.json has $VARIANTS"
[ "$CHECKED" = "$MATCHED" ] || fail "refresh-stock.js matched $MATCHED of $CHECKED variants live"
[ -e stock-updates.json ] || fail "stock-updates.json was not written"

run "catalog-to-csv.js" node "$RECIPES/node/catalog-to-csv.js"
ROWS="$(($(wc -l < catalog.csv) - 1))"
[ "$ROWS" = "$VARIANTS" ] || fail "catalog.csv has $ROWS rows, expected $VARIANTS"

echo "== basket-demo.js"
PRODUCT_ID="$(node -e '
const FFE = require(process.argv[1]);
const catalog = require(process.argv[2]);
new FFE(process.env.FFE_TOKEN).baskets().then((basket) => {
    if (!basket || !Array.isArray(basket.lines)) {
        console.error("baskets:", JSON.stringify(basket).slice(0, 300));
        process.exit(1);
    }
    const inBasket = new Set(basket.lines.map((l) => l.id));
    for (const p of catalog) for (const v of p.variants) {
        if (Number.isInteger(v.id) && !inBasket.has(v.id)) { console.log(v.id); return; }
    }
    console.error("every catalog product is already in the basket");
    process.exit(1);
});' "$SDK" "$WORK/catalog.json")"
echo "product id: $PRODUCT_ID"
BASKET_OUT="$(node "$RECIPES/node/basket-demo.js" "$PRODUCT_ID")" || fail "basket-demo.js exited non-zero"
grep -q '^Basket restored: YES$' <<<"$BASKET_OUT" || fail "basket-demo.js did not restore the basket"
grep -E "^setBasketLine qty 1 -> .*\"id\":$PRODUCT_ID[,}]" <<<"$BASKET_OUT" >/dev/null || fail "setBasketLine did not persist product $PRODUCT_ID (data.id missing)"
grep -E "^Basket after adding qty 1: .*\"id\":$PRODUCT_ID[,}]" <<<"$BASKET_OUT" >/dev/null || fail "basket line for $PRODUCT_ID not found after adding"
echo "basket: added, updated and removed product $PRODUCT_ID; restored"

if command -v php >/dev/null 2>&1; then
    mkdir -p "$WORK/php" && cd "$WORK/php"
    run "sync-catalog.php $BRAND" php "$RECIPES/php/sync-catalog.php" "$BRAND"
    PHP_PRODUCTS="$(node -e 'console.log(require(process.argv[1]).length)' "$WORK/php/catalog.json")"
    [ "$PHP_PRODUCTS" = "$PRODUCTS" ] || fail "sync-catalog.php wrote $PHP_PRODUCTS products, Node wrote $PRODUCTS"
    run "keep-content-updated.php" php "$RECIPES/php/keep-content-updated.php"
    node -e '
const r = require(process.argv[1]);
if (r.missing.length > 0) { console.error(r.missing.length + " products missing in the PHP run"); process.exit(1); }' "$WORK/php/content-updates.json"
    PHP_BASKET_OUT="$(php "$RECIPES/php/basket-demo.php" "$PRODUCT_ID")" || fail "basket-demo.php exited non-zero"
    grep -q 'Basket restored: YES' <<<"$PHP_BASKET_OUT" || fail "basket-demo.php did not restore the basket"
    echo "php: sync-catalog, keep-content-updated and basket-demo passed"
else
    echo "== SKIP php recipes (php is not on PATH)"
fi

echo "ALL RECIPES PASSED ($PRODUCTS products, $VARIANTS variants, brand $BRAND)"
