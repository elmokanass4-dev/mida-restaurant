// Hosted demonstrations only: isolated, disposable data; no restaurant database.
import {readFile, mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from './app.mjs';
import {createUser} from './database.mjs';
import {mountWebsite} from './website.mjs';

const origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
const email = process.env.MIDA_DEMO_OWNER_EMAIL;
const password = process.env.MIDA_DEMO_OWNER_PASSWORD;
if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Set APP_ORIGIN to the public HTTPS origin.');
if (!email || !password || password.length < 16) throw new Error('Set a private MIDA_DEMO_OWNER_EMAIL and MIDA_DEMO_OWNER_PASSWORD (at least 16 characters).');
const directory = path.join(os.tmpdir(), 'mida-hosted-demo');
await mkdir(directory, {recursive:true});
const catalog = JSON.parse(await readFile(new URL('./catalog/menu.json', import.meta.url), 'utf8'));
const {app,store} = createApp({databasePath:path.join(directory,'demo.sqlite'),catalog,origin,production:true,posOptions:{mode:'disabled'}});
if (!store.db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim())) {
  await createUser(store,{email,password,role:'owner',restaurantId:catalog.restaurants[0].id});
}
app.use((_req,res,next)=>{res.set('X-Robots-Tag','noindex, nofollow');next();});
mountWebsite(app,store);
const server = app.listen(Number(process.env.PORT || 3001),'0.0.0.0',()=>console.log('MIDA demonstration ready. Use fictitious data only. Demo data may be lost when hosting restarts.'));
const stop=()=>{server.closeAllConnections();server.close(()=>{store.db.close();process.exit(0);});};
process.once('SIGINT',stop);
process.once('SIGTERM',stop);
