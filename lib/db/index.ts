import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import { drizzle } from 'drizzle-orm/sql-js';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

// SQL.js WASM file location - needs to be served statically or loaded from CDN
// For Vercel serverless, we'll use the CDN approach
const SQL_WASM_CDN = 'https://sql.js.org/dist/sql-wasm.wasm';

// Database path configuration
function getDbPath(): string {
  // Use /tmp for Vercel serverless (ephemeral filesystem)
  // For local development, use the data directory
  if (process.env.VERCEL) {
    return '/tmp/gestion-conges.db';
  }
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
let sqlite: SqlJsDatabase | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let dbInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Internal async initialization
async function initializeDatabase(): Promise<void> {
  if (dbInitialized && sqlite) return;
  
  // Initialize SQL.js
  const SQL = await initSqlJs({
    // For Vercel, load WASM from CDN
    // For local development, try local file first
    locateFile: (file: string) => {
      if (process.env.VERCEL) {
        return `${SQL_WASM_CDN}`;
      }
      // Local development - try to find WASM file
      const localPath = path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
      return `${SQL_WASM_CDN}`;
    },
  });

  const dbPath = getDbPath();
  
  // Ensure data directory exists for local development
  if (!process.env.VERCEL) {
    ensureDataDir();
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      sqlite = new SQL.Database(fileBuffer);
      console.log(`[SQL.js] Loaded existing database from: ${dbPath}`);
    } catch (error) {
      console.error('[SQL.js] Error loading existing database, creating new one:', error);
      sqlite = new SQL.Database();
    }
  } else {
    sqlite = new SQL.Database();
    console.log(`[SQL.js] Created new database at: ${dbPath}`);
  }
  
  // Enable foreign keys
  sqlite.run('PRAGMA foreign_keys = ON');
  
  dbInitialized = true;
  console.log(`[SQL.js] Connected to database at: ${dbPath}`);
}

/**
 * Get the SQLite database connection using sql.js
 * Uses singleton pattern to ensure only one connection exists
 * This is now async to handle sql.js initialization
 */
export async function getDbConnection(): Promise<SqlJsDatabase> {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase();
  }
  await initializationPromise;
  return sqlite!;
}

/**
 * Synchronous getter that ensures initialization before returning
 * For backward compatibility with existing code
 */
export function getDbConnectionSync(): SqlJsDatabase {
  if (!sqlite) {
    throw new Error('Database not initialized. Use getDbConnection() or getDrizzleDb() for async initialization.');
  }
  return sqlite;
}

/**
 * Save database to file
 * Must be called after modifications in serverless environments
 */
export async function saveDatabase(): Promise<void> {
  if (sqlite) {
    const dbPath = getDbPath();
    const data = sqlite.export();
    const buffer = Buffer.from(data);
    
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(dbPath, buffer);
    console.log(`[SQL.js] Database saved to: ${dbPath}`);
  }
}

/**
 * Get Drizzle ORM instance
 */
export async function getDrizzleDb(): Promise<ReturnType<typeof drizzle>> {
  if (!db) {
    await getDbConnection(); // Ensure DB is initialized
    db = drizzle(sqlite!, { schema });
  }
  return db;
}

/**
 * Synchronous version for backward compatibility
 * Note: This will throw if database is not yet initialized
 */
export function getDrizzleDbSync(): ReturnType<typeof drizzle> {
  if (!db) {
    throw new Error('Database not initialized. Use getDrizzleDb() for async initialization.');
  }
  return db;
}

/**
 * Close the database connection
 */
export async function closeDbConnection(): Promise<void> {
  if (sqlite) {
    // Save before closing
    await saveDatabase();
    sqlite.close();
    sqlite = null;
    db = null;
    initializationPromise = null;
    dbInitialized = false;
    console.log('[SQL.js] Database connection closed');
  }
}

/**
 * Check if database is initialized
 */
export function isDbInitialized(): boolean {
  return dbInitialized;
}

// Export the schema and types
export { schema };
export type Database = ReturnType<typeof drizzle>;

// Legacy exports for compatibility - these now return Promises
// Code that uses them should await the result
export const getDb = getDrizzleDb;
export const getDbConn = getDbConnection;
