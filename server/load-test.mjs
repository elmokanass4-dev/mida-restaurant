// Isolated local workload; never connects to the demonstration or production server.
import {createApp} from './app.mjs';
import {createUser} from './database.mjs';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

if(process.env.NODE_ENV==='production')throw new Error('Local testing only');
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mida-load-'));
const catalog=JSON.parse(await fs.readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
const restaurantId=catalog.restaurants[0].id;
const dish=catalog.dishes.find(d=>d.restaurantId===restaurantId&&d.isAvailable&&d.priceMAD===22&&!d.modifierGroups.some(g=>g.required||g.minSelections));
assert.ok(dish,'Expected local fixture dish');
const {app,store}=createApp({databasePath:path.join(directory,'isolated.sqlite'),catalog,origin:'http://localhost'});
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const base=`http://127.0.0.1:${server.address().port}/api`,samples=[],expectedDenials=[];
const client=()=>{let cookie='';return {async request(route,method='GET',body,headers={}){
  const start=performance.now();
  const response=await fetch(base+route,{method,headers:{cookie,Origin:'http://localhost','X-Mida-Request':'1','Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(response.headers.getSetCookie().length)cookie=response.headers.getSetCookie().at(-1).split(';')[0];
  const result=await response.json();samples.push({route:route.replace(/\/orders\/[^/]+/,'/orders/:id'),ms:performance.now()-start,status:response.status});return {status:response.status,body:result};
}};};
const ok=(result,status=200)=>{assert.equal(result.status,status,JSON.stringify(result.body));return result.body;};
const order=(quantity=5,extra={})=>({restaurantId,mode:'pickup',customerName:'Synthetic local customer',customerPhone:'0600000000',paymentMethod:'counter',expectedTotalMAD:quantity*dish.priceMAD,items:[{dishId:dish.id,quantity,selectedModifiers:[]}],...extra});
let report;
try{
  const password=randomUUID()+'-local-only',owner=client(),kitchen=client();
  for(const [c,role] of [[owner,'owner'],[kitchen,'kitchen']]){const email=role+'@load.example.test';await createUser(store,{email,password,role,restaurantId});ok(await c.request('/login','POST',{email,password}));}
  const customers=Array.from({length:30},client);
  const start=performance.now();
  const ids=await Promise.all(customers.map(async(c)=>{
    for(let i=0;i<3;i++)ok(await c.request('/snapshot'));
    const quote=ok(await c.request('/quote','POST',order()));assert.equal(quote.totalMAD,110);
    const key=randomUUID(),placed=ok(await c.request('/orders','POST',order(),{'Idempotency-Key':key}),201);
    const retry=ok(await c.request('/orders','POST',order(),{'Idempotency-Key':key}),201);assert.equal(retry.id,placed.id);return placed.id;
  }));
  assert.equal(new Set(ids).size,30);assert.equal(store.list('order').length,30);
  // Thirty customer polling loops plus two staff loops, each polling every five seconds.
  await Promise.all([...customers,owner,kitchen].map(async c=>{for(let i=0;i<12;i++){ok(await c.request('/snapshot'));await new Promise(r=>setTimeout(r,5000));}}));
  for(const c of customers){const snapshot=ok(await c.request('/snapshot'));assert.equal(snapshot.orders.length,1);assert.ok(ids.includes(snapshot.orders[0].id));}
  assert.equal(ok(await owner.request('/snapshot')).orders.length,30);
  const member=client();ok(await member.request('/member/register','POST',{email:'member@load.example.test',password,name:'Synthetic Member'}),201);
  ok(await owner.request(`/orders/${ids[0]}/payment`,'PATCH',{paymentStatus:'paid'}));
  const receipt=ok(await owner.request(`/orders/${ids[0]}/receipt`,'POST',{}));
  const claims=await Promise.all(Array.from({length:10},()=>member.request('/loyalty/claim','POST',{restaurantId,token:receipt.token})));
  assert.equal(claims.filter(r=>r.status===200).length,1);assert.equal(claims.filter(r=>r.status===409).length,9);expectedDenials.push(...claims.filter(r=>r.status===409));
  const points=()=>okPromise(member.request('/snapshot'));
  async function okPromise(p){return ok(await p).customers.find(c=>c.restaurantId===restaurantId).loyaltyPoints;}
  assert.equal(await points(),110);
  const quote=ok(await member.request('/quote','POST',order(3,{redeemPoints:true})));assert.equal(quote.totalMAD,51);
  const redemptions=await Promise.all(Array.from({length:5},()=>member.request('/orders','POST',order(3,{redeemPoints:true,expectedTotalMAD:51}),{'Idempotency-Key':randomUUID()})));
  assert.equal(redemptions.filter(r=>r.status===201).length,1);assert.equal(redemptions.filter(r=>r.status===409).length,4);expectedDenials.push(...redemptions.filter(r=>r.status===409));assert.equal(await points(),10);
  const winner=redemptions.find(r=>r.status===201).body;assert.equal(winner.discountMAD,15);assert.equal(store.list('order').length,31);
  const successful=samples.filter(s=>s.status<400),sorted=successful.map(s=>s.ms).sort((a,b)=>a-b);
  const percentile=p=>Math.round(sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]*100)/100;
  const routes={};for(const route of new Set(successful.map(s=>s.route))){const rows=successful.filter(s=>s.route===route);routes[route]={count:rows.length,maxMs:Math.round(Math.max(...rows.map(s=>s.ms))*100)/100};}
  report={passed:true,at:new Date().toISOString(),node:process.version,platform:process.platform,concurrentCustomers:30,staffPollingSessions:2,pollIntervalSeconds:5,pollRounds:12,durationSeconds:Math.round((performance.now()-start)/10)/100,requests:samples.length,successfulRequests:successful.length,expectedConflictRejections:expectedDenials.length,unexpectedFailures:samples.filter(s=>s.status>=400).length-expectedDenials.length,latencyMs:{p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:percentile(1)},routes,integrity:{uniqueCustomerOrders:30,duplicateRetryOrders:0,privateOrderViews:true,receiptClaimWinners:1,redemptionWinners:1,remainingPoints:10,totalPersistedOrders:31},limits:'Loopback API workload on this computer; not browser rendering, physical devices, internet latency, production hosting or a long soak test.'};
  assert.equal(report.unexpectedFailures,0);
  const output=process.argv[2]??'data/load-test-report.json';await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
  server.closeAllConnections();await new Promise(r=>server.close(r));store.db.close();
  // Retain only the report. This is the exact mkdtemp directory created by this script.
  await fs.rm(directory,{recursive:true,force:true});
}
