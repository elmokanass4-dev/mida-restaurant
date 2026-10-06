# Mida Restaurant

Customer ordering and restaurant staff platform with a persistent Node.js/SQLite backend.

Public menu preview: https://elmokanass4-dev.github.io/mida-restaurant/

## Access

Customers see the menu, checkout and their own orders. Staff enter through `?surface=staff` and authenticate. Roles are enforced by the API: owner, manager, kitchen, cashier, waiter and platform administrator. Restaurant owners do not receive platform-wide administration.

There are no default credentials. See [DEPLOYMENT.md](DEPLOYMENT.md) for private provisioning, persistent hosting, backups and pilot requirements.

## Local development

Use Node.js 24.4+ and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm catalog
pnpm test
```

Start `pnpm dev:api` with `APP_ORIGIN=http://localhost:3000`, then run the frontend with `VITE_BACKEND_ENABLED=true pnpm dev`. The Vite proxy forwards `/api` to port 3001. Provision a local test account through `server/provision-user.mjs`; no sample customer history is loaded.

## Full server build

```sh
VITE_BACKEND_ENABLED=true pnpm build:server
APP_ORIGIN=http://localhost:3001 pnpm start
```

On PowerShell set environment variables with `$env:NAME='value'` before each command. Production requires HTTPS and persistent storage. The Dockerfile packages the full service.

## GitHub Pages menu preview

Build with `VITE_BACKEND_ENABLED` unset or `false`, then publish the built `dist` directory to `gh-pages`:

```sh
pnpm build
pnpm dlx gh-pages -d dist --dotfiles
```

Pages must use the `gh-pages` branch and `/ (root)`. It cannot run the backend. The preview explicitly disables real ordering and staff login rather than accepting browser-only orders.

## Verified and remaining work

API tests cover tenant isolation, customer privacy, role permissions, server-side prices, modifier validation, table tokens, duplicate submissions, order transitions, refunds, session rotation/revocation and database persistence. Browser checks exercise customer checkout and the kitchen workflow.

This implementation is a pilot foundation. It needs backend hosting, owner provisioning, real restaurant content and a two-device restaurant trial before accepting real customers. Payment gateway processing, MFA/email recovery, customer cross-device login, promotion automation, loyalty redemption and SaaS billing are not implemented.
