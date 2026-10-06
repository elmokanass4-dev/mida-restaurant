import React, {useState} from 'react';
import {storage} from '../services/storageAdapter';
import {backendEnabled} from '../services/api';
export function StaffLogin({onSuccess}:{onSuccess:()=>void}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault(); if(busy)return; setBusy(true); setError(''); try{await storage.login(email,password); setPassword(''); onSuccess();}catch(err){setError(err instanceof Error?err.message:'Connexion impossible.');}finally{setBusy(false);}}
  return <main className="min-h-screen bg-[#080305] text-white grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-sm bg-[#190c13] rounded-3xl border border-amber-950 p-7 space-y-5">
    <h1 className="text-2xl font-bold">Mida · Espace équipe</h1><p className="text-sm text-neutral-400">Connexion réservée au personnel autorisé.</p>
    {!backendEnabled&&<p role="status" className="text-amber-300 text-sm">Le service sécurisé n’est pas encore hébergé. Aucun accès staff public n’est disponible.</p>}
    <label className="block text-sm">Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="block w-full mt-2 bg-neutral-900 rounded-xl p-3 border border-neutral-700"/></label>
    <label className="block text-sm">Mot de passe<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="block w-full mt-2 bg-neutral-900 rounded-xl p-3 border border-neutral-700"/></label>
    {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
    <button disabled={busy||!backendEnabled} className="w-full p-3 rounded-xl bg-amber-500 text-black font-bold disabled:opacity-40">{busy?'Connexion…':'Se connecter'}</button>
    <a className="block text-center text-sm text-neutral-400 underline" href={import.meta.env.BASE_URL}>Retour au menu client</a>
  </form></main>;
}
