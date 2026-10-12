import {readFile} from 'node:fs/promises';
import {openDatabase} from './database.mjs';
import {issueResetToken} from './auth-recovery.mjs';
const email=process.argv[2];if(!email)throw new Error('Usage: node server/reset-access.mjs staff@email — verify identity first. DATABASE_PATH must name the correct restaurant database.');
if(!process.env.DATABASE_PATH)throw new Error('Set DATABASE_PATH explicitly.');
const catalog=JSON.parse(await readFile(new URL('./catalog/menu.json',import.meta.url),'utf8'));
const store=openDatabase(process.env.DATABASE_PATH,catalog);
try{const user=store.db.prepare('SELECT id FROM users WHERE email=? AND active=1').get(email.toLowerCase().trim());if(!user)throw new Error('User not found.');console.log('Single-use reset token (15 minutes). Share privately with the verified account holder:');console.log(issueResetToken(store,user.id));}finally{store.db.close();}
