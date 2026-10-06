export type Language = 'fr' | 'ar' | 'en';

export type OrderingMode = 'table' | 'pickup' | 'delivery';

export type OrderStatus =
  | 'submitted'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'partially_refunded'
  | 'refunded';

export type PaymentMethod =
  | 'cash'
  | 'card_terminal'
  | 'counter'
  | 'online_gateway';

export interface ModifierOption {
  id: string;
  name: { fr: string; ar: string; en: string };
  priceMAD: number;
}

export interface ModifierGroup {
  id: string;
  name: { fr: string; ar: string; en: string };
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export interface Dish {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: { fr: string; ar: string; en: string };
  description: { fr: string; ar: string; en: string };
  priceMAD: number;
  image: string;
  isAvailable: boolean;
  isFeatured?: boolean;
  ingredients: { fr: string[]; ar: string[]; en: string[] };
  verifiedAllergens: string[]; // e.g. 'Gluten', 'Lactose', 'Oeufs', 'Moutarde'
  dietaryLabels: string[]; // e.g. 'Halal', 'Signature', 'Végétarien'
  modifierGroups: ModifierGroup[];
  preparationNotes?: string;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: { fr: string; ar: string; en: string };
  slug: string;
  sortOrder: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  feeMAD: number;
  minSpendMAD: number;
  active: boolean;
}

export interface RestaurantTable {
  tableNumber: number;
  label: string;
  sessionToken: string;
  capacity: number;
  isOccupied?: boolean;
}

export interface ReturnCampaignRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerDaysInactive: number;
  minPastOrders: number;
  rewardType: 'discount_percent' | 'fixed_voucher' | 'free_item';
  discountValueMAD?: number;
  discountPercent?: number;
  freeItemDishId?: string;
  freeItemDishName?: string;
  minSpendMAD: number;
  maxDiscountMAD?: number;
  expiryDays: number;
  frequencyCapDays: number;
  cooldownPeriodDays: number;
  messageTemplate: { fr: string; ar: string; en: string };
  stats: {
    eligibleCount: number;
    sentCount: number;
    redeemedCount: number;
    incrementalSalesMAD: number;
  };
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  tagline: { fr: string; ar: string; en: string };
  city: string;
  address: string;
  phone: string;
  currency: 'MAD';
  timezone: 'Africa/Casablanca';
  accentColor: string;
  coverImage: string;
  openingHours: string;
  isOpen: boolean;
  orderingModes: {
    table: boolean;
    pickup: boolean;
    delivery: boolean;
  };
  deliverySettings: {
    minOrderMAD: number;
    deliveryFeeMAD: number;
    estimatedRange: string;
    zones: DeliveryZone[];
    isPaused: boolean;
  };
  tableCount: number;
  tables: RestaurantTable[];
  prepTimeEstimateMinutes: number;
  taxRatePercent: number; // e.g. 10%
  loyaltyConfig: {
    pointsPerMAD: number;
    pointsToRedeem: number;
    rewardValueMAD: number;
    welcomePoints: number;
  };
  returnCampaigns: ReturnCampaignRule[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceMAD: number;
}

export interface OrderItem {
  dishId: string;
  dishName: string;
  image: string;
  unitPriceMAD: number;
  quantity: number;
  selectedModifiers: SelectedModifier[];
  itemNotes?: string;
  lineTotalMAD: number;
}

export interface StaffCallRequest {
  id: string;
  restaurantId: string;
  tableNumber: number;
  type: 'call_waiter' | 'request_bill' | 'allergen_question';
  notes?: string;
  timestamp: string;
  resolved: boolean;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. BB-1042
  secureRef: string; // unguessable token e.g. ord_7f9a2e8c
  restaurantId: string;
  mode: OrderingMode;
  tableNumber?: number;
  tableSessionToken?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryZoneId?: string;
  customerNotes?: string;
  items: OrderItem[];
  subtotalMAD: number;
  discountMAD: number;
  deliveryFeeMAD: number;
  taxRatePercent: number;
  taxAmountMAD: number;
  totalMAD: number;
  appliedOfferId?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  acceptedAt?: string;
  estimatedReadyAt?: string;
  completedAt?: string;
  staffAttribution?: string;
  rejectionReason?: string;
  refundReason?: string;
  loyaltyPointsEarned?: number;
}

export interface CustomerProfile {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  favoriteDishIds: string[];
  totalOrdersCount: number;
  totalSpentMAD: number;
  lastPurchaseDate?: string;
  marketingConsent: boolean;
  marketingConsentTimestamp?: string;
  availableOffers: {
    id: string;
    campaignId: string;
    title: { fr: string; ar: string; en: string };
    code: string;
    description: { fr: string; ar: string; en: string };
    minSpendMAD: number;
    discountMAD?: number;
    discountPercent?: number;
    freeItemName?: string;
    expiresAt: string;
    isRedeemed: boolean;
  }[];
}

export interface LoyaltyLedgerEntry {
  id: string;
  restaurantId: string;
  customerId: string;
  timestamp: string;
  pointsDelta: number;
  type: 'earned' | 'redeemed' | 'welcome' | 'refund_reversal';
  orderId?: string;
  description: string;
}
