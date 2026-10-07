import fs from 'node:fs/promises';
import { createApp } from './app.mjs';
import {mountWebsite} from './website.mjs';
const port=Number(process.env.PORT || 3001);
const catalog=JSON.parse(await fs.readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
const {app,store}=createApp({databasePath:process.env.DATABASE_PATH || './data/mida.sqlite',catalog,origin:process.env.APP_ORIGIN || `http://localhost:${port}`,production:process.env.NODE_ENV==='production'});
mountWebsite(app,store);
app.listen(port,process.env.HOST || (process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'),()=>console.log(`Mida listening on port ${port}`));
