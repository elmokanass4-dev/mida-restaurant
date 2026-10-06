import fs from 'node:fs/promises';
import { openDatabase, createUser } from './database.mjs';
// Read credentials from stdin; never accept a password in shell arguments.
let input=''; for await (const chunk of process.stdin) input+=chunk;
const catalog=JSON.parse(await fs.readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
const store=openDatabase(process.env.DATABASE_PATH || './data/mida.sqlite',catalog);
try { await createUser(store,JSON.parse(input)); console.log('Account created.'); }
catch(error) { console.error(error.message); process.exitCode=1; }
finally { store.db.close(); }
