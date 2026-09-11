<?php
// Compare catalog.json against the live API and record content changes.
// Run: FFE_TOKEN=<server-side token> php keep-content-updated.php
require 'ffe.php';

$token = getenv('FFE_TOKEN');
if (!$token) {
    fwrite(STDERR, "Set FFE_TOKEN first.\n");
    exit(1);
}
$ffe = new FFE($token);
$BATCH = 50;

function readCatalog() {
    if (!file_exists('catalog.json')) {
        fwrite(STDERR, "catalog.json not found. Run sync-catalog.php first.\n");
        exit(1);
    }
    return json_decode(file_get_contents('catalog.json'), true);
}

function fetchByArticleNos($ffe, $articleNos, $batchSize) {
    $found = [];
    foreach (array_chunk($articleNos, $batchSize) as $batch) {
        // The default page size is 25; always pass limit when you ask for more.
        $page = $ffe->products((object) ['articleNoIn' => implode(',', $batch), 'limit' => $batchSize]);
        if (!is_array($page)) {
            throw new Exception('products articleNoIn: unexpected response');
        }
        foreach ($page as $p) {
            $found[$p['articleno']] = $p;
        }
    }
    return $found;
}

try {
    $catalog = readCatalog();
    $allArticleNos = [];
    foreach ($catalog as $product) {
        foreach ($product['variants'] as $v) {
            $allArticleNos[] = $v['articleno'];
        }
    }
    $live = fetchByArticleNos($ffe, $allArticleNos, $BATCH);

    $changed = [];
    $missing = [];

    foreach ($catalog as $product) {
        $liveVariant = null;
        foreach ($product['variants'] as $v) {
            if (isset($live[$v['articleno']])) {
                $liveVariant = $live[$v['articleno']];
                break;
            }
        }
        if ($liveVariant === null) {
            $articlenos = [];
            foreach ($product['variants'] as $v) {
                $articlenos[] = $v['articleno'];
            }
            $missing[] = ['brand' => $product['brand'], 'name' => $product['name'], 'articlenos' => $articlenos];
            continue;
        }

        $liveName = !empty($liveVariant['nameDisplay']) ? $liveVariant['nameDisplay'] : $liveVariant['name'];
        $liveImage = !empty($liveVariant['images']['medium']) ? $liveVariant['images']['medium'] : null;
        $liveDescription = isset($liveVariant['description']) ? $liveVariant['description'] : null;
        $liveFeatures = isset($liveVariant['features']) ? $liveVariant['features'] : null;

        $fields = [];
        if ($liveName !== $product['name']) {
            $fields['name'] = ['from' => $product['name'], 'to' => $liveName];
        }
        if ($liveDescription !== $product['description']) {
            $fields['description'] = ['from' => $product['description'], 'to' => $liveDescription];
        }
        if ($liveFeatures !== $product['features']) {
            $fields['features'] = ['from' => $product['features'], 'to' => $liveFeatures];
        }
        if ($liveImage !== $product['image']) {
            $fields['image'] = ['from' => $product['image'], 'to' => $liveImage];
        }
        if (count($fields) > 0) {
            $changed[] = ['brand' => $product['brand'], 'name' => $product['name'], 'articleno' => $liveVariant['articleno'], 'fields' => $fields];
        }
    }

    file_put_contents('content-updates.json', json_encode(['changed' => $changed, 'missing' => $missing], JSON_PRETTY_PRINT));
    echo count($catalog) . ' products checked, ' . count($live) . " variants matched live\n";
    echo count($changed) . ' products changed, ' . count($missing) . " products no longer found (discontinued)\n";
} catch (Exception $e) {
    fwrite(STDERR, 'API error: ' . $e->getMessage() . "\n");
    exit(1);
}
