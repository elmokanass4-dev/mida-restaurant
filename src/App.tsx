import React, { useState, useEffect } from 'react';
import { Language } from './types';
import {
  storage,
  SYNC_EVENT_NAME,
  ERROR_EVENT_NAME,
} from './services/storageAdapter';
import { backendEnabled } from './services/api';
import { CustomerApp } from './components/customer/CustomerApp';
import { PlatformAdmin } from './components/platform/PlatformAdmin';
import { StaffLogin } from './components/StaffLogin';
import { StaffWorkspace } from './components/staff/StaffWorkspace';

type Surface = 'customer' | 'staff' | 'platform' | 'team' | 'settings' | 'register';

const params = new URLSearchParams(window.location.search);

export default function App() {
  const [surface, setSurface] = useState<Surface>(
    (
      ['customer', 'staff', 'platform', 'team', 'settings', 'register'].includes(
        params.get('surface') || ''
      )
        ? params.get('surface')
        : 'customer'
    ) as Surface
  );

  const [restaurantId, setRestaurantId] = useState(
    params.get('restaurant') || 'braise-burger'
  );

  const [language, setLanguage] = useState<Language>(
    ['fr', 'ar', 'en'].includes(params.get('lang') || '')
      ? (params.get('lang') as Language)
      : 'fr'
  );

  const [, render] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(!backendEnabled);

  useEffect(() => {
    let alive = true;
    let pending = false;

    const sync = () => {
      if (alive) render(n => n + 1);
    };

    const showError = (e: Event) => {
      if (alive) setError((e as CustomEvent).detail);
    };

    const refresh = async () => {
      if (pending) return;
      pending = true;

      try {
        await storage.refresh();

        if (alive) {
          setReady(true);
          setError('');
        }
      } catch (e) {
        if (alive) {
          setReady(true);
          setError(
            e instanceof Error
              ? e.message
              : 'Connexion interrompue. Les commandes ne peuvent pas être confirmées tant que le service est indisponible.'
          );
        }
      } finally {
        pending = false;
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, sync);
    window.addEventListener(ERROR_EVENT_NAME, showError);

    if (backendEnabled) refresh();

    const timer = window.setInterval(() => {
      if (backendEnabled) refresh();
    }, 5000);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener(SYNC_EVENT_NAME, sync);
      window.removeEventListener(ERROR_EVENT_NAME, showError);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (surface === 'customer') {
      url.searchParams.delete('surface');
      url.searchParams.delete('module');
    } else {
      url.searchParams.set('surface', surface);
    }

    window.history.replaceState(null, '', url);
  }, [surface]);

  const user = storage.user;
  const restaurants = storage.getRestaurants();

  const selectable =
    user?.role === 'platform_admin'
      ? restaurants
      : restaurants.filter(
          r => r.id === (user?.restaurantId || restaurantId)
        );

  const selectedId =
    user &&
    (surface !== 'customer' || !params.has('restaurant')) &&
    user.role !== 'platform_admin'
      ? user.restaurantId
      : restaurantId;

  const restaurant = restaurants.find(
    r => r.id === selectedId || r.slug === selectedId
  );

  useEffect(() => {
    if (!restaurant) return;

    document.title =
      surface === 'platform'
        ? 'MIDA · Administration'
        : restaurant.name;

    const url = new URL(window.location.href);
    url.searchParams.set(
      'restaurant',
      restaurant.slug || restaurant.id
    );
    window.history.replaceState(null, '', url);

    const icon =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]') ||
      document.createElement('link');

    icon.rel = 'icon';
    icon.href =
      restaurant.logoImage ||
      `${import.meta.env.BASE_URL}menu-placeholder.svg`;

    document.head.appendChild(icon);
  }, [
    restaurant?.id,
    restaurant?.name,
    restaurant?.logoImage,
    surface,
  ]);

  const canManageTeam =
    user?.role === 'owner' || user?.role === 'platform_admin';

  const canConfigure = ['owner', 'manager', 'platform_admin'].includes(
    user?.role || ''
  );

  const protectedSurface = surface !== 'customer';

  if (!ready) {
    return (
      <div
        className="min-h-screen bg-[#080305] text-white p-8"
        role="status"
      >
        Connexion au restaurant…
      </div>
    );
  }

  if (protectedSurface && !restaurant && error.includes('Session verrouillée')) return <StaffLogin restaurantName="MIDA" restaurantId={restaurantId} onSuccess={()=>{setError('');setReady(true);}}/>;

  if (!restaurant) {
    return (
      <main className="p-8 text-white bg-neutral-950 min-h-screen">
        <h1>Restaurant indisponible</h1>
        <p role="alert">
          {error || 'Vérifiez le lien de votre restaurant.'}
        </p>
        <button
          onClick={() =>
            storage
              .logout()
              .then(() => window.location.reload())
              .catch(e => storage.report(e))
          }
        >
          Déconnecter la session et réessayer
        </button>
      </main>
    );
  }

  if (protectedSurface && !user) {
    return (
      <StaffLogin
        restaurantName={
          surface === 'platform' ? 'MIDA' : restaurant.name
        }
        restaurantId={restaurant.id}
        onSuccess={() => {
          setRestaurantId(storage.user?.restaurantId || restaurantId);
          setSurface(
            storage.user?.role === 'platform_admin'
              ? 'platform'
              : storage.user?.role === 'kitchen' ? 'staff' : 'register'
          );
        }}
      />
    );
  }

  const allowedSurface = user?.role === 'platform_admin' && surface !== 'customer' ? 'platform' :
    (surface === 'platform' && user?.role !== 'platform_admin') ||
    (surface === 'team' && !canManageTeam) ||
    (surface === 'settings' && !canConfigure)
      ? 'staff'
      : surface;

  const table = Number(params.get('table'));

  const activeTable =
    Number.isInteger(table) && table > 0 && params.get('token')
      ? table
      : undefined;

  const accent = restaurant.accentColor || '#f59e0b';

  const luminance = [1, 3, 5]
    .map(i => parseInt(accent.slice(i, i + 2), 16) / 255)
    .map(v =>
      v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    )
    .reduce(
      (sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i],
      0
    );

  return (
    <div
      className={`restaurant-brand min-h-screen bg-[#080305] text-neutral-100 flex flex-col ${allowedSurface === 'register' ? 'register-shell' : ''}`}
      style={
        {
          '--restaurant-accent': accent,
          '--restaurant-on-accent':
            luminance > 0.179 ? '#080305' : '#ffffff',
        } as React.CSSProperties
      }
    >
      {!backendEnabled && (
        <p
          role="status"
          className="p-3 bg-amber-950/40 text-amber-200 text-center text-sm"
        >
          Aperçu du menu · Les commandes en ligne seront disponibles
          après l’activation du service.
        </p>
      )}

      {error && allowedSurface === 'customer' && (
        <div
          role="alert"
          className="bg-red-950 text-red-200 p-3 flex justify-between gap-3"
        >
          Connexion au restaurant interrompue. Votre commande ne sera confirmée qu’après réception par le service.
          <button
            aria-label="Fermer le message"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      {allowedSurface === 'customer' && (
        <CustomerApp
          key={restaurant.id}
          restaurant={restaurant}
          language={language}
          onLanguageChange={setLanguage}
          activeTableNumber={activeTable}
        />
      )}

      {user && allowedSurface !== 'customer' && allowedSurface !== 'platform' && user.role !== 'platform_admin' && (
        <StaffWorkspace key={`${restaurant.id}:${user.id}`} restaurant={restaurant} initial={allowedSurface} onCustomer={() => setSurface('customer')} />
      )}

      {allowedSurface === 'platform' &&
        user?.role === 'platform_admin' && (
          <PlatformAdmin
            restaurants={restaurants}
            currentRestaurantId={restaurant.id}
            onSelectRestaurant={setRestaurantId}
            onNavigateToCustomer={() => setSurface('customer')}
            onNavigateToStaff={() => setSurface('staff')}
          />
        )}
    </div>
  );
}
