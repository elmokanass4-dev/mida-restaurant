import React, { useState } from 'react';
import { Dish, Language, SelectedModifier, OrderItem } from '../../types';
import { getTranslation } from '../../i18n/translations';
import { X, AlertCircle, Check, Info } from 'lucide-react';

interface Props {
  dish: Dish | null;
  language: Language;
  onClose: () => void;
  onAddToCart: (item: OrderItem) => void;
}

export const DishDetailModal: React.FC<Props> = ({ dish, language, onClose, onAddToCart }) => {
  if (!dish) return null;
  const t = getTranslation(language);

  // Initial required selections
  const initialModifiers: Record<string, string[]> = {};
  dish.modifierGroups.forEach((group) => {
    if (group.required && group.options.length > 0) {
      initialModifiers[group.id] = [group.options[0].id];
    } else {
      initialModifiers[group.id] = [];
    }
  });

  const [selectedMods, setSelectedMods] = useState<Record<string, string[]>>(initialModifiers);
  const [quantity, setQuantity] = useState(1);
  const [customerNotes, setCustomerNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Toggle or select option
  const handleOptionToggle = (group: typeof dish.modifierGroups[0], optionId: string) => {
    const current = selectedMods[group.id] || [];
    if (group.maxSelections === 1) {
      setSelectedMods({ ...selectedMods, [group.id]: [optionId] });
    } else {
      if (current.includes(optionId)) {
        setSelectedMods({ ...selectedMods, [group.id]: current.filter((id) => id !== optionId) });
      } else {
        if (current.length < group.maxSelections) {
          setSelectedMods({ ...selectedMods, [group.id]: [...current, optionId] });
        }
      }
    }
    setValidationError(null);
  };

  // Recalculate live item total
  let unitTotal = dish.priceMAD;
  const flatSelectedList: SelectedModifier[] = [];

  dish.modifierGroups.forEach((group) => {
    const chosenIds = selectedMods[group.id] || [];
    chosenIds.forEach((id) => {
      const opt = group.options.find((o) => o.id === id);
      if (opt) {
        unitTotal += opt.priceMAD;
        flatSelectedList.push({
          groupId: group.id,
          groupName: group.name[language] || group.name.fr,
          optionId: opt.id,
          optionName: opt.name[language] || opt.name.fr,
          priceMAD: opt.priceMAD
        });
      }
    });
  });

  const grandTotal = unitTotal * quantity;

  const handleConfirm = () => {
    // Validate required groups
    for (const group of dish.modifierGroups) {
      const chosen = selectedMods[group.id] || [];
      if (group.required && chosen.length < group.minSelections) {
        setValidationError(`Veuillez sélectionner au moins ${group.minSelections} choix pour "${group.name[language] || group.name.fr}".`);
        return;
      }
    }

    if (!dish.isAvailable) {
      setValidationError('Ce plat est actuellement épuisé.');
      return;
    }

    const orderItem: OrderItem = {
      dishId: dish.id,
      dishName: dish.name[language] || dish.name.fr,
      image: dish.image,
      unitPriceMAD: unitTotal,
      quantity,
      selectedModifiers: flatSelectedList,
      itemNotes: customerNotes.trim() ? customerNotes.trim().slice(0, 150) : undefined,
      lineTotalMAD: grandTotal
    };

    onAddToCart(orderItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div
        className="w-full max-w-lg bg-[#140b0f] border border-amber-950/60 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden text-neutral-100 shadow-2xl animate-in fade-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image */}
        <div className="relative h-60 w-full shrink-0 overflow-hidden bg-black/40">
          <img
            src={dish.image}
            alt={dish.name[language] || dish.name.fr}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#140b0f] via-transparent to-black/60" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/90 hover:text-white border border-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          {/* Dietary labels */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
            {dish.dietaryLabels.map((lbl) => (
              <span
                key={lbl}
                className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md"
              >
                {lbl}
              </span>
            ))}
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-sm font-sans">
              {dish.name[language] || dish.name.fr}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-amber-400 font-bold text-lg tabular-nums">
                {dish.priceMAD} MAD
              </span>
              {!dish.isAvailable && (
                <span className="text-xs bg-red-950/80 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-md font-medium">
                  {t.soldOut}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable details and modifier groups */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-sm text-neutral-300">
          {/* Description */}
          <p className="leading-relaxed text-neutral-300 text-[13.5px]">
            {dish.description[language] || dish.description.fr}
          </p>

          {/* Verified Allergens Notice */}
          {dish.verifiedAllergens.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs flex gap-2.5 items-start">
              <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">
                  {t.allergens} :{' '}
                </span>
                <span className="text-amber-300/90">
                  {dish.verifiedAllergens.join(', ')}
                </span>
                <p className="text-[11px] text-neutral-400 mt-1">
                  En cas d'allergie sévère, prévenez immédiatement notre équipe en salle.
                </p>
              </div>
            </div>
          )}

          {/* Ingredients list */}
          {dish.ingredients[language]?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                {t.ingredients}
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {dish.ingredients[language].join(' · ')}
              </p>
            </div>
          )}

          {/* Modifier Groups */}
          {dish.modifierGroups.map((group) => {
            const chosen = selectedMods[group.id] || [];
            return (
              <div key={group.id} className="pt-2 border-t border-neutral-800/60">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <h4 className="font-semibold text-white text-sm">
                      {group.name[language] || group.name.fr}
                    </h4>
                    <span className="text-[11px] text-neutral-400">
                      {group.required ? (
                        <span className="text-amber-400 font-medium">Obligatoire</span>
                      ) : (
                        <span>Optionnel (jusqu'à {group.maxSelections})</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const isSelected = chosen.includes(opt.id);
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => handleOptionToggle(group, opt.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500/60 text-white'
                            : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-amber-500 border-amber-400 text-black'
                                : 'border-neutral-600 bg-neutral-800/50'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-xs sm:text-sm font-medium">
                            {opt.name[language] || opt.name.fr}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-amber-300/90 tabular-nums">
                          {opt.priceMAD > 0 ? `+${opt.priceMAD} MAD` : 'Inclus'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Kitchen notes */}
          <div className="pt-2 border-t border-neutral-800/60">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Instructions pour la cuisine
            </label>
            <input
              type="text"
              maxLength={150}
              placeholder="Ex: Sauce à part, sans oignons..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/70"
            />
          </div>

          {validationError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        {/* Footer sticky bar */}
        <div className="p-4 bg-[#11080c] border-t border-amber-950/50 flex items-center gap-3">
          {/* Quantity stepper */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl px-1.5 py-1">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-white font-bold text-base active:bg-neutral-800"
            >
              -
            </button>
            <span className="w-7 text-center font-bold text-sm text-white tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-300 hover:text-white font-bold text-base active:bg-neutral-800"
            >
              +
            </button>
          </div>

          {/* Add to order CTA */}
          <button
            type="button"
            disabled={!dish.isAvailable}
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-between shadow-lg shadow-amber-950/40 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>{t.addToOrder}</span>
            <span className="tabular-nums font-black">{grandTotal} MAD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
