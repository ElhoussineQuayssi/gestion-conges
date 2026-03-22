import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

// Database path configuration
function getDbPath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  return path.join(dataDir, 'database.sqlite');
}

// Ensure data directory exists
function ensureDataDir(): void {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Singleton database instance
let sqlite: Database.Database | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Get the SQLite database connection
 * Uses singleton pattern to ensure only one connection exists
 */
export function getDbConnection(): Database.Database {
  if (!sqlite) {
    ensureDataDir();
    const dbPath = getDbPath();
    
    sqlite = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });
    
    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');
    
    // Set journal mode to WAL for better performance
    sqlite.pragma('journal_mode = WAL');
    
    console.log(`[SQLite] Connected to database at: ${dbPath}`);
  }
  
  return sqlite;
}

/**
 * Get Drizzle ORM instance
 */
export function getDrizzleDb(): ReturnType<typeof drizzle> {
  if (!db) {
    const sqlite = getDbConnection();
    db = drizzle(sqlite, { schema });
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDbConnection(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    console.log('[SQLite] Database connection closed');
  }
}

/**
 * Check if database is initialized
 */
export function isDbInitialized(): boolean {
  return sqlite !== null;
}

// Export the schema and types
export { schema };
export type Database = ReturnType<typeof drizzle>;
