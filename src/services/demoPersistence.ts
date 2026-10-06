import {
  Restaurant,
  Dish,
  Category,
  Order,
  CustomerProfile,
  LoyaltyLedgerEntry,
  StaffCallRequest,
  OrderItem,
  OrderStatus,
  PaymentStatus
} from '../types';
import {
  BRAISE_BURGER_ID,
  SEED_RESTAURANTS,
  SEED_CATEGORIES,
  SEED_DISHES,
  SEED_ORDERS,
  SEED_CUSTOMER,
  SEED_LOYALTY_LEDGER
} from '../data/seedData';

const STORAGE_KEYS = {
  RECEIPTS: 'mida_presentation_receipts_v1',
  RESTAURANTS: 'mida_presentation_restaurants_v1',
  CATEGORIES: 'mida_presentation_categories_v1',
  DISHES: 'mida_presentation_dishes_v1',
  ORDERS: 'mida_presentation_orders_v1',
  CUSTOMER: 'mida_presentation_customer_v1',
  LOYALTY: 'mida_presentation_loyalty_ledger_v1',
  STAFF_CALLS: 'mida_presentation_staff_calls_v1',
  ACTIVE_TABLE: 'mida_presentation_active_table_v1'
};

// Event for cross-tab or cross-component real-time reactivity
export const SYNC_EVENT_NAME = 'mida_presentation_sync_event';

function broadcastSync(type: string, payload?: unknown) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: { type, payload } }));
  }
}

export class DemoPersistence {
  private inMemoryStore: Record<string, unknown> = {};

  private getItem<T>(key: string, defaultValue: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item);
      }
    } catch (e) {
      console.warn(`LocalStorage read failed for ${key}, falling back to memory`, e);
    }
    return (this.inMemoryStore[key] as T) || defaultValue;
  }

  private setItem<T>(key: string, value: T): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`LocalStorage write failed for ${key}, falling back to memory`, e);
    }
    this.inMemoryStore[key] = value;
  }

  constructor() {
    this.initializeIfEmpty();
    if (!this.getItem('mida_receipt_demo_version', false)) {this.initializeIfEmpty(true);this.setItem('mida_receipt_demo_version',true);}
  }

  public initializeIfEmpty(forceReset = false) {
    if (forceReset || !this.getItem(STORAGE_KEYS.RESTAURANTS, null)) {
      this.setItem(STORAGE_KEYS.RESTAURANTS, SEED_RESTAURANTS);
      this.setItem(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
      this.setItem(STORAGE_KEYS.DISHES, SEED_DISHES);
      this.setItem(STORAGE_KEYS.ORDERS, SEED_ORDERS.map(o=>({...o,loyaltyPointsEarned:0})));
      this.setItem(STORAGE_KEYS.CUSTOMER, {...SEED_CUSTOMER,loyaltyPoints:0,availableOffers:[]});
      this.setItem(STORAGE_KEYS.LOYALTY, []);
      this.setItem(STORAGE_KEYS.RECEIPTS, []);
      this.setItem(STORAGE_KEYS.STAFF_CALLS, []);
      broadcastSync('RESET');
    }
  }

  // --- RESTAURANTS ---
  public getRestaurants(): Restaurant[] {
    return this.getItem<Restaurant[]>(STORAGE_KEYS.RESTAURANTS, SEED_RESTAURANTS);
  }

  public getRestaurantBySlug(slug: string): Restaurant | undefined {
    const list = this.getRestaurants();
    return list.find((r) => r.slug === slug || r.id === slug);
  }

  public updateRestaurant(restaurant: Restaurant): void {
    const list = this.getRestaurants().map((r) => (r.id === restaurant.id ? restaurant : r));
    this.setItem(STORAGE_KEYS.RESTAURANTS, list);
    broadcastSync('RESTAURANT_UPDATED', restaurant);
  }

  // --- CATEGORIES ---
  public getCategories(restaurantId: string): Category[] {
    const all = this.getItem<Category[]>(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
    return all.filter((c) => c.restaurantId === restaurantId).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // --- DISHES ---
  public getDishes(restaurantId: string): Dish[] {
    const all = this.getItem<Dish[]>(STORAGE_KEYS.DISHES, SEED_DISHES);
    return all.filter((d) => d.restaurantId === restaurantId);
  }

  public getDishById(dishId: string): Dish | undefined {
    const all = this.getItem<Dish[]>(STORAGE_KEYS.DISHES, SEED_DISHES);
    return all.find((d) => d.id === dishId);
  }

  public updateDish(dish: Dish): void {
    const all = this.getItem<Dish[]>(STORAGE_KEYS.DISHES, SEED_DISHES);
    const updated = all.map((d) => (d.id === dish.id ? dish : d));
    this.setItem(STORAGE_KEYS.DISHES, updated);
    broadcastSync('DISH_UPDATED', dish);
  }

  public toggleDishAvailability(dishId: string): boolean {
    const dish = this.getDishById(dishId);
    if (!dish) return false;
    dish.isAvailable = !dish.isAvailable;
    this.updateDish(dish);
    return dish.isAvailable;
  }

  // --- ORDERS ---
  public getOrders(restaurantId: string): Order[] {
    const all = this.getItem<Order[]>(STORAGE_KEYS.ORDERS, SEED_ORDERS);
    return all
      .filter((o) => o.restaurantId === restaurantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getOrderByRef(secureRef: string): Order | undefined {
    const all = this.getItem<Order[]>(STORAGE_KEYS.ORDERS, SEED_ORDERS);
    return all.find((o) => o.secureRef === secureRef);
  }

  /**
   * Server-Side Price & Availability Verification:
   * Recalculates items, modifier additions, taxes, and delivery fee.
   * Throws an error if an item in the cart has been marked sold out.
   */
  public verifyAndCalculateOrder(params: {
    restaurantId: string;
    mode: 'table' | 'pickup' | 'delivery';
    items: OrderItem[];
    deliveryZoneId?: string;
    offerCode?: string;
  }): {
    verifiedItems: OrderItem[];
    subtotalMAD: number;
    discountMAD: number;
    deliveryFeeMAD: number;
    taxRatePercent: number;
    taxAmountMAD: number;
    totalMAD: number;
    appliedOfferId?: string;
  } {
    const restaurant = this.getRestaurants().find((r) => r.id === params.restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    let subtotal = 0;
    const verifiedItems: OrderItem[] = [];

    for (const item of params.items) {
      const liveDish = this.getDishById(item.dishId);
      if (!liveDish) {
        throw new Error(`Plat non disponible ou supprimé : ${item.dishName}`);
      }
      if (!liveDish.isAvailable) {
        throw new Error(
          `Le plat "${liveDish.name.fr}" est actuellement épuisé en cuisine et ne peut être commandé.`
        );
      }

      // Base price snapshot from live restaurant menu (never client trust)
      let itemUnit = liveDish.priceMAD;

      // Recalculate modifiers
      const validatedModifiers = item.selectedModifiers.map((mod) => {
        const group = liveDish.modifierGroups.find((g) => g.id === mod.groupId);
        const opt = group?.options.find((o) => o.id === mod.optionId);
        const liveModPrice = opt ? opt.priceMAD : 0;
        itemUnit += liveModPrice;
        return {
          ...mod,
          priceMAD: liveModPrice
        };
      });

      const lineTotal = itemUnit * item.quantity;
      subtotal += lineTotal;

      verifiedItems.push({
        ...item,
        dishName: liveDish.name.fr,
        image: liveDish.image,
        unitPriceMAD: itemUnit,
        selectedModifiers: validatedModifiers,
        lineTotalMAD: lineTotal
      });
    }

    // Delivery fee calculation
    let deliveryFee = 0;
    if (params.mode === 'delivery') {
      if (restaurant.deliverySettings.isPaused) {
        throw new Error('Les livraisons sont temporairement suspendues par le restaurant.');
      }
      if (subtotal < restaurant.deliverySettings.minOrderMAD) {
        throw new Error(
          `Le montant minimum pour la livraison est de ${restaurant.deliverySettings.minOrderMAD} MAD.`
        );
      }

      if (params.deliveryZoneId) {
        const zone = restaurant.deliverySettings.zones.find((z) => z.id === params.deliveryZoneId);
        if (zone) {
          if (subtotal < zone.minSpendMAD) {
            throw new Error(`Minimum de commande pour ${zone.name} : ${zone.minSpendMAD} MAD`);
          }
          deliveryFee = zone.feeMAD;
        } else {
          deliveryFee = restaurant.deliverySettings.deliveryFeeMAD;
        }
      } else {
        deliveryFee = restaurant.deliverySettings.deliveryFeeMAD;
      }
    }

    // Offer / discount verification
    let discount = 0;
    let appliedOfferId: string | undefined = undefined;

    if (params.offerCode) {
      const customer = this.getCustomer(params.restaurantId);
      const match = customer.availableOffers.find(
        (o) => o.code.toUpperCase() === params.offerCode?.toUpperCase() && !o.isRedeemed
      );
      if (match && subtotal >= match.minSpendMAD) {
        if (match.discountPercent) {
          discount = Math.min(
            Math.round((subtotal * match.discountPercent) / 100),
            30 // Capped discount
          );
        } else if (match.discountMAD) {
          discount = match.discountMAD;
        }
        appliedOfferId = match.id;
      }
    }

    const netBeforeTax = subtotal - discount + deliveryFee;
    const taxRatePercent = restaurant.taxRatePercent || 10;
    // TVA incluse dans la restauration marocaine standard
    const taxAmountMAD = Math.round((netBeforeTax - netBeforeTax / (1 + taxRatePercent / 100)) * 100) / 100;
    const totalMAD = Math.max(0, netBeforeTax);

    return {
      verifiedItems,
      subtotalMAD: subtotal,
      discountMAD: discount,
      deliveryFeeMAD: deliveryFee,
      taxRatePercent,
      taxAmountMAD,
      totalMAD,
      appliedOfferId
    };
  }

  /**
   * Submit new order (status starts at 'submitted')
   */
  public submitOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'secureRef' | 'createdAt' | 'status'>): Order {
    const verified = this.verifyAndCalculateOrder({
      restaurantId: orderData.restaurantId,
      mode: orderData.mode,
      items: orderData.items,
      deliveryZoneId: orderData.deliveryZoneId,
      offerCode: orderData.appliedOfferId ? 'RETOUR15' : undefined
    });

    const existingOrders = this.getOrders(orderData.restaurantId);
    const nextNum = existingOrders.length + 1043;
    const randomHex = Math.random().toString(36).substring(2, 8);

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber: `BB-${nextNum}`,
      secureRef: `ord_${randomHex}`,
      items: verified.verifiedItems,
      subtotalMAD: verified.subtotalMAD,
      discountMAD: verified.discountMAD,
      deliveryFeeMAD: verified.deliveryFeeMAD,
      taxRatePercent: verified.taxRatePercent,
      taxAmountMAD: verified.taxAmountMAD,
      totalMAD: verified.totalMAD,
      appliedOfferId: verified.appliedOfferId,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };

    // Save in storage
    const all = this.getItem<Order[]>(STORAGE_KEYS.ORDERS, SEED_ORDERS);
    all.unshift(newOrder);
    this.setItem(STORAGE_KEYS.ORDERS, all);

    // If an offer was applied, mark it redeemed
    if (verified.appliedOfferId) {
      this.markOfferRedeemed(orderData.restaurantId, verified.appliedOfferId);
    }

    broadcastSync('ORDER_SUBMITTED', newOrder);
    return newOrder;
  }

  public updateOrderStatus(params: {
    orderId: string;
    status: OrderStatus;
    staffAttribution?: string;
    prepMinutesAdded?: number;
    rejectionReason?: string;
  }): Order | undefined {
    const all = this.getItem<Order[]>(STORAGE_KEYS.ORDERS, SEED_ORDERS);
    const orderIndex = all.findIndex((o) => o.id === params.orderId);
    if (orderIndex === -1) return undefined;

    const order = { ...all[orderIndex] };
    const now = new Date();

    order.status = params.status;
    if (params.staffAttribution) {
      order.staffAttribution = params.staffAttribution;
    }

    if (params.status === 'accepted') {
      order.acceptedAt = now.toISOString();
      const prepMinutes = (params.prepMinutesAdded || 20);
      order.estimatedReadyAt = new Date(now.getTime() + prepMinutes * 60 * 1000).toISOString();
    } else if (params.status === 'completed') {
      order.completedAt = now.toISOString();
      // Points are only awarded by claiming a paid receipt, never automatically.
    } else if (params.status === 'rejected') {
      order.rejectionReason = params.rejectionReason || 'Cuisine en surcharge momentanée';
    }

    all[orderIndex] = order;
    this.setItem(STORAGE_KEYS.ORDERS, all);
    broadcastSync('ORDER_STATUS_CHANGED', order);
    return order;
  }

  public updatePaymentStatus(params: {
    orderId: string;
    paymentStatus: PaymentStatus;
    refundReason?: string;
    staffAttribution?: string;
  }): Order | undefined {
    const all = this.getItem<Order[]>(STORAGE_KEYS.ORDERS, SEED_ORDERS);
    const orderIndex = all.findIndex((o) => o.id === params.orderId);
    if (orderIndex === -1) return undefined;

    const order = { ...all[orderIndex] };
    order.paymentStatus = params.paymentStatus;
    if (params.staffAttribution) order.staffAttribution = params.staffAttribution;

    if (params.paymentStatus === 'refunded') {
      order.status = 'cancelled';
      order.refundReason = params.refundReason || 'Remboursement autorisé par le manager';
      // Reverse loyalty points if previously awarded
      if (order.loyaltyPointsEarned) {
        this.reverseLoyaltyPoints(
          order.restaurantId,
          order.loyaltyPointsEarned,
          `Annulation points suite au remboursement #${order.orderNumber}`,
          order.id
        );
        order.loyaltyPointsEarned = 0;
      }
    }

    all[orderIndex] = order;
    this.setItem(STORAGE_KEYS.ORDERS, all);
    broadcastSync('ORDER_PAYMENT_CHANGED', order);
    return order;
  }

  // --- CUSTOMER PROFILE & LOYALTY ---
  public issueReceipt(orderId:string) {
    const order=this.getRestaurants().flatMap(r=>this.getOrders(r.id)).find(o=>o.id===orderId);
    if(!order||order.paymentStatus!=='paid'||['cancelled','rejected'].includes(order.status))throw new Error('Un ticket fidélité nécessite une commande payée et valide.');
    if(order.loyaltyPointsEarned)throw new Error('Les points de cette commande ont déjà été crédités.');
    const receipts=this.getItem<Array<{token:string;orderId:string;restaurantId:string;claimed:boolean}>>(STORAGE_KEYS.RECEIPTS,[]);
    const previous=receipts.find(r=>r.orderId===orderId);
    if(previous)return previous.token;
    const token=crypto.randomUUID().replaceAll('-','').slice(0,20).toUpperCase();
    receipts.push({token,orderId,restaurantId:order.restaurantId,claimed:false});
    this.setItem(STORAGE_KEYS.RECEIPTS,receipts);return token;
  }
  public claimReceipt(restaurantId:string,input:string) {
    let token=input.trim().toUpperCase();
    if(input.trim().startsWith('http')){try{token=new URL(input.trim()).searchParams.get('receipt')?.toUpperCase()||'';}catch{throw new Error('Code invalide.');}}
    const receipts=this.getItem<Array<{token:string;orderId:string;restaurantId:string;claimed:boolean}>>(STORAGE_KEYS.RECEIPTS,[]);
    const receipt=receipts.find(r=>r.token===token&&r.restaurantId===restaurantId);
    if(!receipt)throw new Error('Ticket inconnu dans ce navigateur de démonstration.');
    const orders=this.getItem<Order[]>(STORAGE_KEYS.ORDERS,[]);const order=orders.find(o=>o.id===receipt.orderId);
    if(!order||order.paymentStatus!=='paid'||['cancelled','rejected'].includes(order.status))throw new Error('Ce ticket n’est plus éligible : paiement annulé ou remboursé.');
    if(receipt.claimed||order.loyaltyPointsEarned)throw new Error('Ce ticket a déjà été utilisé.');
    const points=Math.floor(Math.max(0,order.totalMAD-order.deliveryFeeMAD));
    if(points<1)throw new Error('Aucun point disponible pour ce ticket.');
    receipt.claimed=true;order.loyaltyPointsEarned=points;
    this.setItem(STORAGE_KEYS.RECEIPTS,receipts);this.setItem(STORAGE_KEYS.ORDERS,orders);
    this.awardLoyaltyPoints(restaurantId,points,`Ticket #${order.orderNumber} scanné · règle de démonstration`,order.id);
    broadcastSync('RECEIPT_CLAIMED');return points;
  }
  public getCustomer(restaurantId: string): CustomerProfile {
    const stored = this.getItem<CustomerProfile>(STORAGE_KEYS.CUSTOMER, SEED_CUSTOMER);
    if (stored.restaurantId === restaurantId) return stored;
    return {
      ...SEED_CUSTOMER,
      restaurantId,
      loyaltyPoints: 0,
      favoriteDishIds: [],
      availableOffers: []
    };
  }

  public updateCustomer(customer: CustomerProfile): void {
    this.setItem(STORAGE_KEYS.CUSTOMER, customer);
    broadcastSync('CUSTOMER_UPDATED', customer);
  }

  public toggleFavorite(dishId: string, restaurantId: string): boolean {
    const customer = this.getCustomer(restaurantId);
    const exists = customer.favoriteDishIds.includes(dishId);
    if (exists) {
      customer.favoriteDishIds = customer.favoriteDishIds.filter((id) => id !== dishId);
    } else {
      customer.favoriteDishIds.push(dishId);
    }
    this.updateCustomer(customer);
    return !exists;
  }

  public awardLoyaltyPoints(
    restaurantId: string,
    points: number,
    description: string,
    orderId?: string
  ): void {
    const customer = this.getCustomer(restaurantId);
    customer.loyaltyPoints += points;
    customer.totalSpentMAD += points;
    customer.totalOrdersCount += 1;
    customer.lastPurchaseDate = new Date().toISOString();
    this.updateCustomer(customer);

    const ledger = this.getLoyaltyLedger(restaurantId);
    ledger.unshift({
      id: `led-${Date.now()}`,
      restaurantId,
      customerId: customer.id,
      timestamp: new Date().toISOString(),
      pointsDelta: points,
      type: 'earned',
      orderId,
      description
    });
    this.setItem(STORAGE_KEYS.LOYALTY, ledger);
  }

  public reverseLoyaltyPoints(
    restaurantId: string,
    points: number,
    description: string,
    orderId?: string
  ): void {
    const customer = this.getCustomer(restaurantId);
    customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints - points);
    this.updateCustomer(customer);

    const ledger = this.getLoyaltyLedger(restaurantId);
    ledger.unshift({
      id: `led-${Date.now()}`,
      restaurantId,
      customerId: customer.id,
      timestamp: new Date().toISOString(),
      pointsDelta: -points,
      type: 'refund_reversal',
      orderId,
      description
    });
    this.setItem(STORAGE_KEYS.LOYALTY, ledger);
  }

  public markOfferRedeemed(restaurantId: string, offerId: string): void {
    const customer = this.getCustomer(restaurantId);
    customer.availableOffers = customer.availableOffers.map((o) =>
      o.id === offerId ? { ...o, isRedeemed: true } : o
    );
    this.updateCustomer(customer);
  }

  public getLoyaltyLedger(restaurantId: string): LoyaltyLedgerEntry[] {
    const all = this.getItem<LoyaltyLedgerEntry[]>(STORAGE_KEYS.LOYALTY, SEED_LOYALTY_LEDGER);
    return all.filter((l) => l.restaurantId === restaurantId);
  }

  // --- STAFF CALL SERVICE (BELL & BILL) ---
  public getStaffCalls(restaurantId: string): StaffCallRequest[] {
    const all = this.getItem<StaffCallRequest[]>(STORAGE_KEYS.STAFF_CALLS, []);
    return all.filter((c) => c.restaurantId === restaurantId && !c.resolved);
  }

  public submitStaffCall(params: {
    restaurantId: string;
    tableNumber: number;
    type: 'call_waiter' | 'request_bill' | 'allergen_question';
    notes?: string;
  }): { success: boolean; message: string } {
    const all = this.getItem<StaffCallRequest[]>(STORAGE_KEYS.STAFF_CALLS, []);
    // Rate limit: check if a call from same table occurred within last 45 seconds
    const recent = all.find(
      (c) =>
        c.restaurantId === params.restaurantId &&
        c.tableNumber === params.tableNumber &&
        !c.resolved &&
        Date.now() - new Date(c.timestamp).getTime() < 45 * 1000
    );

    if (recent) {
      return {
        success: false,
        message: 'Un appel pour cette table a déjà été transmis au serveur il y a quelques instants.'
      };
    }

    const newCall: StaffCallRequest = {
      id: `call-${Date.now()}`,
      restaurantId: params.restaurantId,
      tableNumber: params.tableNumber,
      type: params.type,
      notes: params.notes,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    all.unshift(newCall);
    this.setItem(STORAGE_KEYS.STAFF_CALLS, all);
    broadcastSync('STAFF_CALLED', newCall);
    return {
      success: true,
      message: 'Demande transmise au serveur. Un membre de l\'équipe arrive à votre table.'
    };
  }

  public resolveStaffCall(callId: string): void {
    const all = this.getItem<StaffCallRequest[]>(STORAGE_KEYS.STAFF_CALLS, []);
    const updated = all.map((c) => (c.id === callId ? { ...c, resolved: true } : c));
    this.setItem(STORAGE_KEYS.STAFF_CALLS, updated);
    broadcastSync('STAFF_CALL_RESOLVED', callId);
  }
}

