import {DatabaseSync} from 'node:sqlite';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {mkdtemp,readFile,writeFile,unlink,rmdir,mkdir,copyFile,statfs} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

function keyBytes(key){if(!/^[0-9a-f]{64}$/i.test(key||''))throw new Error('MIDA_BACKUP_KEY must be 64 hex characters, stored outside the database.');return Buffer.from(key,'hex');}
export function verifyDatabase(filename){
  const db=new DatabaseSync(filename,{readOnly:true});
  try {
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Backup database integrity failed.');
    const has=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='register_payments'").get();
    return has?{payments:db.prepare('SELECT COUNT(*) count,COALESCE(SUM(amount),0) total FROM register_payments').get(),refunds:db.prepare('SELECT COUNT(*) count,COALESCE(SUM(amount),0) total FROM register_refunds').get(),documents:db.prepare('SELECT COUNT(*) count FROM register_documents').get(),pending:db.prepare('SELECT COUNT(*) count FROM register_outbox WHERE acknowledged_at IS NULL').get()}:{legacy:true};
  } finally{db.close();}
}
export async function encryptedBackup(source,target,key,offDeviceDirectory){
  const secret=keyBytes(key),directory=await mkdtemp(path.join(os.tmpdir(),'mida-backup-')),temporary=path.join(directory,'snapshot.sqlite');
  try {
    const db=new DatabaseSync(source,{readOnly:true});try{db.prepare('VACUUM INTO ?').run(temporary);}finally{db.close();}
    const evidence=verifyDatabase(temporary),plaintext=await readFile(temporary),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);
    const bytes=Buffer.concat([Buffer.from('MIDA1'),iv,cipher.update(plaintext),cipher.final(),cipher.getAuthTag()]);
    await mkdir(path.dirname(path.resolve(target)),{recursive:true});await writeFile(target,bytes,{flag:'wx',mode:0o600});
    if(offDeviceDirectory){await mkdir(offDeviceDirectory,{recursive:true});await copyFile(target,path.join(offDeviceDirectory,path.basename(target)),1);}
    return evidence;
  }finally{await unlink(temporary).catch(()=>{});await unlink(temporary+'-wal').catch(()=>{});await unlink(temporary+'-shm').catch(()=>{});await rmdir(directory).catch(()=>{});}
}
export async function restoreBackup(source,target,key){
  const bytes=await readFile(source);if(bytes.subarray(0,5).toString()!=='MIDA1')throw new Error('Unsupported backup format.');
  const decipher=createDecipheriv('aes-256-gcm',keyBytes(key),bytes.subarray(5,17));decipher.setAuthTag(bytes.subarray(-16));
  const plain=Buffer.concat([decipher.update(bytes.subarray(17,-16)),decipher.final()]);
  const directory=await mkdtemp(path.join(os.tmpdir(),'mida-restore-')),temporary=path.join(directory,'verify.sqlite');
  try {
    await writeFile(temporary,plain,{flag:'wx',mode:0o600});const evidence=verifyDatabase(temporary);
    await mkdir(path.dirname(path.resolve(target)),{recursive:true});await writeFile(target,plain,{flag:'wx',mode:0o600});return evidence;
  }finally{await unlink(temporary).catch(()=>{});await unlink(temporary+'-wal').catch(()=>{});await unlink(temporary+'-shm').catch(()=>{});await rmdir(directory).catch(()=>{});}
}
export function startBackups(databasePath){
  const directory=process.env.MIDA_BACKUP_DIR;
  if(!directory)return ()=>{};
  keyBytes(process.env.MIDA_BACKUP_KEY);let running=false;
  const interval=Number(process.env.MIDA_BACKUP_MINUTES||30);if(!Number.isFinite(interval)||interval<5)throw new Error('Backup interval must be at least 5 minutes.');
  const run=async()=>{if(running)return;running=true;try{
    const disk=await statfs(path.dirname(path.resolve(databasePath)));if(disk.bavail*disk.bsize<512*1024*1024)throw new Error('LOW_DISK');
    await encryptedBackup(databasePath,path.join(directory,`mida-${new Date().toISOString().replace(/[:.]/g,'-')}.mida-backup`),process.env.MIDA_BACKUP_KEY,process.env.MIDA_BACKUP_OFFDEVICE_DIR);
    console.log('Verified encrypted backup completed.');
  }catch{console.error('MIDA BACKUP FAILED: inspect disk space, backup destinations and key configuration.');}finally{running=false;}};
  void run();const timer=setInterval(run,interval*60000);timer.unref();return ()=>clearInterval(timer);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const [mode,source,target]=process.argv.slice(2);
  if(mode==='verify'&&source)console.log(JSON.stringify(verifyDatabase(source)));
  else if(mode==='backup'&&source&&target)console.log(JSON.stringify(await encryptedBackup(source,target,process.env.MIDA_BACKUP_KEY,process.env.MIDA_BACKUP_OFFDEVICE_DIR)));
  else if(mode==='restore'&&source&&target)console.log(JSON.stringify(await restoreBackup(source,target,process.env.MIDA_BACKUP_KEY)));
  else throw new Error('Usage: node server/recovery.mjs backup|restore SOURCE NEW_TARGET, or verify DATABASE. Existing targets are never overwritten.');
}
