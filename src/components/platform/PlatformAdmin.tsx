import React from 'react';
import {Restaurant} from '../../types';
import {storage} from '../../services/storageAdapter';
import {RestaurantOnboarding} from './RestaurantOnboarding';
interface Props {restaurants:Restaurant[];currentRestaurantId:string;onSelectRestaurant:(id:string)=>void;onNavigateToCustomer:()=>void;onNavigateToStaff:()=>void}
export const PlatformAdmin:React.FC<Props>=({restaurants,currentRestaurantId,onSelectRestaurant,onNavigateToCustomer,onNavigateToStaff})=><main className="p-5 max-w-5xl mx-auto w-full space-y-6">
  <h1 className="text-2xl font-bold">MIDA · Administration</h1>
  <p className="text-neutral-400">Gérez vos restaurants et leurs accès depuis cet espace réservé à l’administrateur MIDA.</p>
  <RestaurantOnboarding/>
  <h2 className="text-xl font-bold">Restaurants</h2>
  <div className="grid md:grid-cols-2 gap-4">{restaurants.map(r=><article key={r.id} className="rounded-xl border border-neutral-700 bg-neutral-900 p-5 space-y-3">
    <h3 className="text-lg font-bold">{r.name}</h3><p>{r.city} · {r.isOpen?'Commandes ouvertes':'Commandes fermées'}</p>
    <p className="text-sm">{storage.getDishes(r.id).length} plats · {storage.getOrders(r.id).length} commandes</p>
    <a className="block underline" href={`${import.meta.env.BASE_URL}?restaurant=${encodeURIComponent(r.slug)}`}>Menu client : {r.slug}</a>
    <a className="block underline" href={`${import.meta.env.BASE_URL}?restaurant=${encodeURIComponent(r.slug)}&surface=staff`}>Connexion du restaurant</a>
    <button className="p-2 bg-amber-400 text-black rounded" onClick={()=>onSelectRestaurant(r.id)}>{currentRestaurantId===r.id?'Restaurant sélectionné':'Sélectionner'}</button>
  </article>)}</div>
  <div className="flex gap-4"><button className="underline" onClick={onNavigateToCustomer}>Voir le menu sélectionné</button><button className="underline" onClick={onNavigateToStaff}>Gérer le service sélectionné</button></div>
</main>;
