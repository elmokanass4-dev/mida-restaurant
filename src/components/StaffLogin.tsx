import React, {useState} from 'react';
import {storage} from '../services/storageAdapter';
import {api,backendEnabled} from '../services/api';
export function StaffLogin({onSuccess,restaurantName='MIDA',restaurantId}:{onSuccess:()=>void;restaurantName?:string;restaurantId?:string}) {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [reset,setReset]=useState(false),[code,setCode]=useState(''),[message,setMessage]=useState('');
  async function submit(e:React.FormEvent){e.preventDefault(); if(busy)return; setBusy(true); setError(''); try{await storage.login(email,password); setPassword(''); onSuccess();}catch(err){setError(err instanceof Error?err.message:'Connexion impossible.');}finally{setBusy(false);}}
  async function resetPassword(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await api('/password/reset','POST',{token:code,newPassword:password});setPassword('');setCode('');setReset(false);setMessage('Mot de passe modifié. Toutes les anciennes sessions sont révoquées. Connectez-vous.');}catch(err){setError(err instanceof Error?err.message:'Réinitialisation non confirmée.');}finally{setBusy(false);}}
  return <main className="mida-register register-lock"><form onSubmit={reset?resetPassword:submit} className="register-panel">
    <h1 className="text-2xl font-bold">{restaurantName} · Espace équipe</h1><p className="text-sm text-slate-600">Connexion réservée au personnel autorisé.</p>
    {!backendEnabled&&<p role="status" className="text-amber-300 text-sm">Le service sécurisé n’est pas encore hébergé. Aucun accès staff public n’est disponible.</p>}
    {reset?<><p>Demandez un code temporaire au responsable du serveur après vérification de votre identité. Aucun email automatique n’est envoyé.</p><label>Code à usage unique<input required value={code} onChange={e=>setCode(e.target.value)} autoComplete="off"/></label></>:<label>Email<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
    <label>{reset?'Nouveau mot de passe (12 caractères minimum)':'Mot de passe'}<input required minLength={reset?12:undefined} type="password" autoComplete={reset?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<p role="alert" className="register-error">{error}</p>}
    {message&&<p role="status">{message}</p>}
    <button disabled={busy||!backendEnabled} className="register-primary">{busy?'Veuillez patienter…':reset?'Réinitialiser mon mot de passe':'Se connecter'}</button>
    <button type="button" onClick={()=>{setReset(!reset);setPassword('');setError('');}}>{reset?'Retour à la connexion':'Mot de passe oublié'}</button>
    <a className="block text-center text-sm text-slate-600 underline" href={`${import.meta.env.BASE_URL}${restaurantId?`?restaurant=${encodeURIComponent(restaurantId)}`:''}`}>Retour au menu client</a>
  </form></main>;
}
