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
            if ($options->hostname) {
                $this->hostname = $options->hostname;
            }
            if ($options->port) {
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
     * @return object {status: 200, apiToken: 'tokenForApi', message: 'OK'}
     *  or {status: 401, message: 'Login failed'}
     */
    public function login($email, $pass) {
        $opt = new StdClass();
        $opt->email = $email;
        $opt->pass = $pass;
        return $this->post('/login/', $opt);
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

    private function curlExec($curl) {
        $response = curl_exec($curl);
        $info = curl_getinfo($curl);
        $this->curlInfo = $info;

        if ($response === false || $info['http_code'] != 200) {
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

    private function getHeaders() {
        $headers = [
            'Authorization: Bearer ' . $this->jwtToken
        ];
        return $headers;
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
        if (!is_object($opt)) {
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
