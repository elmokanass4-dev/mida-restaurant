# POS integration foundation — mock only

## Safety boundary

No real CLYO code is implemented. No connection to a restaurant POS or its database is required, and none was made. `createApp()` defaults to disabled. Mock mode requires explicit code-level test configuration and is rejected with `production: true`. Normal start commands do not start a dispatcher. Existing orders are not backfilled or replayed.

Run locally from this repository:

```powershell
npm run test:pos
npm run demo:pos
```

The demo creates a new SQLite file under the Windows temporary directory, starts an ephemeral loopback API, submits fictitious data, simulates a lost acknowledgement, retries with the same key and asserts one mock receipt. It prints the disposable database path for inspection and closes its HTTP server/database. It never opens `data/local-pilot.sqlite` or `data/mida.sqlite`. Temporary files are retained for inspection and may be deleted after testing.

## Architecture and contract

```text
Customer / staff workflow
         |
      MIDA API
         |
  one SQLite transaction
  [order + idempotency + loyalty changes + POS outbox]
         |
  explicit mock dispatcher -- mapping --> versioned canonical envelope
         |                                  |
         +---------- adapter.deliver -------+
                        |
             mock deduplicating inbox
                        |
         matching delivery key + external order ID
                        |
                durable acknowledgement
```

The order UUID is the identity; `M-123` is only a restaurant-local display number. The external delivery key is `mida:<restaurantId>:<orderUuid>:create:v1`. It never changes on automatic or manual retry. HTTP submission retries retain the existing customer/key fingerprint check; a changed body is rejected. Integration deduplication applies to one MIDA order UUID, not two deliberately different orders with different keys.

`createPos(store, options)` owns queue persistence, mapping, leases and reporting. The mock provider implements `deliver(envelope, {signal}) -> {deliveryKey, externalId}` and declares idempotent capability. The current runner only accepts mock providers. Future adapters must be separately implemented and reviewed, and cannot be enabled merely by setting a provider name.

The canonical envelope has a version, order/restaurant IDs, currency MAD, ordering mode/table, product/option references and monetary amounts in integer minor units. The mock snapshot excludes customer identity, phone, address, notes, payment credentials, receipt tokens and session tokens. Do not treat this minimal mock envelope as a complete CLYO schema; delivery addresses and kitchen instructions require a reviewed production contract.

Mapping lookup is keyed by restaurant, provider and the tuple `[dishId, groupId, optionId]`; a product uses empty group/option fields. The setup validates ownership and modifier existence. Missing mappings block export without discarding the order. The first mapped payload is saved before sending and reused verbatim on retries, even if menu mappings change. `mapItem` is a private test/configuration function, not a public mapping endpoint.

## States and failure behavior

| State | Meaning |
|---|---|
| disabled | Order stored in MIDA; no POS delivery is intended or permitted. Never automatically replayed if configuration changes. |
| pending | Waiting for an explicit mock worker call; nextAttemptAt controls backoff. |
| sending | Leased for 30 seconds with a unique fencing token; adapter timeout is 10 seconds. |
| acknowledged | Matching key and nonempty external ID were returned and stored. Does not mark the order paid/completed. |
| failed | Mapping failure or exhausted/terminal delivery attempts; order and diagnostic history retained. |
| cancelled | Cancelled/rejected before any delivery attempt; not exported. |

Automatic retry uses 1/2/4-second backoff with a three-attempt ceiling; the driver must call `runNext` again. This release intentionally installs no background scheduler. Authorized manual retry of failed mock jobs reuses the same key/payload, retains the attempt count/history, and permits another attempt. Missing mappings can be repaired before first dispatch. A prepared payload must not be edited after an ambiguous result.

Expired sending leases recover to pending or failed. A late result cannot overwrite a newer lease. Timeouts and lost acknowledgements are treated as **unknown acceptance**, never success. The mock inbox's unique delivery key makes repeating delivery safe. A real provider needs documented deduplication and/or lookup/reconciliation before any automatic retry of an ambiguous result. This release cannot promise exactly-once insertion into CLYO.

Cancellation after any attempted delivery and payment/lifecycle changes set `reviewRequired`; no cancellation, refund or payment is sent to a POS. This can coexist with `acknowledged` because a receipt acknowledges creation only. Pending jobs with review flags are paused. There is deliberately no API to blindly clear the flag. Review and reconcile before implementing such a control.

An outbox write failure aborts the same order transaction, so the customer never receives success for an order whose required job was lost. A later adapter failure does not roll back a saved order, erase it, or hide it from MIDA staff. Events and errors are persisted, not only logged. Operational alerting and a staff-visible POS status display are still required before live activation; this task leaves the UI unchanged.

## Diagnostics and authorization

- `GET /api/restaurants/:id/pos/orders`: authenticated owner, manager, cashier, waiter or platform administrator; normal tenant checks apply. Returns state, attempts, next attempt, external ID, bounded error code, review flag and timestamps. No raw payload or mock inbox is exposed. Customers/kitchen cannot access it.
- `POST /api/orders/:id/pos/retry` with `{}`: same-restaurant owner/manager or platform administrator, normal Origin/CSRF checks, failed mock jobs only. Disabled/acknowledged/review-required jobs cannot be retried.
- SQLite `pos_events`: ordered state history for private administrator diagnosis; no remote bodies or secrets in error text.
- Older orders have no POS job; absence does **not** mean synchronized. There is no automatic historical replay.

## CLYO facts versus unknowns

Official reference checked 9 October 2026: [CLYO website/e-commerce integration guide](https://help.clyosystems.com/hc/fr/articles/22363006383121-Interfacer-un-site-de-vente-en-ligne-avec-la-caisse-Clyo-Web-PHP-WooCommerce).

The guide describes website-side product linking and retrieval of unprocessed orders, including table and charge/discount concepts. It does not establish support for this restaurant's version 5.11.64. It also leaves some format examples incomplete. Do not infer a modern outbound REST API or invent a successful-import callback. Obtain the full specification and a supported test setup.

The transport may need to expose a vendor-defined pull feed instead of using an outbound sender. The durable queue and canonical model remain useful, but a pull transport needs its own authenticated claim/acknowledgement contract. Returning an order in a feed must not itself mark it acknowledged. No PHP-compatible paths or vendor authentication have been implemented here.

## Questions to send CLYO support

1. Is website-order import supported on **5.11.64**, in this edition/licence and restaurant setup? Required update, module activation, reseller intervention and costs?
2. What is the officially supported protocol: website-side pull, local connector, SDK, service or partner? Please supply versioned specifications and full request/response examples.
3. Can we have a sandbox/test licence and sample catalogue, without using the restaurant's production till?
4. What authentication, credential rotation, TLS versions/certificates, IP restrictions and outbound network rules are supported? How should credentials be kept out of access logs?
5. What immutable external order key is retained? Can repeated imports deduplicate on it, and for how long? Can we query an import by that key after losing an acknowledgement?
6. What event proves the order was committed to CLYO? Does it include a stable CLYO order ID? How are rejections, partial imports and lost acknowledgements reconciled?
7. Exact encoding, delimiters/escaping, time zone, decimal/rounding rules, currency and maximum lengths? Are orders imported atomically?
8. How do product variants, cooking choices, extras, menu bundles, free/removed ingredients and kitchen notes map? How do inactive/deleted products behave?
9. How are table IDs, covers, takeaway/delivery modes, preparation routing and kitchen printers mapped? Can duplicate tickets be prevented?
10. Can unpaid orders be imported for cash/TPE-at-counter and cash-on-delivery? Who owns price, VAT, delivery fees, discounts and loyalty redemption? No online payment is required.
11. How are acceptance, cancellation, modifications, split payments, partial/full refunds and final payments reported back? Which system is authoritative for each?
12. Polling interval, rate limits, outages, retry recommendations, supported monitoring and reconciliation reports?
13. What approval/certification and maintenance obligations apply? What happens during CLYO upgrades or licence changes?

Suggested opening: “Nous souhaitons préparer une intégration de commandes MIDA avec une caisse CLYO 5.11.64, sans intervenir sur la caisse en production. Pouvez-vous confirmer la compatibilité et fournir la documentation technique complète, un environnement de test et les règles d’accusé de réception et de dédoublonnage ?”

## Production rollout, in order

1. Obtain written compatibility confirmation and official technical requirements; agree on costs before purchasing anything.
2. Obtain owner authorization and a test POS environment. Back up both systems; do not write directly into the till database or automate cashier screen entry.
3. Agree on system ownership: catalogue/prices/stock, kitchen routing, payment, refunds, loyalty and fiscal receipts. Decide whether creation exports on customer submission or staff acceptance.
4. Export and review mappings for each restaurant/store: products, options, bundles, tables, tax codes, fee/discount items and offline tenders. Version and validate mappings; no fuzzy name matching in production.
5. Implement a separate adapter or pull transport against the official contract, with secrets outside source control and minimized customer data. Implement authenticated acknowledgements and reconciliation before enabling retries.
6. Add operational POS status/alerts, pending-age monitoring, manual reconciliation with audit trail, connection health and a per-restaurant kill switch. Implement safe customer retry recovery across reloads.
7. Test sandbox ordering, disconnect before/after acceptance, worker/till restart, duplicate requests, altered mapping, partial response, cancellation/refund, terminal payment and loyalty. Verify both MIDA and CLYO records/tickets.
8. Deploy MIDA with persistent storage and restore-tested backups. Run shadow comparisons without posting to the live till; resolve price and rounding differences.
9. Enable one restaurant during an agreed quiet period, with trained cashier supervision. Avoid concurrent manual entry and automatic import for the same order.
10. Review daily reconciliation, queue failures and duplicate reports. Expand only after owner/support sign-off. On rollback disable new exports, preserve unresolved queue entries, and reconcile unknown outcomes before manual entry or replay.

No production integration should be enabled until steps 1–7 are complete.
