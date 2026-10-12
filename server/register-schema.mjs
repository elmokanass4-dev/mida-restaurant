// Additive migration: legacy customer orders remain readable; no historical payments are invented.
export function migrateRegister(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  if (db.prepare('SELECT version FROM schema_migrations WHERE version=1').get()) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      CREATE TABLE register_config(restaurant_id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE register_bills(id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
        total INTEGER NOT NULL CHECK(total>=0), tax INTEGER NOT NULL CHECK(tax>=0), snapshot TEXT NOT NULL);
      CREATE TABLE cash_sessions(id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, drawer TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id), opened_at TEXT NOT NULL, business_day TEXT NOT NULL,
        opening INTEGER NOT NULL CHECK(opening>=0), closed_at TEXT, closing TEXT);
      CREATE UNIQUE INDEX one_open_drawer ON cash_sessions(restaurant_id,drawer) WHERE closed_at IS NULL;
      CREATE UNIQUE INDEX one_open_session_per_user ON cash_sessions(restaurant_id,user_id) WHERE closed_at IS NULL;
      CREATE TABLE register_payments(id TEXT PRIMARY KEY, bill_id TEXT NOT NULL REFERENCES register_bills(id),
        session_id TEXT NOT NULL REFERENCES cash_sessions(id), method TEXT NOT NULL CHECK(method IN ('cash','card_terminal')),
        amount INTEGER NOT NULL CHECK(amount>0), tendered INTEGER NOT NULL CHECK(tendered>=amount), at TEXT NOT NULL, actor TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE register_refunds(id TEXT PRIMARY KEY, payment_id TEXT NOT NULL REFERENCES register_payments(id),
        session_id TEXT NOT NULL REFERENCES cash_sessions(id), amount INTEGER NOT NULL CHECK(amount>0), tax INTEGER NOT NULL CHECK(tax>=0),
        reason TEXT NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE cash_movements(id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES cash_sessions(id),
        amount INTEGER NOT NULL CHECK(amount!=0), reason TEXT NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL REFERENCES users(id));
      CREATE TABLE register_sequences(restaurant_id TEXT PRIMARY KEY, next_number INTEGER NOT NULL);
      CREATE TABLE register_documents(id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, bill_id TEXT NOT NULL REFERENCES register_bills(id),
        number TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('receipt','correction')), data TEXT NOT NULL, at TEXT NOT NULL,
        UNIQUE(restaurant_id,number));
      CREATE UNIQUE INDEX one_receipt_per_bill ON register_documents(bill_id) WHERE kind='receipt';
      CREATE TABLE register_requests(restaurant_id TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL,
        PRIMARY KEY(restaurant_id,key));
      CREATE TABLE register_outbox(sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
        restaurant_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, kind TEXT NOT NULL, data TEXT NOT NULL, at TEXT NOT NULL,
        acknowledged_at TEXT);
      CREATE TABLE register_print_jobs(id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES register_documents(id),
        state TEXT NOT NULL CHECK(state IN ('pending','unknown','confirmed','failed')), duplicate INTEGER NOT NULL,
        at TEXT NOT NULL, actor TEXT NOT NULL REFERENCES users(id), note TEXT NOT NULL DEFAULT '');
      CREATE TABLE register_stock_items(id TEXT PRIMARY KEY, restaurant_id TEXT NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL,
        minimum INTEGER NOT NULL DEFAULT 0 CHECK(minimum>=0));
      CREATE TABLE register_stock_movements(id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES register_stock_items(id),
        quantity INTEGER NOT NULL CHECK(quantity!=0), reason TEXT NOT NULL, at TEXT NOT NULL, actor TEXT NOT NULL REFERENCES users(id));
    `);
    for (const table of ['register_payments','register_refunds','cash_movements','register_documents','register_stock_movements']) {
      db.exec(`CREATE TRIGGER ${table}_immutable_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'Immutable financial record'); END;
        CREATE TRIGGER ${table}_immutable_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'Immutable financial record'); END;`);
    }
    db.exec(`CREATE TRIGGER closed_session_immutable BEFORE UPDATE ON cash_sessions WHEN OLD.closed_at IS NOT NULL
      BEGIN SELECT RAISE(ABORT,'Closed session is immutable'); END;
      CREATE TRIGGER cash_session_no_delete BEFORE DELETE ON cash_sessions BEGIN SELECT RAISE(ABORT,'Cash session cannot be deleted'); END;`);
    db.prepare('INSERT INTO schema_migrations VALUES(1,?)').run(new Date().toISOString());
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
