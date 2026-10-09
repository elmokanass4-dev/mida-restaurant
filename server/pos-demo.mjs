import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {posFixture,temporaryPosDatabase} from './pos-fixture.mjs';
import {createMockPosAdapter} from './pos.mjs';

if(process.env.NODE_ENV==='production')throw new Error('Mock demo is not permitted in production.');
let clock=Date.now();
const databasePath=await temporaryPosDatabase();
const f=await posFixture({databasePath,now:()=>clock});
try {
  f.mapAll();
  const key=randomUUID(),first=await f.submit(key),retry=await f.submit(key);
  assert.equal(first.status,201);assert.equal(first.body.id,retry.body.id);
  console.log(`RECEIVED: ${first.body.id} (HTTP retry returned the same order)`);
  const adapter=createMockPosAdapter(f.store,{loseAcknowledgementOnce:true});
  console.log('FIRST DELIVERY:',await f.pos.runNext(adapter));
  clock+=2000;
  const result=await f.pos.runNext(adapter);
  assert.equal(result.state,'acknowledged');
  assert.equal(f.store.db.prepare('SELECT COUNT(*) AS n FROM pos_mock_receipts').get().n,1);
  console.log('ACKNOWLEDGED:',result);
  console.log('PASS: one MIDA order, two delivery attempts, one mock POS receipt. No external POS contacted.');
  console.log(`Disposable mock database (no real customer data): ${databasePath}`);
} finally {await f.close();}
