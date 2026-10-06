import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {mkdirSync} from 'node:fs';
const target=process.argv[2];
if(!target)throw new Error('Usage: node server/backup.mjs /private-backups/mida-YYYYMMDD.sqlite');
mkdirSync(path.dirname(path.resolve(target)),{recursive:true});
const db=new DatabaseSync(process.env.DATABASE_PATH||'./data/mida.sqlite');
try{db.prepare('VACUUM INTO ?').run(path.resolve(target));console.log('Consistent backup created.');}finally{db.close();}
