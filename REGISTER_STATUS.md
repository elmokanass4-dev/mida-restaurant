# MIDA standalone register — implementation and acceptance status

Updated 2026-10-10. This supersedes earlier claims of production readiness. **Local pilot, not a finished production POS and not certified for fiscal use.** MIDA is the authority for its own new register transactions. No CLYO connection, licence or handoff is needed by these flows. The previous disabled mock adapter remains for regression testing only.

## Architecture found before changes

- React 19 / TypeScript / Vite 8 / Tailwind 4; existing customer FR/AR/EN interfaces and separate staff and platform surfaces.
- Express 4, Node >=24.4, built-in SQLite, WAL, foreign keys, immediate transactions. Existing business objects use an `entities` JSON table; users, sessions, idempotency and loyalty claims have dedicated tables.
- Customer order requests are server-priced, table-token checked and idempotent within a customer session. Kitchen states use a five-second polling snapshot. Existing payment handling was a paid/refunded flag, with no tender or drawer ledger.
- Local server serves `dist` and `/api` together. Docker/Render files exist; GitHub Pages is only a static demonstration and cannot host this backend. No cloud deployment was performed.
- Existing account password hashes, cookie sessions, CSRF origin checks and tenant filtering were retained. Existing App.tsx/index.css edits were preserved.

## Changes and authority

`server/register-schema.mjs` applies additive migration 1 transactionally. New tables cover bill snapshots, payment allocation to a bill, refunds, drawer sessions/movements, numbered pilot documents, durable idempotency results, print observations, stock items/movements and an event outbox. Financial ledger rows and documents reject UPDATE/DELETE through database triggers; closed drawer snapshots reject edits. This is application/database immutability, not tamper-proof fiscal certification against a server administrator.

`server/register.mjs` exposes authenticated, tenant-scoped register APIs. Per-restaurant owner activation requires the current password. Activation disables the old payment-flag route for that restaurant. Existing paid transactions are not fabricated into the new ledger. Existing unpaid QR orders can be enrolled; new QR and staff orders get snapshots. New register operations exclude platform administrators; registered-restaurant orders are also excluded from platform snapshot access. No impersonation feature was added.

The local SQLite service is the only financial writer. Browsers never finalize financial state offline independently. `register-sync.mjs` is a transport-neutral ordered event receiver/worker, tested with an isolated replica. It is **not a deployed cloud connector or complete remote reporting service**. Financial conflicts and unknown schemas are rejected; no last-write-wins is used. Queued events survive restart and are acknowledged by matching event ID/sequence/version. Production transport credentials, service identity/enrollment, owner authentication and reporting projections remain unimplemented.

## Feature matrix

| Area | Status and limits |
|---|---|
| Cashier workspace | Implemented: categories/search/products/persistent on-screen ticket, touch controls, FR labels, DH amounts, required modifiers, notes, anonymous counter sale. New workspace uses the supplied light design tokens; existing customer and kitchen views retained. No mockup image was included with this request. |
| Accounts | Existing individual accounts retained. New one-use hashed 15-minute reset tokens, CLI identity-verification workflow, reset UI, all-session revocation API, sensitive-action password checks. No automatic reset email, enrolled-device PIN, or secure device pairing. |
| Shared-terminal lock | Five-minute backend inactivity enforcement for pilot restaurant staff. GET polling does not extend activity. Register UI locks and preserves its in-memory cart; login required to unlock. Screen concealment outside the register is not comprehensive. |
| Manual/QR orders | Implemented and tested through existing kitchen workflow. Customer QR experience retained. Staff order submission is separate from acceptance, preparation and payment. QR token expiry/rotation per seating session remains missing. |
| Drafts | Held counter/table drafts saved to local service; version conflicts rejected; a held draft may be consumed once. Delivery draft saving blocked explicitly. Unsaved cart survives service loss while component stays mounted, not browser reload. |
| Prices | Server validates prices and modifiers. Saved orders retain names, options and prices. New staff submissions reject changed basket prices. Customer checkout intent across a reload/new guest session still needs stronger durable retry recovery. |
| Tables | Existing table list/QR plus ticket table assignment; transfer API allowed only before preparation/payment. No room/zone floor plan, bill merge, item split, seat assignments or reservation system. |
| Payments | Tested partial and mixed cash/external-TPE payments against one bill; exact centime amounts, cash tender/change, optimistic version check, durable retry key. No card charging, card details, credit, tips or delivery-agent settlement. |
| Splits | Paying one bill in multiple amounts/methods works. Separate item/seat sub-bills, allocation groups and merging are NOT implemented. |
| Discounts | Manager/owner order-discount API before preparation/payment, password/reason/version required. No item-level discounts; new discount/table-transfer APIs are not yet exposed in the cashier screen. |
| Refunds | Tested amount-based partial/full refunds linked to original payment, capped balance, current cashier session, tax/points reversal, reason and password, linked correction document. User confirms money has actually been returned. No payment-provider reversal, item-return allocation or refund-before-full-payment flow. |
| Cash | Tested opening float, unique open drawer/operator ownership, paid in/out API/UI, expected cash from cash-only ledger, total counted cash, card reconciliation, blind-count option, immutable closing, discrepancy and unresolved-order reason. No denomination count UI or drawer ownership transfer. |
| Documents | Unique `PILOT-` numbering, immutable receipt/correction snapshots, historical prices/tax/identity, receipt claim QR, browser print/PDF. No approved fiscal series, invoices/buyer ICE, per-item tax profiles/effective dates or stamp-duty implementation. No production certification claim. |
| Printing | Durable browser print-job record; delivery remains unknown; repeated print is marked duplicate. Operator status API records confirmed/failed observation separately. No silent USB/LAN bridge, hardware acknowledgements, kitchen station routing or drawer pulse. |
| Kitchen | Existing accepted/preparing/ready/completed UI retained; manual orders appear there. No item/course sequencing, change-ticket protocol, multi-station routing or explicit seen acknowledgement. |
| Loyalty | Existing one-use high-entropy receipt claims preserved; member login required and bearer possession grants eligibility to the first claimant. Amount refunds proportionally reverse claimed points and redeemed rewards, avoiding repeated reversal. Unclaimed QR is invalidated on refund; earning remaining points after a partial refund is not implemented. Negative point balances prevent spending previously earned/refunded points. |
| Inventory | Basic audited append-only movement ledger with milli-unit quantities and low-stock labels. Separate from menu availability. No suppliers, purchase orders, goods-receipt documents, unit conversion, recipes/BOM, automatic consumption or margin calculation. Refunds never automatically add stock. |
| Owner reports | Actual register ledger: TTC/HT, tax, collected payments, cash/card, refunds, ticket count/average, CSV. Closing records available through report API. No growth guesses/profit claims. No product rankings/channel analysis or full loyalty reporting. Old staff analytics are legacy order-state summaries, NOT the reconciled register report. |
| Offline | Local service works without a cloud dependency when LAN/server stay available. API loss blocks financial writes. Durable ordered outbox tested against isolated receiver including outage/lost ack/restart. Real router outage, remote dashboards and production cloud sync not tested/implemented. |
| Recovery | Verified AES-256-GCM backup/restore, refusal to overwrite, tamper/wrong-key rejection; optional timed backup/off-device directory copying and low-disk warning. Scheduling in app requires configuration. Destination independence, OS ACLs, key escrow, service supervisor, retention/pruning and recovery times require installation validation. |
| Privacy | Customer menu retains optional marketing consent. Register financial document copies exclude phone/address. No CNDP filing or production hosting choice; access/correction/deletion-request module not implemented. |
| Setup/imports | Existing onboarding/menu/team tools plus register legal identity/business day/hardware/blind-count form. No full guided installer, CSV import/preview, historical CLYO import or automatic cutover. |

## Rounding and reporting rules

Money is stored as integer centimes in register ledgers. Menu price/modifier centimes are summed before line multiplication. Existing tax model is one inclusive restaurant-wide percentage; tax rounds to nearest centime. Refund tax uses cumulative proportional rounding so sequential refunds sum to original tax. Points/reward restoration uses cumulative proportional floor allocation. These rules need accountant/business approval; multiple tax profiles are not implemented.

Report sales use issuance time of fully paid receipt; collected payments use actual payment time (therefore partial collections need not equal finalized sales). Average ticket = finalized TTC receipt totals / finalized receipt count in period, before refunds. Refunds appear separately on correction date. `Africa/Casablanca` uses IANA timezone rules; service date subtracts a calendar day before configured closing hour (default 04:00). Changing the cutoff mid-service is operationally prohibited in the runbook; historical reporting does not yet snapshot cutoff versions.

## Acceptance evidence / blockers

Automated tests: run `npm test`, `npm run lint`, `npm run build:server`. Register tests cover manual kitchen/payment/receipt/report, QR acceptance/claim/refund, partial/mixed amounts, version conflicts, retry deduplication, role/tenant blocks, print unknown/reprint, cash variance, snapshot immutability, backup verification, reset/idle sessions and timezone boundaries. Replica tests simulate transport outage and lost acknowledgement, not an actual hosted cloud outage.

Browser walkthrough on an isolated database: login, pilot activation, product entry, submitted/accepted/preparing order, drawer opening, 22 DH sale tendered 50 DH → 28 DH change, preserved receipt and generated loyalty QR. No real payment was taken. Physical printer, cutter, cash drawer, QR scan on paper, Arabic paper shaping, paper-out, restart supervisor and real LAN outage remain **not physically tested**.

Production checklist (all required before replacing the till):
- [ ] Complete missing operational requirements with owner signoff, especially split/merge, tax profiles/invoices, kitchen changes and delivery cash custody.
- [ ] Identify actual hardware and supported local runtime; test 1024×768/1366×768 and physical peripherals.
- [ ] Accountant approves legal profile, per-item taxes, document forms/numbering, stamp duty, corrections, archiving and any current electronic-invoicing requirements.
- [ ] Confirm processing/hosting location, CNDP formalities, privacy information and any foreign transfer authorization steps.
- [ ] Configure unique owner/staff credentials, TLS, local device enrollment and explicit support-access policy.
- [ ] Validate encrypted off-device restore, key recovery, disk capacity, operating-system account permissions, RPO/RTO and supervised startup.
- [ ] Deploy and test authenticated cloud replication/owner reporting if required; never create competing financial writers.
- [ ] Reconcile a full rehearsal shift including refunds, paper failure and power/network loss.
- [ ] Export/preserve old system data; set an explicit opening balance/cutover date. Do not erase/uninstall CLYO automatically.

## Morocco reference material for qualified review

The requested legal baseline is a review checklist, not certification. Official 2026 CGI is listed by the [Ministry of Economy and Finance](https://www.finances.gov.ma/fr/lbc/Pages/publications0.aspx); [official PDF](https://www.finances.gov.ma/Publication/dgi/2025/CGI-2026-FR.pdf). The PDF fetch timed out during this implementation, so article-level verification was not completed. Ask the accountant to validate Articles 145/211 and all current obligations against the restaurant's situation. Do not import French NF525 assumptions.

[CNDP notification procedures](https://www.cndp.ma/procedures-de-notification-process/) and [foreign data transfers](https://www.cndp.ma/transfert-de-donnees-a-letranger/) require evaluating the actual processing and destination. The CNDP explains that transfer authorization depends on approval of the underlying processing. A foreign hosting subscription alone does not establish compliance.

## Next engineering phases

1. Complete normalized tax profiles, immutable fiscal documents and item allocations before fiscal cutover.
2. Implement shared open-bill editing, split/merge provenance and kitchen change tickets with conflict tests.
3. Enroll actual devices and implement one documented printer adapter with physical acceptance tests.
4. Add authenticated cloud transport, remote read model and stale-data reporting; test actual disconnection and source failover with one authority.
5. Complete purchasing/recipes, detailed reports, CSV import, privacy requests and production security/recovery review.

No phase is marked complete merely because a screen exists. This change supplies a working local vertical pilot, not every item in the requested 21-section specification.
