import {randomUUID} from 'node:crypto';
import {passwordHash,token} from './database.mjs';
import {fail,text} from './pricing.mjs';
import {loyaltyDefaults} from './loyalty.mjs';

export function asset(value){
  const v=text(value,2000);if(!v)return '';
  if(/^\/(?!\/)[a-zA-Z0-9_./%-]+$/.test(v))return v;
  try{const u=new URL(v);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}
  fail(400,'Image : URL HTTPS ou chemin local requis.');
}
const translation=(value,required=true)=>Object.fromEntries(['fr','ar','en'].map(lang=>[lang,text(value?.[lang],500,required&&lang==='fr')]));
export function mountTenants({app,store,wrap,authorize,restaurant}){
  app.patch('/api/restaurants/:id/operations',wrap((req,res)=>{
    authorize(req,req.params.id,['owner','manager','platform_admin']);const r=restaurant(req.params.id),b=req.body;
    const number=(v,max)=>{if(!Number.isFinite(v)||v<0||v>max)fail(400,'Valeur numérique invalide.');return v;};
    if(!b.orderingModes||!['table','pickup','delivery'].every(k=>typeof b.orderingModes[k]==='boolean')||!Object.values(b.orderingModes).some(Boolean))fail(400,'Activez au moins un mode de commande.');
    if(!b.deliverySettings||!Array.isArray(b.deliverySettings.zones)||b.deliverySettings.zones.length>30||typeof b.deliverySettings.isPaused!=='boolean')fail(400,'Livraison invalide.');
    const d=b.deliverySettings,seen=new Set();
    const zones=d.zones.map(z=>{if(!z||typeof z.active!=='boolean')fail(400,'Zone invalide.');const id=text(z.id,100)||randomUUID();if(seen.has(id))fail(400,'Zone en double.');seen.add(id);return {id,name:text(z.name,100,true),feeMAD:number(z.feeMAD,10000),minSpendMAD:number(z.minSpendMAD,10000),active:z.active};});
    r.orderingModes=Object.fromEntries(['table','pickup','delivery'].map(k=>[k,b.orderingModes[k]]));r.prepTimeEstimateMinutes=number(b.prepTimeEstimateMinutes,240);r.taxRatePercent=number(b.taxRatePercent,100);
    r.deliverySettings={minOrderMAD:number(d.minOrderMAD,10000),deliveryFeeMAD:number(d.deliveryFeeMAD,10000),estimatedRange:text(d.estimatedRange,100),isPaused:d.isPaused,zones};
    store.put('restaurant',r);store.audit(req.user.id,'operations_updated',r.id);res.json(r);
  }));
  app.post('/api/restaurants',wrap(async(req,res)=>{
    authorize(req,null,['platform_admin']);
    const b=req.body,slug=text(b.slug,60,true);
    if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug))fail(400,'Identifiant : lettres minuscules, chiffres et tirets.');
    const name=text(b.name,120,true),email=text(b.ownerEmail,254,true).toLowerCase(),password=b.ownerPassword;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<12||password.length>256)fail(400,'Email propriétaire et mot de passe de 12 à 256 caractères requis.');
    const hash=await passwordHash(password);
    const r={id:slug,slug,name,tagline:{fr:'',ar:'',en:''},city:text(b.city,120),address:text(b.address,500),phone:text(b.phone,100),currency:'MAD',timezone:'Africa/Casablanca',accentColor:'#f59e0b',logoImage:'',coverImage:'',openingHours:'',isOpen:false,orderingModes:{table:true,pickup:true,delivery:false},deliverySettings:{minOrderMAD:0,deliveryFeeMAD:0,estimatedRange:'',zones:[],isPaused:true},tableCount:1,tables:[{tableNumber:1,label:'Table 1',capacity:2,sessionToken:token()}],prepTimeEstimateMinutes:20,taxRatePercent:0,loyaltyConfig:{...loyaltyDefaults},returnCampaigns:[]};
    store.transaction(()=>{
      if(store.list('restaurant').some(row=>row.id===slug||row.data.slug===slug))fail(409,'Identifiant restaurant déjà utilisé.');
      if(store.db.prepare('SELECT id FROM users WHERE email=?').get(email))fail(409,'Email du personnel déjà utilisé.');
      store.put('restaurant',r);store.db.prepare('INSERT INTO users(id,email,role,password_hash,restaurant_id,active) VALUES(?,?,?,?,?,1)').run(randomUUID(),email,'owner',hash,slug);
    });
    store.audit(req.user.id,'restaurant_created',slug);res.status(201).json(r);
  }));
  app.patch('/api/restaurants/:id/branding',wrap((req,res)=>{
    authorize(req,req.params.id,['owner','manager','platform_admin']);const r=restaurant(req.params.id),b=req.body;
    const color=text(b.accentColor,7,true);if(!/^#[0-9a-fA-F]{6}$/.test(color))fail(400,'Couleur hexadécimale invalide.');
    r.accentColor=color;r.logoImage=asset(b.logoImage);r.coverImage=asset(b.coverImage);r.city=text(b.city,120);r.tagline=translation(b.tagline,false);
    store.put('restaurant',r);store.audit(req.user.id,'branding_updated',r.id);res.json(r);
  }));
  app.post('/api/restaurants/:id/categories',wrap((req,res)=>{
    authorize(req,req.params.id,['owner','manager','platform_admin']);restaurant(req.params.id);
    const c={id:randomUUID(),restaurantId:req.params.id,name:translation(req.body.name),slug:randomUUID(),sortOrder:store.list('category').filter(c=>c.restaurant_id===req.params.id).length};store.put('category',c);res.status(201).json(c);
  }));
  app.post('/api/restaurants/:id/dishes',wrap((req,res)=>{
    authorize(req,req.params.id,['owner','manager','platform_admin']);restaurant(req.params.id);const b=req.body;
    if(store.read('category',b.categoryId)?.restaurant_id!==req.params.id)fail(400,'Catégorie du restaurant requise.');
    if(!Number.isFinite(b.priceMAD)||b.priceMAD<0||b.priceMAD>10000)fail(400,'Prix invalide.');
    const d={id:randomUUID(),restaurantId:req.params.id,categoryId:b.categoryId,name:translation(b.name),description:translation(b.description,false),priceMAD:Math.round(b.priceMAD*100)/100,image:asset(b.image)||'/mida-restaurant/menu-placeholder.svg',isAvailable:true,isFeatured:false,ingredients:{fr:[],ar:[],en:[]},verifiedAllergens:[],dietaryLabels:[],modifierGroups:[]};store.put('dish',d);res.status(201).json(d);
  }));
}
