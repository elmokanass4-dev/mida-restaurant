import {useState} from 'react';
import {storage} from '../../services/storageAdapter';
export function RestaurantOnboarding(){
  const [draft,setDraft]=useState({name:'',slug:'',city:'',address:'',phone:'',ownerEmail:'',ownerPassword:''});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  return <form className="p-5 bg-neutral-900 rounded-xl space-y-3" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');try{await storage.mutate('/restaurants','POST',draft);setDraft({...draft,ownerPassword:''});setMessage('Restaurant et propriétaire créés. Ajoutez sa carte avant d’ouvrir les commandes.');}catch(err){setMessage(err instanceof Error?err.message:'Création impossible.');}finally{setBusy(false);}}}>
    <h2 className="text-xl font-bold">Ajouter un restaurant</h2>
    <p className="text-sm text-neutral-400">Carte vide, commandes fermées et compte propriétaire séparé. Aucun abonnement payant n’est activé.</p>
    {(['name','slug','city','address','phone','ownerEmail','ownerPassword'] as const).map((key,i)=><label className="block" key={key}>{['Nom','Identifiant du lien','Ville','Adresse','Téléphone','Email du propriétaire','Mot de passe initial du propriétaire'][i]}<input className="block w-full bg-black rounded p-2" type={key==='ownerPassword'?'password':key==='ownerEmail'?'email':'text'} autoComplete={key==='ownerPassword'?'new-password':'off'} minLength={key==='ownerPassword'?12:undefined} required={['name','slug','ownerEmail','ownerPassword'].includes(key)} pattern={key==='slug'?'[a-z][a-z0-9]*(-[a-z0-9]+)*':undefined} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
    <p className="text-xs text-neutral-400">Remettez les identifiants en privé au propriétaire. Il peut changer son mot de passe après connexion.</p>
    <button disabled={busy} className="bg-amber-400 text-black p-3 rounded">Créer le restaurant</button>{message&&<p role="status">{message}</p>}
  </form>;
}
