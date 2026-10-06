# Present MIDA to the restaurant owner

Free presentation: https://elmokanass4-dev.github.io/mida-restaurant/demo/

This presentation uses fictitious restaurant data stored in the current browser. No real order, payment or message is sent. View buttons simulate roles; they are not production login credentials. Reset examples before each presentation. Use one browser for the complete demonstration.

## Five-minute walkthrough

1. **Client:** show the menu, categories, dish options, quantities, basket and checkout. Place a sample table/pickup order and show its tracking screen.
2. **Cuisine:** find the order, accept it, move it through preparation and mark it ready. Show how a dish can be marked unavailable.
3. **Propriétaire:** show the order list, record a simulated payment and complete the order. Show sales statistics, table links and service opening/closing controls.
4. Return to **Client** to demonstrate the updated menu or order status. Data stays in this browser; another device does not receive these changes.

## What is prepared for the connected version

The source includes a persistent ordering backend, server-calculated prices, private customer order access, password-based staff accounts, restaurant access separation, and owner/manager/kitchen/cashier/waiter permissions. Owner account management is implemented in the connected version. Hosting and first-owner account provisioning are still required before live use.

Payments are manually recorded cash/terminal payments. This is not an online card processor. Automated marketing, promotion redemption and subscription billing are not active. Menu, prices, hours and operations must be reviewed with the restaurant before a pilot.

## Suggested pitch

“Customers can choose their dishes and follow an order, the kitchen can manage preparation, and you can follow service and recorded sales in one place. Let us test it with your menu and a small pilot before committing to hosting.”

Ask the owner to approve a pilot scope, confirm their menu and prices, and nominate the staff who will test it. Only after approval should paid hosting be activated. No paid service has been created for this demonstration.

## Receipt loyalty demonstration

1. In Propriétaire, select an unpaid sample order and click Encaisser. Open Ticket 80mm: a genuine, downloadable and printable QR appears only for paid, valid purchases.
2. Use the receipt link to open Fidélité in the same browser, or copy the printed code. Camera scanning and QR photo import are also available. Camera access requires the user's permission.
3. Confirm Ajouter mes points. A ticket can be claimed once; repeat attempts are rejected. Refunding the purchase removes its earned points and blocks further claims. Completing an order does not automatically award points.
4. Sample rules only: one point per whole MAD paid, excluding delivery fees; 100 points show a potential 15 MAD future discount. Discount redemption is not implemented. Ask the owner to approve earning, reward, expiry and refund rules.

The demo uses a fictitious member and browser-local storage. It does not authenticate a real customer, prevent browser-storage tampering or share receipt claims between devices. The connected version still uses its prior automatic award policy; server-issued receipts, authenticated customer membership, atomic claims and actual till receipt integration must be implemented before replacing it. Do not use these demo receipts for real rewards. Reset clears example tickets and points only in the demo.
