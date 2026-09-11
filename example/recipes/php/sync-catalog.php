<?php
// Sync the Flyfish Europe catalog into catalog.json.
// Run: FFE_TOKEN=<server-side token> php sync-catalog.php
// Optional: pass one brandno to sync only that brand, e.g. php sync-catalog.php simms
require 'ffe.php';

$token = getenv('FFE_TOKEN');
if (!$token) {
    fwrite(STDERR, "Set FFE_TOKEN first.\n");
    exit(1);
}
$ffe = new FFE($token);
$PAGE = 200;
$onlyBrand = isset($argv[1]) ? $argv[1] : null;

function allProducts($ffe, $brandno, $page) {
    $out = [];
    $offset = 0;
    while (true) {
        $products = $ffe->products((object) ['brand' => $brandno, 'limit' => $page, 'offset' => $offset]);
        if (!is_array($products)) {
            throw new Exception("products $brandno: unexpected response");
        }
        $out = array_merge($out, $products);
        if (count($products) < $page) {
            return $out;
        }
        $offset += $page;
    }
}

function groupVariants($products) {
    $groups = [];
    foreach ($products as $p) {
        $name = !empty($p['nameDisplay']) ? $p['nameDisplay'] : $p['name'];
        $key = $p['brand'] . '|' . $name;
        if (!isset($groups[$key])) {
            $category = array_filter([
                isset($p['mainCategory']) ? $p['mainCategory'] : null,
                isset($p['intermediateCategory']) ? $p['intermediateCategory'] : null,
                isset($p['subCategory']) ? $p['subCategory'] : null,
            ]);
            $groups[$key] = [
                'brand' => $p['brand'],
                'name' => $name,
                'category' => implode(' / ', $category),
                'description' => isset($p['description']) ? $p['description'] : null,
                'features' => isset($p['features']) ? $p['features'] : null,
                'image' => !empty($p['images']['medium']) ? $p['images']['medium'] : null,
                'price' => isset($p['retailPrice']) ? $p['retailPrice'] : null,
                'currency' => isset($p['retailCurrency']) ? $p['retailCurrency'] : null,
                'variants' => [],
            ];
        }
        $groups[$key]['variants'][] = [
            'id' => $p['id'],
            'articleno' => $p['articleno'],
            'gtin' => isset($p['tradeItemNumber']) ? $p['tradeItemNumber'] : null,
            'size' => isset($p['size']) ? $p['size'] : null,
            'color' => isset($p['color']) ? $p['color'] : null,
            'availability' => isset($p['availability']) ? $p['availability'] : null,
            'price' => isset($p['retailPrice']) ? $p['retailPrice'] : null,
            'currency' => isset($p['retailCurrency']) ? $p['retailCurrency'] : null,
            'image' => !empty($p['images']['medium']) ? $p['images']['medium'] : null,
        ];
    }
    return array_values($groups);
}

try {
    $brands = $ffe->brands();
    if (!is_array($brands)) {
        throw new Exception('brands: unexpected response');
    }
    $catalog = [];
    foreach ($brands as $brand) {
        if ($onlyBrand !== null && $brand['brandno'] !== $onlyBrand) {
            continue;
        }
        $products = allProducts($ffe, $brand['brandno'], $PAGE);
        $grouped = groupVariants($products);
        echo $brand['name'] . ': ' . count($products) . ' variants -> ' . count($grouped) . " products\n";
        $catalog = array_merge($catalog, $grouped);
    }
    if ($onlyBrand !== null && count($catalog) === 0) {
        fwrite(STDERR, "No brand with brandno \"$onlyBrand\". Run without an argument to list every brand.\n");
        exit(1);
    }
    file_put_contents('catalog.json', json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    echo 'Wrote catalog.json with ' . count($catalog) . " products\n";
} catch (Exception $e) {
    fwrite(STDERR, 'API error: ' . $e->getMessage() . "\n");
    exit(1);
}
