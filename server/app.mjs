import express from 'express';
import { randomUUID } from 'node:crypto';
import { openDatabase, token, digest, passwordMatches, passwordHash, createUser } from './database.mjs';
import { ApiError, fail, text, priceOrder } from './pricing.mjs';

const staffRoles = ['owner','manager','kitchen','cashier','waiter','platform_admin'];
const managers = ['owner','manager','platform_admin'];
const cashiers = ['owner','manager','cashier','waiter','platform_admin'];
const transitions = {submitted:['accepted','rejected','cancelled'],accepted:['preparing','cancelled'],preparing:['ready','out_for_delivery','cancelled'],ready:['completed','cancelled'],out_for_delivery:['completed','cancelled'],completed:[],rejected:[],cancelled:[]};
const blankCustomer = (id, restaurantId) => ({id,restaurantId,name:'Client',phone:'',loyaltyPoints:0,favoriteDishIds:[],totalOrdersCount:0,totalSpentMAD:0,marketingConsent:false,availableOffers:[]});
export function createApp({databasePath, catalog, origin, production = false}) {
  const store = openDatabase(databasePath,catalog);
  const app = express();
  app.disable('x-powered-by');
  const proxyHops=Number(process.env.TRUST_PROXY_HOPS || 0);
  if(Number.isInteger(proxyHops)&&proxyHops>0&&proxyHops<=2) app.set('trust proxy',proxyHops);
  const wrap = handler => (req,res,next) => Promise.resolve().then(() => handler(req,res)).catch(next);
  const allowedOrigin = new URL(origin).origin;
  if (production && !origin.startsWith('https://')) throw new Error('Production APP_ORIGIN must use HTTPS.');
  app.use((_req,res,next) => {
    res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});
    if (production) res.set('Strict-Transport-Security','max-age=31536000');
    next();
  });
  app.use('/api', (req,res,next) => {
    res.set('Cache-Control','no-store');
    if (!['GET','HEAD'].includes(req.method) && (req.get('origin') !== allowedOrigin || req.get('x-mida-request') !== '1')) return res.status(403).json({error:'Origine de la requête refusée.'});
    next();
  }, express.json({limit:'64kb'}));
  app.get('/api/health',(_req,res)=>res.json({ok:true}));
  app.use('/api',(req,res,next)=>{
    if(!['GET','HEAD'].includes(req.method)&&(!req.body||typeof req.body!=='object'||Array.isArray(req.body)))return res.status(400).json({error:'Requête invalide.'});
    next();
  });
  const newSession = (res, customerId, userId = null) => {
    const value = token();
    store.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(value),customerId,userId,Date.now()+ (userId ? 12*3600000 : 30*86400000));
    res.cookie('mida_session',value,{httpOnly:true,secure:production,sameSite:'strict',path:'/',maxAge:userId?12*3600000:30*86400000});
    return {customer_id:customerId,user_id:userId,hash:digest(value)};
  };
  const limit = (key, maximum, milliseconds) => {
    const now = Date.now();
    store.db.prepare('DELETE FROM rate_limits WHERE resets < ?').run(now);
    const entry = store.db.prepare('SELECT * FROM rate_limits WHERE key=?').get(key);
    if (entry && entry.count >= maximum) fail(429,'Trop de tentatives. Réessayez plus tard.');
    store.db.prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+milliseconds);
  };
  app.use('/api',(req,res,next) => { try {
    store.db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    const raw = req.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith('mida_session='))?.slice(13);
    let session = raw && store.db.prepare('SELECT * FROM sessions WHERE hash=? AND expires>?').get(digest(raw),Date.now());
    if (!session) {
      limit(`sessions:${req.ip}`,120,3600000);
      session = newSession(res,randomUUID());
    }
    req.session = session;
    req.user = session.user_id ? store.db.prepare('SELECT id,email,role,restaurant_id FROM users WHERE id=? AND active=1').get(session.user_id) : null;
    next();
  } catch(error) { next(error); } });
  // Staff authorization always checks the database-backed membership, never a client role.
  const authorize = (req,restaurantId,roles=staffRoles) => {
    if (!req.user) fail(401,'Connexion du personnel requise.');
    if (!roles.includes(req.user.role) || (req.user.role !== 'platform_admin' && req.user.restaurant_id !== restaurantId)) fail(403,'Accès refusé.');
  };
  const saveOrder = (req,row,action) => {store.put('order',row.data,row.restaurant_id,row.owner_id); store.audit(req.user.id,action,row.id);};
  const restaurant = id => store.read('restaurant',id)?.data ?? fail(404,'Restaurant introuvable.');
  const profile = (customerId,restaurantId) => store.read('profile',`${customerId}:${restaurantId}`)?.data ?? blankCustomer(`${customerId}:${restaurantId}`,restaurantId);

  app.post('/api/login',wrap(async(req,res)=>{
    const email = text(req.body.email,254,true).toLowerCase();
    const password=req.body.password;
    if(typeof password!=='string'||!password.length||password.length>256) fail(400,'Mot de passe invalide.');
    limit(`login-ip:${req.ip}`,30,900000); limit(`login-email:${digest(email)}`,10,900000);
    const user = store.db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
    const fallback = await passwordHash('timing-placeholder', 'mida-invalid-user');
    if (!await passwordMatches(password,user?.password_hash ?? fallback) || !user) fail(401,'Identifiants incorrects.');
    store.db.prepare('DELETE FROM sessions WHERE hash=?').run(req.session.hash);
    newSession(res,req.session.customer_id,user.id);
    store.audit(user.id,'login',user.id);
    res.json({ok:true});
  }));
  app.post('/api/logout',wrap((req,res)=>{
    store.db.prepare('DELETE FROM sessions WHERE hash=?').run(req.session.hash);
    // A fresh anonymous identity prevents a shared staff terminal retaining customer history.
    newSession(res,randomUUID()); res.json({ok:true});
  }));
  app.get('/api/snapshot',wrap((req,res)=>{
    const restaurants = store.list('restaurant').map(row=>{
      const r = structuredClone(row.data);
      const member = req.user && (req.user.role==='platform_admin' || req.user.restaurant_id===r.id);
      if (!member) {r.tables=[]; r.returnCampaigns=[];}
      else if (!managers.includes(req.user.role)) {r.returnCampaigns=[]; if(req.user.role==='kitchen')r.tables=[];}
      return r;
    });
    const accessible = row => req.user ? (req.user.role==='platform_admin' || row.restaurant_id===req.user.restaurant_id) : row.owner_id===req.session.customer_id;
    const orders = store.list('order').filter(accessible).map(row=>{
      const order = structuredClone(row.data);
      if (!req.user) {delete order.staffAttribution; delete order.tableSessionToken;}
      if (req.user?.role==='kitchen') {delete order.customerPhone; delete order.deliveryAddress;}
      return order;
    });
    res.json({user:req.user ? {id:req.user.id,email:req.user.email,role:req.user.role,restaurantId:req.user.restaurant_id} : null,
      restaurants,categories:store.list('category').map(r=>r.data),dishes:store.list('dish').map(r=>r.data),orders,
      customers:restaurants.map(r=>profile(req.session.customer_id,r.id)),
      ledger:store.list('ledger').filter(r=>r.owner_id===req.session.customer_id).map(r=>r.data),
      calls:req.user ? store.list('call').filter(accessible).map(r=>r.data) : []});
  }));
  app.post('/api/quote',wrap((req,res)=>res.json(priceOrder(restaurant(req.body.restaurantId),store.list('dish').map(r=>r.data),req.body))));
  app.post('/api/orders',wrap((req,res)=>{
    const data = req.body;
    const key = text(req.get('idempotency-key'),100,true);
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key)) fail(400,'Clé de commande invalide.');
    const fingerprint = digest(JSON.stringify(data));
    limit(`order-attempts:${req.ip}`,150,600000);
    const result = store.transaction(()=>{
      const prior = store.db.prepare('SELECT * FROM idempotency WHERE customer_id=? AND request_key=?').get(req.session.customer_id,key);
      if (prior) {if(prior.fingerprint!==fingerprint) fail(409,'Cette clé correspond à un autre panier.'); return store.read('order',prior.order_id).data;}
      limit(`orders:${req.session.customer_id}`,10,600000); limit(`orders-ip:${req.ip}`,100,600000);
      const r = restaurant(data.restaurantId);
      const verified = priceOrder(r,store.list('dish').map(r=>r.data),data);
      if(!Number.isFinite(data.expectedTotalMAD)||Math.abs(data.expectedTotalMAD-verified.totalMAD)>0.005)fail(409,'Le prix a changé. Actualisez le panier avant de confirmer.');
      const customerName = text(data.customerName,100,true), customerPhone = text(data.customerPhone,30,true);
      if (!/^[+\d\s()-]{7,30}$/.test(customerPhone)) fail(400,'Téléphone invalide.');
      const paymentMethod = data.paymentMethod;
      if (!['cash','counter','card_terminal'].includes(paymentMethod)) fail(400,'Paiement en ligne non disponible.');
      let table;
      if(data.mode==='table') {
        table=r.tables.find(t=>t.tableNumber===data.tableNumber && t.sessionToken===data.tableSessionToken);
        if(!table) fail(403,'Scannez le QR code de votre table.');
      }
      const deliveryAddress=text(data.deliveryAddress,400,data.mode==='delivery');
      const id=randomUUID();
      const order={id,restaurantId:r.id,orderNumber:`M-${store.list('order').length+1}`,secureRef:token(),mode:data.mode,
        customerName,customerPhone,customerNotes:text(data.customerNotes,500),deliveryAddress,deliveryZoneId:data.mode==='delivery'?data.deliveryZoneId:undefined,
        tableNumber:table?.tableNumber,items:verified.verifiedItems,...verified,status:'submitted',paymentStatus:'unpaid',paymentMethod,createdAt:new Date().toISOString()};
      delete order.verifiedItems;
      store.put('order',order,r.id,req.session.customer_id);
      store.db.prepare('INSERT INTO idempotency VALUES(?,?,?,?)').run(req.session.customer_id,key,fingerprint,id);
      const p=profile(req.session.customer_id,r.id); p.name=customerName; p.phone=customerPhone;
      store.put('profile',p,r.id,req.session.customer_id);
      store.audit(req.session.customer_id,'order_created',id);
      return order;
    });
    res.status(201).json(result);
  }));
  app.patch('/api/orders/:id/status',wrap((req,res)=>{
    const result=store.transaction(()=>{
      const row=store.read('order',req.params.id) ?? fail(404,'Commande introuvable.');
      authorize(req,row.restaurant_id);
      const status=req.body.status;
      if (!transitions[row.data.status]?.includes(status)) fail(409,'Transition de commande invalide.');
      if (req.user.role==='kitchen' && !['accepted','preparing','ready','out_for_delivery'].includes(status)) fail(403,'Action réservée à la salle ou au manager.');
      if (status==='out_for_delivery' && row.data.mode!=='delivery' || status==='ready' && row.data.mode==='delivery') fail(400,'Statut incompatible avec le mode.');
      if (status==='completed' && row.data.paymentStatus!=='paid') fail(409,'Enregistrez le paiement avant de terminer.');
      if (status==='cancelled' && !managers.includes(req.user.role)) fail(403,'Annulation réservée au manager.');
      const order=row.data; order.status=status; order.staffAttribution=req.user.email;
      if(status==='accepted') {
        const minutes=req.body.prepMinutesAdded??20;
        if(!Number.isInteger(minutes)||minutes<1||minutes>240) fail(400,'Délai invalide.');
        order.acceptedAt=new Date().toISOString(); order.estimatedReadyAt=new Date(Date.now()+minutes*60000).toISOString();
      }
      if(status==='rejected') order.rejectionReason=text(req.body.rejectionReason,300,true);
      if(status==='completed') {
        order.completedAt=new Date().toISOString();
        const r=restaurant(row.restaurant_id), p=profile(row.owner_id,row.restaurant_id);
        const points=Math.floor(order.totalMAD*r.loyaltyConfig.pointsPerMAD);
        order.loyaltyPointsEarned=points; p.loyaltyPoints+=points; p.totalSpentMAD+=order.totalMAD; p.totalOrdersCount++; p.lastPurchaseDate=order.completedAt;
        store.put('profile',p,row.restaurant_id,row.owner_id);
        store.put('ledger',{id:randomUUID(),restaurantId:row.restaurant_id,customerId:p.id,timestamp:order.completedAt,pointsDelta:points,type:'earned',orderId:order.id,description:`Commande ${order.orderNumber}`},row.restaurant_id,row.owner_id);
      }
      saveOrder(req,row,`order_${status}`); return order;
    }); res.json(result);
  }));
  app.patch('/api/orders/:id/payment',wrap((req,res)=>{
    const result=store.transaction(()=>{
      const row=store.read('order',req.params.id)??fail(404,'Commande introuvable.');
      const status=req.body.paymentStatus;
      authorize(req,row.restaurant_id,status==='refunded'?managers:cashiers);
      const order=row.data;
      if(status==='paid' && order.paymentStatus==='unpaid' && !['cancelled','rejected'].includes(order.status)) order.paymentStatus='paid';
      else if(status==='refunded' && order.paymentStatus==='paid') {
        order.refundReason=text(req.body.refundReason,300,true); order.paymentStatus='refunded'; order.status='cancelled';
        if(order.loyaltyPointsEarned) {
          const p=profile(row.owner_id,row.restaurant_id); p.loyaltyPoints=Math.max(0,p.loyaltyPoints-order.loyaltyPointsEarned); p.totalSpentMAD=Math.max(0,p.totalSpentMAD-order.totalMAD); p.totalOrdersCount=Math.max(0,p.totalOrdersCount-1);
          store.put('profile',p,row.restaurant_id,row.owner_id);
          store.put('ledger',{id:randomUUID(),restaurantId:row.restaurant_id,customerId:p.id,timestamp:new Date().toISOString(),pointsDelta:-order.loyaltyPointsEarned,type:'refund_reversal',orderId:order.id,description:`Remboursement ${order.orderNumber}`},row.restaurant_id,row.owner_id);
          order.loyaltyPointsEarned=0;
        }
      } else fail(409,'Transition de paiement invalide.');
      order.staffAttribution=req.user.email; saveOrder(req,row,`payment_${status}`); return order;
    }); res.json(result);
  }));
  app.patch('/api/dishes/:id/availability',wrap((req,res)=>{
    const row=store.read('dish',req.params.id)??fail(404,'Plat introuvable.');
    authorize(req,row.restaurant_id,['owner','manager','kitchen','platform_admin']);
    if(typeof req.body.isAvailable!=='boolean') fail(400,'Disponibilité invalide.');
    row.data.isAvailable=req.body.isAvailable; store.put('dish',row.data); store.audit(req.user.id,'dish_availability',row.id); res.json(row.data);
  }));
  app.patch('/api/restaurants/:id/service',wrap((req,res)=>{
    authorize(req,req.params.id,managers);
    const r=restaurant(req.params.id);
    if(typeof req.body.isOpen!=='boolean')fail(400,'Statut invalide.');
    r.isOpen=req.body.isOpen; store.put('restaurant',r);store.audit(req.user.id,'restaurant_service',r.id);res.json(r);
  }));
  app.post('/api/password',wrap(async(req,res)=>{
    if(!req.user)fail(401,'Connexion requise.');
    const {currentPassword,newPassword}=req.body;
    if(typeof currentPassword!=='string'||currentPassword.length>256||typeof newPassword!=='string'||newPassword.length<12||newPassword.length>256)fail(400,'Mot de passe invalide (12 caractères minimum).');
    limit(`password:${req.user.id}`,10,900000);
    const user=store.db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if(!await passwordMatches(currentPassword,user.password_hash))fail(401,'Mot de passe actuel incorrect.');
    const hash=await passwordHash(newPassword);
    store.transaction(()=>{
      store.db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,user.id);
      store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      newSession(res,req.session.customer_id,user.id);store.audit(user.id,'password_changed',user.id);
    });res.json({ok:true});
  }));
  app.patch('/api/profile/:restaurantId',wrap((req,res)=>{
    restaurant(req.params.restaurantId);
    const p=profile(req.session.customer_id,req.params.restaurantId);
    if(typeof req.body.marketingConsent!=='boolean') fail(400,'Consentement invalide.');
    p.marketingConsent=req.body.marketingConsent; p.marketingConsentTimestamp=new Date().toISOString();
    store.put('profile',p,req.params.restaurantId,req.session.customer_id); res.json(p);
  }));
  app.post('/api/calls',wrap((req,res)=>{
    const data=req.body;
    if(!['call_waiter','request_bill','allergen_question'].includes(data.type)) fail(400,'Demande invalide.');
    const own=store.list('order').some(r=>r.owner_id===req.session.customer_id && r.restaurant_id===data.restaurantId && r.data.tableNumber===data.tableNumber && !['completed','cancelled','rejected'].includes(r.data.status));
    if(!own) fail(403,'Commande active à cette table requise.');
    limit(`calls:${req.session.customer_id}:${data.restaurantId}:${data.tableNumber}`,1,45000);
    const call={id:randomUUID(),restaurantId:data.restaurantId,tableNumber:data.tableNumber,type:data.type,notes:text(data.notes,300),timestamp:new Date().toISOString(),resolved:false};
    store.put('call',call,data.restaurantId,req.session.customer_id); res.json({success:true,message:'Demande transmise au serveur.'});
  }));
  app.patch('/api/calls/:id',wrap((req,res)=>{
    const row=store.read('call',req.params.id)??fail(404,'Demande introuvable.'); authorize(req,row.restaurant_id,cashiers);
    row.data.resolved=true; store.put('call',row.data,row.restaurant_id,row.owner_id); res.json({ok:true});
  }));
  app.get('/api/users',wrap((req,res)=>{
    const id=req.query.restaurantId; authorize(req,id,['owner','platform_admin']);
    res.json(store.db.prepare('SELECT id,email,role,restaurant_id AS restaurantId,active FROM users WHERE restaurant_id=?').all(id));
  }));
  app.post('/api/users',wrap(async(req,res)=>{
    authorize(req,req.body.restaurantId,['owner','platform_admin']);
    if(req.body.role==='platform_admin' || req.body.role==='owner') fail(403,'Ce rôle doit être créé par le responsable du serveur.');
    if(typeof req.body.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)||req.body.email.length>254||typeof req.body.password!=='string'||req.body.password.length<12||req.body.password.length>256||!['manager','kitchen','cashier','waiter'].includes(req.body.role))fail(400,'Email, rôle ou mot de passe invalide.');
    if(store.db.prepare('SELECT id FROM users WHERE email=?').get(req.body.email.toLowerCase().trim()))fail(409,'Cet email est déjà utilisé.');
    const id=await createUser(store,req.body); store.audit(req.user.id,'staff_created',id); res.status(201).json({id});
  }));
  app.patch('/api/users/:id',wrap((req,res)=>{
    const user=store.db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id)??fail(404,'Utilisateur introuvable.');
    authorize(req,user.restaurant_id,['owner','platform_admin']);
    if(['owner','platform_admin'].includes(user.role) || typeof req.body.active!=='boolean') fail(403,'Action refusée.');
    store.db.prepare('UPDATE users SET active=? WHERE id=?').run(req.body.active?1:0,user.id);
    store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id); store.audit(req.user.id,'staff_access_changed',user.id); res.json({ok:true});
  }));
  app.use('/api',(req,res)=>res.status(404).json({error:'Action non disponible.'}));
  app.use((error,req,res,next)=>{
    if(res.headersSent) return next(error);
    const status=error instanceof ApiError ? error.status : error.type==='entity.parse.failed'?400:500;
    if(status===500) console.error('API failure',error.message);
    res.status(status).json({error:status===500?'Erreur du serveur. Réessayez.':error.message});
  });
  return {app,store};
}
