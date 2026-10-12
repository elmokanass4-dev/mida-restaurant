# Backup, restore and update runbook

Use a dedicated OS account, encrypted disk and restricted filesystem permissions. On Windows, Node's mode=0600 is not a substitute for NTFS ACLs; configure them during installation. Protect the source database, temporary directory, backup directories, reset tokens and exports. Backup encryption does not encrypt the live SQLite file.

## Backup key and configuration

Create one independent cryptographically random 32-byte key, encode as 64 hex characters and store it in a password manager/off-device recovery custody. Set `MIDA_BACKUP_KEY` privately as an environment variable. Do not commit or share it. Losing it means encrypted backups cannot be restored. Key rotation/escrow is an operational task, not implemented automatically.

```powershell
# Set the secret MIDA_BACKUP_KEY privately before these commands.
node server/recovery.mjs backup .\data\local-pilot.sqlite C:\MidaBackups\before-update.mida-backup
node server/recovery.mjs restore C:\MidaBackups\before-update.mida-backup C:\MidaRecovery\rehearsal.sqlite
node server/recovery.mjs verify C:\MidaRecovery\rehearsal.sqlite
```

Backup uses SQLite VACUUM INTO for a consistent snapshot, integrity/foreign-key checks, then AES-256-GCM encryption. Restore authenticates the complete ciphertext, checks database integrity and writes **only a new target**. It refuses overwrite. Printed evidence includes payment/refund counts and centime totals, document count and unsent-event count. Reconcile those with owner reports and inspect actual sample documents before accepting a restore.

Automatic backups in `server/index.mjs` and `server/local.mjs` are enabled only when `MIDA_BACKUP_DIR` and a valid `MIDA_BACKUP_KEY` are supplied. Default interval is 30 minutes (`MIDA_BACKUP_MINUTES`, minimum 5). `MIDA_BACKUP_OFFDEVICE_DIR` optionally copies the encrypted file to a second directory. Validate that it is actually off-device and available. Failures produce a server error message; persistent monitoring/owner alerting remains to implement. Source disk below 512 MiB free blocks a scheduled backup and emits a warning. Destination capacity can still fail separately.

There is no destructive automatic pruning. Agree retention with the accountant and privacy adviser, considering the requested ten-year document baseline. Backups of an entire database include more personal data than document archives; do not automatically apply one undifferentiated retention period to every profile. Long-term searchable document archival and managed key rotation are unfinished.

## Restore after failure

1. Stop financial writes and the failed local service. Preserve the failed database and WAL/SHM for investigation; do not overwrite them.
2. Restore to a **new** directory using the correct key. Run verify and compare totals/documents with the last known closing.
3. Start exactly one authority against the restored database in an isolated environment. Never run two writable copies for the same restaurant.
4. Identify transactions after the backup and reconcile them explicitly from retained receipts/manual records; do not invent or silently renumber documents.
5. Re-establish device connections and verify cash/receipt numbers with the owner before reopening.

Target RPO with a working 30-minute schedule is at most the backup interval; this is not a guaranteed achieved RPO. RTO remains unmeasured until a full hardware restore rehearsal. A local disk copy alone does not protect against device loss.

## Migration / rollback

Migration 1 is additive and transactional (`schema_migrations`); failure rolls back SQL schema creation. Legacy JSON entities remain intact. Auth auxiliary tables are created idempotently. Stop service and take a verified backup before updates; run tests/build on a copy, then migrate outside restaurant hours. Do not change business-day cutoff during a service.

Once register writes exist, rolling code back to the old flag-only payment implementation is unsafe. Do not drop ledger tables or rewind financial data. Use a forward fix, or restore a validated backup with explicit reconciliation of later transactions. Preserve every original database and document history. Historical paid orders are not auto-imported as new sales.

## Startup / deployment

Use the existing local entry point for development, not the disposable preview for business. Actual OS service supervisor, automatic restart, HTTPS/local certificate trust, router/firewall restrictions and device enrollment must be configured/tested for the identified hardware. Do not port-forward an unauthenticated or plain-HTTP pilot to the internet. Frontend and API must share the configured origin.

No CLYO files, settings, historical records or installation were changed. Operational replacement is a future acceptance decision; preserve the existing system until the production checklist passes.
