<?php
include( './../../sdk/php/ffe.php');

/*
 * Create token on: https://dealer.flyfisheurope.com/myaccount
 */
$token = 'YOUR_TOKEN';
$options = new stdClass();
$options->debug = 0;
$ffe = new FFE($token, $options);
$email = 'email@example.com';
$password = 'my_password';
try {
    $ffe->login($email, $password);
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
