import React, { useState } from 'react';
import { Restaurant } from '../../types';
import { storage } from '../../services/storageAdapter';
import {
  Building2,
  Shield,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  Users,
  UtensilsCrossed,
  Globe,
  Lock,
  ArrowRight
} from 'lucide-react';

interface Props {
  restaurants: Restaurant[];
  currentRestaurantId: string;
  onSelectRestaurant: (restaurantId: string) => void;
  onNavigateToCustomer: () => void;
  onNavigateToStaff: () => void;
}

export const PlatformAdmin: React.FC<Props> = ({
  restaurants,
  currentRestaurantId,
  onSelectRestaurant,
  onNavigateToCustomer,
  onNavigateToStaff
}) => {
  const [resetDone, setResetDone] = useState(false);

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données de démonstration Mida aux valeurs initiales ?')) {
      storage.initializeIfEmpty(true);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#090507] text-neutral-100 p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Shield size={14} />
              <span>Plateforme SaaS Multi-Tenant Mida</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Supervision des Établissements & Isolation des Tenants
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Architecture multi-tenant avec séparation hermétique des cartes, commandes et données clients.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetData}
              className="py-2 px-3.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={14} />
              <span>Réinitialiser Démo</span>
            </button>
          </div>
        </div>

        {resetDone && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>Données réinitialisées avec succès aux valeurs de démonstration officielles.</span>
          </div>
        )}

        {/* Multi-Tenants list */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <Building2 size={16} className="text-amber-400" />
            <span>Restaurants hébergés sur la plateforme</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurants.map((rest) => {
              const isSelected = rest.id === currentRestaurantId;
              const restOrders = storage.getOrders(rest.id);
              const restDishes = storage.getDishes(rest.id);

              return (
                <div
                  key={rest.id}
                  className={`rounded-3xl p-5 border flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'bg-[#1b0b13] border-amber-500 shadow-xl shadow-amber-950/30 ring-1 ring-amber-500/40'
                      : 'bg-[#12070c] border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-lg text-white font-sans">{rest.name}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{rest.address}</p>
                      </div>

                      {isSelected ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500 text-black">
                          Tenant Actif
                        </span>
                      ) : (
                        <button
                          onClick={() => onSelectRestaurant(rest.id)}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
                        >
                          Basculer vers ce tenant
                        </button>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800">
                        <span className="text-neutral-500 text-[10px] block">Plats</span>
                        <strong className="text-white font-bold">{restDishes.length}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800">
                        <span className="text-neutral-500 text-[10px] block">Commandes</span>
                        <strong className="text-white font-bold">{restOrders.length}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-neutral-800">
                        <span className="text-neutral-500 text-[10px] block">Tables</span>
                        <strong className="text-white font-bold">{rest.tableCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-5 pt-3 border-t border-neutral-800/80">
                    <button
                      onClick={() => {
                        onSelectRestaurant(rest.id);
                        onNavigateToCustomer();
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <span>App Client</span>
                      <ArrowRight size={13} />
                    </button>
                    <button
                      onClick={() => {
                        onSelectRestaurant(rest.id);
                        onNavigateToStaff();
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <span>Dashboard Staff</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SaaS Subscription Tiers (Separate from food orders) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <DollarSign size={16} className="text-amber-400" />
              <span>Abonnements SaaS Plateforme Mida (B2B)</span>
            </h2>
            <span className="text-[11px] text-neutral-500">
              Facturation logicielle distincte des encaissements repas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-[#14080e] border border-neutral-800 space-y-3">
              <span className="text-xs font-bold text-neutral-400 uppercase">Formule Starter</span>
              <p className="text-2xl font-black text-white tabular-nums">
                390 <span className="text-xs font-normal text-neutral-400">MAD / mois</span>
              </p>
              <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
                <li>Menu QR & Commande à table</li>
                <li>Jusqu'à 10 tables physiques</li>
                <li>Support tickets standard</li>
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-[#1d0c14] border border-amber-600/60 space-y-3 relative overflow-hidden">
              <div className="absolute top-2 right-2 text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">
                Actif (Braise Burger)
              </div>
              <span className="text-xs font-bold text-amber-400 uppercase">Formule Pro</span>
              <p className="text-2xl font-black text-white tabular-nums">
                790 <span className="text-xs font-normal text-neutral-400">MAD / mois</span>
              </p>
              <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
                <li>Table, À emporter & Livraison</li>
                <li>Programme de Fidélité (Braise Club)</li>
                <li>Moteur de Campagnes de retour</li>
                <li>Écran Cuisine tactile & Tickets 80mm</li>
              </ul>
            </div>

            <div className="p-5 rounded-3xl bg-[#14080e] border border-neutral-800 space-y-3">
              <span className="text-xs font-bold text-neutral-400 uppercase">Formule Multi-Sites</span>
              <p className="text-2xl font-black text-white tabular-nums">
                1 490 <span className="text-xs font-normal text-neutral-400">MAD / mois</span>
              </p>
              <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
                <li>Réseaux & Franchises au Maroc</li>
                <li>Multi-établissements consolidés</li>
                <li>Accès API & Export comptable</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tenant Isolation Checklist */}
        <div className="p-5 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs text-neutral-400">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Lock size={15} className="text-emerald-400" />
            <span>Garantie de Séparation Multi-Tenant</span>
          </h3>
          <p>
            Chaque requête et accès de stockage est strictement partitionné par{' '}
            <code className="text-amber-300 bg-neutral-900 px-1 py-0.5 rounded font-mono">
              restaurantId
            </code>
            . Les commandes, paniers, règles de fidélité et consentements de Sarah Mansouri chez
            Braise Burger sont totalement inaccessibles pour les autres établissements.
          </p>
        </div>
      </div>
    </div>
  );
};
