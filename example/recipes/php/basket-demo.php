<?php
// Add, update and remove one basket line, then confirm the basket
// matches how it started.
// Run: FFE_TOKEN=<your token> php basket-demo.php <numeric product id>
require 'ffe.php';

$token = getenv('FFE_TOKEN');
if (!$token) {
    fwrite(STDERR, "Set FFE_TOKEN first.\n");
    exit(1);
}
$id = isset($argv[1]) && ctype_digit($argv[1]) ? (int) $argv[1] : 0;
if (!$id) {
    fwrite(STDERR, "Usage: FFE_TOKEN=<token> php basket-demo.php <numeric product id>\n");
    exit(1);
}
$ffe = new FFE($token);

try {
    $before = $ffe->baskets();
    echo 'Basket before: ', json_encode($before), "\n";

    $added = $ffe->setBasketLine($id, 1);
    echo 'setBasketLine qty 1 -> ', json_encode($added), "\n";
    $afterAdd = $ffe->baskets();
    echo 'Basket after adding qty 1: ', json_encode($afterAdd), "\n";

    $updated = $ffe->setBasketLine($id, 2);
    echo 'setBasketLine qty 2 -> ', json_encode($updated), "\n";
    $afterUpdate = $ffe->baskets();
    echo 'Basket after updating to qty 2: ', json_encode($afterUpdate), "\n";

    $removed = $ffe->setBasketLine($id, 0);
    echo 'setBasketLine qty 0 -> ', json_encode($removed), "\n";
    $after = $ffe->baskets();
    echo 'Basket after removing: ', json_encode($after), "\n";

    $restored = json_encode($before) === json_encode($after);
    echo $restored ? "Basket restored: YES\n" : "Basket restored: NO\n";
    if (!$restored) {
        exit(1);
    }
} catch (Exception $e) {
    fwrite(STDERR, 'API error: ' . $e->getMessage() . "\n");
    exit(1);
}
