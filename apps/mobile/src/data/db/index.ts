import * as SQLite from 'expo-sqlite';

let dbPromise: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = await SQLite.openDatabaseAsync('zeno.db');
    await runMigrations(dbPromise);
  }
  return dbPromise;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, name TEXT NOT NULL, defaultCurrency TEXT DEFAULT 'USD', monthStartDay INTEGER DEFAULT 1, createdAt TEXT, updatedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, householdId TEXT NOT NULL, name TEXT NOT NULL, color TEXT DEFAULT '#000000', createdAt TEXT, updatedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, householdId TEXT NOT NULL, name TEXT NOT NULL, type TEXT DEFAULT 'cash', currency TEXT DEFAULT 'USD', openingBalanceMinor INTEGER DEFAULT 0, archivedAt TEXT, createdAt TEXT, updatedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, householdId TEXT NOT NULL, nameKey TEXT NOT NULL, icon TEXT DEFAULT 'circle', color TEXT DEFAULT '#FF8A65', type TEXT DEFAULT 'expense', parentId TEXT, sortOrder INTEGER DEFAULT 0, archivedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, householdId TEXT NOT NULL, accountId TEXT NOT NULL, memberId TEXT, categoryId TEXT NOT NULL, type TEXT NOT NULL, amountMinor INTEGER NOT NULL, currency TEXT DEFAULT 'USD', occurredAt TEXT NOT NULL, note TEXT DEFAULT '', merchantName TEXT DEFAULT '', locationLabel TEXT DEFAULT '', recurringRuleId TEXT, createdAt TEXT, updatedAt TEXT, deletedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, householdId TEXT NOT NULL, categoryId TEXT NOT NULL, period TEXT DEFAULT 'monthly', limitMinor INTEGER NOT NULL, currency TEXT DEFAULT 'USD', startMonth TEXT, endMonth TEXT, createdAt TEXT, updatedAt TEXT);`,
    `CREATE TABLE IF NOT EXISTS appSettings (key TEXT PRIMARY KEY, value TEXT, updatedAt TEXT);`,
  ];
  for (const sql of migrations) {
    await db.execAsync(sql);
  }
}

/** Drop all rows from every user-data table (for data reset). */
export async function clearDb(): Promise<void> {
  const db = await getDB();
  const tables = [
    'transactions',
    'budgets',
    'accounts',
    'categories',
    'members',
    'households',
    'appSettings',
  ];
  for (const table of tables) {
    await db.execAsync(`DELETE FROM ${table};`);
  }
}
