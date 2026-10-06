import React, { useState } from 'react';
import { OrderItem, Language, Restaurant } from '../../types';
import { getTranslation } from '../../i18n/translations';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Check, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  restaurant: Restaurant;
  language: Language;
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onProceedToCheckout: (appliedCode?: string) => void;
}

export const CartDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  items,
  restaurant,
  language,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout
}) => {
  const t = getTranslation(language);
  const subtotalMAD = items.reduce((sum, item) => sum + item.lineTotalMAD, 0);
  const discountMAD = 0;
  const appliedCode = undefined;
  const finalTotalMAD = subtotalMAD;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#13090e] border-l border-amber-950/60 flex flex-col h-full text-neutral-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 px-5 border-b border-neutral-800/80 flex items-center justify-between bg-[#160a10]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={20} className="text-amber-400" />
            <h3 className="font-bold text-base text-white font-sans">{t.cart}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold tabular-nums">
              {items.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
            <div className="w-16 h-16 rounded-full bg-amber-950/30 border border-amber-900/40 flex items-center justify-center text-amber-400 mb-4">
              <ShoppingBag size={28} />
            </div>
            <p className="font-medium text-neutral-200 text-sm mb-1">{t.emptyCart}</p>
            <p className="text-xs text-neutral-500 mb-6 max-w-xs">
              Explorez nos burgers grillés au feu de braise et nos accompagnements artisanaux.
            </p>
            <button
              onClick={onClose}
              className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wide transition-all"
            >
              {t.startBrowsing}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.map((item, idx) => (
              <div
                key={`${item.dishId}-${idx}`}
                className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex gap-3 items-start"
              >
                <img
                  src={item.image}
                  alt={item.dishName}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-neutral-950 border border-neutral-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-white truncate">{item.dishName}</h4>
                    <button
                      onClick={() => onRemoveItem(idx)}
                      className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Modifiers list */}
                  {item.selectedModifiers.length > 0 && (
                    <div className="text-[11px] text-neutral-400 mt-1 space-y-0.5 leading-snug">
                      {item.selectedModifiers.map((m, mIdx) => (
                        <div key={mIdx}>
                          <span className="text-neutral-500">{m.groupName}:</span> {m.optionName}
                          {m.priceMAD > 0 && (
                            <span className="text-amber-400/80 ml-1">(+{m.priceMAD} MAD)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {item.itemNotes && (
                    <p className="text-[11px] text-amber-300/80 italic mt-1 bg-amber-950/20 px-2 py-0.5 rounded">
                      Note: {item.itemNotes}
                    </p>
                  )}

                  {/* Price and stepper */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-neutral-800/60">
                    <span className="text-xs font-bold text-amber-400 tabular-nums">
                      {item.lineTotalMAD} MAD
                    </span>
                    <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg px-1 py-0.5">
                      <button
                        onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-white tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

          </div>
        )}

        {/* Footer Summary & Checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-[#11070b] border-t border-amber-950/60 space-y-2.5">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>{t.subtotal}</span>
              <span className="text-white font-medium tabular-nums">{subtotalMAD} MAD</span>
            </div>

            {discountMAD > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>{t.discount} </span>
                <span className="font-bold tabular-nums">-{discountMAD} MAD</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-neutral-500">
              <span>{t.taxIncluded}</span>
              <span className="tabular-nums">
                {Math.round((finalTotalMAD - finalTotalMAD / 1.1) * 100) / 100} MAD
              </span>
            </div>

            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800/80">
              <span>{t.total}</span>
              <span className="text-amber-400 text-lg tabular-nums">{finalTotalMAD} MAD</span>
            </div>

            <button
              onClick={() => {
                onProceedToCheckout(appliedCode || undefined);
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 active:scale-[0.99] transition-all mt-2"
            >
              <span>{t.checkout}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
