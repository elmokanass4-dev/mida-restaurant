import React,{useState} from 'react';
import {api} from '../services/api';
export function PasswordChange(){
  const [open,setOpen]=useState(false),[currentPassword,setCurrent]=useState(''),[newPassword,setNew]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  if(!open)return <button onClick={()=>setOpen(true)} className="underline">Mot de passe</button>;
  return <form className="p-3 flex flex-wrap gap-3 bg-neutral-900 rounded" onSubmit={async e=>{e.preventDefault();setBusy(true);try{await api('/password','POST',{currentPassword,newPassword});setCurrent('');setNew('');setMessage('Mot de passe modifié. Les autres sessions ont été fermées.');}catch(e){setMessage(e instanceof Error?e.message:'Erreur.');}finally{setBusy(false);}}}>
    <label>Mot de passe actuel<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrent(e.target.value)} className="block bg-black p-2 rounded"/></label>
    <label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={12} maxLength={256} required value={newPassword} onChange={e=>setNew(e.target.value)} className="block bg-black p-2 rounded"/></label>
    <button disabled={busy} className="text-amber-300">Enregistrer</button><button type="button" onClick={()=>{setOpen(false);setCurrent('');setNew('');}}>Fermer</button>{message&&<p role="status">{message}</p>}
  </form>;
}
