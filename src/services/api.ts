export interface StaffUser {id:string; email:string; role:'owner'|'manager'|'kitchen'|'cashier'|'waiter'|'platform_admin'; restaurantId:string | null}
export const demoEnabled = import.meta.env.VITE_DEMO_MODE === true;
export const backendEnabled = demoEnabled || import.meta.env.VITE_BACKEND_ENABLED === 'true';
export async function api<T>(path:string, method='GET', body?:unknown, extraHeaders:Record<string,string>={}):Promise<T> {
  if(demoEnabled || !backendEnabled) throw new Error('Le service de commande n’est pas encore connecté.');
  const response=await fetch(`/api${path}`,{method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-Mida-Request':'1',...extraHeaders},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok) throw new Error(result.error || 'Erreur de connexion.');
  return result;
}
