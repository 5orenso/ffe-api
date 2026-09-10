# FFE API SDK - Browser JavaScript

A small client-side script that renders brands, categories and products from the
Flyfish Europe Dealer API into an HTML page using `fetch`. It is demo code: it
writes into elements with fixed ids (`#categoryList`, `#product`, `#productList`,
`#productPagination`). Copy it and adapt it to your own markup.

Use a **client-side** token here (created in DealerWeb under My Account). Never put
a server-side token in a web page.

## Usage

```html
<script>
    FFE_TOKEN = '<your client-side token>';
    // Optional overrides:
    // FFE_URL = 'https://dealer.flyfisheurope.com/api';
</script>
<script src="https://cdn.jsdelivr.net/gh/5orenso/ffe-api@master/sdk/javascript/ffe-api-sdk.js"></script>
```

Then call from your page:

- `FFE.getProductList(brand, maingroup, limit, offset)` renders a product list.
- `FFE.getCategoryList(brand)` renders the main categories of a brand.
- `FFE.getProduct(articleno)` renders one product.

`getProductList` does not request `unique=true` by default because that parameter
currently returns HTTP 504 on the live API (see
[docs/reference/products.md](../../docs/reference/products.md)).

See [example/javascript/html-client.html](../../example/javascript/html-client.html)
for a complete page.
