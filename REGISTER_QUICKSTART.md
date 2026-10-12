# Owner and cashier quick start — local pilot

Use Node >=24.4. All commands below are PowerShell. No CLYO, Ollama or paid service is needed.

```powershell
cd "C:\Users\anass\Documents\Codex\2026-10-05\referenced-chatgpt-conversation-this-is-an\work\mida-restaurant"
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
npm run build:server
node server/register-preview.mjs
```

Open `http://127.0.0.1:3005/mida-restaurant/?surface=register`.

This uses a **persistent demo database at `data/register-preview/preview.sqlite`**. Configuration and demo transactions survive restarts. It never opens `data/local-pilot.sqlite`. Test-only login: `owner@example.test` / `Mida-preview-only-2026!`. Those credentials exist only in this loopback preview. Do not use them in production. Stop with Ctrl+C. Do not expose this preview port to the internet.

## Existing local app

Back up `data/local-pilot.sqlite` first (see REGISTER_RECOVERY.md), then run `node server/local.mjs` and open `http://127.0.0.1:3002/mida-restaurant/?surface=register`. Use the existing private individual staff accounts in `data/local-access.json`; do not share that file publicly. If port 3002 is already in use, stop the previous server in its terminal before restarting. Do not terminate unrelated Node processes.

Owner activation changes the payment workflow for that restaurant: the old payment flag buttons reject financial writes and instruct staff to use Caisse POS. Activation does not import old paid orders into cash totals. Keep this installation for pilot testing until the status checklist is complete.

## Owner

1. Sign in with your own account. Open **Paramètres → Caisse, fiscalité pilote et matériel**.
2. Enter the legal profile and known hardware details; unknown values can remain blank in the pilot. Set the business-day cutoff before any test sales. Do not change it during service.
3. Enter your current password and activate the pilot. The `PILOT-` notice stays visible; this is not fiscal approval.
4. Use existing **Équipe** for individual staff accounts. Waiters cannot collect/refund payments through the register. Platform administrators cannot use the register as an owner.
5. In **Rapports**, choose a period; compare sales, payments and refunds separately. Export CSV values are centimes. Old legacy analytics are not the register ledger report.
6. Configure encrypted backups and perform a restore rehearsal before any cutover.

## Cashier / waiter

1. Cashier: **Ma session → Ouvrir ma session**, enter actual opening float and a consistent physical drawer name. Only one operator can own an open drawer; do not invent a different name for the same physical drawer.
2. **Caisse**: choose service/table, products, required modifiers and preparation notes. Delivery requires address, phone and zone.
3. **Mettre en attente** saves a counter/table draft on the service. Reopen it under **Tickets**. Unsaved carts are temporary and are not orders or payments.
4. **Confirmer et envoyer en cuisine** creates an accepted, unpaid staff order. Customer orders first appear under **Commandes**, where acceptance opens the same POS ticket. Kitchen staff use **Cuisine**. Mark ready, then served/collected/delivered after settlement.
5. **Encaisser**: enter amount and payment method. For mixed payment, enter the first amount, then the remaining amount with its method. For cash, enter actual money tendered; MIDA computes change. Card selection only records a payment already confirmed on a separate TPE.
6. Receipt appears when fully paid. Browser printing opens the normal print/PDF dialog. Check paper yourself; the job remains delivery-unknown. Reprints are duplicates. Never restart kitchen preparation solely because printing is uncertain.
7. Loyalty QR: the first logged-in member holding that receipt can claim it once. Do not circulate receipt images. Refunded unclaimed receipts cannot earn points.
8. Refunds require owner/manager password and reason; enter the amount only after the actual cash/TPE refund. No money is moved by this software.
9. **Caisse → Clôture**: count real cash and net TPE totals, explain unresolved orders, authenticate and close. Over/short is preserved. A closed session cannot be edited.

## When something fails

- A timeout is ambiguous: the server may already have saved the operation. Inspect the ticket and retry the same unchanged request. Do not enter a second fresh order to compensate blindly.
- Internet down, local service/LAN working: local register APIs and stored data remain local. Off-site ordering and remote dashboards are not connected in this pilot.
- Local service unreachable: payments are blocked; leave the draft open. Do not finalize independently on another disconnected device.
- Service computer failure: use the restaurant's agreed manual emergency procedure and the restore runbook. No automatic high availability is claimed.
- Five minutes without activity locks register access; sign in again. There is no shared owner password or PIN bypass.

## Password recovery

Server operator verifies the staff member's identity before issuing a temporary code:

```powershell
$env:DATABASE_PATH = ".\data\local-pilot.sqlite"
node server/reset-access.mjs staff@example.com
```

The operator privately provides the one-use code (15-minute expiry). The person chooses **Mot de passe oublié** on the login screen and sets their own password. All previous sessions are revoked. There is no automatic email delivery. Never put reset codes in shared logs, tickets or public messages.
