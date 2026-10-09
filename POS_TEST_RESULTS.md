# POS mock verification results

Run date: 9 October 2026. Local Windows, Node 24, temporary/in-memory SQLite and loopback HTTP only.

| Check | Result |
|---|---|
| `npm test` | **22 passed, 0 failed** (12 existing + 10 new POS tests), about 18 seconds. |
| `npm run lint` | Passed (`tsc --noEmit`). |
| `npm run build:server` | Passed. Existing non-blocking Vite warning about `__dirname`/future native config loader remains. |
| `npm run demo:pos` | Passed: one MIDA order, two delivery attempts, one durable mock receipt. |
| `git diff --check` | Passed; Windows line-ending notices only. |

## Demonstrated sequence

1. The isolated loopback API accepted a fictitious pickup order and saved its POS job atomically.
2. Repeating the HTTP submission with the same key returned the same order UUID.
3. The mock accepted the first delivery but deliberately lost its acknowledgement. MIDA recorded `ACK_UNKNOWN` and retained a pending job.
4. The mock clock advanced past backoff; a second delivery reused the same key and frozen payload.
5. The mock returned the existing external ID. MIDA recorded `acknowledged`, with two attempts and exactly one mock inbox row.
6. The order remained unpaid/submitted in MIDA; POS acknowledgement did not change kitchen, cash or loyalty state.

## New coverage

- Disabled default, blocked unsupported provider and production mock configuration.
- Concurrent same-key order submissions and concurrent worker claims.
- Atomic rollback of order/idempotency when outbox insertion fails (the intentional “API failure test queue write failure” log is expected).
- Missing product/option mappings, scoped mapping validation, repair and retry.
- Lost acknowledgement across database close/reopen; frozen payload despite later mapping changes.
- Bounded retry exhaustion, retained failed order, scoped diagnostics and restricted retry permissions.
- Cancellation before dispatch; reconciliation flag after acknowledgement.
- Recovery of expired worker leases and rejection of mismatched acknowledgements.
- Late acknowledgement fencing and preservation of cancellation review state.
- Ten-second adapter timeout, abort signal and retained retry state.

## Existing coverage retained

Customer identity/privacy, authoritative prices, order idempotency, roles/tenants, malformed orders, table token validation, service calls, staff sessions and revocation, database persistence, paid receipt/QR behavior, membership, single-use claims, redemption/refund atomicity, configuration, promotions and tenant onboarding.

## Limits

No real CLYO connection, 5.11.64 compatibility test, credentials, physical till/printer, kitchen device, live payment, hosted deployment, new browser walkthrough or load benchmark was performed. The production transport, cross-system reconciliation, operational alerts and POS UI remain planned work. Mock inbox persistence shares the isolated test database; it models deduplication and acknowledgement loss but is not a realistic two-machine/network durability test. Customer submission deduplication is scoped to a retained session/key; checkout reload recovery remains an audit finding. No claim of end-to-end exactly-once delivery to an unverified POS is made.
