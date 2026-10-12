import {digest} from './database.mjs';

// Transport-neutral, read-only replication. No receiver may submit payments to the local authority.
// Production HTTP transport, enrollment and remote owner authentication are intentionally not wired.
export function createReplica(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS mirror_events(source TEXT NOT NULL,event_id TEXT NOT NULL,sequence INTEGER NOT NULL,
    fingerprint TEXT NOT NULL,restaurant_id TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL,received_at TEXT NOT NULL,
    PRIMARY KEY(source,event_id),UNIQUE(source,sequence));`);
  return {
    receive(source,event){
      if(!source||event.version!==1||!Number.isSafeInteger(event.sequence)||event.sequence<1)throw new Error('SCHEMA_OR_SOURCE_UNSUPPORTED');
      const fingerprint=digest(JSON.stringify(event));
      db.exec('BEGIN IMMEDIATE');
      try {
        const prior=db.prepare('SELECT fingerprint FROM mirror_events WHERE source=? AND event_id=?').get(source,event.id);
        if(prior&&prior.fingerprint!==fingerprint)throw new Error('FINANCIAL_CONFLICT');
        if(!prior){
          const last=db.prepare('SELECT COALESCE(MAX(sequence),0) n FROM mirror_events WHERE source=?').get(source).n;
          if(event.sequence<=last)throw new Error('OUT_OF_ORDER');
          db.prepare('INSERT INTO mirror_events VALUES(?,?,?,?,?,?,?,?)').run(source,event.id,event.sequence,fingerprint,event.restaurant_id,event.kind,event.data,new Date().toISOString());
        }
        db.exec('COMMIT');return {id:event.id,sequence:event.sequence,version:1};
      } catch(error){db.exec('ROLLBACK');throw error;}
    },
    freshness(source,maxAgeMs=60000){
      const last=db.prepare('SELECT MAX(received_at) at FROM mirror_events WHERE source=?').get(source).at;
      return {lastReceivedAt:last,stale:!last||Date.now()-Date.parse(last)>maxAgeMs,readOnly:true};
    }
  };
}
export function createSyncWorker(db,transport,{now=Date.now,timeoutMs=10000}={}) {
  db.exec(`CREATE TABLE IF NOT EXISTS register_sync_attempts(event_id TEXT PRIMARY KEY,attempts INTEGER NOT NULL,next_at INTEGER NOT NULL,error TEXT);`);
  let active=false;
  return {
    async tick(){
      if(active)return {state:'busy'};active=true;
      try {
        const event=db.prepare('SELECT * FROM register_outbox WHERE acknowledged_at IS NULL ORDER BY sequence LIMIT 1').get();
        if(!event)return {state:'idle'};
        const prior=db.prepare('SELECT * FROM register_sync_attempts WHERE event_id=?').get(event.id);
        if(prior?.next_at>now())return {state:'waiting'};
        const attempts=(prior?.attempts||0)+1;
        let timer;const controller=new AbortController();
        try {
          const payload={sequence:event.sequence,id:event.id,restaurant_id:event.restaurant_id,version:event.version,kind:event.kind,data:event.data,at:event.at};
          const acknowledgement=await Promise.race([transport.send(payload,controller.signal),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('TIMEOUT'));},timeoutMs);})]);
          if(acknowledgement?.id!==event.id||acknowledgement.sequence!==event.sequence||acknowledgement.version!==event.version)throw new Error('ACK_INVALID');
          db.prepare('UPDATE register_outbox SET acknowledged_at=? WHERE id=? AND acknowledged_at IS NULL').run(new Date(now()).toISOString(),event.id);
          db.prepare('DELETE FROM register_sync_attempts WHERE event_id=?').run(event.id);
          return {state:'acknowledged',id:event.id};
        }catch(error){
          const code=['ACK_INVALID','FINANCIAL_CONFLICT','SCHEMA_OR_SOURCE_UNSUPPORTED','OUT_OF_ORDER','TIMEOUT'].includes(error.message)?error.message:'TRANSPORT_UNAVAILABLE';
          const next=now()+Math.min(300000,1000*2**Math.min(attempts,8));
          db.prepare('INSERT INTO register_sync_attempts VALUES(?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET attempts=excluded.attempts,next_at=excluded.next_at,error=excluded.error').run(event.id,attempts,next,code);
          return {state:'pending',id:event.id,error:code};
        }finally{clearTimeout(timer);}
      }finally{active=false;}
    }
  };
}
