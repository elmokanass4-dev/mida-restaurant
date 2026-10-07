import {useState} from 'react';
import {Restaurant} from '../types';
import {storage} from '../services/storageAdapter';
export function RestaurantOperations({restaurant}:{restaurant:Restaurant}){
  const [draft,setDraft]=useState({orderingModes:restaurant.orderingModes,prepTimeEstimateMinutes:restaurant.prepTimeEstimateMinutes,taxRatePercent:restaurant.taxRatePercent,deliverySettings:restaurant.deliverySettings});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const input='block w-full bg-black rounded p-2';const delivery=draft.deliverySettings;
  return <form className="bg-neutral-900 rounded-xl p-4 space-y-3" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{await storage.mutate(`/restaurants/${restaurant.id}/operations`,'PATCH',draft);setMessage('Service enregistré.');}catch(e){setMessage(e instanceof Error?e.message:'Erreur');}finally{setBusy(false);}}}>
    <h2 className="font-bold">Modes de commande et livraison</h2>
    {(['table','pickup','delivery'] as const).map((k,i)=><label className="block" key={k}><input type="checkbox" checked={draft.orderingModes[k]} onChange={e=>setDraft({...draft,orderingModes:{...draft.orderingModes,[k]:e.target.checked}})}/> {['Sur place','À emporter','Livraison'][i]}</label>)}
    {(['prepTimeEstimateMinutes','taxRatePercent'] as const).map((k,i)=><label className="block" key={k}>{['Préparation estimée (minutes)','Taxe incluse dans les prix (%)'][i]}<input type="number" min={0} max={k==='taxRatePercent'?100:240} step="any" required value={draft[k]} onChange={e=>setDraft({...draft,[k]:Number(e.target.value)})} className={input}/></label>)}
    <label className="block"><input type="checkbox" checked={delivery.isPaused} onChange={e=>setDraft({...draft,deliverySettings:{...delivery,isPaused:e.target.checked}})}/> Livraison en pause</label>
    {(['minOrderMAD','deliveryFeeMAD'] as const).map((k,i)=><label className="block" key={k}>{['Minimum de livraison (MAD)','Frais de livraison par défaut (MAD)'][i]}<input type="number" min={0} max={10000} step={0.01} required value={delivery[k]} onChange={e=>setDraft({...draft,deliverySettings:{...delivery,[k]:Number(e.target.value)}})} className={input}/></label>)}
    <label className="block">Délai de livraison affiché<input value={delivery.estimatedRange} onChange={e=>setDraft({...draft,deliverySettings:{...delivery,estimatedRange:e.target.value}})} className={input}/></label>
    {delivery.zones.map((z,i)=><fieldset key={z.id} className="border border-neutral-700 p-3 space-y-2"><legend>Zone {i+1}</legend>{(['name','feeMAD','minSpendMAD'] as const).map((k,j)=><label className="block" key={k}>{['Nom de zone','Frais (MAD)','Minimum (MAD)'][j]}<input required type={k==='name'?'text':'number'} min={0} max={10000} step={0.01} value={z[k]} className={input} onChange={e=>setDraft({...draft,deliverySettings:{...delivery,zones:delivery.zones.map((zone,index)=>index===i?{...zone,[k]:k==='name'?e.target.value:Number(e.target.value)}:zone)}})}/></label>)}<label><input type="checkbox" checked={z.active} onChange={e=>setDraft({...draft,deliverySettings:{...delivery,zones:delivery.zones.map((zone,index)=>index===i?{...zone,active:e.target.checked}:zone)}})}/> Zone active</label></fieldset>)}
    <button type="button" className="underline block" disabled={delivery.zones.length>=30} onClick={()=>setDraft({...draft,deliverySettings:{...delivery,zones:[...delivery.zones,{id:crypto.randomUUID(),name:'',feeMAD:0,minSpendMAD:0,active:true}]}})}>Ajouter une zone</button>
    <button disabled={busy} className="bg-amber-400 text-black p-2 rounded">Enregistrer le service</button>{message&&<p role="status">{message}</p>}
  </form>;
}
