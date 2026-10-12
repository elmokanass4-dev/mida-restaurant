import {useEffect,useRef,useState} from 'react';

import {type LucideIcon,Bell,Menu,ShoppingCart,ChefHat,Users,Settings,Table2,BarChart3,Package,Utensils,Receipt,Volume2} from 'lucide-react';

import {Restaurant,Order} from '../../types';

import {storage,SYNC_EVENT_NAME} from '../../services/storageAdapter';

import {api} from '../../services/api';

import {RegisterWorkspace} from './RegisterWorkspace';

import {StaffDashboard} from './StaffDashboard';

import {TeamManagement} from '../TeamManagement';

import {RestaurantSettings} from '../RestaurantSettings';

import {PasswordChange} from '../PasswordChange';

import './workspace.css';
import {PreparationPrint} from './PreparationPrint';

const money=(n:number)=>new Intl.NumberFormat('fr-MA',{style:'currency',currency:'MAD'}).format(n);

const labels:Record<string,string>={submitted:'À accepter',accepted:'À préparer',preparing:'En préparation',ready:'Prête',out_for_delivery:'En livraison',completed:'Servie',rejected:'Refusée',cancelled:'Annulée'};

export function StaffWorkspace({restaurant,initial,onCustomer}:{restaurant:Restaurant;initial:string;onCustomer:()=>void}){

 const role=storage.user!.role,owner=role==='owner',manager=owner||role==='manager',kitchen=role==='kitchen';

 const [collapsed,setCollapsed]=useState(false);

 const [page,setPage]=useState(kitchen?'kitchen':initial==='team'&&owner?'team':initial==='settings'&&manager?'settings':'sale');

 const [drawer,setDrawer]=useState(false),[panel,setPanel]=useState(false),[orders,setOrders]=useState(()=>storage.getOrders(restaurant.id)),[last,setLast]=useState(''),[error,setError]=useState(''),[sound,setSound]=useState(false),[banner,setBanner]=useState(''),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false);

 const [printOrder,setPrintOrder]=useState<Order|null>(null);
 const [customers,setCustomers]=useState<{id:string;name:string;loyaltyPoints:number;totalOrdersCount:number}[]>([]);
 const [systemNotice,setSystemNotice]=useState('Notifications système désactivées');

 const [reminder,setReminder]=useState(60),[overdue,setOverdue]=useState(5);

 const audio=useRef<AudioContext|null>(null),seen=useRef(new Set<string>()),soundOn=useRef(false),inFlight=useRef(false),notificationDialog=useRef<HTMLDialogElement>(null),navDialog=useRef<HTMLDialogElement>(null);

 const pending=orders.filter(o=>o.status==='submitted');

 const entries: [string,string,LucideIcon][]=[...(!kitchen?[['sale','Caisse',ShoppingCart],['inbox','Commandes',Bell],['tables','Tables',Table2]]:[]),['kitchen','Cuisine',ChefHat],...(manager||kitchen?[['menu','Carte & disponibilités',Utensils]]:[]),...(manager?[['stock','Stock',Package]]:[]),...(owner?[['report','Vue d’ensemble / Rapports',BarChart3],['customers','Clients & fidélité',Users],['team','Équipe',Users]]:[]),...(!kitchen&&role!=='waiter'?[['cash','Ma session',Receipt],['documents','Documents',Receipt]]:[]),...(manager?[['settings','Paramètres',Settings]]:[])] as [string,string,LucideIcon][];

 function beep(){const ctx=audio.current;if(!ctx||ctx.state!=='running')return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);gain.gain.value=.12;osc.frequency.value=880;osc.start();osc.stop(ctx.currentTime+.2);}

 function alertSound(){if(!soundOn.current)return;const key=`mida-alert:${restaurant.id}`;const play=()=>{try{const now=Date.now();if(now-Number(localStorage.getItem(key))<5000)return;localStorage.setItem(key,String(now));beep();}catch{beep();}};if(navigator.locks)void navigator.locks.request(key,{ifAvailable:true},lock=>{if(lock)play();});else play();}

 useEffect(()=>{const sync=()=>{const next=storage.getOrders(restaurant.id);setOrders(next);setLast(new Date().toLocaleTimeString('fr-MA'));setError('');const events=next.filter(o=>(o.status==='submitted'||o.status==='ready')&&!seen.current.has(`${o.id}:${o.status}`));for(const o of next)seen.current.add(`${o.id}:${o.status}`);if(events.length){setBanner(`${events.length} commande(s) à consulter`);alertSound();if('Notification' in window&&Notification.permission==='granted'&&document.hidden){try{const n=new Notification('MIDA · Commandes à consulter',{body:`${events.length} événement(s)`,tag:`mida-${restaurant.id}`});n.onclick=()=>{window.focus();setPanel(true);};}catch{setSystemNotice('Notifications système indisponibles ici. Alertes visuelles actives.');}}}};sync();window.addEventListener(SYNC_EVENT_NAME,sync);const failure=(e:Event)=>{const message=String((e as CustomEvent).detail);setError(message);if(message.includes('Session verrouillée'))setLocked(true);};window.addEventListener('mida_service_error',failure);return()=>{window.removeEventListener(SYNC_EVENT_NAME,sync);window.removeEventListener('mida_service_error',failure);};},[restaurant.id]);

 useEffect(()=>{const timer=setInterval(()=>{if(storage.getOrders(restaurant.id).some(o=>o.status==='submitted'))alertSound();},reminder*1000);return()=>clearInterval(timer);},[reminder,restaurant.id]);

 useEffect(()=>()=>{void audio.current?.close();},[]);

 useEffect(()=>{const d=notificationDialog.current;if(panel)d?.showModal();else d?.close();},[panel]);

 useEffect(()=>{const d=navDialog.current;if(drawer)d?.showModal();else d?.close();},[drawer]);

 useEffect(()=>{let lastActivity=0;const activity=()=>{if(Date.now()-lastActivity>45000){lastActivity=Date.now();void api('/session/activity','POST',{}).catch(()=>{});}};window.addEventListener('pointerdown',activity);window.addEventListener('keydown',activity);return()=>{window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};},[]);

 async function change(o:Order,status:string,reason?:string){if(inFlight.current)return;inFlight.current=true;setBusy(true);try{await api(`/orders/${o.id}/status`,'PATCH',{status,expectedStatus:o.status,rejectionReason:reason,reason});await storage.refresh();if(status==='accepted'){setSelected(o.id);navigate('orders');setPanel(false);}}catch(e){setError((e as Error).message);}finally{inFlight.current=false;setBusy(false);}}

 useEffect(()=>{const requested=new URLSearchParams(location.search).get('module');if(requested&&entries.some(e=>e[0]===requested))setPage(requested);},[]);

 const navigate=(id:string)=>{if(id==='customers'&&owner)void api<typeof customers>(`/register/${restaurant.id}/customers`).then(setCustomers).catch(e=>setError(e.message));setPage(id);setDrawer(false);const url=new URL(location.href);url.searchParams.set('module',id);history.replaceState(null,'',url);};

 const navigation=<><strong className="ws-logo">MIDA <small>Restaurant</small></strong><p>OPÉRATIONS & GESTION</p>{entries.map(([id,label,Icon])=><button key={id} aria-current={page===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={19}/><span>{label}</span>{id==='inbox'&&pending.length>0&&<b>{pending.length}</b>}</button>)}<button onClick={onCustomer}>Voir le menu client ↗</button></>;

 const ticket=(o:Order)=><article className="ws-card" key={o.id}><h3>{o.orderNumber} · {o.tableNumber?`Table ${o.tableNumber}`:o.mode==='delivery'?'Livraison':'À emporter'}</h3><p>{labels[o.status]} · {Math.max(0,Math.floor((Date.now()-Date.parse(o.createdAt))/60000))} min · {new Date(o.createdAt).toLocaleTimeString('fr-MA')}</p><p>{o.channel==='staff'?'Saisie équipe':'Commande client'} · {o.customerNotes}</p>{o.items.map((i,n)=><p key={n}><strong>{i.quantity} × {i.dishName}</strong><br/>{i.selectedModifiers.map(m=>m.optionName).join(', ')} {i.itemNotes}</p>)}{!kitchen&&page!=='kitchen'&&<p>{money(o.totalMAD)} · {{unpaid:'Non payé',pending:'Partiellement payé',paid:'Payé',refunded:'Remboursé',partially_refunded:'Remboursement partiel',failed:'Échec'}[o.paymentStatus]} · {o.customerName}</p>}{o.status==='submitted'&&!kitchen&&<><button disabled={busy} onClick={()=>void change(o,'accepted')}>Accepter et ouvrir en caisse</button><form onSubmit={e=>{e.preventDefault();void change(o,'rejected',String(new FormData(e.currentTarget).get('reason')));}}><input name="reason" required aria-label="Motif de refus" placeholder="Motif de refus"/><button disabled={busy}>Refuser</button></form></>}{!['submitted','cancelled','rejected'].includes(o.status)&&<button onClick={()=>setPrintOrder(o)}>Bon de préparation</button>}{o.status==='accepted'&&<button disabled={busy} onClick={()=>void change(o,'preparing')}>Commencer la préparation</button>}{o.status==='preparing'&&<button disabled={busy} onClick={()=>void change(o,o.mode==='delivery'?'out_for_delivery':'ready')}>Marquer prêt</button>}{['ready','out_for_delivery'].includes(o.status)&&!kitchen&&<button disabled={busy} onClick={()=>void change(o,'completed')}>Servi / remis au client</button>}{!kitchen&&o.status!=='submitted'&&<button onClick={()=>{setSelected(o.id);navigate('orders');setPanel(false);}}>Ouvrir le ticket</button>}</article>;

 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>setLocked(true),300000);};reset();window.addEventListener('pointerdown',reset);window.addEventListener('keydown',reset);return()=>{clearTimeout(timer);window.removeEventListener('pointerdown',reset);window.removeEventListener('keydown',reset);};},[]);
 return <>{locked&&<main className="ws-lock" role="dialog" aria-modal="true" aria-label="Terminal verrouillé"><h1>Terminal verrouillé</h1><p>Le ticket reste ouvert. Reconnectez-vous avec votre compte.</p><form onSubmit={async e=>{e.preventDefault();const password=String(new FormData(e.currentTarget).get('password'));try{await storage.login(storage.user!.email,password);setLocked(false);setError('');}catch(e){setError((e as Error).message);}}}><label>Mot de passe<input autoFocus name="password" type="password" autoComplete="current-password" required/></label><button>Déverrouiller</button></form><button onClick={()=>void storage.logout().catch(e=>setError(e.message))}>Changer d’utilisateur</button><p role="alert">{error}</p></main>}<div inert={locked} className={`ws-shell ${collapsed?'ws-collapsed':''}`}><aside className="ws-sidebar"><button aria-label="Réduire ou agrandir la navigation" onClick={()=>setCollapsed(!collapsed)}><Menu/></button>{navigation}</aside><div className="ws-main"><header className="ws-header"><button className="ws-menu" aria-label="Ouvrir la navigation" onClick={()=>setDrawer(true)}><Menu/></button><div><h1>{entries.find(e=>e[0]===page)?.[1]||'Ticket'}</h1><small>{restaurant.name} · {error?'Synchronisation à vérifier':`Dernière synchronisation ${last||'en cours'}`}</small></div><button aria-label={`Notifications, ${pending.length} commandes en attente`} onClick={()=>setPanel(true)}><Bell size={20}/> {pending.length}</button><details><summary>Mon compte</summary><p>{storage.user?.email}</p><PasswordChange/><button onClick={()=>void api('/session/lock','POST',{}).then(()=>setLocked(true)).catch(e=>setError(e.message))}>Verrouiller</button><button onClick={()=>void storage.logout().catch(e=>setError(e.message))}>Déconnexion / changer d’utilisateur</button></details></header>

 {error&&<p role="alert" className="ws-error">{error}</p>}{banner&&<div className="ws-banner" role="status"><button onClick={()=>setPanel(true)}>{banner}</button><button aria-label="Fermer l’annonce" onClick={()=>setBanner('')}>×</button></div>}{manager&&pending.some(o=>Date.now()-Date.parse(o.createdAt)>overdue*60000)&&<p className="ws-banner">Attention responsable : commandes en attente depuis plus de {overdue} minutes.</p>}

 {!kitchen&&<div hidden={!['sale','orders','cash','documents','report','stock','setup'].includes(page)}><RegisterWorkspace restaurant={restaurant} module={['sale','orders','cash','documents','report','stock','setup'].includes(page)?page:undefined} orderId={selected}/></div>}

 {page==='inbox'&&<section className="ws-content"><h2>À accepter ({pending.length})</h2><p>Prix et options conservés depuis la commande client. L’acceptation ne vaut pas paiement.</p><div className="ws-grid">{pending.map(ticket)}</div>{!pending.length&&<p>Aucune commande en attente.</p>}<h2>Prêtes à servir</h2><div className="ws-grid">{orders.filter(o=>['ready','out_for_delivery'].includes(o.status)).map(ticket)}</div></section>}

 {page==='kitchen'&&<section className="ws-kitchen"><button onClick={()=>void document.documentElement.requestFullscreen().catch(()=>setError('Plein écran indisponible.'))}>Plein écran cuisine</button><div className="ws-grid">{['accepted','preparing','ready'].map(status=><section key={status}><h2>{labels[status]}</h2>{orders.filter(o=>o.status===status||(status==='ready'&&o.status==='out_for_delivery')).map(ticket)}</section>)}</div></section>}

 {page==='tables'&&<section className="ws-content"><h2>Commandes en salle</h2><div className="ws-grid">{orders.filter(o=>o.mode==='table'&&!['completed','cancelled','rejected'].includes(o.status)).map(ticket)}</div></section>}{['tables','menu'].includes(page)&&<StaffDashboard key={page} restaurant={restaurant} module={page as 'tables'|'menu'} onSwitchToCustomerView={onCustomer}/>}

 {page==='customers'&&owner&&<section className="ws-content"><h2>Clients & fidélité</h2><p>Soldes issus du service du restaurant. Les points sont attribués par réclamation unique du QR après paiement.</p><div className="ws-grid">{customers.map(c=><article className="ws-card" key={c.id}><h3>{c.name}</h3><p>{c.loyaltyPoints} points · {c.totalOrdersCount} commandes servies</p></article>)}</div></section>}
 {page==='team'&&owner&&<TeamManagement restaurantId={restaurant.id}/>}

 {manager&&<section hidden={page!=='settings'} className="ws-content"><h2>Paramètres du restaurant</h2><button onClick={()=>navigate('setup')}>Caisse, fiscalité pilote et matériel</button><button onClick={()=>setPanel(true)}>Notifications</button><RestaurantSettings restaurant={restaurant}/></section>}

 </div>{printOrder&&<PreparationPrint order={printOrder} onClose={()=>setPrintOrder(null)}/>}<dialog ref={navDialog} className="ws-nav-dialog" onCancel={()=>setDrawer(false)}><button onClick={()=>setDrawer(false)}>Fermer</button>{navigation}</dialog><dialog ref={notificationDialog} className="ws-notifications" onCancel={()=>setPanel(false)}><button autoFocus onClick={()=>setPanel(false)}>Fermer</button><h2>Notifications · {pending.length} à accepter</h2><p>{sound?'Son activé':'Son coupé'} · Alertes lorsque cette application est ouverte.</p><button onClick={async()=>{try{audio.current??=new AudioContext();await audio.current.resume();soundOn.current=!sound;setSound(!sound);if(!sound)beep();}catch{setError('Son indisponible. Les alertes visuelles restent actives.');}}}><Volume2 size={18}/>{sound?'Couper le son':'Activer le son'}</button><button disabled={!sound} onClick={beep}>Tester le son</button><p>{systemNotice}</p><button onClick={async()=>{if(!('Notification' in window)){setSystemNotice('Notifications système non prises en charge.');return;}try{const p=await Notification.requestPermission();setSystemNotice(p==='granted'?'Notifications système autorisées':p==='denied'?'Autorisation refusée. Alertes visuelles actives.':'Autorisation non accordée.');}catch{setSystemNotice('Notifications indisponibles. Alertes visuelles actives.');}}}>Autoriser les notifications système</button><label>Rappel (secondes)<input type="number" min={15} max={600} value={reminder} onChange={e=>setReminder(Math.max(15,Number(e.target.value)))}/></label><label>Retard (minutes)<input type="number" min={1} value={overdue} onChange={e=>setOverdue(Math.max(1,Number(e.target.value)))}/></label><p>Fermer cette fenêtre ne résout aucune commande.</p>{pending.map(ticket)}</dialog></div></>;

}

