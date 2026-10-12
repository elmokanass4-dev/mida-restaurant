# MIDA shared workspace delivery — 11 October 2026

## Architecture retained
React 19 / TypeScript / Vite 8, Tailwind and Lucide. The storage adapter refreshes the authenticated Express snapshot every five seconds. SQLite is authoritative, with WAL, transactions, scoped records, durable idempotency, register payment/refund journals and stored receipt snapshots. No CLYO connection or paid service was added.

The existing register, membership, loyalty, recovery, tenant and disabled POS-adapter modules remain. GitHub Pages remains a static presentation, not a live restaurant backend. Production/local entry points remain server/index.mjs and server/local.mjs. The loopback preview entry point is separate.

## Implemented
- Staff shell: charcoal collapsible sidebar, light workspace, role-filtered destinations, account menu, mobile modal drawer, kitchen screen and shared notification panel.
- Public menu never renders staff navigation/account information. QR query parameters and /mida-restaurant/ remain supported. Device-frame control requires preview=1; normal customer layout can expand to desktop width.
- Cashier component stays mounted across sections and lock overlay. Customer name/address fields remain in component state. Counter/table held tickets persist on the server; draft names are retained.
- Durable incoming queue comes from stored submitted orders. Acceptance is atomic, reuses the original UUID, enrolls at most one bill, preserves agreed prices and records actor/time. Repeated acceptance returns the existing result. Stale status changes using expectedStatus fail visibly.
- Staff manual entry has a direct accepted-but-unpaid path. Kitchen only receives accepted/preparing/ready/delivery tickets, cannot accept customer orders and does not receive customer contact/name or private tracking reference.
- Fulfillment can finish before payment. Collected customer spend is recomputed from actual payments less refunds, not merely served order totals.
- Persistent pending badge, new/ready banner, explicit sound activation/test, reminders, manager overdue notice. Web Locks plus a shared timestamp coordinate sound on supported same-origin browsers. System notifications are opt-in; denial/unavailability leaves in-app alerts. No claim of closed-browser/background delivery.
- Reports restricted to owner; scoped loyalty balances, period sales/collections/refunds/discounts, all-date unpaid balances, top products, shifts and variances. Role bundles remain fixed; selecting a role is not an authentication mechanism.
- Team search/active state. Creating or disabling staff now requires current owner/platform administrator reauthentication and revokes disabled-user sessions.
- Grouped settings and unsaved-edit warning; settings remain mounted across staff sections.
- Preparation print attempts are recorded idempotently as unknown, reprints labelled. No financial details in preparation output. Existing receipt payment/refund/loyalty and print journals remain intact.
- Demo database now persists at data/register-preview/preview.sqlite. The active temporary demo was copied with SQLite VACUUM INTO; original temporary and existing local-pilot databases were preserved.

## Order workflow
Customer submits -> stored submitted order -> workspace pending badge/panel -> cashier accepts -> same UUID opens as ticket -> kitchen prepares -> ready -> served/collected. Payment has its own journal and can occur before or after preparation/service, but only after acceptance and with an open authorized cashier shift. Full settlement issues the stored receipt; its one-use loyalty QR can be claimed by the customer. Refunds retain correction records and reverse eligible points.

## Verification
Final validation: npm test — 35 passed, 0 failed; npm run lint — passed; npm run build:server — passed. Existing Vite __dirname future-loader warning remains non-blocking. Full backend regression suite includes added concurrent acceptance and waiter/preparation-print scenarios. Coverage includes agreed price preservation, double acceptance, stale status, payment independence, cashier/waiter permissions, tenant isolation, receipt claims/refunds, backup/restart/outbox, print retries and accurate financial totals. Type check and server build are run separately.
Browser inspection: cashier, kitchen, owner report and customer menu; mobile 390x844 and tablet 1024x768; desktop also inspected. Verified unfinished cart survives section changes, mobile drawer, incoming test order/badge, linked ticket acceptance, muted and enabled sound controls, and owner unpaid-vs-collected report. Physical audio output, browser notification permission denial, actual printers and device/network failure were not hardware-tested. There is no automated browser test suite yet; backend tests do not substitute for these browser checks.

## Setup
Run npm run build:server, then npm run demo:register from this repository. Preview is http://127.0.0.1:3005/mida-restaurant/?surface=register and loopback-only, with existing documented test credentials. Never deploy that test account publicly. Existing pilot: back up data/local-pilot.sqlite, run npm run start:local and use individual accounts. Existing additive register migration remains automatic. No production or external deployment performed.

## Remaining limitations / not production approval
- Real cloud receiving/acknowledgement service, remote restaurant delivery, device enrollment and hosted owner dashboards are not connected. Local durable outbox/recovery foundation remains only.
- Physical printer bridge/acknowledgement, cash-drawer hardware and fiscal/legal validation still require the restaurant's actual equipment and professional validation.
- Accepted item amendments with kitchen diff/acknowledgement are not implemented; do not silently edit accepted baskets. Current limited transfer/discount APIs remain restricted before preparation/payment.
- No configurable per-user permission editor or waiter-payment grant. Fixed server-enforced role bundles; waiters cannot pay. Full invitation email automation is absent; secure reset remains operator-issued.
- Notification preferences are session-local; fallback without Web Locks offers best-effort sound deduplication. Browser/system sound delivery is not guaranteed.
- Unsaved sale survives staff section changes/lock, not reload, logout or switching to customer view. Save a held ticket first. Delivery hold is explicitly unsupported.
- Advanced inventory recipes/purchasing, bill split/merge, physical printer queue dispatch and remote offline synchronization remain outside this implemented pilot.
- Legacy totals outside the new owner journal report are not fiscal accounts. Historical paid transactions are not imported into the register journal automatically.

## Main changed files for this update
src/App.tsx; src/components/staff/StaffWorkspace.tsx, workspace.css, RegisterWorkspace.tsx, PreparationPrint.tsx, StaffDashboard.tsx; src/components/customer/CustomerApp.tsx; src/components/RestaurantSettings.tsx, TeamManagement.tsx; src/services/storageAdapter.ts; src/types/index.ts; index.html; server/app.mjs, app.test.mjs, register.mjs, register.test.mjs, register-preview.mjs; REGISTER_QUICKSTART.md and this document. Other pre-existing changes and the separate untracked mida-pos directory were left intact.

Browser references: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API and https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API .

## Receipt QR follow-up
Fixed receipt print CSS specificity and delayed printing until the loyalty QR image finishes loading. Added QR retry and an explicit opt-in to print without QR if loyalty is unavailable; no silent omission. Verified an isolated in-memory paid receipt renders a loaded 256px QR. Type check/build passed; 17 targeted loyalty/register tests passed. Physical printer output not tested. Current main demo had one kitchen print attempt and no payments/documents at inspection; preparation tickets intentionally have no loyalty claim code.
