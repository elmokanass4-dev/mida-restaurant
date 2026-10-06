import React, { useState, useEffect } from 'react';
import {
  Restaurant,
  Language,
  Dish,
  Category,
  OrderItem,
  Order,
  CustomerProfile
} from '../../types';
import { getTranslation } from '../../i18n/translations';
import { storage, SYNC_EVENT_NAME } from '../../services/storageAdapter';
import { CustomerHome } from './CustomerHome';
import { DishDetailModal } from './DishDetailModal';
import { CartDrawer } from './CartDrawer';
import { CheckoutModal } from './CheckoutModal';
import { OrderTracking } from './OrderTracking';
import { RewardsWallet } from './RewardsWallet';
import { CustomerAccount } from './CustomerAccount';
import {
  Home,
  UtensilsCrossed,
  Receipt,
  Gift,
  User,
  ShoppingBag,
  Flame,
  Globe,
  Smartphone,
  Maximize2
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeTableNumber?: number;
  initialOrderRef?: string;
}

export const CustomerApp: React.FC<Props> = ({
  restaurant,
  language,
  onLanguageChange,
  activeTableNumber,
  initialOrderRef
}) => {
  const t = getTranslation(language);

  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'orders' | 'rewards' | 'profile'>('home');
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(false);

  // Cart & Order State
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedDishForModal, setSelectedDishForModal] = useState<Dish | null>(null);
  const [activeOrderRef, setActiveOrderRef] = useState<string | null>(initialOrderRef || null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | undefined>(undefined);

  // Customer & Store Data
  const [customer, setCustomer] = useState<CustomerProfile>(() => storage.getCustomer(restaurant.id));
  const [dishes, setDishes] = useState<Dish[]>(() => storage.getDishes(restaurant.id));
  const [categories, setCategories] = useState<Category[]>(() => storage.getCategories(restaurant.id));
  const [orders, setOrders] = useState<Order[]>(() => storage.getOrders(restaurant.id));

  // Sync listener
  useEffect(() => {
    const handleSync = () => {
      setDishes(storage.getDishes(restaurant.id));
      setCategories(storage.getCategories(restaurant.id));
      setOrders(storage.getOrders(restaurant.id));
      setCustomer(storage.getCustomer(restaurant.id));
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [restaurant.id]);

  // Cart operations
  const handleAddToCart = (item: OrderItem) => {
    setCartItems((prev) => {
      // Find identical dish & modifiers
      const existingIdx = prev.findIndex(
        (i) =>
          i.dishId === item.dishId &&
          JSON.stringify(i.selectedModifiers) === JSON.stringify(item.selectedModifiers)
      );
      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx].quantity += item.quantity;
        copy[existingIdx].lineTotalMAD = copy[existingIdx].quantity * copy[existingIdx].unitPriceMAD;
        return copy;
      }
      return [...prev, item];
    });
  };

  const handleQuickAdd = (dish: Dish) => {
    if (dish.modifierGroups.some(g => g.required || g.minSelections > 0)) { setSelectedDishForModal(dish); return; }
    const quickItem: OrderItem = {
      dishId: dish.id,
      dishName: dish.name[language] || dish.name.fr,
      image: dish.image,
      unitPriceMAD: dish.priceMAD,
      quantity: 1,
      selectedModifiers: [],
      lineTotalMAD: dish.priceMAD
    };
    handleAddToCart(quickItem);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setCartItems((prev) => {
      const copy = [...prev];
      copy[index].quantity = newQty;
      copy[index].lineTotalMAD = newQty * copy[index].unitPriceMAD;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOrderSuccess = (newOrder: Order) => {
    setCartItems([]);
    setIsCheckoutOpen(false);
    setActiveOrderRef(newOrder.secureRef);
    setActiveTab('orders');
  };

  const handleReorder = (order: Order) => {
    // Reverify each item against current availability and price
    const verifiedItems: OrderItem[] = [];
    for (const item of order.items) {
      const live = dishes.find((d) => d.id === item.dishId);
      if (live && live.isAvailable) {
        verifiedItems.push({
          ...item,
          unitPriceMAD: live.priceMAD,
          lineTotalMAD: live.priceMAD * item.quantity
        });
      }
    }
    if (verifiedItems.length > 0) {
      setCartItems(verifiedItems);
      setIsCartOpen(true);
    }
  };

  const totalCartCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalCartMAD = cartItems.reduce((s, i) => s + i.lineTotalMAD, 0);

  // Active uncompleted order for badge count
  const activeUncompletedOrders = orders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'rejected'
  );

  return (
    <div className={`min-h-screen bg-[#080305] text-neutral-100 flex flex-col items-center justify-start ${deviceFrameMode ? 'p-0 sm:py-8' : ''}`}>
      {/* Top Floating Utility Bar (Language switch & Device Mockup toggle) */}
      <div className="w-full max-w-md px-4 py-2 flex items-center justify-between text-xs text-neutral-400 bg-neutral-950/70 border-b border-neutral-900 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-amber-400" />
          <div className="flex items-center gap-1.5 font-bold">
            {(['fr', 'ar', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => onLanguageChange(l)}
                className={`px-1.5 py-0.5 rounded uppercase tracking-wider text-[11px] transition-colors ${
                  language === l
                    ? 'bg-amber-600 text-black font-extrabold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-[11px] font-medium"
            title="Basculer vue smartphone"
          >
            {deviceFrameMode ? <Maximize2 size={13} /> : <Smartphone size={13} />}
            <span>{deviceFrameMode ? 'Plein écran' : 'Cadre Mobile'}</span>
          </button>
        </div>
      </div>

      {/* Main Container / Smartphone Shell */}
      <div
        className={`w-full max-w-md bg-[#0d0609] text-neutral-100 flex flex-col min-h-screen relative overflow-hidden transition-all ${
          deviceFrameMode
            ? 'sm:rounded-[48px] sm:border-[8px] sm:border-neutral-800 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] sm:my-4 sm:min-h-[850px] sm:max-h-[880px]'
            : ''
        }`}
      >
        {/* Mobile Status Bar Simulation (Matches reference picture 10:09 AM, Notch, 89% battery) */}
        <div className="pt-2 px-6 pb-1 flex items-center justify-between text-xs text-white/90 select-none z-30">
          <span className="font-semibold text-[13px] tracking-tight">10:09 AM</span>
          {/* Dynamic Island / Notch */}
          <div className="w-24 h-4 bg-black rounded-full mx-auto hidden sm:block border border-neutral-800" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <span>5G</span>
            <span className="font-bold">89%</span>
          </div>
        </div>

        {/* Top App Header (Matching Apex Kitchen / Braise Burger logo & Shopping Bag) */}
        <header className="px-5 py-3 flex items-center justify-between sticky top-0 z-20 bg-[#0d0609]/90 backdrop-blur-md border-b border-amber-950/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center text-black font-extrabold shadow-sm">
              <Flame size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-sans leading-none">
                {restaurant.name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 leading-none mt-0.5">
                Meknès Gourmet
              </span>
            </div>
          </div>

          {/* Shopping bag trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            aria-label="Ouvrir le panier"
            className="w-9 h-9 rounded-full bg-neutral-900/80 border border-neutral-800 flex items-center justify-center text-white relative hover:border-amber-500/50 transition-colors"
          >
            <ShoppingBag size={18} className="text-amber-300" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black font-black text-[10px] flex items-center justify-center shadow">
                {totalCartCount}
              </span>
            )}
          </button>
        </header>

        {/* Scrollable Main Area with bottom padding for fixed navigation bar */}
        <div className="flex-1 overflow-y-auto pb-28">
          {activeTab === 'home' && (
            <CustomerHome
              restaurant={restaurant}
              categories={categories}
              dishes={dishes}
              language={language}
              activeTableNumber={activeTableNumber}
              onOpenDish={(dish) => setSelectedDishForModal(dish)}
              onQuickAdd={handleQuickAdd}
              onViewCategory={(catId) => {
                setActiveTab('menu');
              }}
            />
          )}

          {activeTab === 'menu' && (
            <CustomerHome
              restaurant={restaurant}
              categories={categories}
              dishes={dishes}
              language={language}
              activeTableNumber={activeTableNumber}
              onOpenDish={(dish) => setSelectedDishForModal(dish)}
              onQuickAdd={handleQuickAdd}
              onViewCategory={() => {}}
            />
          )}

          {activeTab === 'orders' && (
            <div className="p-4">
              {activeOrderRef ? (
                <OrderTracking
                  orderRef={activeOrderRef}
                  restaurant={restaurant}
                  language={language}
                  onBackToMenu={() => setActiveTab('home')}
                  onReorder={handleReorder}
                />
              ) : orders.length > 0 ? (
                <OrderTracking
                  orderRef={orders[0].secureRef}
                  restaurant={restaurant}
                  language={language}
                  onBackToMenu={() => setActiveTab('home')}
                  onReorder={handleReorder}
                />
              ) : (
                <div className="p-8 text-center text-neutral-400">
                  <Receipt size={36} className="text-amber-400 mx-auto mb-3" />
                  <h3 className="font-bold text-white text-base">Aucune commande active</h3>
                  <p className="text-xs text-neutral-500 mt-1 mb-4">
                    Vos commandes en direct et passées s'afficheront ici.
                  </p>
                  <button
                    onClick={() => setActiveTab('home')}
                    className="px-4 py-2 bg-amber-600 rounded-xl text-black font-bold text-xs"
                  >
                    Découvrir le menu
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rewards' && (
            <RewardsWallet
              customer={customer}
              restaurant={restaurant}
              language={language}
              onApplyOfferInCart={(code) => {
                setAppliedPromoCode(code);
                setIsCartOpen(true);
              }}
            />
          )}

          {activeTab === 'profile' && (
            <CustomerAccount
              customer={customer}
              restaurant={restaurant}
              language={language}
              dishes={dishes}
              onOpenDish={(dish) => setSelectedDishForModal(dish)}
              onViewOrder={(ref) => {
                setActiveOrderRef(ref);
                setActiveTab('orders');
              }}
              onReorder={handleReorder}
            />
          )}
        </div>

        {/* Floating Cart Button (when items added and drawer closed) */}
        {totalCartCount > 0 && !isCartOpen && (
          <div className="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 z-30 pointer-events-none">
            <button
              onClick={() => setIsCartOpen(true)}
              className="pointer-events-auto w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-2xl shadow-amber-950/70 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-black text-amber-400 text-[11px] font-black flex items-center justify-center">
                  {totalCartCount}
                </span>
                <span>Voir mon panier</span>
              </div>
              <span className="tabular-nums font-extrabold text-sm">{totalCartMAD} MAD</span>
            </button>
          </div>
        )}

        {/* Fixed Bottom Navigation Bar (Permanently stuck on screen) */}
        <nav
          className={`${
            deviceFrameMode
              ? 'absolute bottom-0 left-0 right-0'
              : 'fixed bottom-0 left-0 right-0 max-w-md mx-auto'
          } z-40 bg-[#12070c]/98 backdrop-blur-xl border-t border-amber-950/80 shadow-[0_-8px_30px_rgba(0,0,0,0.85)] grid grid-cols-5 h-16 items-center px-1 pb-[env(safe-area-inset-bottom,0px)]`}
        >
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'home' ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Home size={19} className={activeTab === 'home' ? 'stroke-[2.5]' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tight mt-1">
              {t.navHome}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'menu' ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <UtensilsCrossed size={19} className={activeTab === 'menu' ? 'stroke-[2.5]' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tight mt-1">
              {t.navMenu}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center justify-center h-full relative transition-colors ${
              activeTab === 'orders' ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Receipt size={19} className={activeTab === 'orders' ? 'stroke-[2.5]' : ''} />
            {activeUncompletedOrders.length > 0 && (
              <span className="absolute top-2 right-4 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">
                {activeUncompletedOrders.length}
              </span>
            )}
            <span className="text-[10px] font-bold uppercase tracking-tight mt-1">
              {t.navOrders}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'rewards' ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Gift size={19} className={activeTab === 'rewards' ? 'stroke-[2.5]' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tight mt-1">
              {t.navRewards}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center h-full transition-colors ${
              activeTab === 'profile' ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <User size={19} className={activeTab === 'profile' ? 'stroke-[2.5]' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-tight mt-1">
              {t.navProfile}
            </span>
          </button>
        </nav>
      </div>

      {/* Dish Detail Modal */}
      {selectedDishForModal && <DishDetailModal
        key={selectedDishForModal.id}
        dish={selectedDishForModal}
        language={language}
        onClose={() => setSelectedDishForModal(null)}
        onAddToCart={handleAddToCart}
      />}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        restaurant={restaurant}
        language={language}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={(code) => {
          setAppliedPromoCode(code);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      {isCheckoutOpen && <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        restaurant={restaurant}
        language={language}
        appliedPromoCode={appliedPromoCode}
        activeTableNumber={activeTableNumber}
        onOrderSuccess={handleOrderSuccess}
      />}
    </div>
  );
};
