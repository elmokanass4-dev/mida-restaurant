import {useEffect,useState} from 'react';
import {CustomerApp} from './components/customer/CustomerApp';
import {StaffDashboard} from './components/staff/StaffDashboard';
import {storage,SYNC_EVENT_NAME,ERROR_EVENT_NAME} from './services/storageAdapter';
import {Language} from './types';

export default function DemoApp(){
  const [view,setView]=useState<'customer'|'kitchen'|'owner'>('customer');
  const [language,setLanguage]=useState<Language>('fr');
  const [ready,setReady]=useState(false),[error,setError]=useState('');
  const [,render]=useState(0);
  const restaurantId='braise-burger';
  const requestedTable=Number(new URLSearchParams(window.location.search).get('table'));
  const demoTable=Number.isInteger(requestedTable)&&requestedTable>0?requestedTable:3;
  useEffect(()=>{
    const sync=()=>render(n=>n+1);
    const fail=(event:Event)=>setError((event as CustomEvent).detail);
    window.addEventListener(SYNC_EVENT_NAME,sync);window.addEventListener(ERROR_EVENT_NAME,fail);
    storage.refresh().then(()=>setReady(true)).catch(storage.report);
    return()=>{window.removeEventListener(SYNC_EVENT_NAME,sync);window.removeEventListener(ERROR_EVENT_NAME,fail);};
  },[]);
  useEffect(()=>{document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';},[language]);
  const changeView=(next:typeof view)=>storage.setDemoRole(next==='customer'?null:next,restaurantId).then(()=>{setView(next);setError('');}).catch(e=>storage.report(e));
  const restaurant=storage.getRestaurants().find(r=>r.id===restaurantId)!;
  return <div className="min-h-screen bg-[#080305] text-neutral-100">
    <header className="bg-amber-950 border-b border-amber-700 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><strong>MIDA · Démonstration pour le restaurant</strong><a className="underline text-sm" href="../">Aperçu public</a></div>
      <p className="text-sm text-amber-100">Données fictives · Commandes et paiements simulés dans ce navigateur uniquement. Aucune commande réelle n’est envoyée. Le service connecté sera activé après votre accord.</p>
      <nav aria-label="Vues de démonstration" className="flex flex-wrap gap-2">
        {([['customer','1. Client'],['kitchen','2. Cuisine'],['owner','3. Propriétaire']] as const).map(([id,label])=><button key={id} onClick={()=>changeView(id)} aria-pressed={view===id} className={`px-4 py-2 rounded-lg ${view===id?'bg-amber-400 text-black':'bg-neutral-900 text-white'}`}>{label}</button>)}
        <button className="underline text-sm ml-auto" onClick={()=>storage.resetDemo().catch(e=>storage.report(e))}>Réinitialiser les exemples</button>
      </nav>
      {view==='owner'&&<p className="text-sm text-amber-100">Version connectée préparée : comptes propriétaire, manager, cuisine, caisse et serveur avec accès limité par rôle. Leur connexion et la gestion des comptes nécessitent l’hébergement du serveur.</p>}
    </header>
    {error&&<p role="alert" className="bg-red-950 p-4">{error}</p>}
    {!ready?<p className="p-6">Préparation des exemples…</p>:view==='customer'?<CustomerApp restaurant={restaurant} language={language} onLanguageChange={setLanguage} activeTableNumber={demoTable}/>:<StaffDashboard key={view} restaurant={restaurant} onSwitchToCustomerView={()=>changeView('customer')}/>}
  </div>;
}
