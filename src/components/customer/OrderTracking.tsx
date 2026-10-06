import React, { useEffect, useState } from 'react';
import { Order, Language, Restaurant } from '../../types';
import { getTranslation } from '../../i18n/translations';
import { storage, SYNC_EVENT_NAME } from '../../services/storageAdapter';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Utensils,
  Bike,
  AlertCircle,
  BellRing,
  Receipt,
  Repeat,
  ShieldCheck,
  Check
} from 'lucide-react';

interface Props {
  orderRef: string;
  restaurant: Restaurant;
  language: Language;
  onBackToMenu: () => void;
  onReorder: (order: Order) => void;
}

export const OrderTracking: React.FC<Props> = ({
  orderRef,
  restaurant,
  language,
  onBackToMenu,
  onReorder
}) => {
  const t = getTranslation(language);
  const [order, setOrder] = useState<Order | undefined>(() => storage.getOrderByRef(orderRef));
  const [callToast, setCallToast] = useState<string | null>(null);
  const [isCallingStaff, setIsCallingStaff] = useState(false);

  // Sync listener: updates live when kitchen/staff accepts or updates status
  useEffect(() => {
    const handleSync = () => {
      const updated = storage.getOrderByRef(orderRef);
      if (updated) {
        if (order?.status !== 'completed' && updated.status === 'completed') {
          try {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
          } catch (e) {
            // Ignore confetti errors
          }
        }
        setOrder(updated);
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [orderRef, order]);

  if (!order) {
    return (
      <div className="p-8 text-center text-neutral-300">
        <AlertCircle size={36} className="text-amber-400 mx-auto mb-3" />
        <h3 className="font-bold text-base text-white">Commande introuvable</h3>
        <p className="text-xs text-neutral-400 mt-1 mb-4">
          La référence sécurisée spécifiée est invalide ou a expiré.
        </p>
        <button
          onClick={onBackToMenu}
          className="px-4 py-2 bg-amber-600 rounded-xl text-black font-bold text-xs"
        >
          Retour au menu
        </button>
      </div>
    );
  }

  // Handle Call Staff action (Bell / Bill)
  const handleCallStaff = async (type: 'call_waiter' | 'request_bill') => {
    if (!order.tableNumber) return;
    setIsCallingStaff(true);
    try { const result = await storage.submitStaffCall({
      restaurantId: restaurant.id,
      tableNumber: order.tableNumber,
      type
    });

    setCallToast(result.message); } catch(e) { setCallToast(e instanceof Error ? e.message : 'Demande impossible.'); }
    setIsCallingStaff(false);
    setTimeout(() => setCallToast(null), 4000);
  };

  // Status mapping
  const steps = [
    { key: 'submitted', label: t.orderStatusSubmitted, icon: Clock },
    { key: 'accepted', label: t.orderStatusAccepted, icon: CheckCircle2 },
    { key: 'preparing', label: t.orderStatusPreparing, icon: ChefHat },
    {
      key: order.mode === 'delivery' ? 'out_for_delivery' : 'ready',
      label: order.mode === 'delivery' ? t.orderStatusDelivery : t.orderStatusReady,
      icon: order.mode === 'delivery' ? Bike : Utensils
    },
    { key: 'completed', label: t.orderStatusCompleted, icon: CheckCircle2 }
  ];

  const getStepIndex = (status: Order['status']) => {
    if (status === 'submitted') return 0;
    if (status === 'accepted') return 1;
    if (status === 'preparing') return 2;
    if (status === 'ready' || status === 'out_for_delivery') return 3;
    if (status === 'completed') return 4;
    return -1;
  };

  const currentIdx = getStepIndex(order.status);
  const isRejected = order.status === 'rejected';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-5 pb-24 text-neutral-100">
      {/* Header card with order reference */}
      <div className="rounded-3xl bg-gradient-to-b from-[#241119] to-[#160a10] border border-amber-600/30 p-5 shadow-2xl relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={13} />
              {restaurant.name} · {order.orderNumber}
            </span>
            <h2 className="text-lg font-bold text-white mt-1 font-sans">Suivi en direct de votre commande</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono tabular-nums">
            {order.secureRef}
          </span>
        </div>

        {/* Mode context */}
        <div className="mt-3 text-xs text-neutral-300 flex items-center gap-2">
          {order.mode === 'table' && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              Table #{order.tableNumber}
            </span>
          )}
          {order.mode === 'pickup' && (
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              Retrait à Hamria
            </span>
          )}
          {order.mode === 'delivery' && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
              Livraison Meknès
            </span>
          )}
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Estimated Prep notice */}
        {order.estimatedReadyAt && order.status !== 'completed' && !isCancelled && !isRejected && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3">
            <Clock size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-200">
                {t.estimatedPrep}{' '}
                <span className="text-white">
                  {new Date(order.estimatedReadyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                La cuisine affine l'estimation en fonction de la cuisson au feu de braise.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Rejection / Cancellation alerts */}
      {isRejected && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800 text-red-200 text-xs flex gap-3">
          <AlertCircle size={20} className="shrink-0 text-red-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-red-300 mb-1">{t.orderStatusRejected}</h4>
            <p className="leading-relaxed">
              {order.rejectionReason || 'La cuisine n\'a pas pu valider votre commande en raison d\'une forte affluence.'}
            </p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs flex gap-3">
          <AlertCircle size={20} className="shrink-0 text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-white mb-1">{t.orderStatusCancelled}</h4>
            <p className="leading-relaxed text-neutral-400">
              {order.refundReason || 'Cette commande a été annulée.'}
            </p>
          </div>
        </div>
      )}

      {/* Live Status Progress Stepper */}
      {!isRejected && !isCancelled && (
        <div className="rounded-3xl bg-[#150a0f] border border-neutral-800 p-5 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400">
            Progression de votre commande
          </h3>

          <div className="space-y-4 relative before:absolute before:top-3 before:bottom-3 before:left-4 before:w-0.5 before:bg-neutral-800">
            {steps.map((step, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const Icon = step.icon;

              return (
                <div key={step.key} className="flex items-center gap-3.5 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isPast
                        ? 'bg-amber-500 text-black font-bold shadow-md'
                        : isCurrent
                        ? 'bg-amber-600 text-black font-bold ring-4 ring-amber-500/20 animate-pulse'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-600'
                    }`}
                  >
                    {isPast ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                  </div>
                  <div>
                    <span
                      className={`text-xs font-semibold block ${
                        isCurrent ? 'text-amber-300 font-bold text-sm' : isPast ? 'text-white' : 'text-neutral-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] text-neutral-400">
                        Mise à jour en temps réel depuis la cuisine
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Service Call Buttons (If table order) */}
      {order.mode === 'table' && (
        <div className="p-4 rounded-3xl bg-[#190c13] border border-amber-950/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span className="flex items-center gap-1.5">
              <BellRing size={14} />
              Services à Table #{order.tableNumber}
            </span>
            <span className="text-[11px] text-neutral-400">Serveur assigné</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isCallingStaff}
              onClick={() => handleCallStaff('call_waiter')}
              className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <BellRing size={14} className="text-amber-400" />
              <span>{t.callWaiter}</span>
            </button>

            <button
              type="button"
              disabled={isCallingStaff}
              onClick={() => handleCallStaff('request_bill')}
              className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Receipt size={14} className="text-amber-400" />
              <span>{t.requestBill}</span>
            </button>
          </div>

          {callToast && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{callToast}</span>
            </div>
          )}
        </div>
      )}

      {/* Order Items Breakdown */}
      <div className="p-4 rounded-3xl bg-[#140a0f] border border-neutral-800/80 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Receipt size={14} />
          <span>{t.orderSummary}</span>
        </h3>

        <div className="divide-y divide-neutral-900 text-xs">
          {order.items.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
              <div>
                <span className="font-semibold text-white">
                  {item.quantity}x {item.dishName}
                </span>
                {item.selectedModifiers.length > 0 && (
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {item.selectedModifiers.map((m) => m.optionName).join(', ')}
                  </p>
                )}
                {item.itemNotes && (
                  <p className="text-[11px] text-amber-400/80 italic mt-0.5">
                    « {item.itemNotes} »
                  </p>
                )}
              </div>
              <span className="font-semibold text-amber-400 tabular-nums shrink-0">
                {item.lineTotalMAD} MAD
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="pt-3 border-t border-neutral-800/80 space-y-1.5 text-xs text-neutral-300">
          <div className="flex justify-between">
            <span>{t.subtotal}</span>
            <span className="font-medium text-white tabular-nums">{order.subtotalMAD} MAD</span>
          </div>

          {order.discountMAD > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>{t.discount}</span>
              <span className="tabular-nums">-{order.discountMAD} MAD</span>
            </div>
          )}

          {order.deliveryFeeMAD > 0 && (
            <div className="flex justify-between">
              <span>{t.deliveryFee}</span>
              <span className="font-medium text-white tabular-nums">{order.deliveryFeeMAD} MAD</span>
            </div>
          )}

          <div className="flex justify-between text-[11px] text-neutral-500">
            <span>{t.taxIncluded}</span>
            <span className="tabular-nums">{order.taxAmountMAD} MAD</span>
          </div>

          <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-neutral-800">
            <span>{t.total}</span>
            <span className="text-amber-400 text-base tabular-nums">{order.totalMAD} MAD</span>
          </div>
        </div>

        {/* Loyalty earned notice */}
        {order.loyaltyPointsEarned ? (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <span>Points fidélité Braise Club gagnés :</span>
            <span className="font-bold tabular-nums">+{order.loyaltyPointsEarned} pts</span>
          </div>
        ) : null}
      </div>

      {/* Bottom Actions: Reorder or Back */}
      <div className="flex gap-2">
        <button
          onClick={() => onReorder(order)}
          className="flex-1 py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Repeat size={14} className="text-amber-400" />
          <span>Recommander ce menu</span>
        </button>

        <button
          onClick={onBackToMenu}
          className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs transition-colors"
        >
          Menu
        </button>
      </div>
    </div>
  );
};
