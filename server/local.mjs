import fs from 'node:fs/promises';
import {createApp} from './app.mjs';
import {prepareLocalAccounts} from './local-accounts.mjs';
import {mountWebsite} from './website.mjs';

// Local pilot only: never bind to a public interface or use this bootstrap in production.
if(process.env.NODE_ENV==='production')throw new Error('The local pilot cannot run in production.');
const port=Number(process.env.MIDA_LOCAL_PORT||3002),origin=`http://127.0.0.1:${port}`;
const catalog=JSON.parse(await fs.readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
const {app,store}=createApp({databasePath:'./data/local-pilot.sqlite',catalog,origin});
const url=`${origin}/mida-restaurant/`;await prepareLocalAccounts(store,catalog.restaurants[0].id,url);
mountWebsite(app,store);
const server=app.listen(port,'127.0.0.1',()=>console.log(`Local pilot: ${url}\nLocal staff credentials: data/local-access.json (never commit or share publicly).`));
const stop=()=>{server.closeAllConnections();server.close(()=>{store.db.close();process.exit(0);});};process.once('SIGINT',stop);process.once('SIGTERM',stop);
