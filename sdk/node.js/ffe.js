'use strict';

const https = require('https');

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
            if (options.https) {
                this.https = options.https;
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
            console.log('queryString', `?${queryString.join('&')}`);
            return `?${queryString.join('&')}`;
        }
        return '';
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

    getEndpoint(url) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: this.hostname,
                port: this.port,
                path: url,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.jwtToken}`
                }
            };
            const req = this.https.request(options, (res) => {
                const body = [];
                res.on('data', (chunk) => body.push(chunk.toString('utf8')));
                res.on('end', () => {
                    let data;
                    try {
                        data = JSON.parse(body.join(''));
                    } catch (err) {
                        reject(err);
                    }
                    resolve(data);
                });
            });
            req.on('error', (error) => {
                reject(new Error(error));
            });
            req.end();
        });
    }
}

module.exports = FFE;
