import {token,digest,passwordHash} from './database.mjs';
import {fail,text} from './pricing.mjs';
export function recoverySchema(store){store.db.exec(`CREATE TABLE IF NOT EXISTS staff_reset_tokens(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL,used_at TEXT);`);}
// Only call from the server-operator CLI after verifying the requester's identity.
export function issueResetToken(store,userId){
  recoverySchema(store);
  if(!store.db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(userId))throw new Error('Active user required.');
  const value=token();
  store.transaction(()=>{store.db.prepare('DELETE FROM staff_reset_tokens WHERE user_id=?').run(userId);store.db.prepare('INSERT INTO staff_reset_tokens VALUES(?,?,?,NULL)').run(digest(value),userId,Date.now()+15*60000);store.audit('server_operator','password_reset_issued',userId);});
  return value;
}
export function mountAuthRecovery({app,store,wrap,limit}){
  recoverySchema(store);
  app.post('/api/password/reset',wrap(async(req,res)=>{
    limit(`reset:${req.ip}`,10,900000);
    const value=text(req.body.token,100,true),password=req.body.newPassword;
    if(typeof password!=='string'||password.length<12||password.length>256)fail(400,'Mot de passe de 12 à 256 caractères requis.');
    const find=()=>store.db.prepare('SELECT r.* FROM staff_reset_tokens r JOIN users u ON u.id=r.user_id WHERE r.hash=? AND r.expires>? AND r.used_at IS NULL AND u.active=1').get(digest(value),Date.now());
    if(!find())fail(400,'Code invalide ou expiré.');
    const hash=await passwordHash(password);
    store.transaction(()=>{
      const reset=find()??fail(400,'Code invalide ou expiré.');
      store.db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash,reset.user_id);
      store.db.prepare('UPDATE staff_reset_tokens SET used_at=? WHERE hash=?').run(new Date().toISOString(),reset.hash);
      store.db.prepare('DELETE FROM sessions WHERE user_id=?').run(reset.user_id);store.audit(reset.user_id,'password_reset_completed',reset.user_id);
    });res.json({ok:true});
  }));
}
