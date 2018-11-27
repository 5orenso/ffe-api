'use strict';

const https = require('https');
const http = require('http');
const querystring = require('querystring');

class FFE {
    constructor(jwtToken, options) {
        this.hostname = 'dealer.flyfisheurope.com';
        this.port = 443;
        this.https = https;
        this.jwtToken = jwtToken;
        if (typeof options === 'object') {
            if (options.hostname) {
                this.hostname = options.hostname;
            }
            if (options.port) {
                this.port = options.port;
            }
            if (!options.https) {
                this.https = http;
            }
        }
    }

    makeQueryString(opt) {
        let queryString = [];
        if (typeof opt === 'object') {
            const keys = Object.keys(opt);
            for (let i = 0, l = keys.length; i < l; i += 1) {
                const key = keys[i];
                const val = opt[key];
                if (key && val) {
                    queryString.push(`${key}=${encodeURIComponent(val)}`);
                }
            }
        }
        if (queryString.length > 0) {
            return `?${queryString.join('&')}`;
        }
        return '';
    }

    login(email, pass) {
        return this.getEndpoint(`/login/`, 'POST', { email, pass });
    }

    brand(brandno) {
        return this.getEndpoint(`/api/brands/${brandno}`);
    }

    brands() {
        return this.getEndpoint('/api/brands/');
    }

    category(categoryno) {
        return this.getEndpoint(`/api/categories/${categoryno}`);
    }

    categories(opt) {
        return this.getEndpoint(`/api/categories/${this.makeQueryString(opt)}`);
    }

    product(articleno) {
        return this.getEndpoint(`/api/products/${articleno}`);
    }

    products(opt) {
        return this.getEndpoint(`/api/products/${this.makeQueryString(opt)}`);
    }

    posAddSale(opt) {
        return this.getEndpoint('/api/pos/sales/', 'POST', opt);
    }
    posSales(opt) {
        return this.getEndpoint('/api/pos/sales/');
    }

    posAddProduct(opt) {
        return this.getEndpoint('/api/pos/products/', 'POST', opt);
    }
    posEditProduct(opt, params) {
        let id = '';
        if (typeof params === 'object' && typeof params.id !== 'undefined') {
            id = params.id;
            return this.getEndpoint(`/api/pos/products/${id}`, 'PUT', opt);
        }
        return false;
    }
    posProducts(opt, params) {
        let id = '';
        if (typeof params === 'object' && typeof params.id !== 'undefined') {
            id = params.id;
        }
        return this.getEndpoint(`/api/pos/products/${id}${this.makeQueryString(opt)}`);
    }

    getEndpoint(url, method = 'GET', body) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.hostname,
                port: this.port,
                path: url,
                method,
                headers: {
                    Authorization: `Bearer ${this.jwtToken}`
                }
            };
            let postData;
            if (typeof body === 'object') {
                postData = JSON.stringify(body);
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = postData.length;
            }
            const req = this.https.request(options, (res) => {
                const body = [];
                res.on('data', (chunk) => body.push(chunk.toString('utf8')));
                res.on('end', () => {
                    let data;
                    try {
                        data = JSON.parse(body.join(''));
                    } catch (err) {
                        data = {
                            code: 500,
                            error: 'Invalid JSON from server',
                            message: body.join(''),
                            hostname: this.hostname,
                            port: this.port,
                            path: url,
                            method,
                        }
                    }
                    resolve(data);
                });
            });
            req.on('error', (error) => {
                reject(new Error(error));
            });
            if (typeof body === 'object') {
                req.write(postData);
            }
            req.end();
        });
    }
}

module.exports = FFE;
