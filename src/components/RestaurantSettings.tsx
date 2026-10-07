import {useState,useEffect} from 'react';
import {Restaurant} from '../types';
import {storage} from '../services/storageAdapter';
import {MenuBuilder} from './MenuBuilder';
import {RestaurantOperations} from './RestaurantOperations';
const inputClass='block w-full bg-black p-2 rounded border border-neutral-700 mt-1';
export function RestaurantSettings({restaurant}:{restaurant:Restaurant}){
  const [rules,setRules]=useState({...restaurant.loyaltyConfig,enabled:restaurant.loyaltyConfig.enabled??true,claimDays:restaurant.loyaltyConfig.claimDays??30,minRewardSpendMAD:restaurant.loyaltyConfig.minRewardSpendMAD??50});
  const [promo,setPromo]=useState(restaurant.promotion??{enabled:false,code:'BIENVENUE',percent:10,maxDiscountMAD:20,minSpendMAD:50,expiresAt:new Date(Date.now()+30*86400000).toISOString()});
  const [details,setDetails]=useState({name:restaurant.name,address:restaurant.address,phone:restaurant.phone,openingHours:restaurant.openingHours,tableCount:restaurant.tableCount});
  const [branding,setBranding]=useState({accentColor:restaurant.accentColor,logoImage:restaurant.logoImage||'',coverImage:restaurant.coverImage||'',city:restaurant.city,tagline:restaurant.tagline});
  const dishes=storage.getDishes(restaurant.id),[dishId,setDishId]=useState(dishes[0]?.id||'');
  const [draft,setDraft]=useState(dishes[0]);
  useEffect(()=>{if(!draft&&dishes.length){setDraft(dishes[0]);setDishId(dishes[0].id);}},[draft,dishes]);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function save(path:string,body:unknown){setBusy(true);setMessage('');try{await storage.mutate(path,'PATCH',body);setMessage('Configuration enregistrée.');}catch(e){setMessage(e instanceof Error?e.message:'Enregistrement impossible.');}finally{setBusy(false);}}
  return <section className="p-5 max-w-3xl mx-auto w-full text-white space-y-6">
    <h1 className="text-xl font-bold">Configuration du restaurant</h1>
    {message&&<p role="status" className="p-3 bg-amber-950 rounded">{message}</p>}
    <div className="bg-neutral-900 p-4 rounded-xl"><h2 className="font-bold">Liens du restaurant</h2><a className="block underline" href={`${import.meta.env.BASE_URL}?restaurant=${encodeURIComponent(restaurant.slug)}`}>Ouvrir le menu {restaurant.name}</a><a className="block underline" href={`${import.meta.env.BASE_URL}?restaurant=${encodeURIComponent(restaurant.slug)}&surface=staff`}>Ouvrir la connexion de l’équipe</a></div>
    <form className="bg-neutral-900 p-4 rounded-xl space-y-3" onSubmit={e=>{e.preventDefault();void save(`/restaurants/${restaurant.id}/branding`,branding);}}><h2 className="font-bold">Identité visuelle</h2>
      <label className="block">Couleur principale<input type="color" value={branding.accentColor} onChange={e=>setBranding({...branding,accentColor:e.target.value})}/></label>
      {(['logoImage','coverImage','city'] as const).map((key,i)=><label className="block" key={key}>{['Logo (URL HTTPS ou chemin local)','Couverture (URL HTTPS ou chemin local)','Ville affichée'][i]}<input value={branding[key]} onChange={e=>setBranding({...branding,[key]:e.target.value})} className={inputClass}/></label>)}
      {(['fr','ar','en'] as const).map(lang=><label className="block" key={lang}>Signature ({lang})<input value={branding.tagline[lang]} onChange={e=>setBranding({...branding,tagline:{...branding.tagline,[lang]:e.target.value}})} className={inputClass}/></label>)}
      <button disabled={busy} className="bg-amber-400 text-black p-2 rounded">Enregistrer l’identité visuelle</button>
    </form>
    <MenuBuilder restaurantId={restaurant.id}/>
    <RestaurantOperations restaurant={restaurant}/>
    <form className="space-y-3 p-4 bg-neutral-900 rounded-xl" onSubmit={e=>{e.preventDefault();void save(`/restaurants/${restaurant.id}/details`,details);}}><h2 className="font-bold">Restaurant et tables</h2>
      {(['name','address','phone','openingHours'] as const).map((key,index)=><label key={key} className="block">{['Nom du restaurant','Adresse du restaurant','Téléphone du restaurant','Horaires affichés'][index]}<input required value={details[key]} onChange={e=>setDetails({...details,[key]:e.target.value})} className={inputClass}/></label>)}
      <label className="block">Nombre de tables<input type="number" min={1} max={100} required value={details.tableCount} onChange={e=>setDetails({...details,tableCount:Number(e.target.value)})} className={inputClass}/></label>
      <p className="text-xs text-neutral-400">Les horaires sont informatifs. Utilisez Ouvrir/Fermer les commandes pour contrôler le service.</p><button disabled={busy} className="bg-amber-400 p-2 text-black rounded">Enregistrer le restaurant</button>
    </form>
    <form className="space-y-3 p-4 bg-neutral-900 rounded-xl" onSubmit={e=>{e.preventDefault();void save(`/restaurants/${restaurant.id}/loyalty`,rules);}}><h2 className="font-bold">Règles de fidélité</h2>
      <label className="block"><input type="checkbox" checked={rules.enabled} onChange={e=>setRules({...rules,enabled:e.target.checked})}/> Activer la fidélité</label>
      {(['pointsPerMAD','pointsToRedeem','rewardValueMAD','minRewardSpendMAD','claimDays'] as const).map((key,index)=><label key={key} className="block">{['Points par MAD payé','Points nécessaires par récompense','Valeur de la récompense (MAD)','Minimum de nourriture par récompense (MAD)','Délai de réclamation du ticket (jours)'][index]}<input required type="number" step={key==='pointsPerMAD'?0.1:1} min={1} value={rules[key]} onChange={e=>setRules({...rules,[key]:Number(e.target.value)})} className={inputClass}/></label>)}
      <p className="text-xs text-neutral-400">Points sur la nourriture réellement payée, hors livraison. Une récompense par commande, sans cumul de promotion. Les points réclamés n’expirent pas ; seuls les tickets non réclamés expirent. Les remboursements retirent les points, y compris si le solde devient négatif.</p>
      <button disabled={busy} className="bg-amber-400 p-2 text-black rounded">Enregistrer la fidélité</button>
    </form>
    <form className="space-y-3 p-4 bg-neutral-900 rounded-xl" onSubmit={e=>{e.preventDefault();void save(`/restaurants/${restaurant.id}/promotion`,promo);}}><h2 className="font-bold">Promotion manuelle</h2><p className="text-xs text-neutral-400">Un code actif par restaurant. Aucune campagne ou notification automatique.</p>
      <label className="block"><input type="checkbox" checked={promo.enabled} onChange={e=>setPromo({...promo,enabled:e.target.checked})}/> Activer le code promotion</label>
      <label className="block">Code promotion du restaurant<input required value={promo.code} onChange={e=>setPromo({...promo,code:e.target.value.toUpperCase()})} className={inputClass}/></label>
      {(['percent','maxDiscountMAD','minSpendMAD'] as const).map((key,index)=><label key={key} className="block">{['Réduction (%)','Plafond de réduction (MAD)','Minimum du panier promotion (MAD)'][index]}<input required type="number" min={0} step={1} value={promo[key]} onChange={e=>setPromo({...promo,[key]:Number(e.target.value)})} className={inputClass}/></label>)}
      <label className="block">Expiration du code (UTC)<input required type="datetime-local" value={promo.expiresAt.slice(0,16)} onChange={e=>{if(e.target.value)setPromo({...promo,expiresAt:new Date(e.target.value+'Z').toISOString()});}} className={inputClass}/></label>
      <button disabled={busy} className="bg-amber-400 p-2 text-black rounded">Enregistrer la promotion</button>
    </form>
    {draft&&<form className="space-y-3 p-4 bg-neutral-900 rounded-xl" onSubmit={e=>{e.preventDefault();void save(`/dishes/${dishId}/details`,{priceMAD:draft.priceMAD,name:draft.name,description:draft.description});}}><h2 className="font-bold">Carte : prix et textes</h2>
      <label className="block">Plat à modifier<select value={dishId} onChange={e=>{setDishId(e.target.value);setDraft(dishes.find(d=>d.id===e.target.value)!);}} className={inputClass}>{dishes.map(d=><option key={d.id} value={d.id}>{d.name.fr}</option>)}</select></label>
      <label className="block">Prix du plat (MAD)<input required type="number" min={0} max={10000} step={0.01} value={draft.priceMAD} onChange={e=>setDraft({...draft,priceMAD:Number(e.target.value)})} className={inputClass}/></label>
      {(['fr','ar','en'] as const).map(lang=><div key={lang}><label className="block">Nom ({lang})<input required={lang==='fr'} value={draft.name[lang]} onChange={e=>setDraft({...draft,name:{...draft.name,[lang]:e.target.value}})} className={inputClass}/></label><label className="block">Description ({lang})<textarea value={draft.description[lang]} onChange={e=>setDraft({...draft,description:{...draft.description,[lang]:e.target.value}})} className={inputClass}/></label></div>)}
      <button disabled={busy} className="bg-amber-400 p-2 text-black rounded">Enregistrer le plat</button>
    </form>}
  </section>;
}
