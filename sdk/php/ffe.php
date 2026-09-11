<?php

/**
 * Access the FlyfishEurope dealer API
 *
 */
class FFE {
    private $hostname;
    private $port;
    private $jwtToken;
    private $https;
    private $debug;
    private $curlInfo;

    /**
     * @param string $jwtToken From https://dealer.flyfisheurope.com/myaccount
     * @param object $options Optional.
     *  $options->hostname: API server location, default dealer.flyfisheurope.com.<br>
     *  $options->port: API server port, default 443.<br>
     *  $options->https: Is the API server running on https? default 1.<br>
     *  $options->debug: output debug information about execution of API, default 0.<br>
     */
    public function __construct($jwtToken, $options = null) {
        $this->hostname = 'dealer.flyfisheurope.com';
        $this->port = 443;
        $this->https = 1;
        $this->jwtToken = $jwtToken;
        $this->debug = 0;
        $this->curlInfo = [];
        if (gettype($options) === 'object') {
            if (!empty($options->hostname)) {
                $this->hostname = $options->hostname;
            }
            if (!empty($options->port)) {
                $this->port = $options->port;
            }
            if (isset($options->https)) {
                $this->https = $options->https;
            }
            if (isset($options->debug)) {
                $this->debug = $options->debug;
            }
        }
    }

    /**
     * @param string $email Your login $email for dealer.flyfisheurope.com
     * @param string $pass Password for your account
     * @return array {status: 200, apiToken: 'tokenForApi', message: 'OK'}
     *  On failure curlExec() throws Exception('Not authorized') instead of
     *  returning an array, so a 401 never reaches this method's return value.
     */
    public function login($email, $pass) {
        $opt = new StdClass();
        $opt->email = $email;
        $opt->pass = $pass;
        $data = $this->post('/login/', $opt);
        if ($data['status'] === 200 && isset($data['apiToken'])) {
            $this->jwtToken = $data['apiToken'];
        }
        return $data;
    }

    /**
     * Get all brands available for your dealer
     * @return array [[brandno=>'simms', sort=>1,name=>'Simms']]
     */
    public function brands() {
         return $this->get('/api/brands/');
    }

    /**
     * Get a single brand
     * @param string $brandno brand['brandno'] value
     */
    public function brand($brandno) {
        return $this->get('/api/brands/' . urlencode($brandno));
    }

    /**
     * Get all categories
     * @param object $opt
     *  $opt->brand Optional, brandno, default simms.<br>
     *  $opt->level Optional, default main.<br>
     *  $opt->parent Optional, default 0
     * @return array [[categoryno=>101, name=>'Simms wader', level=>'main', parent=>'',sort=>1]]
     */
    public function categories($opt = null) {
        return $this->get('/api/categories/' . $this->makeQueryString($opt));
    }

    /**
     * Get a single category
     * @param int $categoryno
     * @see FFE::categories()
     */
    public function category($categoryno) {
        return $this->get('/api/categories/' . urlencode($categoryno));
    }

    /**
     * @param object $opt
     *  $opt->limit int Optional, default 100<br>
     *  $opt->offset int Optional, default 0<br>
     *  $opt->brand string brandno<br>
     *  $opt->maingroup int Optional<br>
     *  $opt->intgroup int Optioanl<br>
     *  $opt->gtin Optional string Global Trade Item Number<br>
     *  $opt->search string Optional Search within products<br>
     *  $opt->unique string Optional, only return unique products<br>
     * @return array [[articleno=>'123-456-789',brand....]]
     */
    public function products($opt = null) {
        return $this->get('/api/products/' . $this->makeQueryString($opt));
    }

    /**
     * Get a single product
     * @param string articleno
     * @return array [articleno=>'123-456-789',brand....]
     */
    public function product($articleno) {
        return $this->get('/api/products/' . urlencode($articleno));
    }

    /**
     * Get your current basket
     * @param object $opt
     *  $opt->presale int Optional, 1 enables pre-season mode
     * @return array See docs/reference/baskets.md
     */
    public function baskets($opt = null) {
        return $this->get('/api/baskets/' . $this->makeQueryString($opt));
    }

    /**
     * Add, update or remove one basket line. Verified live 2026-09-10; see
     * docs/reference/baskets.md (setBasketLine).
     * @param int $id The numeric product id from products()/product()
     *  (Product['id']) - NOT articleno. The live API silently accepts
     *  articleno/productNo and returns a 201 that looks successful but
     *  never persists anything (data.id stays null); to catch that
     *  mistake before it ever reaches the API, this method throws
     *  InvalidArgumentException if $id isn't a positive integer (or a
     *  digit-only string) - (int) casting a SKU string like
     *  "13960-096-10" would otherwise silently truncate to a different,
     *  wrong product id (13960).
     * @param int $qty Target quantity for this product's line. 0 removes
     *  the line; any other value upserts it in place (no duplicate line).
     * @return array {status: 201, message: 'Basket update', data: {...}}
     *  Always confirm the result with baskets() - a 201 here does not
     *  guarantee the write persisted (check data['id']).
     * @throws InvalidArgumentException If $id is not a positive integer
     *  (or digit-only string), or $qty is not a non-negative integer (or
     *  digit-only string).
     */
    public function setBasketLine($id, $qty) {
        if ((!is_int($id) && !(is_string($id) && ctype_digit($id))) || (int) $id <= 0) {
            throw new InvalidArgumentException('setBasketLine: id must be the numeric product id (Product[id]) from products()/product(), not articleno');
        }
        if ((!is_int($qty) && !(is_string($qty) && ctype_digit($qty))) || (int) $qty < 0) {
            throw new InvalidArgumentException('setBasketLine: qty must be a non-negative integer (0 removes the line)');
        }
        return $this->patch('/api/baskets/', ['id' => (int) $id, 'qty' => (int) $qty]);
    }

    /**
     * Information about the dealer account the token belongs to
     * @return array See docs/reference/dealers.md
     */
    public function dealerInfo() {
        return $this->get('/api/dealers/info');
    }

    /**
     * @throws Exception Not implemented
     */
    public function posAddSale($opt) {
        throw new Exception('Not implemented');
    }

    /**
     * @throws Exception Not implemented
     */
    public function posSales() {
        throw new Exception('Not implemented');
    }

    /**
     * @throws Exception Not implemented
     */
    public function posAddProduct($opt) {
        throw new Exception('Not implemented');
    }

    /**
     * @throws Exception Not implemented
     */
    public function posProducts($opt) {
        throw new Exception('Not implemented');
    }

    /**
     * @throws Exception Not implemented
     */
    public function posEditProduct($opt, $params = null) {
        throw new Exception('Not implemented');
    }

    /**
     * Debug information about the last CURL request
     * @return array From curl_getinfo()
     */
    public function lastCurlInfo() {
        return $this->curlInfo;
    }

    private function get($resource) {
        $this->debug('GET on ' . $resource);
        $curl = $this->getCurl($resource);

        return $this->curlExec($curl);
    }

    private function post($resource, $data) {
        $this->debug('POST on ' . $resource);
        $curl = $this->getCurl($resource);
        curl_setopt($curl, CURLOPT_POST, 1);
        $query = http_build_query($data);
        $this->debug('query=' . $query);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $query);

        return $this->curlExec($curl);
    }

    /**
     * Sends $data as a JSON body with the PATCH method. Verified live
     * 2026-09-10 against PATCH /api/baskets/ (setBasketLine); see
     * docs/reference/baskets.md.
     */
    private function patch($resource, $data) {
        $this->debug('PATCH on ' . $resource);
        $curl = $this->getCurl($resource);
        $body = json_encode($data);
        $this->debug('body=' . $body);
        curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'PATCH');
        curl_setopt($curl, CURLOPT_POSTFIELDS, $body);
        curl_setopt($curl, CURLOPT_HTTPHEADER, $this->getHeaders(['Content-Type: application/json']));

        return $this->curlExec($curl);
    }

    private function curlExec($curl) {
        $response = curl_exec($curl);
        $info = curl_getinfo($curl);
        $this->curlInfo = $info;

        // Accept any 2xx (e.g. the 201 that PATCH /api/baskets/ returns on
        // success), not just 200 - previously any non-200 status threw,
        // even a genuine success.
        if ($response === false || $info['http_code'] < 200 || $info['http_code'] >= 300) {
            $error = 'No data from API';
            if ($info['http_code'] === 401) {
                $error = 'Not authorized';
            }
            $curlError = curl_error($curl);
            if ($curlError) {
                $error .= ': ' . $curlError;
            }
            throw new Exception($error);
        }
        curl_close($curl);
        $this->debug("Response\n$response");
        return json_decode($response, true);
    }

    private function getCurl($resource) {
        $url = $this->createUrl($resource);
        $curl = curl_init();
        curl_setopt($curl, CURLOPT_HTTPHEADER, $this->getHeaders());
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl , CURLOPT_USERAGENT, 'ffe-api-sdk-php');
        curl_setopt($curl, CURLOPT_URL, $url);
        return $curl;
    }

    /**
     * @param array $extra Optional extra header lines (e.g.
     *  ['Content-Type: application/json']) appended to the base headers.
     */
    private function getHeaders($extra = []) {
        $headers = [
            'Authorization: Bearer ' . $this->jwtToken
        ];
        return array_merge($headers, $extra);
    }

    private function createUrl($resource) {
        $url = 'http';
        if ($this->https) {
            $url .= 's';
        };
        $url .= '://' . $this->hostname;
        if ($this->port) {
            $url .= ':' . $this->port;
        }
        $url .= $resource;
        $this->debug("\nGetting url $url");
        return $url;
    }

    private function makeQueryString($opt) {
        if (!is_object($opt) && !is_array($opt)) {
            return '';
        }
        $queryParams = [];
        foreach ($opt as $key => $val) {
            $queryParams[] = "$key=" . urlencode($val);
        }
        if (count($queryParams) > 0) {
            return "?" . implode("&", $queryParams);
        }
        return '';
    }

    private function debug($msg) {
        if (!$this->debug) {
            return;
        }
        echo $msg . "\n";
    }
}
