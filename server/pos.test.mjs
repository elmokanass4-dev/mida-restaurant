import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {posFixture,temporaryPosDatabase} from './pos-fixture.mjs';
import {createMockPosAdapter,createPos} from './pos.mjs';

async function setup(t,options) {const f=await posFixture(options);t.after(f.close);return f;}
const count=(store,table)=>store.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

test('POS disabled by default; unknown providers and production mock are rejected',async t=>{
  const f=await setup(t,{mode:'disabled'});
  const order=await f.submit();assert.equal(order.status,201);
  assert.equal(f.pos.list(f.restaurantId)[0].state,'disabled');
  assert.equal(await f.pos.runNext({deliver(){throw new Error('Must not run');}}),null);
  assert.throws(()=>f.pos.retry(order.body.id),/indisponible/);
  assert.throws(()=>createPos(f.store,{mode:'clyo'}),/Only disabled/);
  assert.throws(()=>createPos(f.store,{mode:'mock',production:true}),/forbidden/);
  assert.equal(createPos(f.store).mode,'disabled');
  assert.equal(count(f.store,'pos_mock_receipts'),0);
});

test('POS atomic enqueue + concurrent customer retries produce one order and one acknowledged mock receipt',async t=>{
  const f=await setup(t);f.mapAll();const key=randomUUID();
  const responses=await Promise.all([f.submit(key),f.submit(key),f.submit(key)]);
  responses.forEach(r=>assert.equal(r.status,201));
  assert.equal(new Set(responses.map(r=>r.body.id)).size,1);
  assert.equal(count(f.store,'pos_jobs'),1);assert.equal(f.store.list('order').length,1);
  assert.equal((await f.submit(key,{...f.data,customerName:'Different'})).status,409);
  const adapter=createMockPosAdapter(f.store);
  await Promise.all([f.pos.runNext(adapter),f.pos.runNext(adapter)]);
  const job=f.pos.list(f.restaurantId)[0];assert.equal(job.state,'acknowledged');assert.equal(job.attempts,1);
  assert.equal(count(f.store,'pos_mock_receipts'),1);
  const stored=f.store.db.prepare('SELECT payload FROM pos_jobs').get().payload;
  assert.ok(!stored.includes('customerPhone'));assert.ok(!stored.includes('POS mock customer'));
  const order=f.store.read('order',job.orderId).data;
  assert.equal(order.status,'submitted');assert.equal(order.paymentStatus,'unpaid');assert.equal(order.loyaltyPointsEarned,undefined);
  assert.deepEqual(f.store.db.prepare('SELECT state FROM pos_events ORDER BY id').all().map(r=>r.state),['pending','sending','acknowledged']);
});

test('POS enqueue failure rolls back order and idempotency record together',async t=>{
  const f=await setup(t);f.store.db.exec("CREATE TRIGGER fail_job BEFORE INSERT ON pos_jobs BEGIN SELECT RAISE(ABORT,'test queue write failure'); END;");
  const key=randomUUID();assert.equal((await f.submit(key)).status,500);
  assert.equal(f.store.list('order').length,0);assert.equal(count(f.store,'idempotency'),0);
  f.store.db.exec('DROP TRIGGER fail_job');assert.equal((await f.submit(key)).status,201);
  assert.equal(count(f.store,'pos_jobs'),1);
});

test('POS missing product/option mapping fails visibly; scoped mapping and explicit retry recover',async t=>{
  const f=await setup(t);const order=await f.submit();const adapter=createMockPosAdapter(f.store);
  await f.pos.runNext(adapter);
  assert.equal(f.pos.list(f.restaurantId)[0].errorCode,'MAPPING_REQUIRED');assert.equal(count(f.store,'pos_mock_receipts'),0);
  assert.throws(()=>f.pos.mapItem(f.restaurantId,f.catalog.dishes.find(d=>d.restaurantId!==f.restaurantId).id,'bad'),/restaurant/);
  assert.throws(()=>f.pos.mapItem(f.restaurantId,f.dish.id,'bad','unknown','option'),/inconnue/);
  f.pos.mapItem(f.restaurantId,f.dish.id,'product-only');f.pos.retry(order.body.id);await f.pos.runNext(adapter);
  if(f.modifiers.length)assert.equal(f.pos.list(f.restaurantId)[0].state,'failed');
  f.mapAll();if(f.pos.list(f.restaurantId)[0].state==='failed')f.pos.retry(order.body.id);
  await f.pos.runNext(adapter);assert.equal(f.pos.list(f.restaurantId)[0].state,'acknowledged');
});

test('POS lost acknowledgement survives restart, freezes mapping and deduplicates provider delivery',async t=>{
  let clock=100000;const file=await temporaryPosDatabase();const f=await setup(t,{databasePath:file,now:()=>clock});
  f.mapAll();await f.submit();await f.pos.runNext(createMockPosAdapter(f.store,{loseAcknowledgementOnce:true}));
  assert.equal(f.pos.list(f.restaurantId)[0].errorCode,'ACK_UNKNOWN');assert.equal(count(f.store,'pos_mock_receipts'),1);
  const original=f.store.db.prepare('SELECT payload FROM pos_jobs').get().payload;
  await f.close();clock+=2000;
  const next=await setup(t,{databasePath:file,now:()=>clock});
  next.pos.mapItem(next.restaurantId,next.dish.id,'changed-product');
  await next.pos.runNext(createMockPosAdapter(next.store));
  assert.equal(next.pos.list(next.restaurantId)[0].state,'acknowledged');assert.equal(count(next.store,'pos_mock_receipts'),1);
  assert.equal(next.store.db.prepare('SELECT payload FROM pos_jobs').get().payload,original);
});

test('POS bounded retries retain failed orders; status and retries require authorized tenant staff',async t=>{
  let clock=100000;const f=await setup(t,{now:()=>clock});f.mapAll();const order=await f.submit();
  const bad=createMockPosAdapter(f.store,{failBefore:10});
  for(let n=0;n<3;n++){await f.pos.runNext(bad);clock+=10000;}
  assert.equal(f.pos.list(f.restaurantId)[0].state,'failed');assert.equal(f.store.read('order',order.body.id).data.status,'submitted');
  assert.equal((await f.customer(`/restaurants/${f.restaurantId}/pos/orders`)).status,401);
  const other=await f.staff('owner',f.catalog.restaurants[1].id),cashier=await f.staff('cashier'),owner=await f.staff();
  assert.equal((await other(`/restaurants/${f.restaurantId}/pos/orders`)).status,403);
  assert.equal((await other(`/orders/${order.body.id}/pos/retry`,'POST',{})).status,403);
  assert.equal((await cashier(`/orders/${order.body.id}/pos/retry`,'POST',{})).status,403);
  assert.equal((await cashier(`/restaurants/${f.restaurantId}/pos/orders`)).body.orders[0].state,'failed');
  assert.equal((await owner(`/orders/${order.body.id}/pos/retry`,'POST',{})).status,200);
  await f.pos.runNext(createMockPosAdapter(f.store));assert.equal(f.pos.list(f.restaurantId)[0].state,'acknowledged');
});

test('POS cancellation before dispatch skips delivery; cancellation after acknowledgement requires review',async t=>{
  const f=await setup(t);f.mapAll();const owner=await f.staff();
  const a=await f.submit();assert.equal((await owner(`/orders/${a.body.id}/status`,'PATCH',{status:'cancelled'})).status,200);
  await f.pos.runNext(createMockPosAdapter(f.store));assert.equal(count(f.store,'pos_mock_receipts'),0);
  assert.equal(f.pos.list(f.restaurantId).find(j=>j.orderId===a.body.id).state,'cancelled');
  const b=await f.submit();await f.pos.runNext(createMockPosAdapter(f.store));
  await owner(`/orders/${b.body.id}/status`,'PATCH',{status:'cancelled'});
  const job=f.pos.list(f.restaurantId).find(j=>j.orderId===b.body.id);
  assert.equal(job.state,'acknowledged');assert.equal(job.reviewRequired,1);
  assert.throws(()=>f.pos.retry(b.body.id),/indisponible/);
});

test('POS expired lease is reclaimed and invalid acknowledgement never reports success',async t=>{
  let clock=100000;const f=await setup(t,{now:()=>clock});f.mapAll();await f.submit();
  f.store.db.exec("UPDATE pos_jobs SET state='sending',attempts=1,lease_until=1,lease_token='dead-worker'");
  await f.pos.runNext({kind:'mock',idempotent:true,async deliver(){return {deliveryKey:'wrong',externalId:'fake'};}});
  assert.equal(f.pos.list(f.restaurantId)[0].errorCode,'ACK_INVALID');
  assert.equal(f.pos.list(f.restaurantId)[0].state,'pending');clock+=10000;
  await f.pos.runNext(createMockPosAdapter(f.store));assert.equal(f.pos.list(f.restaurantId)[0].state,'acknowledged');
});

test('POS delayed acknowledgement cannot overwrite a new lease or lose a cancellation review',async t=>{
  let clock=100000;const f=await setup(t,{now:()=>clock});f.mapAll();const order=await f.submit();
  let release;const delayed={kind:'mock',idempotent:true,deliver(payload){return new Promise(resolve=>{release=()=>resolve({deliveryKey:payload.deliveryKey,externalId:'late-ack'});});}};
  const first=f.pos.runNext(delayed);clock+=31000;
  const second=await f.pos.runNext(createMockPosAdapter(f.store));
  const owner=await f.staff();await owner(`/orders/${order.body.id}/status`,'PATCH',{status:'cancelled'});
  release();await first;
  const job=f.pos.list(f.restaurantId)[0];assert.equal(job.externalId,second.externalId);assert.equal(job.reviewRequired,1);
});

test('POS timeout aborts a stalled adapter and retains a retriable order',async t=>{
  const f=await setup(t);f.mapAll();await f.submit();let signal;
  await f.pos.runNext({kind:'mock',idempotent:true,deliver(_payload,options){signal=options.signal;return new Promise(()=>{});}});
  const job=f.pos.list(f.restaurantId)[0];assert.equal(signal.aborted,true);assert.equal(job.errorCode,'ACK_UNKNOWN');
  assert.equal(job.state,'pending');assert.equal(f.store.list('order').length,1);
});
