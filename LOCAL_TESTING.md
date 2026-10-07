# MIDA local pilot

No paid hosting or other paid service has been activated. This version runs on this computer only:

http://127.0.0.1:3002/mida-restaurant/

## Start again

From this project directory with Node.js 24 and dependencies installed:

```powershell
node node_modules/vite/bin/vite.js build --mode server
node server/local.mjs
```

Keep the terminal running. The server binds to 127.0.0.1 and uses the private, persistent `data/local-pilot.sqlite` database. It creates local owner, manager, kitchen, cashier, waiter and customer test accounts. Their private credentials are in `data/local-access.json`. Both files are excluded from Git. Never publish these credentials or use these test accounts in production.

## What works locally

- Customer menu, basket, server-priced orders and tracking; staff preparation, offline payment recording and refunds.
- Server-enforced restaurant/role permissions and staff management.
- Member registration, login across browser sessions, password changes and private order/points history.
- Paid receipt QR generation, manual claim, QR image import and camera scanning UI. Each receipt can earn points once; refunds reverse earned points.
- Checkout reward redemption, atomic points reservation, cancellation/refund restoration and a configurable manual promotion code. Rewards and promotions cannot be combined.
- Owner/manager configuration for restaurant details, opening hours, table count, existing menu descriptions/prices, loyalty rules and promotions; genuine table QR downloads.

Sample loyalty rules: 1 point per whole MAD paid for food, 100 points redeem a 15 MAD discount on at least 50 MAD of food, receipt claims expire after 30 days. Points themselves do not expire. The restaurant must approve these rules.

## Validation performed

Automated API tests cover pricing, role/tenant access, orders, payment/refund rules, repeated submissions, membership, concurrent receipt claims/redemptions, privacy, promotions, configuration and SQLite restart persistence. TypeScript and production builds are also checked.

A separate 30-customer plus two-staff local load test passed with 618 requests and zero unexpected failures. See LOAD_TEST_RESULTS.md for measurements, repeat instructions and limitations.

The actual browser flow created M-1 for 110 DH, recorded its offline payment, completed it, generated its QR receipt and claimed 110 points as a member. M-2 then spent 100 points: 66 DH food minus 15 DH reward = 51 DH payable. The saved wallet retained 10 points. No browser console errors were observed during that flow. These are test orders, not real sales.

For a presentation, use separate browser profiles for staff and customers. Log in with the local owner account through Espace équipe; use the customer account from Compte/Fidélité. Test data survives server restarts.

## Before a real seven-day restaurant trial

1. Obtain the approved menu, prices, allergens, hours, delivery zones and loyalty policy. Current content is sample data.
2. Test on the restaurant's phones and actual receipt printer. Physical camera scanning and thermal printer output have not been verified here.
3. Identify the existing cashier system and its API/export capabilities before promising direct integration. MIDA currently records payments separately.
4. Validate HTTPS hosting, container/disk permissions, backup restoration, monitoring, privacy/retention procedures and real multi-device service conditions.
5. Decide how customer account recovery will work; automated recovery email, email verification, SMS, automated marketing and subscription billing are not implemented.

This is ready for local testing and an owner demonstration. It is not yet validated for unattended production service. Do not deploy this backend-dependent build to GitHub Pages; Pages cannot run its API or SQLite database.
