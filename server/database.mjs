import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const derive = promisify(scrypt);
export const token = () => randomBytes(32).toString('base64url');
export const digest = value => createHash('sha256').update(value).digest('hex');
export const roles = ['owner', 'manager', 'kitchen', 'cashier', 'waiter', 'platform_admin'];
export async function passwordHash(password, salt = token()) {
  const hash = await derive(password, salt, 64);
  return `${salt}:${Buffer.from(hash).toString('hex')}`;
}
export async function passwordMatches(password, stored) {
  const [salt, expected] = stored.split(':');
  const actual = Buffer.from((await passwordHash(password, salt)).split(':')[1], 'hex');
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export function openDatabase(filename, catalog) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), {recursive: true});
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS entities (kind TEXT NOT NULL, id TEXT NOT NULL, restaurant_id TEXT, owner_id TEXT, data TEXT NOT NULL, PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, restaurant_id TEXT, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, customer_id TEXT NOT NULL, user_id TEXT REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS idempotency (customer_id TEXT NOT NULL, request_key TEXT NOT NULL, fingerprint TEXT NOT NULL, order_id TEXT NOT NULL, PRIMARY KEY(customer_id,request_key));
    CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, resets INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS entity_scope ON entities(kind,restaurant_id,owner_id);`);
  const read = (kind, id) => {
    const row = db.prepare('SELECT * FROM entities WHERE kind=? AND id=?').get(kind,id);
    return row ? {...row, data: JSON.parse(row.data)} : undefined;
  };
  const list = kind => db.prepare('SELECT * FROM entities WHERE kind=?').all(kind).map(row => ({...row, data:JSON.parse(row.data)}));
  const put = (kind, value, restaurantId = value.restaurantId ?? value.id, ownerId = null) => db.prepare('INSERT INTO entities VALUES (?,?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET restaurant_id=excluded.restaurant_id,owner_id=excluded.owner_id,data=excluded.data').run(kind,value.id,restaurantId,ownerId,JSON.stringify(value));
  const transaction = callback => {
    db.exec('BEGIN IMMEDIATE');
    try { const result = callback(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  if (!list('restaurant').length) transaction(() => {
    for (const restaurant of catalog.restaurants) put('restaurant', {...restaurant, tables: restaurant.tables.map(t => ({...t, sessionToken:token()})), returnCampaigns: []});
    for (const category of catalog.categories) put('category',category);
    for (const dish of catalog.dishes) put('dish',dish);
  });
  return {db, read, list, put, transaction, audit: (actor, action, id) => db.prepare('INSERT INTO audit(at,actor,action,entity_id) VALUES(?,?,?,?)').run(new Date().toISOString(),actor,action,id)};
}
export async function createUser(store, {email, password, role, restaurantId}) {
  if (!roles.includes(role) || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('Valid email, role and password of 12–256 characters required.');
  if (role !== 'platform_admin' && !store.read('restaurant',restaurantId)) throw new Error('Restaurant not found.');
  const id = randomUUID();
  store.db.prepare('INSERT INTO users(id,email,password_hash,role,restaurant_id) VALUES(?,?,?,?,?)').run(id,email.toLowerCase().trim(),await passwordHash(password),role,role === 'platform_admin' ? null : restaurantId);
  store.audit('provisioning', 'user_created', id);
  return id;
}
