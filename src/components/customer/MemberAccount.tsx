import {useState} from 'react';
import {storage} from '../../services/storageAdapter';
import {backendEnabled,demoEnabled} from '../../services/api';

export function MemberAccount(){
  const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState('');
  const run=async(action:()=>Promise<unknown>)=>{setBusy(true);setMessage('');try{await action();setPassword('');setCurrentPassword('');setNewPassword('');setMessage('Enregistrement effectué.');}catch(e){setMessage(e instanceof Error?e.message:'Action impossible.');}finally{setBusy(false);}};
  if(demoEnabled)return <p className="text-sm text-amber-200">Compte fictif de présentation. Aucun compte réel n’est créé.</p>;
  if(!backendEnabled)return <p className="text-sm text-amber-200">Les comptes membres seront disponibles lorsque le service sera connecté.</p>;
  return <div className="p-4 rounded-2xl bg-neutral-900 space-y-3 text-sm">
    {storage.member?<>
      <p>Connecté : <strong>{storage.member.name}</strong> · {storage.member.email}</p>
      <button disabled={busy} onClick={()=>void run(()=>storage.logout())} className="underline">Déconnexion du membre</button>
      <details><summary>Changer mon mot de passe</summary><form className="space-y-2 mt-3" onSubmit={e=>{e.preventDefault();void run(()=>storage.memberPassword(currentPassword,newPassword));}}>
        <label className="block">Mot de passe actuel du membre<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="block p-2 bg-black rounded w-full"/></label>
        <label className="block">Nouveau mot de passe du membre<input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="block p-2 bg-black rounded w-full"/></label>
        <button disabled={busy} className="p-2 bg-amber-400 text-black rounded">Enregistrer le mot de passe</button>
      </form></details>
    </>:storage.user?<p>Déconnectez le personnel pour utiliser un compte membre.</p>:<>
      <h3 className="font-bold">{register?'Créer mon compte fidélité':'Connexion membre'}</h3>
      <p>Retrouvez vos points sur vos appareils. Vous pouvez commander sans compte.</p>
      <form onSubmit={e=>{e.preventDefault();void run(()=>storage.memberAuth(register?'register':'login',{email,password,name}));}} className="space-y-3">
        {register&&<label className="block">Nom du membre<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} className="block p-2 bg-black rounded w-full"/></label>}
        <label className="block">Email du membre<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="block p-2 bg-black rounded w-full"/></label>
        <label className="block">Mot de passe du membre<input required type="password" minLength={register?12:undefined} autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} className="block p-2 bg-black rounded w-full"/></label>
        <button disabled={busy} className="p-3 bg-amber-400 text-black rounded-xl font-bold">{busy?'Connexion…':register?'Créer le compte membre':'Se connecter comme membre'}</button>
      </form><button disabled={busy} onClick={()=>{setRegister(!register);setMessage('');}} className="underline">{register?'J’ai déjà un compte':'Créer un compte fidélité'}</button>
    </>}
    {message&&<p role="status">{message}</p>}
  </div>;
}
