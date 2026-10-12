// Disposable loopback demonstration. Never opens restaurant or local-pilot data.
import {mkdir,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createApp} from './app.mjs';
import {createUser} from './database.mjs';
import {mountWebsite} from './website.mjs';
if(process.env.NODE_ENV==='production')throw new Error('Disposable preview only.');
const directory=path.resolve('data/register-preview');
await mkdir(directory,{recursive:true});
const catalog=JSON.parse(await readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
const port=Number(process.env.MIDA_PREVIEW_PORT||3005),origin=`http://127.0.0.1:${port}`;
const {app,store}=createApp({databasePath:path.join(directory,'preview.sqlite'),catalog,origin});
if(!store.db.prepare('SELECT id FROM users WHERE email=?').get('owner@example.test'))await createUser(store,{email:'owner@example.test',password:'Mida-preview-only-2026!',role:'owner',restaurantId:catalog.restaurants[0].id});
mountWebsite(app,store);
const server=app.listen(port,'127.0.0.1',()=>console.log(`Persistent loopback demo: ${origin}/mida-restaurant/?surface=register\nTest login: owner@example.test / Mida-preview-only-2026!\nDemo database: data/register-preview/preview.sqlite. Retained on restart; never use real restaurant data.`));
const stop=()=>{server.closeAllConnections();server.close(()=>{store.db.close();process.exit(0);});};
process.once('SIGINT',stop);process.once('SIGTERM',stop);
