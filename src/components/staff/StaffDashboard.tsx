import React, { useState, useEffect } from 'react';
import {
  Restaurant,
  Order,
  Dish,
  Category,
  OrderStatus,
  PaymentStatus,
  StaffCallRequest,
  ReturnCampaignRule
} from '../../types';
import { storage, SYNC_EVENT_NAME } from '../../services/storageAdapter';
import { KitchenTicketModal } from './KitchenTicketModal';
import {
  Bell,
  Volume2,
  VolumeX,
  ChefHat,
  Clock,
  Printer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Utensils,
  Bike,
  ShoppingBag,
  QrCode,
  Tag,
  TrendingUp,
  Settings,
  Flame,
  Search,
  Filter,
  Eye,
  Check
} from 'lucide-react';

interface Props {
  restaurant: Restaurant;
  onSwitchToCustomerView: () => void;
}

export const StaffDashboard: React.FC<Props> = ({ restaurant, onSwitchToCustomerView }) => {
  const [activeTab, setActiveTab] = useState<
    'orders' | 'menu' | 'tables' | 'campaigns' | 'analytics' | 'settings'
  >('orders');
  const [ordersFilter, setOrdersFilter] = useState<
    'all' | 'submitted' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  >('all');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);

  const role = storage.user?.role;
  const canPay = ['owner','manager','cashier','waiter','platform_admin'].includes(role || '');
  const canManage = ['owner','manager','platform_admin'].includes(role || '');
  const canEditMenu = canManage || role === 'kitchen';
  const run = (action: Promise<unknown>) => action.catch(e => storage.report(e));

  // Live state
  const [orders, setOrders] = useState<Order[]>(() => storage.getOrders(restaurant.id));
  const [dishes, setDishes] = useState<Dish[]>(() => storage.getDishes(restaurant.id));
  const [categories, setCategories] = useState<Category[]>(() =>
    storage.getCategories(restaurant.id)
  );
  const [staffCalls, setStaffCalls] = useState<StaffCallRequest[]>(() =>
    storage.getStaffCalls(restaurant.id)
  );
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Cuisine en surcharge');
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('Annulation client avant préparation');

  // Real-time synchronization
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent?.detail;

      setOrders(storage.getOrders(restaurant.id));
      setDishes(storage.getDishes(restaurant.id));
      setStaffCalls(storage.getStaffCalls(restaurant.id));

      if (detail?.type === 'ORDER_SUBMITTED' && soundEnabled) {
        playBeep();
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [restaurant.id, soundEnabled]);

  // Web Audio synthesizer for alert beep (zero external audio files needed)
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // AudioContext unavailable or restricted
    }
  };

  // Order status actions
  const handleAcceptOrder = (order: Order, minutes = 20) => {
    run(storage.updateOrderStatus({
      orderId: order.id,
      status: 'accepted',
      staffAttribution: 'Staff Cuisine',
      prepMinutesAdded: minutes
    }));
  };

  const handleStartPrep = (order: Order) => {
    run(storage.updateOrderStatus({
      orderId: order.id,
      status: 'preparing',
      staffAttribution: 'Chef Grille'
    }));
  };

  const handleMarkReady = (order: Order) => {
    const nextStatus = order.mode === 'delivery' ? 'out_for_delivery' : 'ready';
    run(storage.updateOrderStatus({
      orderId: order.id,
      status: nextStatus,
      staffAttribution: 'Chef Expédition'
    }));
  };

  const handleCompleteOrder = (order: Order) => {
    run(storage.updateOrderStatus({
      orderId: order.id,
      status: 'completed',
      staffAttribution: 'Caisse Service'
    }));
  };

  const handleConfirmReject = () => {
    if (!rejectingOrder) return;
    run(storage.updateOrderStatus({
      orderId: rejectingOrder.id,
      status: 'rejected',
      staffAttribution: 'Manager Salle',
      rejectionReason
    }));
    setRejectingOrder(null);
  };

  const handleConfirmRefund = () => {
    if (!refundingOrder) return;
    run(storage.updatePaymentStatus({
      orderId: refundingOrder.id,
      paymentStatus: 'refunded',
      staffAttribution: 'Manager Caisse',
      refundReason
    }));
    setRefundingOrder(null);
  };

  const handleMarkPaid = (order: Order) => {
    run(storage.updatePaymentStatus({
      orderId: order.id,
      paymentStatus: 'paid',
      staffAttribution: 'Caisse'
    }));
  };

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (ordersFilter === 'all') return true;
    if (ordersFilter === 'submitted') return o.status === 'submitted';
    if (ordersFilter === 'preparing') return o.status === 'accepted' || o.status === 'preparing';
    if (ordersFilter === 'ready') return o.status === 'ready' || o.status === 'out_for_delivery';
    if (ordersFilter === 'completed') return o.status === 'completed';
    if (ordersFilter === 'cancelled') return o.status === 'rejected' || o.status === 'cancelled';
    return true;
  });

  const newOrdersCount = orders.filter((o) => o.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-[#0d070a] text-neutral-100 flex flex-col font-sans">
      {canManage && <div className="p-3 flex items-center justify-between bg-neutral-900 text-sm"><span>Prise de commandes : {restaurant.isOpen ? 'ouverte' : 'fermée'}</span><button className="text-amber-300 underline" onClick={() => run(storage.setService(restaurant.id, !restaurant.isOpen))}>{restaurant.isOpen ? 'Fermer les commandes' : 'Ouvrir les commandes'}</button></div>}{/* Top Operational Bar */}
      <header className="bg-[#140a0f] border-b border-amber-950/60 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center text-black font-extrabold shadow-md">
            <Flame size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-white font-sans tracking-tight">
                {restaurant.name}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {restaurant.isOpen ? 'Service ouvert' : 'Service fermé'} · {restaurant.city}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">Poste Caisse & Écran Cuisine</p>
          </div>
        </div>

        {/* Operational quick buttons */}
        <div className="flex items-center gap-2">
          {/* Sound alert toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playBeep();
            }}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Alerte sonore de nouvelle commande"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline">{soundEnabled ? 'Son activé' : 'Son coupé'}</span>
          </button>

          {/* Customer app preview switcher */}
          <button
            onClick={onSwitchToCustomerView}
            className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wide transition-all shadow-md"
          >
            Vue Client 📱
          </button>
        </div>
      </header>

      {/* Table Calls Alert Bar (if waiter called) */}
      {staffCalls.length > 0 && (
        <div className="bg-amber-600/90 text-black px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 font-semibold text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 truncate">
            <Bell size={16} className="animate-bounce shrink-0" />
            <span>
              APPEL EN SALLE : Table #{staffCalls[0].tableNumber} (
              {staffCalls[0].type === 'call_waiter'
                ? 'Appel serveur'
                : staffCalls[0].type === 'request_bill'
                ? 'Addition demandée'
                : 'Question allergène'}
              )
            </span>
          </div>
          <button
            hidden={!canPay} onClick={() => run(storage.resolveStaffCall(staffCalls[0].id))}
            className="bg-black text-amber-300 px-3 py-1 rounded-lg text-xs font-bold hover:bg-neutral-900 whitespace-nowrap"
          >
            Marquer pris en charge ✓
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-neutral-800 bg-[#12080d] px-4 sm:px-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-black font-bold shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800'
            }`}
          >
            <ChefHat size={15} />
            <span>Commandes en direct</span>
            {newOrdersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center justify-center animate-pulse">
                {newOrdersCount}
              </span>
            )}
          </button>

          <button
            hidden={!canEditMenu} onClick={() => setActiveTab('menu')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'menu'
                ? 'bg-amber-600 text-black font-bold shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800'
            }`}
          >
            <Utensils size={15} />
            <span>Gestion de Carte & Ruptures</span>
          </button>

          <button
            hidden={!canPay} onClick={() => setActiveTab('tables')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'tables'
                ? 'bg-amber-600 text-black font-bold shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800'
            }`}
          >
            <QrCode size={15} />
            <span>Tables & Chevalets QR</span>
          </button>

          <button
            hidden disabled title="Campagnes non activées" onClick={() => setActiveTab('campaigns')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'campaigns'
                ? 'bg-amber-600 text-black font-bold shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800'
            }`}
          >
            <Tag size={15} />
            <span>Campagnes de Retour</span>
          </button>

          <button
            hidden={!canManage} onClick={() => setActiveTab('analytics')}
            className={`py-2 px-3.5 rounded-xl flex items-center gap-2 transition-all ${
              activeTab === 'analytics'
                ? 'bg-amber-600 text-black font-bold shadow-md'
                : 'text-neutral-400 hover:text-white bg-neutral-900/60 border border-neutral-800'
            }`}
          >
            <TrendingUp size={15} />
            <span>Statistiques & Ventes</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {/* ================= TAB 1: ORDERS KANBAN ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'Toutes les commandes' },
                { id: 'submitted', label: `Nouvelles (${newOrdersCount})`, alert: newOrdersCount > 0 },
                { id: 'preparing', label: 'En préparation' },
                { id: 'ready', label: 'Prêtes / En cours de livraison' },
                { id: 'completed', label: 'Terminées' },
                { id: 'cancelled', label: 'Annulées / Refusées' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOrdersFilter(f.id as typeof ordersFilter)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                    ordersFilter === f.id
                      ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Orders Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full py-12 text-center text-neutral-500 text-xs">
                  Aucune commande dans cette catégorie.
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const isNew = ord.status === 'submitted';
                  const isPreparing = ord.status === 'preparing' || ord.status === 'accepted';
                  const isReady = ord.status === 'ready' || ord.status === 'out_for_delivery';
                  const isDone = ord.status === 'completed';
                  const isCancelled = ord.status === 'cancelled' || ord.status === 'rejected';

                  return (
                    <div
                      key={ord.id}
                      className={`rounded-3xl border flex flex-col justify-between p-4 shadow-xl transition-all ${
                        isNew
                          ? 'bg-[#220d16] border-amber-500 shadow-amber-950/40 ring-1 ring-amber-500/30'
                          : isPreparing
                          ? 'bg-[#180b12] border-amber-950/80'
                          : isReady
                          ? 'bg-[#121612] border-emerald-950/80'
                          : 'bg-[#12070c] border-neutral-900 opacity-80'
                      }`}
                    >
                      {/* Top Header Card */}
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono text-sm font-black text-white">
                              {ord.orderNumber}
                            </span>
                            <span className="text-[10px] text-neutral-400 ml-2">
                              {new Date(ord.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              ord.mode === 'table'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : ord.mode === 'pickup'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {ord.mode === 'table'
                              ? `Table #${ord.tableNumber}`
                              : ord.mode === 'pickup'
                              ? 'À emporter'
                              : 'Livraison'}
                          </span>
                        </div>

                        {/* Customer contact */}
                        <div className="mt-2 text-xs text-neutral-300">
                          <span className="font-semibold">{ord.customerName}</span> ·{' '}
                          <span className="text-neutral-400">{ord.customerPhone}</span>
                          {ord.deliveryAddress && (
                            <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                              📍 {ord.deliveryAddress}
                            </p>
                          )}
                          {ord.customerNotes && (
                            <p className="text-[11px] text-amber-300/90 font-medium bg-amber-950/30 p-1.5 rounded-lg mt-1.5 border border-amber-900/40">
                              Note client : « {ord.customerNotes} »
                            </p>
                          )}
                        </div>

                        {/* Items list */}
                        <div className="my-3 py-2 border-y border-neutral-800/80 divide-y divide-neutral-900 text-xs">
                          {ord.items.map((item, iIdx) => (
                            <div key={iIdx} className="py-1">
                              <div className="flex justify-between font-semibold text-white">
                                <span>
                                  {item.quantity}x {item.dishName}
                                </span>
                                <span className="tabular-nums text-neutral-400">
                                  {item.lineTotalMAD} MAD
                                </span>
                              </div>
                              {item.selectedModifiers.length > 0 && (
                                <p className="text-[10px] text-neutral-400 pl-2">
                                  {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Totals & Payment Status */}
                        <div className="flex items-center justify-between text-xs mb-3">
                          <span className="text-neutral-400">
                            Total :{' '}
                            <strong className="text-amber-400 font-bold text-sm tabular-nums">
                              {ord.totalMAD} MAD
                            </strong>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : ord.paymentStatus === 'refunded'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                              }`}
                            >
                              {ord.paymentStatus.toUpperCase()}
                            </span>

                            {ord.paymentStatus !== 'paid' && ord.paymentStatus !== 'refunded' && (
                              <button
                                hidden={!canPay} onClick={() => handleMarkPaid(ord)}
                                title="Encaisser"
                                className="text-[10px] px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded"
                              >
                                Encaisser
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                        {isNew && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptOrder(ord, 20)}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs uppercase transition-all shadow-md"
                            >
                              Accepter (+20 min)
                            </button>
                            <button
                              hidden={role === 'kitchen'} onClick={() => setRejectingOrder(ord)}
                              className="py-2 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-semibold"
                            >
                              Refuser
                            </button>
                          </div>
                        )}

                        {ord.status === 'accepted' && (
                          <button
                            onClick={() => handleStartPrep(ord)}
                            className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-extrabold text-xs uppercase"
                          >
                            Lancer en cuisson 🔥
                          </button>
                        )}

                        {ord.status === 'preparing' && (
                          <button
                            onClick={() => handleMarkReady(ord)}
                            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase"
                          >
                            {ord.mode === 'delivery' ? 'Prêt pour le livreur 🛵' : 'Prêt à servir 🍽️'}
                          </button>
                        )}

                        {isReady && (
                          <button
                            hidden={!canPay} onClick={() => handleCompleteOrder(ord)}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs uppercase"
                          >
                            Marquer comme terminée ✓
                          </button>
                        )}

                        {/* Print ticket & audit refund buttons */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <button
                            onClick={() => setTicketOrder(ord)}
                            className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
                          >
                            <Printer size={13} />
                            <span>Ticket 80mm</span>
                          </button>

                          {!isCancelled && (
                            <button
                              hidden={!canManage || ord.paymentStatus !== 'paid'} onClick={() => setRefundingOrder(ord)}
                              className="text-neutral-500 hover:text-red-400 text-[11px]"
                            >
                              Enregistrer un remboursement
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: MENU & SOLD-OUT MANAGEMENT ================= */}
        {activeTab === 'menu' && (
          <div className="space-y-5 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-sans">
                  Gestion de la carte & Ruptures instantanées
                </h3>
                <p className="text-xs text-neutral-400">
                  Un plat marqué épuisé est immédiatement bloqué en commande client.
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-800 bg-[#140a0f] border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              {dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-neutral-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={dish.image}
                      alt={dish.name.fr}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover shrink-0 bg-neutral-950 border border-neutral-800"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                          {dish.name.fr}
                        </h4>
                        {!dish.isAvailable && (
                          <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold">
                            Épuisé
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-amber-400 tabular-nums">
                        {dish.priceMAD} MAD
                      </span>
                    </div>
                  </div>

                  {/* Immediate toggle switch */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-neutral-400 hidden sm:inline">
                      {dish.isAvailable ? 'Disponible' : 'Rupture'}
                    </span>
                    <button
                      onClick={() => {
                        run(storage.toggleDishAvailability(dish.id));
                        setDishes(storage.getDishes(restaurant.id));
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                        dish.isAvailable ? 'bg-emerald-600' : 'bg-red-800'
                      }`}
                      aria-label="Disponibilité"
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          dish.isAvailable ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TABLES & QR CHEVALETS ================= */}
        {activeTab === 'tables' && (
          <div className="space-y-5 max-w-4xl">
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Chevalets de table & QR Codes sécurisés
              </h3>
              <p className="text-xs text-neutral-400">Imprimez le lien de chaque table en QR. Ce lien est une clé d’accès : partagez-le uniquement avec les clients à cette table.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {restaurant.tables.map((tbl) => (
                <div
                  key={tbl.tableNumber}
                  className="rounded-3xl bg-[#150a10] border border-amber-950/70 p-4 flex flex-col items-center text-center space-y-3 shadow-xl"
                >
                  <div className="w-full flex justify-between text-xs text-neutral-400">
                    <span className="font-bold text-white">Table #{tbl.tableNumber}</span>
                    <span>{tbl.capacity} places</span>
                  </div>

                  {/* Clean QR Graphic */}
                  <div className="p-3 rounded-2xl bg-white text-black shadow-md">
                    <svg className="w-24 h-24" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="5" y="5" width="25" height="25" />
                      <rect x="10" y="10" width="15" height="15" fill="white" />
                      <rect x="13" y="13" width="9" height="9" />
                      <rect x="70" y="5" width="25" height="25" />
                      <rect x="75" y="10" width="15" height="15" fill="white" />
                      <rect x="5" y="70" width="25" height="25" />
                      <rect x="10" y="75" width="15" height="15" fill="white" />
                      <rect x="40" y="40" width="20" height="20" />
                      <rect x="70" y="70" width="10" height="10" />
                    </svg>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-white">{tbl.label}</h4>
                    <p className="text-[10px] text-amber-400 font-mono mt-0.5">
                      Session : {tbl.sessionToken}
                    </p>
                  </div>

                  <a
                    href={`${import.meta.env.BASE_URL}?surface=customer&restaurant=${encodeURIComponent(restaurant.id)}&table=${tbl.tableNumber}&token=${encodeURIComponent(tbl.sessionToken)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200"
                  >
                    Tester scan QR ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: RETENTION CAMPAIGNS ================= */}
        {activeTab === 'campaigns' && (
          <div className="space-y-5 max-w-4xl">
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Moteur de règles de réactivation clients
              </h3>
              <p className="text-xs text-neutral-400">
                Relance automatique des clients inactifs avec plafonnement des remises et
                période de refroidissement (cooldown).
              </p>
            </div>

            <div className="space-y-4">
              {restaurant.returnCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="rounded-3xl bg-[#160b11] border border-amber-950/80 p-5 space-y-4 shadow-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-900/60">
                        Règle active
                      </span>
                      <h4 className="text-base font-bold text-white mt-1">{camp.name}</h4>
                    </div>

                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-800">
                      +{camp.stats.incrementalSalesMAD} MAD générés
                    </span>
                  </div>

                  {/* Trigger parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-black/40 p-3.5 rounded-2xl border border-neutral-800/80">
                    <div>
                      <span className="text-neutral-500 block">Déclencheur</span>
                      <span className="font-bold text-white">
                        {camp.triggerDaysInactive} jours inactif
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Avantage</span>
                      <span className="font-bold text-amber-400">
                        {camp.discountPercent ? `-${camp.discountPercent}%` : camp.freeItemDishName}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Min. Commande</span>
                      <span className="font-bold text-white">{camp.minSpendMAD} MAD</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Plafond remise</span>
                      <span className="font-bold text-white">{camp.maxDiscountMAD || 30} MAD</span>
                    </div>
                  </div>

                  {/* Template message */}
                  <div className="p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800 text-xs">
                    <span className="font-semibold text-neutral-400 block mb-1">
                      Modèle de message préparé :
                    </span>
                    <p className="text-neutral-200 italic">« {camp.messageTemplate.fr} »</p>
                  </div>

                  {/* Campaign stats */}
                  <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800">
                    <span>
                      Éligibles : <strong className="text-white">{camp.stats.eligibleCount}</strong>
                    </span>
                    <span>
                      Envoyés : <strong className="text-white">{camp.stats.sentCount}</strong>
                    </span>
                    <span>
                      Rachetés : <strong className="text-emerald-400">{camp.stats.redeemedCount}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-5 max-w-4xl">
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Rapport des ventes & Métriques de service
              </h3>
              <p className="text-xs text-neutral-400">
                Statistiques calculées à partir des commandes enregistrées. Dans la démonstration, ces données sont fictives.
              </p>
            </div>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-3xl bg-[#170c12] border border-amber-950/60">
                <span className="text-[11px] text-neutral-400">Chiffre d'affaires (MAD)</span>
                <p className="text-2xl font-black text-amber-400 tabular-nums mt-1 font-sans">
                  {orders
                    .filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled' && o.status !== 'rejected')
                    .reduce((sum, o) => sum + o.totalMAD, 0)}{' '}
                  MAD
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-[#170c12] border border-amber-950/60">
                <span className="text-[11px] text-neutral-400">Commandes servies</span>
                <p className="text-2xl font-black text-white tabular-nums mt-1 font-sans">
                  {orders.filter((o) => o.status === 'completed').length}
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-[#170c12] border border-amber-950/60">
                <span className="text-[11px] text-neutral-400">Panier moyen</span>
                <p className="text-2xl font-black text-white tabular-nums mt-1 font-sans">
                  {(() => {const paid=orders.filter(o=>o.paymentStatus==='paid'&&o.status!=='cancelled'&&o.status!=='rejected');return paid.length?(paid.reduce((sum,o)=>sum+o.totalMAD,0)/paid.length).toFixed(2):'0';})()} MAD
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-[#170c12] border border-amber-950/60">
                <span className="text-[11px] text-neutral-400">Remises offertes</span>
                <p className="text-2xl font-black text-emerald-400 tabular-nums mt-1 font-sans">
                  {orders.reduce((sum, o) => sum + o.discountMAD, 0)} MAD
                </p>
              </div>
            </div>

            {/* Orders by mode breakdown */}
            <div className="rounded-3xl bg-[#150a0f] border border-neutral-800 p-5 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-400">
                Répartition des commandes par mode
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="font-bold text-amber-400 text-lg block">
                    {orders.filter((o) => o.mode === 'table').length}
                  </span>
                  <span className="text-neutral-400">Sur Place (Table)</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="font-bold text-blue-400 text-lg block">
                    {orders.filter((o) => o.mode === 'pickup').length}
                  </span>
                  <span className="text-neutral-400">À emporter</span>
                </div>
                <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <span className="font-bold text-emerald-400 text-lg block">
                    {orders.filter((o) => o.mode === 'delivery').length}
                  </span>
                  <span className="text-neutral-400">Livraison</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Ticket Modal */}
      {ticketOrder && (
        <KitchenTicketModal
          order={ticketOrder}
          restaurant={restaurant}
          onClose={() => setTicketOrder(null)}
        />
      )}

      {/* Rejection Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#160a10] border border-red-800 rounded-3xl p-5 space-y-3 text-white">
            <h3 className="font-bold text-sm text-red-300">
              Refuser la commande #{rejectingOrder.orderNumber}
            </h3>
            <p className="text-xs text-neutral-400">
              Indiquez le motif qui sera affiché en toute transparence au client.
            </p>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                Confirmer refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#160a10] border border-amber-800 rounded-3xl p-5 space-y-3 text-white">
            <h3 className="font-bold text-sm text-amber-300">
              Rembourser la commande #{refundingOrder.orderNumber} ({refundingOrder.totalMAD} MAD)
            </h3>
            <p className="text-xs text-neutral-400">
              Effectuez d’abord le remboursement au client. Cette action enregistre le remboursement, annule la commande et retire les points associés.
            </p>
            <input
              type="text"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRefundingOrder(null)}
                className="flex-1 py-2 rounded-xl bg-neutral-800 text-xs font-semibold"
              >
                Retour
              </button>
              <button
                onClick={handleConfirmRefund}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Confirmer le remboursement effectué
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
