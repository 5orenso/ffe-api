# FAQ

Short answers to the questions that come up most. For the ideas behind these answers, see
[Concepts](./concepts.md); for the exact statuses and bodies, see [Errors](./errors.md).

## Is there a sandbox or test account?

No. There is no separate sandbox or demo environment — every call goes against the same
production API your dealer account and its real catalog live in. Use your own DealerWeb
account and your own token, and be aware that write operations (where they exist) act on
real data.

## What's the difference between a server-side and a client-side token?

A server-side token should only ever run in code you control, like a nightly sync script —
treat it the same way you'd treat any other credential that must not leak. A client-side
token is safe to put in a web page's JavaScript, because it's expected to be visible to
anyone who views the page's source. Create both kinds in DealerWeb under My Account; see
[Getting started, Step 1](./getting-started.md).

## What does the API mean by "product"?

What `GET /api/products/` returns is one entry per **variant** — a single size/colour
combination, identified by `articleno` — not one entry per shop-facing product. If you show
customers "one product, several sizes," you build that grouping yourself by collecting
variants that share the same `brand` and `nameDisplay`. See
[Concepts: Variants](./concepts.md#variants) for the grouping code.

## Can I resell the product data I get from the API?

This repository doesn't document terms of use for the data. Ask Flyfish Europe through
DealerWeb before you rely on any particular use of the catalog data.

## How often should I sync my catalog?

There's no enforced schedule, but a sensible split is: once a day for the catalog itself
(names, descriptions, images — content that rarely changes), and more often — for example
hourly — for stock and price, fetched in batches with `articleNoIn` rather than one request
per article. See [Concepts: Rate limiting](./concepts.md#rate-limiting) and the
[stock and price lookup recipe](./recipes/stock-and-price-lookup.md).

## Can I place orders through the API?

Reading your basket (`GET /api/baskets/`) is verified and documented — see
[docs/reference/baskets.md](./reference/baskets.md). Adding lines to a basket or placing an
order through the API is not yet documented or verified against the live API. Place orders
in DealerWeb until that's confirmed; see the
[ordering with baskets recipe](./recipes/ordering-with-baskets.md) for the current state of
write access.

## Which SDK should I use for a WooCommerce shop?

The PHP SDK (`sdk/php/ffe.php`), since WooCommerce runs on PHP. See
[sdk/php/README.md](../sdk/php/README.md), the
[WooCommerce platform guide](./platforms/woocommerce.md) and the
[PHP platform guide](./platforms/php.md).

## Is there a Postman collection?

Yes. Import [postman/ffe-api.postman_collection.json](../postman/ffe-api.postman_collection.json)
into Postman and set its `token` variable to your own token.

## I don't use Node.js or PHP — what are my options?

Call the API directly over plain HTTP with any HTTP client, using
`Authorization: Bearer <your token>`. You can also generate a client in another language
(Python, C#, Java, ...) from [openapi.yaml](../openapi.yaml) with a tool like
openapi-generator. See the
[other languages platform guide](./platforms/other-languages.md).

## Why do I get `{}` back for an id I know exists in DealerWeb?

Every by-id endpoint returns HTTP 200 with an empty object for an id it doesn't recognize —
never HTTP 404 — so `{}` most often means the id wasn't found for your dealer account, not
that something broke. Double-check the exact value (for example, `articleno` requires an
exact match; case-sensitivity was not tested). See [Errors: Errors that look like
success](./errors.md#errors-that-look-like-success).

## Is rate limiting active right now?

No. HTTP 429 is reserved for when rate limiting is turned on, which the root
[README](../README.md) says can happen without further notice. Be polite regardless: send
requests sequentially and use a `limit` of 100–500 for bulk pulls rather than the smallest
page size. See [Concepts: Rate limiting](./concepts.md#rate-limiting).

## What currency are prices shown in?

`retailPrice` comes with its own `retailCurrency` field, reflecting the currency configured
on your dealer account — use that pair together rather than assuming a fixed currency. See
[Concepts: Prices](./concepts.md#prices).

## Can I show dealer prices to my customers?

No. The dealer (wholesale) price fields — `dealerPrice`, `dealerEurPrice`, and the rest —
are your own cost figures for margin and cost calculations. Show customers `retailPrice` /
`retailCurrency` instead. See [Concepts: Prices](./concepts.md#prices).

## Where do I ask something this FAQ doesn't cover?

Ask Flyfish Europe through DealerWeb. This repository documents the API as observed; it
isn't the place to look for terms, policies or support contact details beyond what's shown
here.
