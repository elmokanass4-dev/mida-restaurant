export interface StaffUser {id:string; email:string; role:'owner'|'manager'|'kitchen'|'cashier'|'waiter'|'platform_admin'; restaurantId:string | null}
export const demoEnabled = import.meta.env.VITE_DEMO_MODE === true;
export const backendEnabled = demoEnabled || import.meta.env.VITE_BACKEND_ENABLED === 'true';
export async function api<T>(path:string, method='GET', body?:unknown, extraHeaders:Record<string,string>={}):Promise<T> {
  if(demoEnabled || !backendEnabled) throw new Error('Le service de commande n’est pas encore connecté.');
  const restaurant=new URLSearchParams(window.location.search).get('restaurant');
  const controller=new AbortController();
  const timer=window.setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(`/api${path}`,{method,signal:controller.signal,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Mida-Request':'1',...(restaurant?{'X-Mida-Restaurant':restaurant}:{}),...extraHeaders},body:body===undefined?undefined:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error || 'Erreur de connexion.');
    return result;
  } catch(error) {
    if(controller.signal.aborted)throw new Error('Réponse non reçue. L’opération peut avoir été enregistrée : vérifiez le ticket avant de réessayer.');
    throw error;
  } finally {window.clearTimeout(timer);}
}
