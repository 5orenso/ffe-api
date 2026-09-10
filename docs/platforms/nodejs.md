# Node.js

The Node SDK is a single dependency-free module, published on npm as
[`@flyfisheurope/ffe-api-sdk`](https://www.npmjs.com/package/@flyfisheurope/ffe-api-sdk).
This page covers installing it, a minimal `async`/`await` skeleton, and running a script on
a schedule. For the full method list, constructor options and error shape, see
[sdk/node.js/README.md](../../sdk/node.js/README.md).

## Install

```bash
npm install @flyfisheurope/ffe-api-sdk --save
```

Node.js 18+ is enough to run every script on this site — none of them use anything newer.

## A minimal async/await skeleton

The Node SDK's methods return Promises. `async`/`await` reads better than chaining
`.then()` once you have more than one call in sequence, and it makes error handling look
the same as the synchronous code most developers expect.

```javascript
'use strict';
const FFE = require('@flyfisheurope/ffe-api-sdk');

async function main() {
    const token = process.env.FFE_TOKEN;
    if (!token) {
        console.error('Set FFE_TOKEN first.');
        process.exit(1);
    }
    const ffe = new FFE(token);

    const brands = await ffe.brands();
    if (!Array.isArray(brands)) {
        // The Promise only rejects on network errors - an HTTP error such as 401
        // resolves with the API's error body instead. Always check the shape you got.
        console.error('API error:', JSON.stringify(brands).slice(0, 300));
        process.exit(1);
    }
    console.log(`${brands.length} brands`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
```

The `if (!Array.isArray(brands))` check matters: see
[Errors: Errors that look like success](../errors.md#errors-that-look-like-success) for
why a Node SDK call can resolve successfully with something that isn't the data you asked
for.

## Running under cron

The same pattern as the [sync your catalog recipe](../recipes/sync-catalog.md): add a line
to `crontab -e` that runs the script on a schedule, with the output appended to a log
file. An inline `FFE_TOKEN=<your token>` on the cron line works, but it leaves the token
sitting in your crontab and process list in plain text; prefer a small env file
(`chmod 600`, outside version control) or a wrapper shell script that exports `FFE_TOKEN`
before calling `node`, and point cron at that instead — see
[Recipe: sync your catalog, Run it nightly](../recipes/sync-catalog.md#run-it-nightly) for
both forms.

```
0 3 * * * cd /path/to/script && FFE_TOKEN=<your token> node sync-catalog.js >> sync.log 2>&1
```

## Running under pm2

Prefer cron, as above. If you already run long-lived Node processes under
[pm2](https://pm2.keymetrics.io/), it can run this kind of run-once script too, started
with `--no-autorestart` so pm2 doesn't relaunch it the moment it finishes and
`--cron-restart` to give it a schedule — but check your installed pm2 version's own docs
for its current cron-restart behaviour before relying on it; it's written primarily for
scheduling long-lived processes, not scripts that exit on their own after every run.

## Environment variables for the token

Whichever scheduler you use, keep the token out of the script itself:

- Set `FFE_TOKEN` in an environment file read by a small wrapper script (see above), in the
  pm2 ecosystem file's `env` block, or in your process manager's own variable store. An
  inline value on the cron line works but is visible to anyone who can read the crontab.
- Never commit a file that holds the real token — keep any local copy out of version
  control (for example, an `.gitignore`d `.env` file loaded before the script starts).
- A **server-side** token is right for an unattended sync script — see
  [Getting started, Step 1](../getting-started.md). Never use a client-side token here; the
  distinction only matters in the browser (see the [browser platform guide](./browser.md)),
  but a server-side token is the safer default everywhere code isn't visible to a client.

## Where next

- [sdk/node.js/README.md](../../sdk/node.js/README.md) — full method table, constructor
  options, error shape.
- [Recipes](../recipes/) — sync your catalog, keep content updated, stock and price
  lookup, ordering with baskets: every recipe script on this site is Node.js first, with a
  PHP equivalent alongside it.
- [Errors](../errors.md) and [Troubleshooting](../troubleshooting.md) — what a failed
  call looks like and how to fix it.
