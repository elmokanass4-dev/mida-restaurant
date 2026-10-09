// Isolated test/demo fixture. Never opens the application's real database.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createApp} from './app.mjs';
import {createUser} from './database.mjs';

export async function posFixture({mode='mock',databasePath=':memory:',now=Date.now}={}) {
  if(process.env.NODE_ENV==='production')throw new Error('Mock fixture is not permitted in production.');
  const catalog=JSON.parse(await fs.readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
  const restaurantId=catalog.restaurants[0].id;
  const context=createApp({databasePath,catalog,origin:'http://localhost',posOptions:{mode,restaurantIds:[restaurantId],now}});
  const {app,store,pos}=context;
  const dish=catalog.dishes.find(d=>d.restaurantId===restaurantId&&d.isAvailable);
  const modifiers=dish.modifierGroups.flatMap(g=>g.options.slice(0,Math.max(g.minSelections,g.required?1:0)).map(o=>({groupId:g.id,optionId:o.id})));
  const data={restaurantId,mode:'pickup',customerName:'POS mock customer',customerPhone:'0600000000',paymentMethod:'counter',
    expectedTotalMAD:dish.priceMAD+modifiers.reduce((sum,m)=>sum+dish.modifierGroups.find(g=>g.id===m.groupId).options.find(o=>o.id===m.optionId).priceMAD,0),
    items:[{dishId:dish.id,quantity:1,selectedModifiers:modifiers}]};
  function mapAll() {
    pos.mapItem(restaurantId,dish.id,'mock-product-1');
    for(const m of modifiers)pos.mapItem(restaurantId,dish.id,`mock-${m.groupId}-${m.optionId}`,m.groupId,m.optionId);
  }
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const client=()=>{let cookie='';return async(route,method='GET',body,headers={})=>{
    const res=await fetch(`http://127.0.0.1:${server.address().port}/api${route}`,{method,headers:{cookie,Origin:'http://localhost','X-Mida-Request':'1','Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
    if(res.headers.getSetCookie().length)cookie=res.headers.getSetCookie().at(-1).split(';')[0];
    return {status:res.status,body:await res.json()};
  };};
  const customer=client();
  // Establish the guest cookie before concurrent attempts.
  await customer('/snapshot');
  const submit=(key=randomUUID(),body=data)=>customer('/orders','POST',body,{'Idempotency-Key':key});
  const staff=async(role='owner',id=restaurantId)=>{
    const email=`${randomUUID()}@example.test`,password=`Test-${randomUUID()}`;
    await createUser(store,{email,password,role,restaurantId:id});
    const request=client();await request('/login','POST',{email,password});return request;
  };
  let closed=false;
  const close=()=>closed?Promise.resolve():new Promise(resolve=>{closed=true;server.closeAllConnections();server.close(()=>{store.db.close();resolve();});});
  return {...context,catalog,restaurantId,dish,data,modifiers,mapAll,client,customer,submit,staff,close};
}

export async function temporaryPosDatabase() {
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mida-pos-mock-'));
  return path.join(directory,'mock.sqlite');
}
