import {randomUUID} from 'node:crypto';
import {token,digest,passwordHash,passwordMatches} from './database.mjs';
import {fail,text} from './pricing.mjs';

export const loyaltyDefaults={enabled:true,pointsPerMAD:1,pointsToRedeem:100,rewardValueMAD:15,welcomePoints:0,claimDays:30,minRewardSpendMAD:50};
export const loyaltyRules=restaurant=>({...loyaltyDefaults,...restaurant.loyaltyConfig});
export function mountMembership({app,store,wrap,limit,newSession}){
  app.use('/api',(req,_res,next)=>{req.member=!req.user?store.db.prepare('SELECT id,email,name FROM customers WHERE id=? AND active=1').get(req.session.customer_id):null;next();});
  app.post('/api/member/register',wrap(async(req,res)=>{
    if(req.user||req.member)fail(409,'Déconnectez-vous avant de créer un compte.');
    const email=text(req.body.email,254,true).toLowerCase(),name=text(req.body.name,100,true),password=req.body.password;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<12||password.length>256)fail(400,'Email valide et mot de passe de 12 caractères minimum requis.');
    limit(`member-register:${req.ip}`,10,3600000);
    if(store.db.prepare('SELECT id FROM customers WHERE email=?').get(email))fail(409,'Cet email est déjà utilisé.');
    const hash=await passwordHash(password);
    store.transaction(()=>{
      if(store.db.prepare('SELECT id FROM customers WHERE id=? OR email=?').get(req.session.customer_id,email))fail(409,'Un compte existe déjà. Connectez-vous.');
      store.db.prepare('INSERT INTO customers(id,email,name,password_hash) VALUES(?,?,?,?)').run(req.session.customer_id,email,name,hash);
      store.db.prepare('DELETE FROM sessions WHERE hash=?').run(req.session.hash);newSession(res,req.session.customer_id);
      store.audit(req.session.customer_id,'member_registered',req.session.customer_id);
    });res.status(201).json({ok:true});
  }));
  app.post('/api/member/login',wrap(async(req,res)=>{
    if(req.user)fail(409,'Déconnectez le personnel avant de vous connecter comme client.');
    const email=text(req.body.email,254,true).toLowerCase(),password=req.body.password;
    if(typeof password!=='string'||!password.length||password.length>256)fail(400,'Mot de passe invalide.');
    limit(`member-login:${req.ip}`,30,900000);limit(`member-email:${digest(email)}`,10,900000);
    const member=store.db.prepare('SELECT * FROM customers WHERE email=? AND active=1').get(email);
    const fallback=await passwordHash('timing-placeholder','mida-invalid-member');
    if(!await passwordMatches(password,member?.password_hash??fallback)||!member)fail(401,'Identifiants incorrects.');
    store.db.prepare('DELETE FROM sessions WHERE hash=?').run(req.session.hash);newSession(res,member.id);
    store.audit(member.id,'member_login',member.id);res.json({ok:true});
  }));
  app.post('/api/member/password',wrap(async(req,res)=>{
    if(!req.member)fail(401,'Connexion membre requise.');
    const {currentPassword,newPassword}=req.body;
    if(typeof currentPassword!=='string'||currentPassword.length>256||typeof newPassword!=='string'||newPassword.length<12||newPassword.length>256)fail(400,'Mot de passe invalide.');
    limit(`member-password:${req.member.id}`,10,900000);
    const member=store.db.prepare('SELECT * FROM customers WHERE id=?').get(req.member.id);
    if(!await passwordMatches(currentPassword,member.password_hash))fail(401,'Mot de passe actuel incorrect.');
    const hash=await passwordHash(newPassword);
    store.transaction(()=>{store.db.prepare('UPDATE customers SET password_hash=? WHERE id=?').run(hash,member.id);store.db.prepare('DELETE FROM sessions WHERE customer_id=? AND user_id IS NULL').run(member.id);newSession(res,member.id);});res.json({ok:true});
  }));
}
export function mountLoyalty({app,store,wrap,limit,authorize,restaurant,profile}){
  app.post('/api/orders/:id/receipt',wrap((req,res)=>{
    const result=store.transaction(()=>{
      const row=store.read('order',req.params.id)??fail(404,'Commande introuvable.');
      authorize(req,row.restaurant_id,['owner','manager','cashier','waiter','platform_admin']);
      const order=row.data,rules=loyaltyRules(restaurant(row.restaurant_id));
      if(!rules.enabled)fail(409,'Fidélité désactivée.');
      if(order.paymentStatus!=='paid'||['cancelled','rejected'].includes(order.status))fail(409,'Commande payée et valide requise.');
      const prior=store.db.prepare('SELECT * FROM loyalty_receipts WHERE order_id=?').get(order.id);
      if(prior?.claimed_by||order.loyaltyPointsEarned)fail(409,'Points déjà crédités.');
      if(prior){if(prior.expires<=Date.now())fail(409,'Ce ticket a expiré.');return prior;}
      const points=Math.floor(Math.max(0,order.totalMAD-order.deliveryFeeMAD)*rules.pointsPerMAD);
      if(points<1)fail(409,'Aucun point pour ce ticket.');
      const value=token(),expires=Date.now()+rules.claimDays*86400000;
      store.db.prepare('INSERT INTO loyalty_receipts(order_id,restaurant_id,token_hash,claim_token,points,expires) VALUES(?,?,?,?,?,?)').run(order.id,row.restaurant_id,digest(value),value,points,expires);
      store.audit(req.user.id,'receipt_issued',order.id);return {claim_token:value,points,expires};
    });res.json({token:result.claim_token,points:result.points,expiresAt:new Date(result.expires).toISOString()});
  }));
  app.post('/api/loyalty/claim',wrap((req,res)=>{
    if(!req.member)fail(401,'Connectez-vous à votre compte fidélité.');
    limit(`receipt:${req.member.id}`,30,600000);
    const value=text(req.body.token,100,true),id=text(req.body.restaurantId,100,true);
    const result=store.transaction(()=>{
      const receipt=store.db.prepare('SELECT * FROM loyalty_receipts WHERE token_hash=? AND restaurant_id=?').get(digest(value),id);
      if(!receipt)fail(404,'Ticket inconnu.');
      if(receipt.claimed_by)fail(409,'Ce ticket a déjà été utilisé.');
      if(receipt.expires<=Date.now())fail(409,'Ce ticket a expiré.');
      const row=store.read('order',receipt.order_id),order=row?.data;
      if(!loyaltyRules(restaurant(id)).enabled)fail(409,'Fidélité désactivée.');
      if(!order||order.paymentStatus!=='paid'||['cancelled','rejected'].includes(order.status))fail(409,'Ticket annulé ou remboursé.');
      if(order.loyaltyPointsEarned)fail(409,'Points déjà crédités.');
      const p=profile(req.member.id,id),now=new Date().toISOString();
      p.name=req.member.name;p.email=req.member.email;p.loyaltyPoints+=receipt.points;
      order.loyaltyPointsEarned=receipt.points;order.loyaltyCustomerId=req.member.id;
      store.db.prepare('UPDATE loyalty_receipts SET claimed_by=?,claimed_at=? WHERE order_id=? AND claimed_by IS NULL').run(req.member.id,now,order.id);
      store.put('profile',p,id,req.member.id);store.put('order',order,id,row.owner_id);
      store.put('ledger',{id:randomUUID(),restaurantId:id,customerId:p.id,timestamp:now,pointsDelta:receipt.points,type:'earned',orderId:order.id,description:`Ticket ${order.orderNumber}`},id,req.member.id);
      store.audit(req.member.id,'receipt_claimed',order.id);return {points:receipt.points,balance:p.loyaltyPoints};
    });res.json(result);
  }));
  app.patch('/api/restaurants/:id/loyalty',wrap((req,res)=>{
    authorize(req,req.params.id,['owner','manager','platform_admin']);const r=restaurant(req.params.id),b=req.body;
    if(typeof b.enabled!=='boolean'||!Number.isFinite(b.pointsPerMAD)||b.pointsPerMAD<0.1||b.pointsPerMAD>10||!Number.isInteger(b.pointsToRedeem)||b.pointsToRedeem<1||b.pointsToRedeem>100000||!Number.isFinite(b.rewardValueMAD)||b.rewardValueMAD<1||b.rewardValueMAD>500||!Number.isInteger(b.claimDays)||b.claimDays<1||b.claimDays>365||!Number.isFinite(b.minRewardSpendMAD)||b.minRewardSpendMAD<b.rewardValueMAD||b.minRewardSpendMAD>10000)fail(400,'Règles de fidélité invalides.');
    r.loyaltyConfig={enabled:b.enabled,pointsPerMAD:b.pointsPerMAD,pointsToRedeem:b.pointsToRedeem,rewardValueMAD:b.rewardValueMAD,welcomePoints:0,claimDays:b.claimDays,minRewardSpendMAD:b.minRewardSpendMAD};
    store.put('restaurant',r);store.audit(req.user.id,'loyalty_configured',r.id);res.json(r.loyaltyConfig);
  }));
  app.patch('/api/restaurants/:id/promotion',wrap((req,res)=>{
    authorize(req,req.params.id,['owner','manager','platform_admin']);const r=restaurant(req.params.id),b=req.body;
    if(typeof b.enabled!=='boolean'||!Number.isFinite(b.percent)||b.percent<1||b.percent>50||!Number.isFinite(b.maxDiscountMAD)||b.maxDiscountMAD<1||b.maxDiscountMAD>500||!Number.isFinite(b.minSpendMAD)||b.minSpendMAD<0||b.minSpendMAD>10000||!Number.isFinite(Date.parse(b.expiresAt)))fail(400,'Promotion invalide.');
    const code=text(b.code,30,true).toUpperCase();if(!/^[A-Z0-9_-]{3,30}$/.test(code))fail(400,'Code promotion invalide.');
    r.promotion={enabled:b.enabled,code,percent:b.percent,maxDiscountMAD:b.maxDiscountMAD,minSpendMAD:b.minSpendMAD,expiresAt:new Date(b.expiresAt).toISOString()};
    store.put('restaurant',r);store.audit(req.user.id,'promotion_configured',r.id);res.json(r.promotion);
  }));
}
