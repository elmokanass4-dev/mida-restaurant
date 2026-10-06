import React, { useState } from 'react';
import { OrderItem, Language, Restaurant, OrderingMode, PaymentMethod, Order } from '../../types';
import { getTranslation } from '../../i18n/translations';
import { backendEnabled } from '../../services/api';
import { storage } from '../../services/storageAdapter';
import { X, Utensils, ShoppingBag, Bike, CreditCard, Banknote, Store, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  restaurant: Restaurant;
  language: Language;
  appliedPromoCode?: string;
  activeTableNumber?: number;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  items,
  restaurant,
  language,
  appliedPromoCode,
  activeTableNumber,
  onOrderSuccess
}) => {

  const t = getTranslation(language);

  const [mode, setMode] = useState<OrderingMode>(activeTableNumber ? 'table' : 'pickup');
  const [tableNum, setTableNum] = useState<number>(activeTableNumber || 1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>(restaurant.deliverySettings.zones[0]?.id || 'z1');
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('counter');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [requestKey] = useState(() => crypto.randomUUID());
  if (!isOpen) return null;
  // Estimate; final prices are verified by the server.
  let calcResult;
  try {
    calcResult = storage.verifyAndCalculateOrder({
      restaurantId: restaurant.id,
      mode,
      items,
      deliveryZoneId: mode === 'delivery' ? deliveryZoneId : undefined,
      offerCode: appliedPromoCode
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur lors du calcul de la commande';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-[#140b0f] border border-red-800 p-6 rounded-2xl max-w-md text-white text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-red-200 mb-2">Impossible de finaliser le panier</h3>
          <p className="text-xs text-neutral-300 mb-4">{errorMsg}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 rounded-xl text-xs font-semibold hover:bg-neutral-700"
          >
            Retour au panier
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!backendEnabled) { setSubmitError('Le service de commande n’est pas encore connecté.'); return; }

    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError('Veuillez renseigner votre nom et votre numéro de téléphone.');
      return;
    }

    if (mode === 'delivery' && !deliveryAddress.trim()) {
      setSubmitError('Veuillez renseigner votre adresse de livraison complète.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {


      const createdOrder = await storage.submitOrder({
        restaurantId: restaurant.id,
        mode,
        tableNumber: mode === 'table' ? activeTableNumber : undefined,
        tableSessionToken: mode === 'table' ? new URLSearchParams(window.location.search).get('token') || undefined : undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: mode === 'delivery' ? deliveryAddress.trim() : undefined,
        deliveryZoneId: mode === 'delivery' ? deliveryZoneId : undefined,
        customerNotes: customerNotes.trim() || undefined,
        items,
        subtotalMAD: calcResult.subtotalMAD,
        discountMAD: calcResult.discountMAD,
        deliveryFeeMAD: calcResult.deliveryFeeMAD,
        taxRatePercent: calcResult.taxRatePercent,
        taxAmountMAD: calcResult.taxAmountMAD,
        totalMAD: calcResult.totalMAD,
        appliedOfferId: calcResult.appliedOfferId,
        paymentStatus: 'unpaid',
        paymentMethod
      }, requestKey);

      onOrderSuccess(createdOrder);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue lors de l\'envoi de la commande.';
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-[#140a0f] border border-amber-950/70 rounded-3xl overflow-hidden flex flex-col max-h-[95vh] text-neutral-100 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-neutral-800/80 flex items-center justify-between bg-[#190c13]">
          <div>
            <h3 className="font-bold text-base text-white font-sans">{t.checkout}</h3>
            <span className="text-xs text-amber-300/80 font-medium">{restaurant.name} · Meknès</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Ordering Mode Selector */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Mode de retrait / service
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!activeTableNumber}
                onClick={() => setMode('table')}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  mode === 'table'
                    ? 'bg-amber-950/50 border-amber-500 text-white shadow-sm'
                    : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Utensils size={18} className={mode === 'table' ? 'text-amber-400' : ''} />
                <span className="font-semibold text-[11px] truncate">{t.tableOrder}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('pickup')}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  mode === 'pickup'
                    ? 'bg-amber-950/50 border-amber-500 text-white shadow-sm'
                    : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <ShoppingBag size={18} className={mode === 'pickup' ? 'text-amber-400' : ''} />
                <span className="font-semibold text-[11px] truncate">{t.pickupOrder}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('delivery')}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                  mode === 'delivery'
                    ? 'bg-amber-950/50 border-amber-500 text-white shadow-sm'
                    : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <Bike size={18} className={mode === 'delivery' ? 'text-amber-400' : ''} />
                <span className="font-semibold text-[11px] truncate">{t.deliveryOrder}</span>
              </button>
            </div>
          </div>

          {/* Mode specific fields */}
          {mode === 'table' && (
            <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-200">Choix de la Table</span>
                <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                  <ShieldCheck size={13} />
                  QR scanné · vérification à l’envoi
                </span>
              </div>
              <p className="font-bold text-white">Table #{activeTableNumber}</p>
            </div>
          )}

          {mode === 'pickup' && (
            <div className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between text-neutral-300">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-amber-400" />
                <span>Adresse de retrait :</span>
              </div>
              <span className="font-semibold text-white">Hamria, Meknès (~20 min)</span>
            </div>
          )}

          {mode === 'delivery' && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Zone de livraison à Meknès
                </label>
                <select
                  value={deliveryZoneId}
                  onChange={(e) => setDeliveryZoneId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  {restaurant.deliverySettings.zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} (+{zone.feeMAD} MAD · Min. {zone.minSpendMAD} MAD)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">{t.address}</label>
                <input
                  type="text"
                  required
                  placeholder="Quartier, rue, immeuble, étage, appt..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Customer contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="checkout-name" className="block text-neutral-400 font-medium mb-1">{t.name}</label>
              <input
                id="checkout-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label htmlFor="checkout-phone" className="block text-neutral-400 font-medium mb-1">{t.phone}</label>
              <input
                id="checkout-phone"
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Special notes */}
          <div>
            <label className="block text-neutral-400 font-medium mb-1">{t.instructions}</label>
            <input
              type="text"
              maxLength={120}
              placeholder="Ex: Sans oignons, sonnette en panne..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Mode de paiement
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('counter')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left ${
                  paymentMethod === 'counter'
                    ? 'bg-amber-950/40 border-amber-500 text-white'
                    : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                }`}
              >
                <Banknote size={16} className="text-amber-400 shrink-0" />
                <span className="font-semibold text-xs leading-tight">
                  {mode === 'delivery' ? t.payCash : t.payCounter}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card_terminal')}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left ${
                  paymentMethod === 'card_terminal'
                    ? 'bg-amber-950/40 border-amber-500 text-white'
                    : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                }`}
              >
                <CreditCard size={16} className="text-amber-400 shrink-0" />
                <span className="font-semibold text-xs leading-tight">{t.payCard}</span>
              </button>
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Pricing summary */}
          <div className="p-3.5 rounded-2xl bg-[#1a0c13] border border-amber-950/60 space-y-1.5 text-xs text-neutral-300">
            <div className="flex justify-between">
              <span>{t.subtotal}</span>
              <span className="font-medium text-white tabular-nums">{calcResult.subtotalMAD} MAD</span>
            </div>

            {calcResult.discountMAD > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>{t.discount}</span>
                <span className="tabular-nums">-{calcResult.discountMAD} MAD</span>
              </div>
            )}

            {mode === 'delivery' && (
              <div className="flex justify-between">
                <span>{t.deliveryFee}</span>
                <span className="font-medium text-white tabular-nums">{calcResult.deliveryFeeMAD} MAD</span>
              </div>
            )}

            <div className="flex justify-between text-neutral-500 text-[11px]">
              <span>{t.taxIncluded}</span>
              <span className="tabular-nums">{calcResult.taxAmountMAD} MAD</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-neutral-800">
              <span>{t.total}</span>
              <span className="text-amber-400 text-base tabular-nums">{calcResult.totalMAD} MAD</span>
            </div>
          </div>

          {/* Submit button with idempotency guard */}
          <button
            type="submit"
            disabled={isSubmitting || !backendEnabled || !storage.connected}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Transmission de la commande...</span>
            ) : (
              <span>{t.placeOrder} · {calcResult.totalMAD} MAD</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
