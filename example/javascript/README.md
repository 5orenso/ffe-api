# FFE API Examples - Clientside Javascript

Flyfish Europe REST API client side example.

## Files

- [html-client.html](html-client.html) — a page that lists brands, categories and products using [sdk/javascript/ffe-api-sdk.js](../../sdk/javascript/ffe-api-sdk.js).

## How to test

Serve the repository root over HTTP so the relative script path resolves, then open the page:

```bash
# From the repository root:
python3 -m http.server 9999
# Then open:
open http://localhost:9999/example/javascript/html-client.html
```

Edit `FFE_TOKEN` in `html-client.html` first and use a client-side token.
