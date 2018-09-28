# Flyfish Europe JSON REST API

## Introduction

This API is for Flyfish Europe Dealers with access to our DealerWeb.


## Overview

With this API you will have access to all our brands, categories and products. You should be able to integrate all our
products into your web shop or point of sale system with ease.


## Authentication

Preferred way of authentication is with an API token. You can create tokens inside the DealerWeb. Tokens can be of 2
different kinds:

- __Server side token__ should be used only on your servers where no one but you have access. It's like a password to
your data.
- __Client side token__ should be used inside client side applications like a javascript component on a webpage.

Your token is sent to our servers inside the HTTP request headers:
```
Authorization: Bearer <your jwt token>
```


## HTTP Status Codes

We use standard HTTP status codes in our responses.

Example of the mos† common codes are:
- __200__ for successful GET requests.
- __201__ for new inserts.
- __202__ for updates.
- __401__ for unauthorized request.
- __401__ for forbidden request.

[All HTTP status codes can be found on Wikipedia.](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)


## Rate limit

Currently we do not have rate limiting activated, but we will activate and throttle over active usage without any
further notice. Status code of throttling is:
- __429__ Too many requests. Slow down your pace.


# API endpoints

- [/api/brands/](brands.md)
- [/api/categories/](categories.md)
- [/api/products/](products.md)

You can create an API token on the DealerWeb under My Account.


# SDKs

- [Client side Javascript](./sdk/javascript/)
- [Server side Javascript (Node.js)](./sdk/node.js/)
    ```bash
    $ npm install ffe-api-sdk --save
    ```   
    Test it online at RunKit: https://npm.runkit.com/ffe-api-sdk   


# Code examples

- [Example code](./example/)


# Other resources

- [Consumer web](https://flyfisheurope.com/)
- [Dealer web](https://dealer.flyfisheurope.com/)
