# Register verification — 2026-10-10

## Recorded results

- `npm test`: **33 passed, 0 failed**, approximately 22 seconds. Includes all pre-existing customer, loyalty, tenant and mock POS tests plus standalone register/recovery tests.
- `npm run lint`: passed TypeScript checks.
- `npm run build:server`: passed. Existing Vite warning about future native config-loader support for `__dirname`; not a build failure.
- `git diff --check`: passed (line-ending conversion warnings only).
- Browser: temporary loopback database at port 3005. Owner login → register activation → product entry → submitted order → acceptance → preparation → opening float → cash payment → immutable receipt with rendered loyalty QR. Test sale 22 DH, tendered 50 DH, change 28 DH, remaining 0 DH.

The deliberate `API failure test queue write failure` log belongs to the existing rollback test; that test passes and asserts no lost order/false success.

## New automated coverage

1. Manual order and kitchen state changes, mixed partial payments, receipt and report reconciliation.
2. Retry with same key returns the original payment; changed payload rejects reuse.
3. Concurrent different-key payments sharing a version: one succeeds, one conflicts.
4. Immutable financial rows and closed drawer snapshots reject edits.
5. Customer QR order cannot be paid before acceptance; paid receipt can be claimed once.
6. Partial/full refund caps, proportional cumulative tax and point reversal, receipt invalidation.
7. Drawer expected cash excludes card collections and change is not added as sales.
8. Cash discrepancy preserved at close; unresolved tickets require a reason.
9. Waiter and other tenant blocked from financial operations; platform cannot enter register.
10. Legacy payment-flag route blocked after pilot activation.
11. Print delivery remains unknown, repeat marked duplicate, operator-observed failure persists without changing sales.
12. Held draft version conflict and one-time consumption; transfer and discount version checks.
13. Changed menu prices reject new submissions; historical receipt JSON stays unchanged after menu/tax edits.
14. Midnight and Casablanca seasonal-offset business-day handling.
15. Database reopen and consistent backup retain financial totals/documents/unsent events.
16. Replica outage, lost acknowledgement, worker recreation and ordered deduplicated replay; conflicts/unsupported schemas rejected.
17. Encrypted backup of actual test payments/documents restores exact summaries; bad key, modified ciphertext and overwrite are rejected.
18. Server inactivity lock, logout recovery and all-session revocation.
19. Reset tokens stored hashed, one-use, expiry checked and previous sessions revoked.

## Not established by these results

No physical printer/cutter/drawer testing; no printed QR scan or Arabic paper verification; no real restaurant router/power outage; no deployed cloud replica/remote dashboard; no production device enrollment; no fiscal certification; no full split/merge/item-refund accounting. Desktop browser walkthrough is not a multi-device load or target-hardware acceptance test. See REGISTER_STATUS.md for the complete gap matrix.

The preview database is separate from the real local pilot. No real restaurant transactions, CLYO system, payment provider, cloud credentials or paid services were used. No deployment was performed.
