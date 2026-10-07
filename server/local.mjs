import fs from 'node:fs/promises';
import {createApp} from './app.mjs';
import {prepareLocalAccounts} from './local-accounts.mjs';
import {mountWebsite} from './website.mjs';

// Local pilot only: loopback by default; optionally bind to a private LAN address for phone previews.
if(process.env.NODE_ENV==='production')throw new Error('The local pilot cannot run in production.');
const host=process.env.MIDA_LOCAL_HOST||'127.0.0.1';
const octets=host.split('.').map(Number);
if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255)||!(host==='127.0.0.1'||octets[0]===10||(octets[0]===192&&octets[1]===168)||(octets[0]===172&&octets[1]>=16&&octets[1]<=31)))throw new Error('Use loopback or a private LAN IPv4 address for the local pilot.');
const port=Number(process.env.MIDA_LOCAL_PORT||3002),origin=`http://${host}:${port}`;
const catalog=JSON.parse(await fs.readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
const {app,store}=createApp({databasePath:'./data/local-pilot.sqlite',catalog,origin});
const url=`${origin}/mida-restaurant/`;await prepareLocalAccounts(store,catalog.restaurants[0].id,url);
mountWebsite(app,store);
const server=app.listen(port,host,()=>console.log(`Local pilot: ${url}\nLocal staff credentials: data/local-access.json (never commit or share publicly).`));
const stop=()=>{server.closeAllConnections();server.close(()=>{store.db.close();process.exit(0);});};process.once('SIGINT',stop);process.once('SIGTERM',stop);
