import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createUser,token,passwordHash} from './database.mjs';
export async function prepareLocalAccounts(store,restaurantId,url){
  if(process.env.NODE_ENV==='production')throw new Error('Local fixtures cannot run in production.');
  await fs.mkdir('data',{recursive:true});
  let credentials;try{credentials=JSON.parse(await fs.readFile('data/local-access.json','utf8'));}catch{credentials={accounts:[]};}
  for(const role of ['owner','manager','kitchen','cashier','waiter','platform_admin']){
    const email=`${role}@local.mida.test`;
    if(!store.db.prepare('SELECT id FROM users WHERE email=?').get(email)){const password=token();await createUser(store,{email,password,role,restaurantId});credentials.accounts.push({role,email,password});}
  }
  const email='customer@local.mida.test';
  if(!store.db.prepare('SELECT id FROM customers WHERE email=?').get(email)){const password=token();store.db.prepare('INSERT INTO customers(id,email,name,password_hash) VALUES(?,?,?,?)').run(randomUUID(),email,'Client local de test',await passwordHash(password));credentials.member={email,password};}
  credentials.url=url;await fs.writeFile('data/local-access.json',JSON.stringify(credentials,null,2),{mode:0o600});
}
