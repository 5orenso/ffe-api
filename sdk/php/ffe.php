<?php

class FFE {
    private $hostname;
    private $port;
    private $jwtToken;
    private $https;
    private $curlInfo;

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

    public function login($email, $pass) {
        $opt = new StdClass();
        $opt->email = $email;
        $opt->pass = $pass;
        return $this->post('/login/', $opt);
    }

    public function brands() {
         return $this->get('/api/brands/');
    }

    public function brand($brandno) {
        return $this->get('/api/brands/' . urlencode($brandno));
    }

    public function category($categoryno) {
        return $this->get('/api/categories/' . urlencode($categoryno));
    }

    public function categories($opt = null) {
        return $this->get('/api/categories/' . $this->makeQueryString($opt));
    }

    public function product($articleno) {
        return $this->get('/api/products/' . urlencode($articleno));
    }

    public function products($opt) {
        return $this->get('/api/products/' . $this->makeQueryString($opt));
    }

    public function posAddSale($opt) {
        throw new Exception('Not implemented');
    }
    public function posSales() {
        throw new Exception('Not implemented');
    }

    public function posAddProduct($opt) {
        throw new Exception('Not implemented');
    }

    public function posProducts($opt) {
        throw new Exception('Not implemented');
    }

    public function getLastCurlInfo() {
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
