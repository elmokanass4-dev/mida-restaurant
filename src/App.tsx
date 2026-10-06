import React,{useState,useEffect} from 'react';
import {Language} from './types';
import {storage,SYNC_EVENT_NAME,ERROR_EVENT_NAME} from './services/storageAdapter';
import {backendEnabled} from './services/api';
import {CustomerApp} from './components/customer/CustomerApp';
import {StaffDashboard} from './components/staff/StaffDashboard';
import {PlatformAdmin} from './components/platform/PlatformAdmin';
import {StaffLogin} from './components/StaffLogin';
import {TeamManagement} from './components/TeamManagement';
import {PasswordChange} from './components/PasswordChange';
type Surface='customer'|'staff'|'platform'|'team';
const params=new URLSearchParams(window.location.search);
export default function App(){
  const [surface,setSurface]=useState<Surface>(params.get('surface')==='platform'?'platform':params.get('surface')==='staff'?'staff':'customer');
  const [restaurantId,setRestaurantId]=useState(params.get('restaurant')||'braise-burger');
  const [language,setLanguage]=useState<Language>(['fr','ar','en'].includes(params.get('lang')||'')?params.get('lang') as Language:'fr');
  const [,render]=useState(0),[error,setError]=useState(''),[ready,setReady]=useState(!backendEnabled);
  useEffect(()=>{
    let alive=true,pending=false;
    const sync=()=>{if(alive)render(n=>n+1);};
    const showError=(e:Event)=>{if(alive)setError((e as CustomEvent).detail);};
    const refresh=async()=>{if(pending)return;pending=true;try{await storage.refresh();if(alive){setReady(true);setError('');}}catch{if(alive){setReady(true);setError('Connexion interrompue. Les commandes ne peuvent pas être confirmées tant que le service est indisponible.');}}finally{pending=false;}};
    window.addEventListener(SYNC_EVENT_NAME,sync);window.addEventListener(ERROR_EVENT_NAME,showError);
    if(backendEnabled)refresh();
    const timer=window.setInterval(()=>{if(backendEnabled)refresh();},5000);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener(SYNC_EVENT_NAME,sync);window.removeEventListener(ERROR_EVENT_NAME,showError);};
  },[]);
  useEffect(()=>{document.documentElement.dir=language==='ar'?'rtl':'ltr';document.documentElement.lang=language;},[language]);
  const user=storage.user;
  const restaurants=storage.getRestaurants();
  const selectable=user?.role==='platform_admin'?restaurants:restaurants.filter(r=>r.id===(user?.restaurantId||restaurantId));
  const restaurant=restaurants.find(r=>r.id===(user&&surface!=='customer'&&user.role!=='platform_admin'?user.restaurantId:restaurantId))||restaurants[0];
  const canManageTeam=user?.role==='owner'||user?.role==='platform_admin';
  const protectedSurface=surface!=='customer';
  if(!ready)return <div className="min-h-screen bg-[#080305] text-white p-8" role="status">Connexion au restaurant…</div>;
  if(protectedSurface&&!user)return <StaffLogin onSuccess={()=>{setRestaurantId(storage.user?.restaurantId||restaurantId);setSurface(storage.user?.role==='platform_admin'?'platform':'staff');}}/>;
  const allowedSurface=surface==='platform'&&user?.role!=='platform_admin'||surface==='team'&&!canManageTeam?'staff':surface;
  const table=Number(params.get('table'));
  const activeTable=Number.isInteger(table)&&table>0&&params.get('token')?table:undefined;
  return <div className="min-h-screen bg-[#080305] text-neutral-100 flex flex-col">
    {user&&<nav aria-label="Navigation de l’équipe" className="p-3 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center gap-3 text-sm">
      <button onClick={()=>setSurface('customer')} className="text-amber-300">Menu client</button>
      <button onClick={()=>setSurface('staff')} className="text-amber-300">Écran Staff / Cuisine</button>
      {user.role==='platform_admin'&&<button onClick={()=>setSurface('platform')} className="text-amber-300">Plateforme SaaS</button>}
      {canManageTeam&&<button onClick={()=>setSurface('team')} className="text-amber-300">Équipe</button>}
      {user.role==='platform_admin'&&<select aria-label="Restaurant" value={restaurant.id} onChange={e=>setRestaurantId(e.target.value)} className="bg-neutral-900 p-2 rounded">{selectable.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>}
      <span className="ml-auto text-neutral-400">{user.email} · {user.role}</span>
      <PasswordChange/>
      <button onClick={()=>storage.logout().then(()=>{setSurface('customer');setError('');}).catch(e=>storage.report(e))} className="underline">Déconnexion</button>
    </nav>}
    {!backendEnabled&&<p role="status" className="p-3 bg-amber-950/40 text-amber-200 text-center text-sm">Aperçu du menu · Les commandes en ligne seront disponibles après l’activation du service.</p>}
    {error&&<div role="alert" className="bg-red-950 text-red-200 p-3 flex justify-between gap-3">{error}<button aria-label="Fermer le message" onClick={()=>setError('')}>×</button></div>}
    {allowedSurface==='customer'&&<CustomerApp key={restaurant.id} restaurant={restaurant} language={language} onLanguageChange={setLanguage} activeTableNumber={activeTable}/>}
    {allowedSurface==='staff'&&user&&<StaffDashboard key={`${restaurant.id}:${user.role}`} restaurant={restaurant} onSwitchToCustomerView={()=>setSurface('customer')}/>}
    {allowedSurface==='team'&&canManageTeam&&<TeamManagement key={restaurant.id} restaurantId={restaurant.id}/>}
    {allowedSurface==='platform'&&user?.role==='platform_admin'&&<PlatformAdmin restaurants={restaurants} currentRestaurantId={restaurant.id} onSelectRestaurant={setRestaurantId} onNavigateToCustomer={()=>setSurface('customer')} onNavigateToStaff={()=>setSurface('staff')}/>}
    {!user&&surface==='customer'&&<footer className="p-5 pb-24 text-center text-xs text-neutral-500"><a href={`${import.meta.env.BASE_URL}?surface=staff&restaurant=${encodeURIComponent(restaurant.id)}`}>Espace équipe</a></footer>}
  </div>;
}
