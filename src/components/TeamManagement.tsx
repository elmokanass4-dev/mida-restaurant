import React,{useState,useEffect} from 'react';
import {api} from '../services/api';
interface Member {id:string;email:string;role:string;active:number}
export function TeamManagement({restaurantId}:{restaurantId:string}) {
  const [members,setMembers]=useState<Member[]>([]),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[role,setRole]=useState('kitchen'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const load=()=>api<Member[]>(`/users?restaurantId=${encodeURIComponent(restaurantId)}`).then(setMembers);
  useEffect(()=>{load().catch(e=>setMessage(e.message));},[restaurantId]);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{await api('/users','POST',{email,password,role,restaurantId});setPassword('');setEmail('');await load();setMessage('Compte créé. Transmettez les identifiants à la personne concernée par un canal privé.');}catch(e){setMessage(e instanceof Error?e.message:'Action impossible.');}finally{setBusy(false);}}
  return <section className="max-w-3xl w-full mx-auto p-6 space-y-5"><h1 className="text-2xl font-bold">Accès de l’équipe</h1><form onSubmit={submit} className="grid gap-3 p-5 bg-neutral-900 rounded-2xl">
    <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full p-2 bg-black rounded"/></label>
    <label>Mot de passe temporaire (12 caractères minimum)<input required minLength={12} maxLength={256} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-full p-2 bg-black rounded"/></label>
    <label>Rôle<select value={role} onChange={e=>setRole(e.target.value)} className="block w-full p-2 bg-black rounded"><option value="manager">Manager</option><option value="kitchen">Cuisine</option><option value="cashier">Caisse</option><option value="waiter">Service</option></select></label>
    <button disabled={busy} className="bg-amber-500 text-black p-3 rounded font-bold">Créer le compte</button>
  </form>{message&&<p role="status">{message}</p>}
  {members.map(member=><div key={member.id} className="flex gap-3 justify-between bg-neutral-900 p-3 rounded"><span>{member.email} · {member.role}</span>{!['owner','platform_admin'].includes(member.role)&&<button disabled={busy} onClick={async()=>{setBusy(true);try{await api(`/users/${member.id}`,'PATCH',{active:!member.active});await load();}catch(e){setMessage(e instanceof Error?e.message:'Action impossible.');}finally{setBusy(false);}}} className="text-amber-300 underline">{member.active?'Désactiver':'Activer'}</button>}</div>)}
  </section>;
}
