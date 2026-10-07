# MIDA: separate restaurant experiences on one platform

## Open the local examples

- Braise Burger: http://127.0.0.1:3002/mida-restaurant/?restaurant=braise-burger
- Atelier Pizza demonstration: http://127.0.0.1:3002/mida-restaurant/?restaurant=atelier-pizza-demo
- Private MIDA administration: http://127.0.0.1:3002/mida-restaurant/?surface=platform

The local server must be running. These addresses work only on this computer. Start instructions are in LOCAL_TESTING.md; the full Node executable path is shown in LOAD_TEST_RESULTS.md if PowerShell cannot find `node`.

## Accounts

Private local credentials are in `data/local-access.json`, excluded from Git. Use the account with role `platform_admin` for MIDA administration. The original restaurant uses `owner@local.mida.test`; the pizza example uses `pizza-owner@local.mida.test`. Copy the matching password from that file. Do not publish it or use these test credentials for production.

Use separate browser profiles when testing different staff accounts simultaneously. Tabs on this same hostname share a login cookie. A restaurant account opening another restaurant's link is refused; log out before switching accounts. The platform administrator can access all restaurants and must never be shared with restaurant owners.

## Add a restaurant

1. Log into MIDA administration with the platform administrator account.
2. In **Ajouter un restaurant**, enter its name, a unique lowercase identifier such as `restaurant-example`, optional contact details, and the owner's email and initial password (12 characters minimum).
3. Create it. The restaurant starts with an empty menu, a separate owner and closed ordering. Existing restaurants keep their data and configuration.
4. Select the restaurant, open **Configuration**, and set its logo, accent colour, cover image, city, translated tagline, contact details, opening hours and tables.
5. Add categories and dishes; edit descriptions, translations and prices. Image fields accept HTTPS URLs or existing local asset paths. This version does not upload image files. New dishes use a neutral placeholder when no photo is provided.
6. Configure ordering modes, preparation estimate, the approved tax rate, delivery fees/zones, loyalty rules and promotions. Delivery starts disabled for a new restaurant.
7. Create the restaurant's staff from **Équipe**, validate the menu and run a complete test order. Open ordering from the staff dashboard when ready.
8. Give the owner only their restaurant-specific staff link and credentials. Provide the customer link and table QR codes to that restaurant. The owner can change the initial password after login.

Owner creation and restaurant creation are committed together; duplicate restaurant identifiers or staff emails are rejected. An email currently identifies one staff account, so distinct restaurant memberships require distinct staff accounts.

## Separation and branding

Each restaurant has its own menu, settings, staff, orders, table tokens and loyalty balances. Public API snapshots return only the selected restaurant. Restaurant staff cannot list other restaurants or modify their data. Only the platform administrator sees the directory and onboarding form.

Names, logos, colours, customer/staff links, page metadata, browser icons, home-screen manifest links and receipt links follow the selected restaurant. Order numbering is independent per restaurant. Unknown restaurant links return an unavailable/404 response instead of displaying another restaurant.

This is one shared web application with distinct branded links, not independently deployed apps. The hostname and URL path are still shared. Custom domains/subdomains and domain ownership verification are not configured. Customer sign-in identity is currently shared on the platform; customer order history, points and consent profiles are scoped to each restaurant. No other restaurant's private customer records are exposed to an owner.

## Validation on 7 October 2026

- 12 automated test groups passed, including onboarding, wrong-restaurant login rejection, menu/branding/operations access, concurrent orders in two restaurants, independent numbering, private snapshots and loyalty separation.
- HTML titles, restaurant-specific manifests and unknown links were tested.
- TypeScript and the connected production build passed.
- Browser checks verified the pizza owner login, absence of the platform directory for that owner, branding save, new category/item creation and their appearance in the pizza customer menu. The original burger menu retained its 14 dishes and two prior demonstration orders.
- Browser checks verified the private MIDA directory and onboarding form with the platform administrator account. Account creation itself was exercised through the API tests and local fixture setup.

The pizza example is explicitly fictitious and uses placeholder photos. Local test account files and databases remain private and uncommitted. No hosting was purchased and no public deployment was changed.

## Remaining production work

Before a live trial: approved restaurant data and allergens, real phones/printer checks, cashier integration requirements, HTTPS hosting, backups/restoration and monitoring. Basic menu creation is available; advanced modifier/ingredient/allergen editing still needs an administration workflow or reviewed catalog preparation. Native store apps, automated email recovery, subscription billing and custom domains are not included in this change.
