# MIDA architecture and POS readiness audit

Date: 9 October 2026. Repository: this `work/mida-restaurant` checkout, not the older `C:\mida-multi-tenant-platform` export.

## Assessment

MIDA has a functioning local connected ordering backend with regression tests. It is suitable for a mock integration exercise. It is **not yet connected to CLYO**, and compatibility with the restaurant's reported **5.11.64** installation remains unconfirmed. A successful mock test is not certification of CLYO compatibility, fiscal compliance, hosted availability, printer behavior or restaurant network reliability.

Inspection covered the repository inventory, application entry points, customer/staff components, service and demo adapters, API handlers, pricing, membership/loyalty, tenant configuration, database, tests, local scripts and deployment configuration. Existing uncommitted App.tsx/index.css work was preserved. No UI design changes, live POS connections, hosting changes or paid services were made. Binary images and lockfiles were inventoried, not treated as application logic. This is a code and automated integration audit, not a penetration test or a full physical-device acceptance test.

## Architecture found

| Layer | Implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind 4; `src/main.tsx` selects App or DemoApp; restaurant branding is scoped through CSS variables. |
| Connected client | `src/services/api.ts` calls same-origin `/api`, sends a restaurant header, session cookie and CSRF header; `storageAdapter.ts` holds snapshots and publishes updates. App polls every five seconds. |
| Browser demo | `DemoApp.tsx` and `demoPersistence.ts`; fictitious browser-local orders and role switching; no connected POS or cross-device synchronization. |
| Backend | Node 24.4+ and Express 4; `app.mjs` handles sessions, roles, orders, payments and calls. `pricing.mjs`, `loyalty.mjs`, `tenants.mjs` separate pricing, membership and restaurant configuration. |
| Database | Node built-in SQLite, WAL, foreign keys enabled, 5-second busy timeout. Generic JSON entities plus users, sessions, idempotency, audit, rate limits and receipt tables. Synchronous `BEGIN IMMEDIATE` transactions. |
| Identity | Staff roles owner, manager, kitchen, cashier, waiter, platform_admin; scrypt passwords, HttpOnly/SameSite cookies, Secure in production, database-backed authorization and revocation. Members have separate accounts. |
| Local hosting | `server/local.mjs`, `data/local-pilot.sqlite`; loopback default, explicit private LAN preview allowed. Local fixture credentials are private ignored files. |
| Production preparation | Docker Node 24, one instance, persistent SQLite disk; `server/index.mjs`, exact APP_ORIGIN/HTTPS, Render blueprint with paid compute and 1 GB disk. No deployment made by this task. |
| Public hosting | GitHub Pages supports the preview/demo only. It cannot execute this API, queue worker or SQLite backend. |
| Recovery | `server/backup.mjs` uses SQLite VACUUM INTO; external backup scheduling, retention and restore drills remain operational work. |

## Order and payment flow

1. Customer selects restaurant, mode, products and modifiers. Browser estimates prices.
2. Checkout submits to `/api/orders` with an idempotency key and expected total.
3. Backend validates restaurant/mode, availability, quantities/modifiers, prices, expected total, table token, delivery zone, customer fields and allowed offline payment methods.
4. A transaction writes a random UUID order, tenant-local display number, profile changes, loyalty redemption, idempotency record and audit event. This change additionally writes the POS job in that same transaction.
5. Staff receive the saved order through polling. Status transitions and role checks are enforced server-side; completion requires recorded payment.
6. Cashier/authorized staff record cash or existing TPE payment. This is a bookkeeping action, not collection of money by MIDA.
7. Paid valid orders can issue a one-use receipt. An authenticated member claims points. Refunds reverse points/rewards through transactions.
8. A future POS transport must operate independently of this flow: export acknowledgement does not mean cooking, payment or loyalty is complete.

## Reliability findings

| Workflow | Existing protection | Limit / action before a live pilot |
|---|---|---|
| Customer submission | UUID identity, server pricing, atomic write, same-key/same-body retries return the same order; changed body on that key returns 409. | Checkout key is component-local: closing/reopening/reloading or a new guest session can create a new intent/key. A deliberately new request is not deduplicated. Persist an unresolved checkout intent and provide order reconciliation before claiming reload-safe exactly-once submission. |
| Table QR | Server validates a stored random table token. | A copied QR can be reused remotely; it is not proof of presence. Review rotation/session policy with the restaurant. |
| Waiter | Own-tenant order visibility, table service calls, authenticated updates. | No dedicated waiter order-entry/seat/split-bill workflow was found. Waiters currently may record payments; obtain explicit owner approval for that permission. |
| Kitchen | Restricted status transitions, availability updates; phone/address stripped from kitchen snapshots. | Polling is not instant delivery; browser audio can require interaction. No independent missed-order alarm. Names/notes may still contain personal details. |
| Cashier | Payment transitions checked, completion requires paid state, manager-only refund, audit attribution from authenticated user. | No till reconciliation, split tender, partial refund, external fiscal ticket import, or CLYO-confirmed payment event. Repeated payment clicks produce conflicts rather than a second payment. |
| Loyalty | Paid receipts, authenticated one-time claims, expiry, atomic redemption/refund reversal and persistence tests. | CLYO payment reconciliation and receipt integration must be designed before POS-originated payments can trigger rewards. |
| Staff UI | Backend error messages propagate; snapshot refresh failure after a successful mutation is identified separately. | Several action buttons do not lock while pending; conflicts can be confusing. API fetch has no timeout, so a stalled request can stall refresh/submission until the browser fails it. |
| Tenant isolation | API role and restaurant checks; cross-tenant tests; restaurant-scoped menu/products/orders. | A shared browser session uses one identity; use separate profiles for different staff identities. Never expose global POS diagnostics to customers. |
| Scale | Local load-test script and historical report; SQLite serializes writes. | Snapshot reads scan entity lists; no pagination. Historical 30-customer results are not hosted capacity guarantees. No new load benchmark performed here. |
| Availability | Saved orders survive reopened database; local application does not depend on POS for serving orders. | No offline order capture. Backups, alerting, host restart and physical devices still need production acceptance tests. |
| Documentation | Deployment and local testing guides describe the connected system. | BUILD_STATUS.md includes older demo-era claims. Treat running code/tests and these audit documents as evidence, not every historical feature claim. |

## Safe improvements in this task

- New `server/pos.mjs`: transactional durable outbox, explicit disabled/mock modes, immutable delivery IDs and payloads, tenant/product/option mapping, durable mock inbox, bounded retries, leases, late-result fencing, diagnostic events, and lifecycle review flag.
- Small hooks in `server/app.mjs`: enqueue alongside order creation; observe cancellation/payment changes; authorized POS reporting and restricted mock retry API. Existing payment/status/loyalty behavior is retained.
- New disposable fixture, runnable demonstration and failure-oriented tests. No new dependencies.
- Normal local and production entry points pass no mock configuration: **POS stays disabled**. The production flag additionally rejects mock mode. There is no environment switch, UI switch, CLYO URL, credentials field, webhook or real adapter.

Read POS_INTEGRATION.md for the adapter contract, commands, support questions and rollout gates.
