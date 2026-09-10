<?php
// Run with:  FFE_TOKEN=<your token> php ffe.php
// Optional:  FFE_EMAIL and FFE_PASS to demonstrate login() instead of a pre-made token.
include(__DIR__ . '/../../sdk/php/ffe.php');

$token = getenv('FFE_TOKEN');
$options = new stdClass();
$options->debug = 0;
$ffe = new FFE($token ?: '', $options);
try {
    if (getenv('FFE_EMAIL') && getenv('FFE_PASS')) {
        $ffe->login(getenv('FFE_EMAIL'), getenv('FFE_PASS'));
    } elseif (!$token) {
        fwrite(STDERR, "Set FFE_TOKEN (or FFE_EMAIL and FFE_PASS) first.\n");
        exit(1);
    }
    $allbrands = $ffe->brands();
    echo "Getting all brands: \n\n";
    foreach ($allbrands as $brand) {
        echo "Name: " . $brand['name'] . ", brandno: " . $brand['brandno'] . "\n";
    }

    echo "\n\n#######\n";
    echo "Categories\n";
    foreach ($ffe->categories() as $category) {
        echo "Category: " . $category['name'];
        echo ", categoryno: " . $category['categoryno'];
        echo ", level: " . $category['level'];
        echo ", parent: " . $category['parent'];
        echo "\n";
    }

    echo "\n\n#######\n";
    echo "Products\n";
    foreach ($allbrands as $brand) {
        echo "\nGetting a product for: " . $brand['name'] . "\n";
        $opt = new stdClass();
        $opt->limit = 1;
        $opt->brand = $brand['brandno'];
        $products = $ffe->products($opt);
        foreach ($products as $product) {
            $p = $ffe->product($product['articleno']);
            echo "\t" . $p['name'] . "\n";
        }

    }
} catch (Exception $e) {
    echo $e->getMessage();
}
