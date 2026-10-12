import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {posFixture} from './pos-fixture.mjs';
import {createUser} from './database.mjs';
import {businessDay,minor} from './register.mjs';
import {issueResetToken} from './auth-recovery.mjs';

async function fixture(t,databasePath=':memory:') {
  const f=await posFixture({mode:'disabled',databasePath});t.after(f.close);
  const password='Register-test-only-password-972!',email=`${randomUUID()}@example.test`;
  await createUser(f.store,{email,password,role:'owner',restaurantId:f.restaurantId});
  const owner=f.client();assert.equal((await owner('/login','POST',{email,password})).status,200);
  const base=`/register/${f.restaurantId}`;
  const write=(url,body,key=randomUUID(),actor=owner)=>actor(url,'POST',body,{'Idempotency-Key':key});
  assert.equal((await write(`${base}/config`,{password,legal:{name:'Test only'},businessDayHour:4})).status,200);
  const open=async(opening=100000)=>{const r=await write(`${base}/cash/open`,{drawer:'Main',opening});assert.equal(r.status,200);return r.body;};
  const order=async()=>{
    const r=await write(`${base}/orders`,f.data);assert.equal(r.status,201,JSON.stringify(r.body));
    assert.equal((await owner(`/orders/${r.body.id}/status`,'PATCH',{status:'accepted'})).status,200);return r.body;
  };
  return {...f,password,owner,base,write,open,order};
}
test('manual order, kitchen, mixed exact payments, immutable receipt, closing and owner report',async t=>{
  const f=await fixture(t);await f.open(10000);const order=await f.order(),total=minor(order.totalMAD);
  assert.equal((await f.owner(`/orders/${order.id}/status`,'PATCH',{status:'preparing'})).status,200);
  assert.equal((await f.owner(`/orders/${order.id}/status`,'PATCH',{status:'ready'})).status,200);
  const first=Math.floor(total/2),key=randomUUID(),body={version:1,amount:first,tendered:first+100,method:'cash'};
  const a=await f.write(`/register/orders/${order.id}/payments`,body,key);assert.equal(a.status,200);assert.equal(a.body.change,100);assert.equal(a.body.remaining,total-first);
  assert.deepEqual((await f.write(`/register/orders/${order.id}/payments`,body,key)).body,a.body);
  assert.equal((await f.write(`/register/orders/${order.id}/payments`,{...body,amount:first+1},key)).status,409);
  assert.equal((await f.write(`/register/orders/${order.id}/payments`,body)).status,409,'Stale editor cannot pay');
  const b=await f.write(`/register/orders/${order.id}/payments`,{version:2,amount:total-first,method:'card_terminal'});assert.equal(b.status,200);assert.ok(b.body.receipt.number.startsWith('PILOT-'));
  assert.equal((await f.owner(`/orders/${order.id}/status`,'PATCH',{status:'completed'})).status,200);
  const before=(await f.owner(`/register/documents/${b.body.receipt.id}`)).body;
  const dish=f.store.read('dish',f.dish.id);dish.data.priceMAD+=9;f.store.put('dish',dish.data);const restaurant=f.store.read('restaurant',f.restaurantId);restaurant.data.taxRatePercent=25;f.store.put('restaurant',restaurant.data);
  assert.deepEqual((await f.owner(`/register/documents/${b.body.receipt.id}`)).body,before);
  assert.throws(()=>f.store.db.prepare('UPDATE register_payments SET amount=1').run(),/Immutable/);
  const report=await f.owner(`${f.base}/report?from=2000-01-01&to=2099-12-31`);assert.equal(report.body.collected,total);assert.equal(report.body.salesIncludingTax,total);assert.equal(report.body.paidOrders,1);
  const close=await f.write(`${f.base}/cash/close`,{password:f.password,counted:10000+first-25,cardCounted:total-first});assert.equal(close.status,200);assert.equal(close.body.variance,-25);
  assert.throws(()=>f.store.db.prepare("UPDATE cash_sessions SET opening=0 WHERE closed_at IS NOT NULL").run(),/immutable/);
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM register_payments').get().n,2);
});
test('QR acceptance, real loyalty claim, partial refund, tax and points reversals',async t=>{
  const f=await fixture(t);await f.open();const member=f.client();
  assert.equal((await member('/member/register','POST',{email:`${randomUUID()}@example.test`,password:f.password,name:'Member'})).status,201);
  const placed=await f.submit();assert.equal(placed.status,201);const order=placed.body,total=minor(order.totalMAD);
  assert.equal((await f.write(`/register/orders/${order.id}/payments`,{version:1,amount:total,tendered:total,method:'cash'})).status,409);
  await f.owner(`/orders/${order.id}/status`,'PATCH',{status:'accepted'});
  const payment=await f.write(`/register/orders/${order.id}/payments`,{version:1,amount:total,tendered:total,method:'cash'});assert.equal(payment.status,200);
  const receipt=await f.owner(`/orders/${order.id}/receipt`,'POST',{});assert.equal(receipt.status,200);
  const claimed=await member('/loyalty/claim','POST',{restaurantId:f.restaurantId,token:receipt.body.token});assert.equal(claimed.status,200);
  const amount=Math.floor(total/3),key=randomUUID(),body={password:f.password,version:2,paymentId:payment.body.id,amount,reason:'Returned amount'};
  const refund=await f.write(`/register/orders/${order.id}/refunds`,body,key);assert.equal(refund.status,200);assert.equal(refund.body.tax,Math.round(minor(order.taxAmountMAD)*amount/total));
  assert.equal((await f.write(`/register/orders/${order.id}/refunds`,body,key)).body.id,refund.body.id);
  const profile=(await member('/snapshot')).body.customers.find(p=>p.restaurantId===f.restaurantId);assert.equal(profile.loyaltyPoints,claimed.body.balance-Math.floor(receipt.body.points*amount/total));
  assert.equal((await f.owner(`/orders/${order.id}/receipt`,'POST',{})).status,409);
  assert.equal((await f.write(`/register/orders/${order.id}/refunds`,{...body,version:3,amount:total})).status,409);
  const end=await f.write(`/register/orders/${order.id}/refunds`,{...body,version:3,amount:total-amount});assert.equal(end.status,200);assert.equal(end.body.tax+refund.body.tax,minor(order.taxAmountMAD));
});
test('role isolation, shared drawer ownership, legacy payment bypass and missing idempotency rejected',async t=>{
  const f=await fixture(t);await f.open();const order=await f.order();
  const waiter=await f.staff('waiter'),other=await f.staff('owner',f.catalog.restaurants[1].id),platform=await f.staff('platform_admin');
  assert.equal((await waiter(`${f.base}/report?from=2000-01-01&to=2099-12-31`)).status,403);
  assert.equal((await other(f.base)).status,403);assert.equal((await platform(f.base)).status,403);
  assert.equal((await f.write(`${f.base}/cash/open`,{drawer:'Main',opening:0})).status,409);
  assert.equal((await f.owner(`/orders/${order.id}/payment`,'PATCH',{paymentStatus:'paid'})).status,409);
  assert.equal((await f.owner(`/register/orders/${order.id}/payments`,'POST',{version:1,amount:100,method:'cash',tendered:100})).status,400);
  assert.equal((await f.write(`/register/orders/${order.id}/payments`,{version:1,amount:100,method:'cash',tendered:100},randomUUID(),waiter)).status,403);
});
test('concurrent payments use one version, cancelled paid tickets are blocked and print attempts stay unknown',async t=>{
  const f=await fixture(t);await f.open();const order=await f.order(),total=minor(order.totalMAD);
  const body={version:1,amount:total,tendered:total,method:'cash'};
  const attempts=await Promise.all([f.write(`/register/orders/${order.id}/payments`,body),f.write(`/register/orders/${order.id}/payments`,body)]);
  assert.deepEqual(attempts.map(r=>r.status).sort(),[200,409]);
  assert.equal((await f.owner(`/orders/${order.id}/status`,'PATCH',{status:'cancelled',reason:'test'})).status,409);
  const doc=attempts.find(r=>r.status===200).body.receipt;
  const a=await f.write(`/register/documents/${doc.id}/print`,{}),b=await f.write(`/register/documents/${doc.id}/print`,{});
  assert.equal(a.body.state,'unknown');assert.equal(a.body.duplicate,false);assert.equal(b.body.duplicate,true);
  const observation=await f.write(`/register/print-jobs/${a.body.id}/status`,{state:'failed',note:'No paper during rehearsal'});assert.equal(observation.status,200);assert.equal(observation.body.source,'operator');
  assert.equal((await f.owner(f.base)).body.printJobs.find(j=>j.id===a.body.id).state,'failed');
  assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM register_payments').get().n,1);
});
test('restart and consistent backup preserve documents, financial totals and unsent outbox',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'mida-register-test-')),filename=path.join(directory,'source.sqlite'),backup=path.join(directory,'backup.sqlite');
  const f=await fixture(t,filename);await f.open();const order=await f.order(),total=minor(order.totalMAD);
  const payment=await f.write(`/register/orders/${order.id}/payments`,{version:1,amount:total,tendered:total,method:'cash'});assert.equal(payment.status,200);
  const n=f.store.db.prepare('SELECT COUNT(*) n FROM register_outbox WHERE acknowledged_at IS NULL').get().n;assert.ok(n>0);
  f.store.db.prepare('VACUUM INTO ?').run(backup);await f.close();
  for(const file of [filename,backup]){const db=new DatabaseSync(file);try{
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.equal(db.prepare('SELECT SUM(amount) n FROM register_payments').get().n,total);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM register_outbox WHERE acknowledged_at IS NULL').get().n,n);
    assert.equal(JSON.parse(db.prepare('SELECT data FROM register_documents').get().data).number,payment.body.receipt.number);
  }finally{db.close();}}
});
test('Casablanca business date crosses midnight and seasonal UTC offset without fixed-offset arithmetic',()=>{
  assert.equal(businessDay(new Date('2026-01-01T01:00:00Z'),4),'2025-12-31');
  assert.equal(businessDay(new Date('2026-01-01T05:00:00Z'),4),'2026-01-01');
  assert.equal(businessDay(new Date('2026-03-01T03:30:00Z'),4),'2026-02-28');
  assert.equal(minor(0.1+0.2),30);assert.equal(minor(1.005),101);
});
test('held draft versions, consuming once, table transfer and manager discount preserve agreed snapshots',async t=>{
  const f=await fixture(t);
  const b={...f.data,mode:'table',tableNumber:1,label:'Table 1'};
  const held=await f.write(`${f.base}/drafts`,b);assert.equal(held.status,200);
  const updated=await f.write(`${f.base}/drafts`,{...b,id:held.body.id,version:1});assert.equal(updated.status,200);
  assert.equal((await f.write(`${f.base}/drafts`,{...b,id:held.body.id,version:1})).status,409);
  const order=await f.write(`${f.base}/orders`,{...b,draftId:held.body.id,draftVersion:2});assert.equal(order.status,201);
  assert.equal((await f.write(`${f.base}/orders`,{...b,draftId:held.body.id,draftVersion:2})).status,409);
  assert.equal((await f.write(`/register/orders/${order.body.id}/table`,{version:1,tableNumber:2})).status,200);
  const discount=await f.write(`/register/orders/${order.body.id}/discount`,{version:2,amount:100,reason:'Manager goodwill',password:f.password});assert.equal(discount.status,200);assert.equal(minor(discount.body.totalMAD),minor(order.body.totalMAD)-100);
  assert.equal((await f.write(`/register/orders/${order.body.id}/table`,{version:1,tableNumber:1})).status,409);
  const changed=f.store.read('dish',f.dish.id);changed.data.priceMAD+=10;f.store.put('dish',changed.data);
  assert.equal((await f.write(`${f.base}/orders`,f.data)).status,409,'Do not silently accept changed prices');
});
test('server enforces idle lock and allows authentication recovery; revoke all devices clears sessions',async t=>{
  const f=await fixture(t);await f.owner(f.base);
  f.store.db.prepare('UPDATE staff_activity SET last_activity=?').run(Date.now()-301000);
  assert.equal((await f.owner(f.base)).status,423);assert.equal((await f.owner('/session/activity','POST',{})).status,423);
  assert.equal((await f.owner('/logout','POST',{})).status,200);
  const fresh=await f.staff('owner');assert.equal((await fresh(f.base)).status,200);
  assert.equal((await fresh('/session/lock','POST',{})).status,200);assert.equal((await fresh(f.base)).status,423);
  const other=await f.staff('owner');assert.equal((await other('/session/revoke-all','POST',{})).status,200);assert.equal((await other(f.base)).status,401);
});
test('password recovery stores only a token hash, expires, is single-use and revokes all sessions',async t=>{
  const f=await fixture(t),user=(await f.owner('/snapshot')).body.user;
  const token=issueResetToken(f.store,user.id),row=f.store.db.prepare('SELECT * FROM staff_reset_tokens').get();assert.notEqual(row.hash,token);
  const guest=f.client();assert.equal((await guest('/password/reset','POST',{token:'wrong',newPassword:'a-new-test-password!'})).status,400);
  const data={token,newPassword:'a-new-test-password!'};assert.equal((await guest('/password/reset','POST',data)).status,200);
  assert.equal((await guest('/password/reset','POST',data)).status,400);assert.equal((await f.owner(f.base)).status,401);
  assert.equal((await guest('/login','POST',{email:user.email,password:data.newPassword})).status,200);
  const expired=issueResetToken(f.store,user.id);f.store.db.prepare('UPDATE staff_reset_tokens SET expires=0').run();assert.equal((await f.client()('/password/reset','POST',{token:expired,newPassword:data.newPassword})).status,400);
});


test('two cashiers accept one incoming order, preserve submitted prices, kitchen and payment remain independent',async t=>{
 const f=await fixture(t);const placed=await f.submit();assert.equal(placed.status,201);const id=placed.body.id;
 const email=`${randomUUID()}@example.test`;await createUser(f.store,{email,password:f.password,role:'cashier',restaurantId:f.restaurantId});const second=f.client();await second('/login','POST',{email,password:f.password});
 const dish=f.store.read('dish',f.dish.id);dish.data.priceMAD+=10;f.store.put('dish',dish.data);
 const results=await Promise.all([f.owner(`/orders/${id}/status`,'PATCH',{status:'accepted',expectedStatus:'submitted'}),second(`/orders/${id}/status`,'PATCH',{status:'accepted',expectedStatus:'submitted'})]);
 assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(results[0].body.acceptedBy,results[1].body.acceptedBy);assert.equal(results[0].body.totalMAD,placed.body.totalMAD);
 assert.equal(f.store.db.prepare('SELECT COUNT(*) n FROM register_bills WHERE id=?').get(id).n,1);
 assert.equal((await f.owner(`/orders/${id}/status`,'PATCH',{status:'preparing',expectedStatus:'submitted'})).status,409);
 await f.owner(`/orders/${id}/status`,'PATCH',{status:'preparing',expectedStatus:'accepted'});
 await f.owner(`/orders/${id}/status`,'PATCH',{status:'ready',expectedStatus:'preparing'});
 const served=await f.owner(`/orders/${id}/status`,'PATCH',{status:'completed',expectedStatus:'ready'});assert.equal(served.status,200);assert.equal(served.body.paymentStatus,'unpaid');
 await f.open();const paid=await f.write(`/register/orders/${id}/payments`,{version:1,amount:minor(placed.body.totalMAD),tendered:minor(placed.body.totalMAD),method:'cash'});assert.equal(paid.status,200);assert.ok(paid.body.receipt);
 assert.equal((await second(`${f.base}/report?from=2000-01-01&to=2099-12-31`)).status,403);
});


test('waiter confirms manual order, cannot pay, kitchen prints retry without duplicate attempts',async t=>{
 const f=await fixture(t);const email=`${randomUUID()}@example.test`;await createUser(f.store,{email,password:f.password,role:'waiter',restaurantId:f.restaurantId});const waiter=f.client();await waiter('/login','POST',{email,password:f.password});
 const placed=await f.write(`${f.base}/orders`,{...f.data,confirm:true},randomUUID(),waiter);assert.equal(placed.status,201);assert.equal(placed.body.status,'accepted');
 const id=placed.body.id;assert.equal((await f.write(`/register/orders/${id}/payments`,{version:1,amount:minor(placed.body.totalMAD),method:'cash',tendered:100000},randomUUID(),waiter)).status,403);
 const key=randomUUID(),headers={'Idempotency-Key':key};const a=await waiter(`/orders/${id}/kitchen-print`,'POST',{},headers),b=await waiter(`/orders/${id}/kitchen-print`,'POST',{},headers);assert.equal(a.status,200);assert.deepEqual(a.body,b.body);assert.equal(a.body.state,'unknown');assert.equal(a.body.duplicate,false);
 const duplicate=await waiter(`/orders/${id}/kitchen-print`,'POST',{}, {'Idempotency-Key':randomUUID()});assert.equal(duplicate.body.duplicate,true);assert.equal(f.store.list('kitchen_print').length,2);
 assert.equal((await waiter(`${f.base}/customers`)).status,403);
 const before=(await f.owner(`${f.base}/report?from=2000-01-01&to=2099-12-31`)).body;assert.equal(before.unpaid,minor(placed.body.totalMAD));assert.equal(before.collected,0);assert.equal(before.salesIncludingTax,0);
});
