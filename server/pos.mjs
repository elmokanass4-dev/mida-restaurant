import {randomUUID} from 'node:crypto';
import {digest} from './database.mjs';
import {fail, text} from './pricing.mjs';

// Transport-neutral order delivery. No CLYO transport, URL, credentials or network calls.
// Only the explicitly constructed non-production mock harness can dispatch jobs.
export function createPos(store, {mode = 'disabled', restaurantIds = [], production = false, now = Date.now} = {}) {
  if (!['disabled', 'mock'].includes(mode)) throw new Error('Only disabled and mock POS modes are implemented.');
  if (production && mode !== 'disabled') throw new Error('POS mock mode is forbidden in production.');
  const enabled = new Set(restaurantIds);
  for (const id of enabled) if (!store.read('restaurant', id)) throw new Error('Unknown POS restaurant.');
  store.db.exec(`
    CREATE TABLE IF NOT EXISTS pos_jobs (
      order_id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, provider TEXT NOT NULL,
      delivery_key TEXT UNIQUE NOT NULL, state TEXT NOT NULL,
      source TEXT NOT NULL, payload TEXT, attempts INTEGER NOT NULL DEFAULT 0,
      next_at INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0, lease_token TEXT,
      external_id TEXT, error_code TEXT, review_required INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pos_due ON pos_jobs(state,next_at,restaurant_id);
    CREATE TABLE IF NOT EXISTS pos_mappings (
      restaurant_id TEXT NOT NULL, provider TEXT NOT NULL, item_key TEXT NOT NULL,
      external_id TEXT NOT NULL, PRIMARY KEY(restaurant_id,provider,item_key)
    );
    CREATE TABLE IF NOT EXISTS pos_events (
      id INTEGER PRIMARY KEY, order_id TEXT NOT NULL, at INTEGER NOT NULL,
      state TEXT NOT NULL, code TEXT, attempt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pos_mock_receipts (
      delivery_key TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, external_id TEXT NOT NULL
    );
  `);
  const get = id => store.db.prepare('SELECT * FROM pos_jobs WHERE order_id=?').get(id);
  const event = (job, code = null) => store.db.prepare('INSERT INTO pos_events(order_id,at,state,code,attempt) VALUES(?,?,?,?,?)').run(job.order_id,now(),job.state,code,job.attempts);
  const itemKey = (dishId, groupId = '', optionId = '') => JSON.stringify([dishId, groupId, optionId]);
  const isEnabled = job => mode === 'mock' && enabled.has(job.restaurant_id) && job.provider === 'mock';
  const minor = value => {
    const result = Math.round(value * 100);
    if (!Number.isFinite(value) || !Number.isSafeInteger(result) || result < 0) throw new Error('INVALID_AMOUNT');
    return result;
  };

  // Called INSIDE the order transaction. Failure rolls back the whole order, never just its job.
  function enqueue(order) {
    const active = mode === 'mock' && enabled.has(order.restaurantId);
    // Minimal immutable snapshot: no customer identity, phone, address, QR/session tokens or notes.
    const source = {
      version: 1, orderId: order.id, restaurantId: order.restaurantId, orderNumber: order.orderNumber,
      currency: 'MAD', mode: order.mode, tableNumber: order.tableNumber ?? null,
      totalMinor: minor(order.totalMAD), discountMinor: minor(order.discountMAD),
      deliveryMinor: minor(order.deliveryFeeMAD), taxMinor: minor(order.taxAmountMAD),
      items: order.items.map(i => ({dishId:i.dishId, quantity:i.quantity, unitMinor:minor(i.unitPriceMAD),
        modifiers:i.selectedModifiers.map(m => ({groupId:m.groupId, optionId:m.optionId, priceMinor:minor(m.priceMAD)}))})),
    };
    store.db.prepare(`INSERT INTO pos_jobs(order_id,restaurant_id,provider,delivery_key,state,source,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?)`).run(order.id,order.restaurantId,active?'mock':'disabled',`mida:${order.restaurantId}:${order.id}:create:v1`,active?'pending':'disabled',JSON.stringify(source),now(),now());
    event(get(order.id));
  }

  // Private harness/configuration API. Mapping is tenant-scoped and never inferred from names.
  function mapItem(restaurantId, dishId, externalId, groupId = '', optionId = '') {
    if (mode !== 'mock' || !enabled.has(restaurantId)) fail(409,'POS mock non activé.');
    const dish = store.read('dish',dishId);
    if (!dish || dish.restaurant_id !== restaurantId) fail(400,'Plat du restaurant requis.');
    if ((groupId || optionId) && !dish.data.modifierGroups.some(g=>g.id===groupId && g.options.some(o=>o.id===optionId))) fail(400,'Option inconnue.');
    const value = text(externalId,100,true);
    store.db.prepare(`INSERT INTO pos_mappings VALUES(?,?,?,?) ON CONFLICT(restaurant_id,provider,item_key) DO UPDATE SET external_id=excluded.external_id`)
      .run(restaurantId,'mock',itemKey(dishId,groupId,optionId),value);
  }
  function payloadFor(job) {
    if (job.payload) return JSON.parse(job.payload); // Never change a payload after a possibly accepted delivery.
    const source = JSON.parse(job.source);
    const mapped = (dish, group = '', option = '') => {
      const row=store.db.prepare('SELECT external_id FROM pos_mappings WHERE restaurant_id=? AND provider=? AND item_key=?').get(job.restaurant_id,job.provider,itemKey(dish,group,option));
      if (!row) throw new Error('MAPPING_REQUIRED');
      return row.external_id;
    };
    return {...source, deliveryKey:job.delivery_key, items:source.items.map(i=>({...i, externalProductId:mapped(i.dishId),
      modifiers:i.modifiers.map(m=>({...m, externalOptionId:mapped(i.dishId,m.groupId,m.optionId)}))}))};
  }
  function list(restaurantId) {
    return store.db.prepare(`SELECT order_id AS orderId,provider,state,attempts,next_at AS nextAttemptAt,
      external_id AS externalId,error_code AS errorCode,review_required AS reviewRequired,
      created_at AS createdAt,updated_at AS updatedAt FROM pos_jobs WHERE restaurant_id=? ORDER BY created_at,order_id`).all(restaurantId);
  }
  function retry(orderId) {
    return store.transaction(()=>{
      const job=get(orderId) ?? fail(404,'Suivi POS introuvable.');
      if (!isEnabled(job) || job.state!=='failed' || job.review_required) fail(409,'Relance POS indisponible.');
      store.db.prepare("UPDATE pos_jobs SET state='pending',next_at=0,error_code=NULL,updated_at=? WHERE order_id=?").run(now(),orderId);
      event(get(orderId),'MANUAL_RETRY');
    });
  }
  // Order lifecycle remains authoritative in MIDA. No mock acknowledgement changes payment or loyalty.
  function orderChanged(order) {
    const job=get(order.id);
    if (!job || job.state==='disabled') return;
    const cancelled=['cancelled','rejected'].includes(order.status);
    if (!cancelled && order.paymentStatus!=='paid') return;
    if (cancelled && job.attempts===0) {
      store.db.prepare("UPDATE pos_jobs SET state='cancelled',updated_at=? WHERE order_id=?").run(now(),order.id);
      event(get(order.id),'CANCELLED_BEFORE_SEND');
    } else {
      // Once attempted, a lost acknowledgement can hide a POS acceptance. Never silently discard it.
      store.db.prepare('UPDATE pos_jobs SET review_required=1,updated_at=? WHERE order_id=?').run(now(),order.id);
      event(get(order.id),'LIFECYCLE_REVIEW_REQUIRED');
    }
  }

  async function runNext(adapter) {
    if (mode==='disabled') return null;
    // Strict allow-list: this release cannot be used to dispatch a live provider.
    if (!adapter || adapter.kind!=='mock' || adapter.idempotent!==true) throw new Error('Only an idempotent mock adapter is allowed.');
    const job=store.transaction(()=>{
      // Durable leases allow recovery after a worker restart. Late completions are fenced by token.
      for (const stale of store.db.prepare("SELECT * FROM pos_jobs WHERE state='sending' AND lease_until<=?").all(now())) {
        if (!isEnabled(stale)) continue;
        store.db.prepare("UPDATE pos_jobs SET state=?,lease_token=NULL,error_code='ACK_UNKNOWN',next_at=?,updated_at=? WHERE order_id=?")
          .run(stale.attempts>=3?'failed':'pending',now(),now(),stale.order_id);
        event(get(stale.order_id),'ACK_UNKNOWN');
      }
      const candidate=store.db.prepare("SELECT * FROM pos_jobs WHERE state='pending' AND review_required=0 AND next_at<=? ORDER BY created_at,order_id").all(now()).find(isEnabled);
      if (!candidate) return null;
      const order=store.read('order',candidate.order_id)?.data;
      if (!order || ['cancelled','rejected'].includes(order.status)) {
        store.db.prepare("UPDATE pos_jobs SET state='cancelled',updated_at=? WHERE order_id=?").run(now(),candidate.order_id);
        event(get(candidate.order_id),'CANCELLED_BEFORE_SEND');return null;
      }
      let payload;
      try { payload=payloadFor(candidate); } catch {
        store.db.prepare("UPDATE pos_jobs SET state='failed',error_code='MAPPING_REQUIRED',updated_at=? WHERE order_id=?").run(now(),candidate.order_id);
        event(get(candidate.order_id),'MAPPING_REQUIRED');return null;
      }
      store.db.prepare("UPDATE pos_jobs SET state='sending',payload=?,attempts=attempts+1,lease_until=?,lease_token=?,updated_at=? WHERE order_id=?")
        .run(JSON.stringify(payload),now()+30000,randomUUID(),now(),candidate.order_id);
      const leased=get(candidate.order_id);event(leased);return leased;
    });
    if (!job) return null;
    const controller=new AbortController();
    let timer;
    try {
      const receipt=await Promise.race([
        adapter.deliver(JSON.parse(job.payload),{signal:controller.signal}),
        new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('ACK_UNKNOWN'));},10000);}),
      ]);
      if (!receipt || receipt.deliveryKey!==job.delivery_key || typeof receipt.externalId!=='string' || !receipt.externalId.trim() || receipt.externalId.length>100) throw new Error('ACK_INVALID');
      store.transaction(()=>{
        const current=get(job.order_id);
        if (current.state!=='sending' || current.lease_token!==job.lease_token) return;
        store.db.prepare("UPDATE pos_jobs SET state='acknowledged',external_id=?,error_code=NULL,next_at=0,lease_token=NULL,lease_until=0,updated_at=? WHERE order_id=?")
          .run(receipt.externalId,now(),job.order_id);event(get(job.order_id));
      });
    } catch (error) {
      // Persist only bounded internal codes, not remote error bodies, credentials or personal data.
      const code=['MOCK_UNAVAILABLE','ACK_UNKNOWN','ACK_INVALID','PAYLOAD_CONFLICT'].includes(error?.message)?error.message:'ADAPTER_FAILURE';
      store.transaction(()=>{
        const current=get(job.order_id);
        if (current.state!=='sending' || current.lease_token!==job.lease_token) return;
        const state=job.attempts>=3 || code==='PAYLOAD_CONFLICT'?'failed':'pending';
        store.db.prepare('UPDATE pos_jobs SET state=?,error_code=?,next_at=?,lease_token=NULL,lease_until=0,updated_at=? WHERE order_id=?')
          .run(state,code,now()+1000*2**(job.attempts-1),now(),job.order_id);event(get(job.order_id),code);
      });
    } finally { clearTimeout(timer); }
    return list(job.restaurant_id).find(row=>row.orderId===job.order_id);
  }
  return {mode,enqueue,mapItem,list,retry,runNext,orderChanged};
}

// Durable mock inbox models provider-side deduplication, including a lost first acknowledgement.
export function createMockPosAdapter(store,{failBefore=0,loseAcknowledgementOnce=false}={}) {
  let failures=failBefore, lose=loseAcknowledgementOnce;
  return {kind:'mock',idempotent:true,async deliver(payload) {
    if (failures-- > 0) throw new Error('MOCK_UNAVAILABLE');
    const hash=digest(JSON.stringify(payload));
    const prior=store.db.prepare('SELECT * FROM pos_mock_receipts WHERE delivery_key=?').get(payload.deliveryKey);
    if (prior && prior.payload_hash!==hash) throw new Error('PAYLOAD_CONFLICT');
    const externalId=prior?.external_id??`mock-${randomUUID()}`;
    if (!prior) store.db.prepare('INSERT INTO pos_mock_receipts VALUES(?,?,?)').run(payload.deliveryKey,hash,externalId);
    if (lose) {lose=false;throw new Error('ACK_UNKNOWN');}
    return {deliveryKey:payload.deliveryKey,externalId};
  }};
}
