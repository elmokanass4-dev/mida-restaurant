import {randomUUID} from 'node:crypto';
import {digest, token, passwordMatches} from './database.mjs';
import {fail, text, priceOrder} from './pricing.mjs';
import {migrateRegister} from './register-schema.mjs';

export const minor = value => {
  if (!Number.isFinite(value) || value < 0 || value > 10000000) fail(400,'Montant invalide.');
  return Math.round((value + Number.EPSILON) * 100);
};
const integer = (value, min=0, max=1000000000) => {
  if (!Number.isSafeInteger(value) || value<min || value>max) fail(400,'Valeur entière invalide.');
  return value;
};
// Compare wall-clock hour in Casablanca, then subtract a calendar day, not a fixed UTC offset.
export function businessDay(date=new Date(), cutoff=4) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  const day=new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  if(Number(parts.hour)<cutoff) day.setUTCDate(day.getUTCDate()-1);
  return day.toISOString().slice(0,10);
}

export function mountRegister({app,store,wrap,authorize,restaurant,profile,limit}) {
  const db=store.db;
  migrateRegister(db);
  const staff=['owner','manager','cashier','waiter'];
  const finance=['owner','manager','cashier'];
  const managers=['owner','manager'];
  const now=()=>new Date().toISOString();
  const refreshCustomerTotals=row=>{
    const p=profile(row.owner_id,row.restaurant_id),orders=store.list('order').filter(o=>o.owner_id===row.owner_id&&o.restaurant_id===row.restaurant_id);
    p.totalSpentMAD=orders.reduce((sum,o)=>{const b=db.prepare('SELECT id FROM register_bills WHERE id=?').get(o.id);if(!b)return sum+(o.data.paymentStatus==='paid'?Math.round(o.data.totalMAD*100):0);const paid=db.prepare('SELECT COALESCE(SUM(amount),0) n FROM register_payments WHERE bill_id=?').get(o.id).n;const refunded=db.prepare('SELECT COALESCE(SUM(r.amount),0) n FROM register_refunds r JOIN register_payments p ON p.id=r.payment_id WHERE p.bill_id=?').get(o.id).n;return sum+paid-refunded;},0)/100;
    p.totalOrdersCount=orders.filter(o=>o.data.status==='completed').length;
    store.put('profile',p,row.restaurant_id,row.owner_id);
  };
  const config=id=>JSON.parse(db.prepare('SELECT data FROM register_config WHERE restaurant_id=?').get(id)?.data||'null');
  const requireConfig=id=>config(id)??fail(409,'Activez le pilote caisse dans Configuration.');
  const event=(restaurantId,kind,data)=>db.prepare('INSERT INTO register_outbox(id,restaurant_id,kind,data,at) VALUES(?,?,?,?,?)').run(randomUUID(),restaurantId,kind,JSON.stringify(data),now());
  const request=(req,id,operation,fn)=>store.transaction(()=>{
    if(!db.prepare('SELECT s.hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.user_id=? AND u.active=1 AND s.expires>?').get(req.session.hash,req.user.id,Date.now()))fail(401,'Session révoquée. Reconnectez-vous.');
    const key=text(req.get('idempotency-key'),100,true);
    if(!/^[\w-]{16,100}$/.test(key))fail(400,'Clé de répétition invalide.');
    const fingerprint=digest(JSON.stringify([req.user.id,operation,req.body]));
    const prior=db.prepare('SELECT * FROM register_requests WHERE restaurant_id=? AND key=?').get(id,key);
    if(prior){if(prior.fingerprint!==fingerprint)fail(409,'Cette clé appartient à une autre opération.');return JSON.parse(prior.result);}
    const result=fn();
    db.prepare('INSERT INTO register_requests VALUES(?,?,?,?)').run(id,key,fingerprint,JSON.stringify(result));
    store.audit(req.user.id,`register_${operation}`,id);
    event(id,operation,result);
    return result;
  });
  const reauth=async req=>{
    limit(`register-sensitive:${req.user.id}`,8,900000);
    const password=text(req.body.password,256,true);
    const user=db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);
    if(!await passwordMatches(password,user.password_hash))fail(403,'Réauthentification nécessaire.');
  };
  const activeSession=(id,user)=>db.prepare('SELECT * FROM cash_sessions WHERE restaurant_id=? AND user_id=? AND closed_at IS NULL').get(id,user)??fail(409,'Ouvrez votre session de caisse.');
  const rowFor=req=>{
    const row=store.read('order',req.params.orderId)??fail(404,'Commande introuvable.');
    authorize(req,row.restaurant_id,staff);requireConfig(row.restaurant_id);return row;
  };
  const enroll=row=>{
    let bill=db.prepare('SELECT * FROM register_bills WHERE id=?').get(row.id);
    if(!bill){
      if(row.data.paymentStatus!=='unpaid')fail(409,'Transaction historique : paiement antérieur non importé.');
      db.prepare('INSERT INTO register_bills(id,restaurant_id,total,tax,snapshot) VALUES(?,?,?,?,?)').run(row.id,row.restaurant_id,minor(row.data.totalMAD),minor(row.data.taxAmountMAD||0),JSON.stringify(row.data));
      bill=db.prepare('SELECT * FROM register_bills WHERE id=?').get(row.id);
    }
    return bill;
  };
  const totals=bill=>{
    const paid=db.prepare('SELECT COALESCE(SUM(amount),0) n FROM register_payments WHERE bill_id=?').get(bill.id).n;
    const refunded=db.prepare('SELECT COALESCE(SUM(r.amount),0) n FROM register_refunds r JOIN register_payments p ON p.id=r.payment_id WHERE p.bill_id=?').get(bill.id).n;
    return {total:bill.total,tax:bill.tax,paid,refunded,remaining:bill.total-paid,version:bill.version};
  };
  const cashSummary=session=>{
    const cashSales=db.prepare("SELECT COALESCE(SUM(amount),0) n FROM register_payments WHERE session_id=? AND method='cash'").get(session.id).n;
    const cardSales=db.prepare("SELECT COALESCE(SUM(amount),0) n FROM register_payments WHERE session_id=? AND method='card_terminal'").get(session.id).n;
    const cashRefunds=db.prepare("SELECT COALESCE(SUM(r.amount),0) n FROM register_refunds r JOIN register_payments p ON p.id=r.payment_id WHERE r.session_id=? AND p.method='cash'").get(session.id).n;
    const cardRefunds=db.prepare("SELECT COALESCE(SUM(r.amount),0) n FROM register_refunds r JOIN register_payments p ON p.id=r.payment_id WHERE r.session_id=? AND p.method='card_terminal'").get(session.id).n;
    const adjustments=db.prepare('SELECT COALESCE(SUM(amount),0) n FROM cash_movements WHERE session_id=?').get(session.id).n;
    return {opening:session.opening,cashSales,cardSales,cashRefunds,cardRefunds,adjustments,expected:session.opening+cashSales-cashRefunds+adjustments};
  };
  const document=(row,kind,extra={})=>{
    const prior=kind==='receipt'&&db.prepare("SELECT * FROM register_documents WHERE bill_id=? AND kind='receipt'").get(row.id);
    if(prior)return {...prior,data:JSON.parse(prior.data)};
    const cfg=requireConfig(row.restaurant_id),bill=enroll(row);
    db.prepare('INSERT INTO register_sequences VALUES(?,1) ON CONFLICT DO NOTHING').run(row.restaurant_id);
    const seq=db.prepare('SELECT next_number FROM register_sequences WHERE restaurant_id=?').get(row.restaurant_id).next_number;
    db.prepare('UPDATE register_sequences SET next_number=next_number+1 WHERE restaurant_id=?').run(row.restaurant_id);
    const id=randomUUID(),at=now(),number=`PILOT-${String(seq).padStart(8,'0')}`;
    const data={...JSON.parse(bill.snapshot),...extra,number,kind,at,paymentStatus:row.data.paymentStatus,
      legal:{...cfg.legal,name:cfg.legal.name||restaurant(row.restaurant_id).name},
      payments:db.prepare('SELECT id,method,amount,tendered,at FROM register_payments WHERE bill_id=?').all(row.id),
      notice:'PILOTE — document non validé pour usage fiscal',totals:totals(bill)};
    // Phone/address are excluded from financial copies until invoice buyer-data policy is configured.
    delete data.customerPhone;delete data.deliveryAddress;delete data.secureRef;
    db.prepare('INSERT INTO register_documents VALUES(?,?,?,?,?,?,?)').run(id,row.restaurant_id,row.id,number,kind,JSON.stringify(data),at);
    return {id,restaurant_id:row.restaurant_id,bill_id:row.id,number,kind,data,at};
  };
  app.get('/api/register/:id',wrap((req,res)=>{
    authorize(req,req.params.id,staff);restaurant(req.params.id);
    const id=req.params.id,canFinance=finance.includes(req.user.role),session=canFinance?db.prepare('SELECT * FROM cash_sessions WHERE restaurant_id=? AND user_id=? AND closed_at IS NULL').get(id,req.user.id):null;
    const bills=db.prepare('SELECT * FROM register_bills WHERE restaurant_id=?').all(id).map(b=>({id:b.id,...totals(b)}));
    const pending=db.prepare('SELECT COUNT(*) n,MIN(at) oldest FROM register_outbox WHERE restaurant_id=? AND acknowledged_at IS NULL').get(id);
    res.json({config:config(id),bills,session:session?{...session,summary:config(id)?.blindCount&&req.user.role==='cashier'?null:cashSummary(session)}:null,
      serverTime:now(),sync:{configured:false,lastAcknowledgedAt:null,pending:pending.n,oldest:pending.oldest},
      drafts:store.list('register_draft').filter(r=>r.restaurant_id===id&&!r.data.consumed).map(r=>r.data),
      printJobs:canFinance?db.prepare('SELECT j.*,d.number FROM register_print_jobs j JOIN register_documents d ON d.id=j.document_id WHERE d.restaurant_id=? ORDER BY j.at DESC LIMIT 100').all(id):[],
      documents:canFinance?db.prepare('SELECT id,bill_id,number,kind,at FROM register_documents WHERE restaurant_id=? ORDER BY at DESC LIMIT 100').all(id):[]});
  }));
  app.post('/api/register/:id/config',wrap(async(req,res)=>{
    authorize(req,req.params.id,['owner']);restaurant(req.params.id);await reauth(req);
    const result=request(req,req.params.id,'configure',()=>{
      const cutoff=integer(req.body.businessDayHour??4,0,12);
      const legal={};for(const field of ['name','address','ice','if','tp'])legal[field]=text(req.body.legal?.[field],300);
      const hardware={};for(const field of ['os','printer','connection','paperWidth','drawer'])hardware[field]=text(req.body.hardware?.[field],200);
      const value={pilot:true,businessDayHour:cutoff,blindCount:req.body.blindCount===true,legal,hardware,physicalTesting:'not_tested',fiscalApproval:false};
      db.prepare('INSERT INTO register_config VALUES(?,?) ON CONFLICT(restaurant_id) DO UPDATE SET data=excluded.data').run(req.params.id,JSON.stringify(value));
      return value;
    });res.json(result);
  }));
  app.post('/api/register/:id/cash/open',wrap((req,res)=>{
    authorize(req,req.params.id,finance);const cfg=requireConfig(req.params.id);
    res.json(request(req,req.params.id,'cash_open',()=>{
      const opening=integer(req.body.opening),drawer=text(req.body.drawer,80,true);
      if(db.prepare('SELECT id FROM cash_sessions WHERE restaurant_id=? AND closed_at IS NULL AND (drawer=? OR user_id=?)').get(req.params.id,drawer,req.user.id))fail(409,'Tiroir ou caissier déjà en service.');
      const id=randomUUID(),at=now();db.prepare('INSERT INTO cash_sessions(id,restaurant_id,drawer,user_id,opened_at,business_day,opening) VALUES(?,?,?,?,?,?,?)').run(id,req.params.id,drawer,req.user.id,at,businessDay(new Date(at),cfg.businessDayHour),opening);
      return {id,opening,drawer};
    }));
  }));
  app.post('/api/register/:id/cash/movement',wrap(async(req,res)=>{
    authorize(req,req.params.id,managers);await reauth(req);
    res.json(request(req,req.params.id,'cash_movement',()=>{
      const session=activeSession(req.params.id,req.user.id),amount=integer(req.body.amount,-1000000000);
      if(!amount)fail(400,'Montant nul.');
      if(cashSummary(session).expected+amount<0)fail(409,'Espèces insuffisantes.');
      const id=randomUUID();db.prepare('INSERT INTO cash_movements VALUES(?,?,?,?,?,?)').run(id,session.id,amount,text(req.body.reason,300,true),now(),req.user.id);return {id,amount};
    }));
  }));
  app.post('/api/register/:id/cash/close',wrap(async(req,res)=>{
    authorize(req,req.params.id,finance);await reauth(req);
    res.json(request(req,req.params.id,'cash_close',()=>{
      const session=activeSession(req.params.id,req.user.id),counted=integer(req.body.counted),summary=cashSummary(session);
      const unresolved=store.list('order').filter(r=>r.restaurant_id===req.params.id&&!['completed','cancelled','rejected'].includes(r.data.status)).map(r=>r.id);
      if(unresolved.length&&!req.body.unresolvedReason)fail(409,'Tickets ouverts : indiquez le motif de report.');
      const closing={...summary,counted,variance:counted-summary.expected,unresolved,unresolvedReason:text(req.body.unresolvedReason,300),cardCounted:integer(req.body.cardCounted),cardVariance:req.body.cardCounted-(summary.cardSales-summary.cardRefunds),at:now()};
      db.prepare('UPDATE cash_sessions SET closed_at=?,closing=? WHERE id=?').run(closing.at,JSON.stringify(closing),session.id);return {id:session.id,...closing};
    }));
  }));
  app.post('/api/register/:id/orders',wrap((req,res)=>{
    authorize(req,req.params.id,staff);requireConfig(req.params.id);
    res.status(201).json(request(req,req.params.id,'manual_order',()=>{
      const r=restaurant(req.params.id),input=req.body;
      const held=input.draftId?store.read('register_draft',input.draftId):null;
      if(input.draftId&&(!held||held.restaurant_id!==r.id||held.data.consumed||held.data.version!==input.draftVersion))fail(409,'Brouillon déjà utilisé ou modifié.');
      const verified=priceOrder(r,store.list('dish').map(r=>r.data),input);
      if(minor(input.expectedTotalMAD)!==minor(verified.totalMAD))fail(409,'Le prix a changé. Revérifiez le ticket.');
      const table=input.mode==='table'?r.tables.find(t=>t.tableNumber===input.tableNumber):null;
      if(input.mode==='table'&&!table)fail(400,'Table introuvable.');
      const nextNumber=store.list('order').filter(row=>row.restaurant_id===r.id).reduce((highest,row)=>Math.max(highest,Number(/^M-(\d+)$/.exec(row.data.orderNumber)?.[1]||0)),0)+1;
      const id=randomUUID(),order={...verified,id,restaurantId:r.id,orderNumber:`M-${nextNumber}`,secureRef:token(),items:verified.verifiedItems,
        mode:input.mode,tableNumber:table?.tableNumber,customerName:text(input.customerName,100)||'Client comptoir',customerPhone:text(input.customerPhone,30,input.mode==='delivery'),
        deliveryAddress:text(input.deliveryAddress,400,input.mode==='delivery'),deliveryZoneId:input.deliveryZoneId,customerNotes:text(input.customerNotes,500),
        status:input.confirm===true?'accepted':'submitted',...(input.confirm===true?{acceptedAt:now(),acceptedBy:req.user.id}:{}),paymentStatus:'unpaid',paymentMethod:'counter',createdAt:now(),staffAttribution:req.user.email,channel:'staff'};
      delete order.verifiedItems;store.put('order',order,r.id,req.session.customer_id);enroll(store.read('order',id));
      if(held){held.data.consumed=id;store.put('register_draft',held.data,r.id,held.owner_id);}return order;
    }));
  }));
  app.post('/api/register/:id/drafts',wrap((req,res)=>{
    authorize(req,req.params.id,staff);requireConfig(req.params.id);
    res.json(request(req,req.params.id,'save_draft',()=>{
      const b=req.body,prior=b.id?store.read('register_draft',b.id):null;
      if(b.id&&(!prior||prior.restaurant_id!==req.params.id||prior.data.consumed||prior.data.version!==b.version))fail(409,'Brouillon modifié. Rechargez-le.');
      const priced=priceOrder(restaurant(req.params.id),store.list('dish').map(d=>d.data),b);
      if(minor(b.expectedTotalMAD)!==minor(priced.totalMAD))fail(409,'Prix modifié : revérifiez le panier.');
      const draft={id:prior?.id||randomUUID(),restaurantId:req.params.id,version:(prior?.data.version||0)+1,mode:b.mode,tableNumber:b.tableNumber,
        customerName:text(b.customerName,100),items:priced.verifiedItems,expectedTotalMAD:priced.totalMAD,label:text(b.label,100)||'Brouillon',createdAt:prior?.data.createdAt||now(),updatedAt:now(),actor:req.user.id};
      if(b.mode==='delivery')fail(409,'Mise en attente livraison non prise en charge. Enregistrez la commande avec ses coordonnées.');
      store.put('register_draft',draft,req.params.id,req.user.id);return draft;
    }));
  }));
  app.post('/api/register/orders/:orderId/table',wrap((req,res)=>{
    const row=rowFor(req);
    res.json(request(req,row.restaurant_id,`table:${row.id}`,()=>{
      const current=store.read('order',row.id),bill=enroll(current);
      if(req.body.version!==bill.version)fail(409,'Ticket modifié. Actualisez.');
      if(totals(bill).paid||!['submitted','accepted'].includes(current.data.status)||current.data.mode!=='table')fail(409,'Transfert disponible avant préparation et paiement, pour une commande sur place.');
      const table=restaurant(row.restaurant_id).tables.find(t=>t.tableNumber===req.body.tableNumber)??fail(404,'Table introuvable.');
      current.data.tableNumber=table.tableNumber;store.put('order',current.data,row.restaurant_id,row.owner_id);refreshCustomerTotals(current);
      db.prepare('UPDATE register_bills SET snapshot=?,version=version+1 WHERE id=?').run(JSON.stringify(current.data),row.id);return current.data;
    }));
  }));
  app.post('/api/register/orders/:orderId/discount',wrap(async(req,res)=>{
    const row=rowFor(req);authorize(req,row.restaurant_id,managers);await reauth(req);
    res.json(request(req,row.restaurant_id,`discount:${row.id}`,()=>{
      const current=store.read('order',row.id),bill=enroll(current);
      if(req.body.version!==bill.version)fail(409,'Ticket modifié. Actualisez.');
      if(totals(bill).paid||!['submitted','accepted'].includes(current.data.status))fail(409,'Remise disponible avant préparation et paiement.');
      const previous=current.data.staffDiscountMinor||0,base=bill.total+previous,discount=integer(req.body.amount,0,Math.max(0,base-1));
      if(current.data.redeemedPoints)fail(409,'Remise non cumulable avec une récompense.');
      current.data.discountMAD=(minor(current.data.discountMAD)-previous+discount)/100;
      current.data.staffDiscountMinor=discount;current.data.discountReason=text(req.body.reason,300,true);current.data.totalMAD=(base-discount)/100;
      current.data.taxAmountMAD=Math.round((base-discount)-(base-discount)/(1+current.data.taxRatePercent/100))/100;
      store.put('order',current.data,row.restaurant_id,row.owner_id);refreshCustomerTotals(current);
      db.prepare('UPDATE register_bills SET total=?,tax=?,snapshot=?,version=version+1 WHERE id=?').run(base-discount,minor(current.data.taxAmountMAD),JSON.stringify(current.data),row.id);return current.data;
    }));
  }));
  app.post('/api/register/orders/:orderId/payments',wrap((req,res)=>{
    const row=rowFor(req);authorize(req,row.restaurant_id,finance);
    res.json(request(req,row.restaurant_id,`payment:${row.id}`,()=>{
      const current=store.read('order',row.id),bill=enroll(current),balance=totals(bill);
      if(req.body.version!==bill.version)fail(409,'Ticket modifié. Actualisez avant de payer.');
      if(['cancelled','rejected','submitted'].includes(current.data.status))fail(409,'Acceptez la commande avant encaissement.');
      const session=activeSession(row.restaurant_id,req.user.id),amount=integer(req.body.amount,1);
      if(amount>balance.remaining)fail(409,'Montant supérieur au solde restant.');
      const method=req.body.method;if(!['cash','card_terminal'].includes(method))fail(400,'Moyen de paiement invalide.');
      const tendered=method==='cash'?integer(req.body.tendered,amount):amount;
      const id=randomUUID();db.prepare('INSERT INTO register_payments VALUES(?,?,?,?,?,?,?,?)').run(id,row.id,session.id,method,amount,tendered,now(),req.user.id);
      db.prepare('UPDATE register_bills SET version=version+1 WHERE id=?').run(row.id);
      current.data.paymentStatus=balance.remaining===amount?'paid':'pending';current.data.paymentMethod=method;
      store.put('order',current.data,row.restaurant_id,row.owner_id);refreshCustomerTotals(current);
      const receipt=current.data.paymentStatus==='paid'?document(current,'receipt'):null;
      return {id,amount,change:tendered-amount,remaining:balance.remaining-amount,receipt};
    }));
  }));
  app.get('/api/register/orders/:orderId/payments',wrap((req,res)=>{
    const row=rowFor(req);authorize(req,row.restaurant_id,finance);
    res.json(db.prepare('SELECT p.*,COALESCE((SELECT SUM(amount) FROM register_refunds WHERE payment_id=p.id),0) refunded FROM register_payments p WHERE bill_id=?').all(row.id));
  }));
  app.post('/api/register/orders/:orderId/refunds',wrap(async(req,res)=>{
    const row=rowFor(req);authorize(req,row.restaurant_id,managers);await reauth(req);
    res.json(request(req,row.restaurant_id,`refund:${row.id}`,()=>{
      const current=store.read('order',row.id),bill=enroll(current),balance=totals(bill);
      if(balance.remaining!==0)fail(409,'Remboursement partiel avant règlement complet non pris en charge.');
      if(req.body.version!==bill.version)fail(409,'Ticket modifié. Actualisez.');
      const payment=db.prepare('SELECT * FROM register_payments WHERE id=? AND bill_id=?').get(req.body.paymentId,row.id)??fail(404,'Paiement introuvable.');
      const refunded=db.prepare('SELECT COALESCE(SUM(amount),0) n FROM register_refunds WHERE payment_id=?').get(payment.id).n;
      const amount=integer(req.body.amount,1);if(amount>payment.amount-refunded)fail(409,'Remboursement supérieur au montant disponible.');
      const session=activeSession(row.restaurant_id,req.user.id);
      if(payment.method==='cash'&&cashSummary(session).expected<amount)fail(409,'Espèces insuffisantes dans votre tiroir.');
      const previousTax=db.prepare('SELECT COALESCE(SUM(r.tax),0) n FROM register_refunds r JOIN register_payments p ON p.id=r.payment_id WHERE p.bill_id=?').get(row.id).n;
      // Cumulative allocation prevents multiple rounded refunds exceeding original tax.
      const tax=Math.round(bill.tax*(balance.refunded+amount)/bill.total)-previousTax;
      const id=randomUUID(),reason=text(req.body.reason,300,true);
      db.prepare('INSERT INTO register_refunds VALUES(?,?,?,?,?,?,?,?)').run(id,payment.id,session.id,amount,tax,reason,now(),req.user.id);
      db.prepare('UPDATE register_bills SET version=version+1 WHERE id=?').run(row.id);
      current.data.paymentStatus=balance.refunded+amount===bill.total?'refunded':'partially_refunded';
      // Revoke any unused receipt; existing points reverse proportionally, including already-spent points (negative balance allowed).
      db.prepare('UPDATE loyalty_receipts SET expires=0 WHERE order_id=?').run(row.id);
      if(current.data.loyaltyPointsEarned){
        const original=current.data.registerOriginalPoints??current.data.loyaltyPointsEarned;
        current.data.registerOriginalPoints=original;
        const target=Math.floor(original*(balance.refunded+amount)/bill.total),previous=current.data.registerReversedPoints||0,delta=target-previous;
        const customerId=current.data.loyaltyCustomerId||row.owner_id,p=profile(customerId,row.restaurant_id);
        p.loyaltyPoints-=delta;store.put('profile',p,row.restaurant_id,customerId);
        if(delta)store.put('ledger',{id:randomUUID(),restaurantId:row.restaurant_id,customerId:p.id,timestamp:now(),pointsDelta:-delta,type:'refund_reversal',orderId:row.id,description:`Correction ${current.data.orderNumber}`},row.restaurant_id,customerId);
        current.data.registerReversedPoints=target;
      }
      if(current.data.redeemedPoints){
        const target=Math.floor(current.data.redeemedPoints*(balance.refunded+amount)/bill.total),delta=target-(current.data.registerRestoredReward||0);
        const p=profile(row.owner_id,row.restaurant_id);p.loyaltyPoints+=delta;store.put('profile',p,row.restaurant_id,row.owner_id);
        if(delta)store.put('ledger',{id:randomUUID(),restaurantId:row.restaurant_id,customerId:p.id,timestamp:now(),pointsDelta:delta,type:'refund_reversal',orderId:row.id,description:`Restitution récompense ${current.data.orderNumber}`},row.restaurant_id,row.owner_id);
        current.data.registerRestoredReward=target;
        if(target===current.data.redeemedPoints)current.data.redemptionRestored=true;
      }
      store.put('order',current.data,row.restaurant_id,row.owner_id);refreshCustomerTotals(current);
      const correction=document(current,'correction',{refund:{id,paymentId:payment.id,amount,tax,reason},originalReceipt:db.prepare("SELECT number FROM register_documents WHERE bill_id=? AND kind='receipt'").get(row.id)?.number});
      return {id,amount,tax,correction};
    }));
  }));
  app.get('/api/register/documents/:documentId',wrap((req,res)=>{
    const doc=db.prepare('SELECT * FROM register_documents WHERE id=?').get(req.params.documentId)??fail(404,'Document introuvable.');authorize(req,doc.restaurant_id,finance);
    res.json({...doc,data:JSON.parse(doc.data)});
  }));
  app.post('/api/register/documents/:documentId/print',wrap((req,res)=>{
    const doc=db.prepare('SELECT * FROM register_documents WHERE id=?').get(req.params.documentId)??fail(404,'Document introuvable.');authorize(req,doc.restaurant_id,finance);
    res.json(request(req,doc.restaurant_id,`print:${doc.id}`,()=>{
      const duplicate=db.prepare('SELECT COUNT(*) n FROM register_print_jobs WHERE document_id=?').get(doc.id).n>0;
      const id=randomUUID();db.prepare("INSERT INTO register_print_jobs(id,document_id,state,duplicate,at,actor) VALUES(?,?,'unknown',?,?,?)").run(id,doc.id,duplicate?1:0,now(),req.user.id);
      return {id,duplicate,state:'unknown',message:'Dialogue navigateur demandé. Impression physique non confirmée.'};
    }));
  }));
  app.post('/api/register/print-jobs/:jobId/status',wrap((req,res)=>{
    const job=db.prepare('SELECT j.*,d.restaurant_id FROM register_print_jobs j JOIN register_documents d ON d.id=j.document_id WHERE j.id=?').get(req.params.jobId)??fail(404,'Impression introuvable.');
    authorize(req,job.restaurant_id,finance);
    res.json(request(req,job.restaurant_id,`print_status:${job.id}`,()=>{
      if(!['confirmed','failed'].includes(req.body.state))fail(400,'Choisissez une observation physique.');
      const note=text(req.body.note,300,true);
      db.prepare('UPDATE register_print_jobs SET state=?,note=? WHERE id=?').run(req.body.state,`Observation opérateur ${req.user.id}: ${note}`,job.id);
      return {id:job.id,state:req.body.state,source:'operator',note};
    }));
  }));
  app.get('/api/register/:id/report',wrap((req,res)=>{
    authorize(req,req.params.id,['owner']);
    const from=text(req.query.from,10,true),to=text(req.query.to,10,true);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)fail(400,'Période invalide.');
    const cutoff=requireConfig(req.params.id).businessDayHour;
    const docs=db.prepare('SELECT * FROM register_documents WHERE restaurant_id=? ORDER BY at').all(req.params.id).filter(d=>{const day=businessDay(new Date(d.at),cutoff);return day>=from&&day<=to;});
    const receipts=docs.filter(d=>d.kind==='receipt').map(d=>JSON.parse(d.data)),corrections=docs.filter(d=>d.kind==='correction').map(d=>JSON.parse(d.data));
    const sales=receipts.reduce((s,d)=>s+d.totals.total,0),tax=receipts.reduce((s,d)=>s+d.totals.tax,0),refunds=corrections.reduce((s,d)=>s+d.refund.amount,0),refundTax=corrections.reduce((s,d)=>s+d.refund.tax,0);
    const tenders=db.prepare('SELECT p.* FROM register_payments p JOIN register_bills b ON b.id=p.bill_id WHERE b.restaurant_id=?').all(req.params.id).filter(p=>{const day=businessDay(new Date(p.at),cutoff);return day>=from&&day<=to;});
    const collected=tenders.reduce((s,p)=>s+p.amount,0),cash=tenders.filter(p=>p.method==='cash').reduce((s,p)=>s+p.amount,0);
    const products=new Map();
    for(const d of receipts)for(const i of d.items){const p=products.get(i.dishId)||{id:i.dishId,name:i.dishName,quantity:0,gross:0};p.quantity+=i.quantity;p.gross+=minor(i.lineTotalMAD);products.set(i.dishId,p);}
    const discounts=receipts.reduce((n,d)=>n+minor(d.discountMAD||0),0);
    const unpaid=db.prepare('SELECT * FROM register_bills WHERE restaurant_id=?').all(req.params.id).filter(b=>{const o=store.read('order',b.id)?.data;return o&&!['cancelled','rejected'].includes(o.status);}).reduce((n,b)=>n+totals(b).remaining,0);
    res.json({from,to,discounts,unpaid,unpaidDefinition:"Solde actuel de tous les tickets non annulés, hors filtre de période",topProducts:[...products.values()].sort((a,b)=>b.quantity-a.quantity).slice(0,10),salesIncludingTax:sales,salesExcludingTax:sales-tax,tax,refunds,refundTax,netSalesIncludingTax:sales-refunds,collected,cash,card:collected-cash,paidOrders:receipts.length,averageTicket:receipts.length?Math.round(sales/receipts.length):0,denominator:'Tickets intégralement payés émis dans la période',documents:docs.map(d=>({id:d.id,number:d.number,kind:d.kind,at:d.at})),sessions:db.prepare('SELECT * FROM cash_sessions WHERE restaurant_id=? AND business_day>=? AND business_day<=?').all(req.params.id,from,to)});
  }));
  app.get('/api/register/:id/customers',wrap((req,res)=>{
    authorize(req,req.params.id,['owner']);
    res.json(store.list('profile').filter(p=>p.restaurant_id===req.params.id).map(p=>({id:p.id,name:p.data.name||'Client',loyaltyPoints:p.data.loyaltyPoints||0,totalOrdersCount:p.data.totalOrdersCount||0})));
  }));
  app.get('/api/register/:id/stock',wrap((req,res)=>{
    authorize(req,req.params.id,managers);res.json(db.prepare('SELECT i.*,COALESCE((SELECT SUM(quantity) FROM register_stock_movements WHERE item_id=i.id),0) balance FROM register_stock_items i WHERE restaurant_id=?').all(req.params.id));
  }));
  app.post('/api/register/:id/stock',wrap((req,res)=>{
    authorize(req,req.params.id,managers);requireConfig(req.params.id);
    res.json(request(req,req.params.id,'stock_item',()=>{
      const id=randomUUID(),name=text(req.body.name,120,true),unit=text(req.body.unit,20,true),minimum=integer(req.body.minimum);
      db.prepare('INSERT INTO register_stock_items VALUES(?,?,?,?,?)').run(id,req.params.id,name,unit,minimum);return {id,name,unit,minimum};
    }));
  }));
  app.post('/api/register/:id/stock/:itemId',wrap((req,res)=>{
    authorize(req,req.params.id,managers);
    res.json(request(req,req.params.id,`stock_movement:${req.params.itemId}`,()=>{
      if(!db.prepare('SELECT id FROM register_stock_items WHERE id=? AND restaurant_id=?').get(req.params.itemId,req.params.id))fail(404,'Article introuvable.');
      const quantity=integer(req.body.quantity,-1000000000);if(!quantity)fail(400,'Quantité nulle.');
      const id=randomUUID();db.prepare('INSERT INTO register_stock_movements VALUES(?,?,?,?,?,?)').run(id,req.params.itemId,quantity,text(req.body.reason,300,true),now(),req.user.id);return {id,quantity};
    }));
  }));
  return {config,enroll,totals,cashSummary,refreshCustomerTotals,orderChanged:order=>{if(config(order.restaurantId))event(order.restaurantId,'order_status',{id:order.id,status:order.status,paymentStatus:order.paymentStatus});}};
}
