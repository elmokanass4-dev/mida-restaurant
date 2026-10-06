import React, { useState, useEffect } from 'react';
import { Language, Restaurant } from './types';
import { storage, SYNC_EVENT_NAME } from './services/storageAdapter';
import { BRAISE_BURGER_ID } from './data/seedData';
import { CustomerApp } from './components/customer/CustomerApp';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { PlatformAdmin } from './components/platform/PlatformAdmin';
import {
  Smartphone,
  ChefHat,
  Building2,
  Globe,
  RotateCcw,
  QrCode,
  Info,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

type AppSurface = 'customer' | 'staff' | 'platform';

export default function App() {
  const [currentSurface, setCurrentSurface] = useState<AppSurface>('customer');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(BRAISE_BURGER_ID);
  const [language, setLanguage] = useState<Language>('fr');
  const [simulatedTable, setSimulatedTable] = useState<number | undefined>(3); // Table 3 scanned by default in demo
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Read URL query params on mount for direct deep linking e.g. ?surface=staff or ?table=2
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const surfaceParam = urlParams.get('surface');
      if (surfaceParam === 'staff' || surfaceParam === 'platform' || surfaceParam === 'customer') {
        setCurrentSurface(surfaceParam as AppSurface);
      }
      const restaurantParam = urlParams.get('restaurant');
      if (restaurantParam && storage.getRestaurants().some(r => r.id === restaurantParam)) setSelectedRestaurantId(restaurantParam);
      const tableParam = urlParams.get('table');
      if (tableParam) {
        setSimulatedTable(Number(tableParam));
      }
      const langParam = urlParams.get('lang');
      if (langParam === 'ar' || langParam === 'en' || langParam === 'fr') {
        setLanguage(langParam as Language);
      }
    } catch (e) {
      // Ignore query param error
    }
  }, []);

  // Set RTL direction attribute on document HTML element
  useEffect(() => {
    if (language === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', language);
    }
  }, [language]);

  const restaurants = storage.getRestaurants();
  const currentRestaurant =
    restaurants.find((r) => r.id === selectedRestaurantId) || restaurants[0];

  const mobileUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  mobileUrl.searchParams.set('surface', 'customer');
  mobileUrl.searchParams.set('restaurant', selectedRestaurantId);
  mobileUrl.searchParams.set('lang', language);
  if (simulatedTable) mobileUrl.searchParams.set('table', String(simulatedTable));

  return (
    <div className="min-h-screen bg-[#080305] text-neutral-100 flex flex-col font-sans">
      {/* Top Universal Mida Switcher Bar */}
      <nav
        aria-label="Navigation surfaces Mida"
        className="bg-[#11060b] border-b border-amber-950/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs sticky top-0 z-50 shadow-md backdrop-blur-md"
      >
        {/* Surface Switcher Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900/80 rounded-xl border border-neutral-800">
          <button
            onClick={() => setCurrentSurface('customer')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
              currentSurface === 'customer'
                ? 'bg-amber-600 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Smartphone size={14} />
            <span>App Client</span>
          </button>

          <button
            onClick={() => setCurrentSurface('staff')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
              currentSurface === 'staff'
                ? 'bg-amber-600 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <ChefHat size={14} />
            <span>Écran Staff / Cuisine</span>
          </button>

          <button
            onClick={() => setCurrentSurface('platform')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
              currentSurface === 'platform'
                ? 'bg-amber-600 text-black shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Building2 size={14} />
            <span className="hidden sm:inline">Plateforme SaaS</span>
          </button>
        </div>

        {/* Tenant selector & Demo controls */}
        <div className="flex items-center gap-2">
          {/* Restaurant Tenant Switcher */}
          <select
            value={selectedRestaurantId}
            onChange={(e) => setSelectedRestaurantId(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-amber-500"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.city})
              </option>
            ))}
          </select>

          {/* Table QR Simulation (for customer view) */}
          {currentSurface === 'customer' && (
            <div className="hidden md:flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 px-2 py-1 rounded-lg">
              <QrCode size={13} className="text-amber-400" />
              <select
                value={simulatedTable || ''}
                onChange={(e) =>
                  setSimulatedTable(e.target.value ? Number(e.target.value) : undefined)
                }
                className="bg-transparent text-[11px] text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-neutral-900 text-white">Sans QR (À emporter / Livraison)</option>
                <option value="1" className="bg-neutral-900 text-white">Scan QR Table #1 (Terrasse)</option>
                <option value="2" className="bg-neutral-900 text-white">Scan QR Table #2 (RDC)</option>
                <option value="3" className="bg-neutral-900 text-white">Scan QR Table #3 (Banquette)</option>
                <option value="4" className="bg-neutral-900 text-white">Scan QR Table #4 (Famille)</option>
                <option value="5" className="bg-neutral-900 text-white">Scan QR Table #5 (Mezzanine)</option>
                <option value="6" className="bg-neutral-900 text-white">Scan QR Table #6 (Verrière)</option>
              </select>
            </div>
          )}

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            {(['fr', 'ar', 'en'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                  language === l ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Test on Phone link button */}
          <button
            onClick={() => setShowMobileModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Tester sur mon téléphone (Lien & QR code)"
          >
            <Smartphone size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Lien Mobile</span>
            <span className="sm:hidden">Mobile</span>
          </button>

          {/* Demo info popup toggle */}
          <button
            onClick={() => setShowDemoInfo(!showDemoInfo)}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-300"
            title="Détails du mode Démo Mida"
          >
            <Info size={15} />
          </button>
        </div>
      </nav>

      {/* Mobile Link & QR Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-[#160b11] border border-amber-600/40 rounded-3xl p-5 text-neutral-100 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Tester sur votre smartphone</h3>
                  <p className="text-[11px] text-neutral-400">Application PWA Mida</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileModal(false)}
                className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* QR Code Container */}
            <div className="my-4 p-4 rounded-2xl bg-white text-black flex flex-col items-center justify-center shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  mobileUrl.href
                )}`}
                alt="QR Code pour smartphone"
                className="w-40 h-40 rounded"
              />
              <p className="text-[11px] font-bold text-neutral-800 mt-2">
                Scannez avec l'appareil photo de votre téléphone
              </p>
            </div>

            {/* Direct Link box */}
            <div className="space-y-2">
              <label className="text-[11px] text-neutral-400 font-medium block">
                Ou copiez le lien direct ci-dessous :
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={mobileUrl.href}
                  className="w-full bg-neutral-900/90 border border-neutral-800 rounded-xl px-2.5 py-2 text-[11px] font-mono text-amber-300 truncate focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      mobileUrl.href
                    );
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-extrabold text-xs whitespace-nowrap transition-colors"
                >
                  {linkCopied ? 'Copié !' : 'Copier'}
                </button>
              </div>

              <a
                href={mobileUrl.href}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 mt-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors block text-center"
              >
                Ouvrir directement dans un nouvel onglet ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Demo Mode Notice Drawer / Banner */}
      {showDemoInfo && (
        <div className="bg-[#1b0d14] border-b border-amber-950 px-4 py-3 text-xs text-neutral-300 flex items-start justify-between gap-4 animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldCheck size={16} />
              <span>Environnement Mida — Démonstration Opérationnelle & Données Persistantes</span>
            </div>
            <p className="text-neutral-400 leading-relaxed text-[11px] max-w-3xl">
              Les enregistrements (commandes, points de fidélité, modifications de carte, appels serveurs) sont persistés localement dans le navigateur.
              Toute commande passée dans l'App Client est synchronisée en temps réel avec l'Écran Staff Cuisine.
              Devise : <strong>MAD (Dirham Marocain)</strong> · Fuseau : <strong>Africa/Casablanca</strong>.
            </p>
          </div>
          <button
            onClick={() => setShowDemoInfo(false)}
            className="text-neutral-400 hover:text-white font-bold px-2 py-1 bg-neutral-900 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Surface Render */}
      <main className="flex-1 flex flex-col">
        {currentSurface === 'customer' && (
          <CustomerApp
            restaurant={currentRestaurant}
            language={language}
            onLanguageChange={setLanguage}
            activeTableNumber={simulatedTable}
          />
        )}

        {currentSurface === 'staff' && (
          <StaffDashboard
            restaurant={currentRestaurant}
            onSwitchToCustomerView={() => setCurrentSurface('customer')}
          />
        )}

        {currentSurface === 'platform' && (
          <PlatformAdmin
            restaurants={restaurants}
            currentRestaurantId={selectedRestaurantId}
            onSelectRestaurant={(id) => setSelectedRestaurantId(id)}
            onNavigateToCustomer={() => setCurrentSurface('customer')}
            onNavigateToStaff={() => setCurrentSurface('staff')}
          />
        )}
      </main>
    </div>
  );
}
