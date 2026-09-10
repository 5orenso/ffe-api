# Other languages

There's no SDK for Python, C#, Java, Ruby, Go or anything else — but the API is plain JSON
over HTTP with one header, so none of that is a blocker. This page covers three ways in:
calling it directly with any HTTP client, exploring it in Postman, and generating a typed
client from the OpenAPI specification.

## Plain HTTP

Every request needs one header: `Authorization: Bearer <your token>`. That's it — no
signing, no special content type on `GET` requests. Here it is with `curl`; translate the
same header and URL into whatever HTTP client your language provides (`requests` in
Python, `HttpClient` in C#, `HttpClient`/`OkHttp` in Java, and so on).

**List all brands:**

```bash
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/brands/'
```

**Get one product by article number:**

```bash
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/products/1113000'
```

**List products for one brand, 10 at a time:**

```bash
curl -H 'Authorization: Bearer <your token>' 'https://dealer.flyfisheurope.com/api/products/?brand=simms&limit=10'
```

See [docs/reference/products.md](../reference/products.md) for the full set of query
parameters, and [Concepts: Pagination](../concepts.md#pagination) before you write a loop
around the third example.

## Postman

A ready-made collection covering every documented endpoint lives at
[postman/ffe-api.postman_collection.json](../../postman/ffe-api.postman_collection.json).
It's a fast way to explore the API's requests and responses without writing any code.

1. In Postman, **Import** the file
   [postman/ffe-api.postman_collection.json](../../postman/ffe-api.postman_collection.json)
   from this repository.
2. The collection defines two variables: `baseUrl` (already set to
   `https://dealer.flyfisheurope.com`) and `token` (empty). Open the collection's
   **Variables** tab and set `token` to your own API token. Keep it in the collection's
   variables rather than pasting it into individual requests, so every request picks it up
   the same way.
3. Open the **brands** folder and run **List all brands available to your dealer
   account**. A 200 response with a JSON array of brands confirms the token is set up
   correctly before you try anything else in the collection.

## Generating a client from the OpenAPI spec

[openapi.yaml](../../openapi.yaml) at the repository root fully describes every
documented endpoint, and you can feed it to
[openapi-generator](https://openapi-generator.tech/) to produce a typed client in a
language of your choice. These three are worth calling out because they cover most
non-Node/PHP integrations:

```bash
openapi-generator-cli generate -i openapi.yaml -g python -o out/python
openapi-generator-cli generate -i openapi.yaml -g csharp -o out/csharp
openapi-generator-cli generate -i openapi.yaml -g java -o out/java
```

If you don't have `openapi-generator-cli` installed locally, the project also publishes a
Docker image that needs nothing but Docker itself. Run it from the repository root, with
the current directory mounted as `/local`:

```bash
docker run --rm -v "${PWD}:/local" openapitools/openapi-generator-cli generate -i /local/openapi.yaml -g python -o /local/out/python
```

Swap `-g python` for `-g csharp` or `-g java` (and the `-o` path to match) to generate the
other two the same way. `openapi-generator` supports many more `-g` targets than these
three — see its own documentation for the full list and per-language options; this page
only walks through the three above, the same way, one language at a time.

**Configure the bearer token before making a call.** The spec declares one auth scheme,
`bearerToken` (HTTP bearer, `Authorization: Bearer <token>`), applied to every endpoint
except `POST /login/`, which needs no token since it's how you obtain one in the first
place. Every generated client exposes a place to set that credential — the exact name
depends on the target language and generator version, so look for something like
`access_token`, `bearer_token`, or an `Authorization` setting on the client's
configuration object, and set it to the same token you'd otherwise pass as
`<your token>` in the curl examples above. Without it, generated calls come back with the
401 body documented in [Errors](../errors.md).

## Where next

- [docs/reference/](../reference/) — every endpoint, parameter and response.
- [Errors](../errors.md) and [Troubleshooting](../troubleshooting.md) — what a failed call
  looks like and how to fix it.
- [FAQ: I don't use Node.js or PHP — what are my options?](../faq.md#i-dont-use-nodejs-or-php--what-are-my-options)
