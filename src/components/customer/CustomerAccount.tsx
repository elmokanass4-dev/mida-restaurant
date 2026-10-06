import React, { useState } from 'react';
import { CustomerProfile, Language, Restaurant, Dish, Order } from '../../types';
import { getTranslation } from '../../i18n/translations';
import { storage } from '../../services/storageAdapter';
import {
  Heart,
  Download,
  ShieldCheck,
  Bell,
  Clock,
  RotateCcw,
  Check,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface Props {
  customer: CustomerProfile;
  restaurant: Restaurant;
  language: Language;
  dishes: Dish[];
  onOpenDish: (dish: Dish) => void;
  onViewOrder: (ref: string) => void;
  onReorder: (order: Order) => void;
}

export const CustomerAccount: React.FC<Props> = ({
  customer,
  restaurant,
  language,
  dishes,
  onOpenDish,
  onViewOrder,
  onReorder
}) => {
  const t = getTranslation(language);
  const [marketingOptIn, setMarketingOptIn] = useState(customer.marketingConsent);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [installPromptShown, setInstallPromptShown] = useState(false);

  const pastOrders = storage.getOrders(restaurant.id);
  const favoriteDishes = dishes.filter((d) => customer.favoriteDishIds.includes(d.id));

  const handleToggleConsent = () => {
    const updatedState = !marketingOptIn;
    setMarketingOptIn(updatedState);
    const updatedCust: CustomerProfile = {
      ...customer,
      marketingConsent: updatedState,
      marketingConsentTimestamp: new Date().toISOString()
    };
    storage.updateCustomer(updatedCust);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleInstallClick = () => {
    setInstallPromptShown(true);
  };

  return (
    <div className="p-4 sm:p-5 max-w-lg mx-auto space-y-5 pb-24 text-neutral-100">
      {/* Account Profile Card */}
      <div className="rounded-3xl bg-[#190c13] border border-amber-950/60 p-5 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-xl font-sans">
            SM
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-sans">{customer.name}</h2>
            <p className="text-xs text-neutral-400">{customer.phone}</p>
            <p className="text-xs text-amber-400 font-semibold mt-0.5">
              Client régulier · {customer.totalOrdersCount} commandes passées
            </p>
          </div>
        </div>
      </div>

      {/* PWA Web App Installation */}
      <div className="rounded-3xl bg-gradient-to-r from-[#241119] to-[#1a0c13] border border-amber-600/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
            <Download size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{t.installApp}</h3>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              {t.installSubtitle}
            </p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors"
        >
          <Download size={15} />
          <span>{t.installButton}</span>
        </button>

        {installPromptShown && (
          <div className="p-3 rounded-2xl bg-black/60 border border-neutral-800 text-[11px] text-neutral-300 space-y-1.5 animate-in fade-in">
            <p className="font-semibold text-amber-300">Instructions d'installation :</p>
            <ul className="space-y-1 text-neutral-400 list-disc list-inside">
              <li>
                <strong>Sur iPhone (Safari) :</strong> Touchez l'icône de partage <span className="text-white">« Partager »</span> puis <span className="text-white">« Sur l'écran d'accueil »</span>.
              </li>
              <li>
                <strong>Sur Android (Chrome) :</strong> Touchez le menu <span className="text-white">« ⋮ »</span> puis <span className="text-white">« Installer l'application »</span>.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Favorites */}
      <div className="rounded-3xl bg-[#140a0f] border border-neutral-800 p-4 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Heart size={14} className="text-amber-400" />
          <span>Vos Plats Favoris ({favoriteDishes.length})</span>
        </h3>

        {favoriteDishes.length === 0 ? (
          <p className="text-xs text-neutral-500">
            Vous n'avez pas encore ajouté de plat en favori.
          </p>
        ) : (
          <div className="space-y-2">
            {favoriteDishes.map((dish) => (
              <div
                key={dish.id}
                onClick={() => onOpenDish(dish)}
                className="p-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-center justify-between gap-3 hover:border-amber-700/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={dish.image}
                    alt={dish.name[language] || dish.name.fr}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div className="truncate">
                    <h4 className="font-semibold text-xs text-white truncate">
                      {dish.name[language] || dish.name.fr}
                    </h4>
                    <span className="text-[11px] font-bold text-amber-400 tabular-nums">
                      {dish.priceMAD} MAD
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order History */}
      <div className="rounded-3xl bg-[#140a0f] border border-neutral-800 p-4 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Clock size={14} className="text-amber-400" />
          <span>Historique des commandes ({pastOrders.length})</span>
        </h3>

        <div className="divide-y divide-neutral-900 text-xs">
          {pastOrders.map((ord) => (
            <div key={ord.id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono">{ord.orderNumber}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    {ord.mode === 'table' ? `Table #${ord.tableNumber}` : ord.mode === 'pickup' ? 'À emporter' : 'Livraison'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {new Date(ord.createdAt).toLocaleDateString()} · {ord.totalMAD} MAD ({ord.items.length} articles)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onViewOrder(ord.secureRef)}
                  className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-[11px] font-semibold text-neutral-200"
                >
                  Suivi
                </button>
                <button
                  onClick={() => onReorder(ord)}
                  title="Recommander"
                  className="p-1.5 bg-amber-600 hover:bg-amber-500 text-black rounded-lg"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marketing & Privacy Consent Preferences */}
      <div className="rounded-3xl bg-[#140a0f] border border-neutral-800 p-4 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-amber-400" />
          <span>Gestion des consentements & Confidentialité</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div>
              <p className="font-medium text-white">Notifications transactionnelles</p>
              <p className="text-[11px] text-neutral-400">
                Suivi de préparation et mise à disposition des commandes.
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
              Toujours actif
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="pr-3">
              <p className="font-medium text-white">Offres de fidélité & Campagnes de retour</p>
              <p className="text-[11px] text-neutral-400">
                Recevoir des réductions personnalisées après période d'inactivité.
              </p>
              {customer.marketingConsentTimestamp && (
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Mis à jour le : {new Date(customer.marketingConsentTimestamp).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={handleToggleConsent}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
                marketingOptIn ? 'bg-amber-500' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  marketingOptIn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-300 text-[11px] flex items-center gap-1.5">
              <Check size={13} />
              <span>Préférences de confidentialité enregistrées avec succès.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
