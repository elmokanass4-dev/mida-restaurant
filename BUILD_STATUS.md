# BUILD_STATUS.md — Mida Multi-Tenant Restaurant SaaS

## 1. Project Overview & Working Context
- **Product**: Mida (Multi-tenant SaaS providing branded digital ordering, table QR sessions, kitchen operations, and customer retention for restaurants).
- **Primary Demo Tenant**: **Braise Burger** (Meknès, Hamria, Morocco).
- **Secondary Tenant (Isolation Testing)**: **Riad Atlas Café** (Place El Hedim, Meknès).
- **Currency**: Moroccan Dirham (`MAD`).
- **Timezone**: `Africa/Casablanca`.
- **Supported Languages**: French (Default for Moroccan restaurant interface), Arabic (`ar` with true RTL bidirectional layout), and English (`en`).
- **Visual Design Reference**: Deep luxury dark-mode palette (`#0d0709` / `#160a10` with warm amber/gold accents `#d97706`), matching the provided mobile UI design mockups with Appetizing Studio 3D Food renders and iPhone dynamic island layout.

---

## 2. Implemented Features & Surfaces

### A. Customer-Facing Restaurant App (`/r/{slug}`)
- **Visual Food Discovery**:
  - Hero featured burger card (*Le Braisé Signature / The Heirloom*) with golden glow and direct "+ ADD TO ORDER" CTA.
  - "EXPLORE OUR MENU" responsive 2-column card grid with authentic generated food photography.
  - Trilingual search bar with real-time dish and ingredient matching.
  - Category selector slider (Burgers Braisés, Accompagnements, Salades, Milkshakes & Desserts, Boissons).
- **Dish Customization & Detail Modal**:
  - Required and optional modifier groups (Patty size, Meat doneness, Side selection, Gourmet extras up to 3, Ingredient removals).
  - Real-time unit price calculation.
  - Verified Allergen disclosures (Gluten, Lactose, Eggs, Mustard) with safety disclaimer.
  - Special kitchen notes (max 150 characters).
  - Immediate sold-out locking (*Fondant au Chocolat* demonstrated as Sold Out).
- **Basket & Checkout**:
  - Live modifier breakdown, quantity steppers, and item deletion.
  - Recalculates all prices, minimum spend, delivery fees, and taxes on the mock backend adapter (never trusts client prices).
  - Promo code verification (demonstrating `RETOUR15` with 15% discount capped at 30 MAD).
  - Ordering modes:
    - **Table (Sur place)**: Enforces table QR session tokens (`bb-tbl-t3-8d1f`) to prevent remote table spoofing.
    - **Pickup (À emporter)**: Hamria location, preparation estimates (~20 min), zero delivery fee.
    - **Delivery (Livraison)**: Neighborhood zones in Meknès (*Hamria / Ville Nouvelle*, *Médina*, *Bassatine*) with zone-based minimum spend and delivery fees.
  - Idempotent order submission preventing duplicate requests.
- **Live Order Tracking**:
  - Stepper: `submitted` → `accepted` → `preparing` → `ready` / `out_for_delivery` → `completed`.
  - Real-time event bus synchronization: updates instantly when kitchen staff changes order status in the dashboard.
  - Table Call Service: "Appeler le serveur" & "Demander l'addition" with 45s rate limiter and confirmation toasts.
  - Reorder button that validates live menu prices and stock before repopulating basket.
- **Braise Club & Loyalty Wallet**:
  - Balance display (140 points for Sarah Mansouri) with estimated MAD value.
  - Digital Member QR Code for in-person cashier identification.
  - Return Campaign offers list with coupon copying and expiration dates.
  - Ledger of points history (welcome bonus, order earnings, redemptions).
- **Customer Account & Privacy**:
  - Favorite dishes quick access.
  - Order history.
  - Explicit privacy consent controls: Transactional notifications (Always on) vs. Promotional Return offers (Opt-in toggle with timestamp and 1-click unsubscribe).
  - Progressive Web App (PWA) installation guide for iOS and Android.
  - **Fixed Mobile Navigation**: Pinned bottom navigation tab bar permanently stuck to the bottom of the screen (`fixed bottom-0` / `z-40` with safe-area insets and `pb-28` scroll padding) so it never scrolls away or disappears.
  - **Mobile Preview Link & QR Code**: Added direct phone test modal with scannable QR code and 1-click link copying.

### B. Restaurant Staff Dashboard (`/manage/{slug}`)
- **Operational Kitchen & Cashier Kanban**:
  - Real-time columns and filters: New Orders, Preparing/Accepted, Ready/Out for delivery, Completed, Cancelled/Rejected.
  - Web Audio synthesized order alert chime with staff sound toggle.
  - Persistent order counter badge.
  - Actions:
    - Accept order with prep time estimate (+10m, +20m, +30m).
    - Start wood-fire grilling (`preparing`).
    - Ready for service / Handover to courier (`ready` / `out_for_delivery`).
    - Complete order (automatically calculates and credits customer loyalty points).
    - Reject order with customer-visible reason.
    - Refund order with auditable manager notes (reverses loyalty ledger points).
    - Mark paid (Cash / TPE terminal).
- **Printable Kitchen Ticket (80mm Thermal)**:
  - Print-friendly layout (`@media print` support) with table number, time, items, modifiers, customer notes, tax breakdown, and staff attribution.
- **Table Call Queue**:
  - Top alert banner notifying waiters of bill requests and service calls.
  - Single-click "Marquer pris en charge".
- **Menu Management**:
  - Instant sold-out toggle immediately blocks orders at checkout.
  - Price verification.
- **Table QR Management**:
  - 6 physical tables with unique cryptographic session tokens.
  - Direct QR simulation links for testing.
- **Retention Rules Engine**:
  - Automated rules: Inactivity thresholds (21 days, 35 days), minimum past orders, budget capping, frequency caps, and cooldown periods.
  - Live campaign metrics: Eligible recipients, messages simulated, redeemed count, and incremental sales in MAD.
- **Operational Analytics**:
  - Revenue in MAD, completed order count, average order value, total discounts offered.
  - Order breakdown by channel (Table vs. Pickup vs. Delivery).

### C. Platform SaaS Admin (`/platform`)
- Multi-tenant directory (Braise Burger vs. Riad Atlas Café).
- Tenant switcher verifying strict data partition by `restaurantId`.
- B2B SaaS pricing plans (Starter 390 MAD/mo, Pro 790 MAD/mo, Enterprise 1490 MAD/mo).
- 1-Click demo state reset to factory seed data.

---

## 3. Architecture & Data Persistence
- **Storage Adapter**: `src/services/storageAdapter.ts` provides persistent local storage caching with window event bus (`SYNC_EVENT_NAME`) for instantaneous cross-tab and cross-view reactivity.
- **Safe Money Handling**: Integer MAD amounts throughout all entities; tax computed with 10% VAT standard.
- **PWA Ready**: `public/manifest.json` configured for standalone mobile experience.

---

## 4. Setup & Running Instructions
1. Run development server: `npm run dev` (running on port 3000).
2. Build for production: `npm run build`.
3. Switch surfaces via the top universal navigation bar:
   - **App Client**: Customer mobile experience.
   - **Écran Staff / Cuisine**: Restaurant operational center.
   - **Plateforme SaaS**: Multi-tenant admin.

---

## 5. Next Steps for Cloud Integration (Stage 3 Roadmap)
- [ ] Connect Firebase Firestore or Cloud SQL backend for multi-device server synchronization.
- [ ] Integrate SMS / WhatsApp gateway adapter (Twilio or Meta Cloud API) for automated retention messages.
- [ ] Integrate local Moroccan payment gateway (CMI / PayZone) when live merchant credentials are provided.
