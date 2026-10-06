# Activate real ordering

GitHub Pages serves the public menu preview only. Never enable `VITE_BACKEND_ENABLED` on Pages: it cannot run the API or database. The full app must use one HTTPS origin for the frontend and API so staff cookies remain first-party.

## Hosting requirements

- Node.js 24.4+ or the provided Docker image.
- A persistent writable disk mounted at `/app/data`; an ephemeral/serverless filesystem is not suitable for this SQLite deployment.
- HTTPS and `APP_ORIGIN` set to the exact host origin, without `/mida-restaurant/`.
- One app instance. Scaling to several instances requires migrating to a shared database.
- Backups held privately outside the app disk. Do not commit or publish database files.

On an existing Docker host:

```sh
docker build -t mida-restaurant .
docker volume create mida-data
docker run -d --name mida --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v mida-data:/app/data \
  -e APP_ORIGIN=https://YOUR-HOST \
  -e TRUST_PROXY_HOPS=1 mida-restaurant
```

Configure the host's HTTPS reverse proxy to forward to port 3001. Only set `TRUST_PROXY_HOPS=1` when exactly one trusted proxy sits in front of the service. The public app is `https://YOUR-HOST/mida-restaurant/`; staff login is `https://YOUR-HOST/mida-restaurant/?surface=staff`. The container runs as the `node` user (UID 1000), so bind-mounted directories need matching write permissions. Do not launch a paid host until its owner has selected the plan.

## First owner and platform accounts

There are no default credentials, public signup, or client-side role assignment. Provision the first owner through the server administrator's private terminal. `server/provision-user.mjs` reads a single JSON object from stdin, with `email`, `password`, `role: "owner"`, and `restaurantId: "braise-burger"`. Choose a unique password of at least 12 characters. Do not put passwords in command arguments, shell history, GitHub, or this document. Use `docker exec -i mida node server/provision-user.mjs` and pipe the JSON from a trusted secret manager or hidden prompt. The platform administrator, if required, must be provisioned separately with `role: "platform_admin"`.

Owners can create manager, kitchen, cashier and waiter accounts from **Équipe**, then disable them immediately if access should end. Each account can change its own password from the staff header. Password changes revoke every previous staff session. Account recovery is currently a server-admin operation; automated password-reset email and MFA are not implemented.

## Backups

Set `DATABASE_PATH` when using a non-default path and run `node server/backup.mjs /private-backups/mida-YYYYMMDD.sqlite`. This creates a consistent SQLite backup. To restore, stop the service, retain the original database, replace it with the verified backup (remove its obsolete WAL/SHM companions while stopped), and restart. Test restoration on an isolated host. Backup copies contain customer information and must remain private.

## Pilot checklist

1. Replace sample restaurant/menu content with the restaurant's approved information. Verify prices, taxes, opening hours, allergens and delivery zones with the owner.
2. Create distinct staff accounts and test denied access across roles and restaurants.
3. Print the table links shown to authorized staff as QR codes. Treat those links as bearer credentials; a copied QR does not prove physical presence.
4. Test pickup, delivery, table ordering, modifier requirements, sold-out dishes, connection failures, duplicate submissions and refunds with two separate devices.
5. Verify backups and restoration, HTTPS, monitoring, privacy/retention policy, and staff service procedures before accepting real orders.

## Current limits

Staff and customer screens poll the server every five seconds; this is shared synchronization, not an instant push service. Guests can view their own orders from the same browser's secure session. Clearing cookies loses that guest access; cross-device customer login/recovery is not implemented. Payments and refunds are recorded after staff perform them using cash or a separate terminal; no money is processed by Mida. Promotions, automated marketing, loyalty redemption and SaaS billing are not active. This is a tested pilot foundation, not a completed production rollout.
