import {useEffect,useRef,useState} from 'react';
import {CustomerProfile,Restaurant} from '../../types';
import {storage} from '../../services/storageAdapter';

export function ReceiptLoyaltyDemo({customer,restaurant}:{customer:CustomerProfile;restaurant:Restaurant}){
  const [code,setCode]=useState(new URLSearchParams(window.location.search).get('receipt')||'');
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[camera,setCamera]=useState(false);
  const video=useRef<HTMLVideoElement>(null);
  useEffect(()=>{
    if(!camera)return;
    let cancelled=false;let controls:{stop:()=>void}|undefined;
    import('@zxing/browser').then(async({BrowserQRCodeReader})=>{
      if(cancelled||!video.current)return;
      const reader=new BrowserQRCodeReader();
      const next=await reader.decodeFromVideoDevice(undefined,video.current,(result,_error,control)=>{
        if(result&&!cancelled){setCode(result.getText());setMessage('QR lu. Confirmez pour ajouter les points.');control.stop();setCamera(false);}
      });
      controls=next;if(cancelled)next.stop();
    }).catch(()=>{if(!cancelled){setMessage('Caméra indisponible. Importez une photo ou saisissez le code du ticket.');setCamera(false);}});
    return()=>{cancelled=true;controls?.stop();const stream=video.current?.srcObject;if(stream instanceof MediaStream)stream.getTracks().forEach(track=>track.stop());};
  },[camera]);
  async function readPhoto(file:File){
    setBusy(true);setMessage('Lecture du QR…');const url=URL.createObjectURL(file);
    try{const {BrowserQRCodeReader}=await import('@zxing/browser');const result=await new BrowserQRCodeReader().decodeFromImageUrl(url);setCode(result.getText());setMessage('QR lu. Confirmez pour ajouter les points.');}
    catch{setMessage('QR illisible. Essayez une photo plus nette ou saisissez le code.');}
    finally{URL.revokeObjectURL(url);setBusy(false);}
  }
  async function claim(){setBusy(true);try{const points=await storage.claimDemoReceipt(restaurant.id,code);setMessage(`+${points} points ajoutés ! Ce ticket ne peut être utilisé qu’une fois.`);setCode('');}catch(error){setMessage(error instanceof Error?error.message:'Action impossible.');}finally{setBusy(false);}}
  const ledger=storage.getLoyaltyLedger(restaurant.id);
  return <section className="max-w-lg mx-auto p-5 pb-24 space-y-5 text-neutral-100">
    <h2 className="text-xl font-bold">Fidélité · Scannez votre ticket payé</h2>
    <p className="bg-amber-950/40 p-3 rounded-xl text-sm text-amber-200">Compte membre fictif : {customer.name}. Exemple à valider avec le propriétaire : 1 MAD de nourriture payé = 1 point ; 100 points = 15 MAD de réduction potentielle. La remise n’est pas encore applicable au panier.</p>
    <div className="p-5 rounded-2xl border border-amber-600 bg-neutral-900"><strong className="text-3xl text-amber-400">{customer.loyaltyPoints} points</strong><p className="mt-2 text-sm">Équivalent indicatif : {Math.floor(customer.loyaltyPoints/100)*15} MAD sur un prochain repas.</p></div>
    <p className="text-sm">Après paiement, demandez le QR au caissier. Dans cette présentation, créez et réclamez le ticket dans le même navigateur : les données ne sont pas partagées entre appareils.</p>
    <div className="space-y-3 p-4 rounded-2xl bg-neutral-900">
      <button onClick={()=>{setCamera(true);setMessage('');}} disabled={camera||busy} className="bg-amber-400 text-black rounded-xl px-4 py-2 font-bold">Scanner le QR avec la caméra</button>
      {camera&&<div><video ref={video} autoPlay playsInline muted aria-label="Caméra pour lire le QR du ticket" className="w-full rounded-xl"/><button onClick={()=>setCamera(false)} className="underline p-2">Arrêter la caméra</button></div>}
      <label className="block text-sm">Importer une photo du QR<input type="file" accept="image/*" disabled={busy} className="block mt-2 w-full" onChange={e=>{const file=e.target.files?.[0];if(file)void readPhoto(file);e.target.value='';}}/></label>
      <label className="block text-sm" htmlFor="receipt-code">Code du ticket ou lien QR</label>
      <input id="receipt-code" value={code} onChange={e=>setCode(e.target.value)} className="w-full p-3 rounded-xl bg-black border border-neutral-600" placeholder="Code imprimé sous le QR" autoComplete="off"/>
      <button onClick={()=>void claim()} disabled={busy||!code.trim()} className="w-full p-3 bg-amber-400 rounded-xl font-bold text-black disabled:opacity-40">{busy?'Vérification…':'Ajouter mes points'}</button>
      {message&&<p role="status" className="text-sm text-amber-200">{message}</p>}
    </div>
    <h3 className="font-bold">Historique des points</h3>
    {ledger.length?ledger.map(entry=><div key={entry.id} className="p-3 border-b border-neutral-700 text-sm">{entry.description}<strong className="block">{entry.pointsDelta>0?'+':''}{entry.pointsDelta} points</strong></div>):<p className="text-sm text-neutral-400">Aucun ticket réclamé. Les commandes terminées n’ajoutent pas de points automatiquement.</p>}
  </section>;
}
