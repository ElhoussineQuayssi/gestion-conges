import fs from 'fs';
import path from 'path';
import { getDbConnection, saveDatabase } from './index';
import { users, offers, requests, leaveBalances, activityLogs, systemSettings } from './schema';

/**
 * Migration Script
 * Initializes the SQLite database and optionally seeds it with data from db.json
 */

interface JsonDatabase {
  users: any[];
  offers: any[];
  requests: any[];
  leave_balances: any[];
  activity_logs: any[];
  system_settings: any[];
}

/**
 * Create all database tables
 */
export async function createTables(): Promise<void> {
  const db = await getDbConnection();
  
  console.log('[Migration] Creating tables...');
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('employee', 'hr_admin', 'owner')),
      department TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
      deactivated_at TEXT,
      deactivated_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);
  
  // Create offers table
  db.run(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      destination TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration TEXT,
      price REAL NOT NULL,
      max_participants INTEGER NOT NULL DEFAULT 0,
      current_participants INTEGER NOT NULL DEFAULT 0,
      application_deadline TEXT,
      hotel_name TEXT,
      conditions TEXT,
      images TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'Disponible' CHECK(status IN ('Disponible', 'Complet', 'Expiré / indisponible')),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);
  
  // Create requests table
  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      offer_id INTEGER REFERENCES offers(id),
      type TEXT NOT NULL CHECK(type IN ('offer', 'leave')),
      start_date TEXT,
      end_date TEXT,
      selected_start_date TEXT,
      selected_end_date TEXT,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'En cours / En attente RH' CHECK(status IN ('En cours / En attente RH', 'Acceptée', 'Refusée', 'Refus automatique')),
      approved_by INTEGER REFERENCES users(id),
      approval_date TEXT,
      approval_reason TEXT,
      auto_rejection_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);
  
  // Create leave_balances table
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      annual_leave REAL NOT NULL DEFAULT 30,
      used_leave REAL NOT NULL DEFAULT 0,
      remaining_leave REAL NOT NULL DEFAULT 30,
      year INTEGER NOT NULL,
      days_worked REAL NOT NULL DEFAULT 0,
      calculated_leave REAL NOT NULL DEFAULT 0,
      manual_adjustment REAL NOT NULL DEFAULT 0,
      adjustment_reason TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  // Create activity_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id INTEGER,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  // Create system_settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  await saveDatabase();
  console.log('[Migration] Tables created successfully');
}

/**
 * Create indexes for frequently queried fields
 */
export async function createIndexes(): Promise<void> {
  const db = await getDbConnection();
  
  console.log('[Migration] Creating indexes...');
  
  // Users indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
  
  // Offers indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_offers_start_date ON offers(start_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_offers_created_by ON offers(created_by)');
  
  // Requests indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_requests_offer_id ON requests(offer_id)');
  
  // Leave balances indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_leave_balances_user_id ON leave_balances(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year)');
  
  // Activity logs indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)');
  
  await saveDatabase();
  console.log('[Migration] Indexes created successfully');
}

/**
 * Seed the database with data from db.json
 */
export async function seedFromJson(): Promise<void> {
  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  
  if (!fs.existsSync(dbPath)) {
    console.log('[Migration] No db.json found, skipping seed');
    return;
  }
  
  console.log('[Migration] Seeding database from db.json...');
  
  const db = await getDbConnection();
  const content = fs.readFileSync(dbPath, 'utf-8');
  const data: JsonDatabase = JSON.parse(content);
  
  // Check if data already exists
  const userCountResult = db.exec('SELECT COUNT(*) as count FROM users');
  const userCount = userCountResult[0]?.values[0]?.[0] as number || 0;
  
  if (userCount > 0) {
    console.log('[Migration] Database already has data, skipping seed');
    return;
  }
  
  // Seed users using run() method
  for (const user of data.users) {
    db.run(
      `INSERT INTO users (id, email, password_hash, full_name, role, department, status, deactivated_at, deactivated_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        user.id,
        user.email,
        user.password_hash,
        user.full_name,
        user.role,
        user.department || null,
        user.status,
        user.deactivated_at || null,
        user.deactivated_by || null
      ]
    );
  }
  console.log(`[Migration] Seeded ${data.users.length} users`);
  
  // Seed offers
  for (const offer of data.offers || []) {
    db.run(
      `INSERT INTO offers (id, title, description, destination, start_date, end_date, duration, price, max_participants, current_participants, application_deadline, hotel_name, conditions, images, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        offer.id,
        offer.title,
        offer.description || null,
        offer.destination,
        offer.start_date,
        offer.end_date,
        offer.duration || null,
        offer.price,
        offer.max_participants,
        offer.current_participants,
        offer.application_deadline || null,
        offer.hotel_name || null,
        offer.conditions || null,
        JSON.stringify(offer.images || []),
        offer.status,
        offer.created_by
      ]
    );
  }
  console.log(`[Migration] Seeded ${data.offers?.length || 0} offers`);
  
  // Seed requests
  for (const request of data.requests || []) {
    db.run(
      `INSERT INTO requests (id, user_id, offer_id, type, start_date, end_date, selected_start_date, selected_end_date, reason, status, approved_by, approval_date, approval_reason, auto_rejection_reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        request.id,
        request.user_id,
        request.offer_id || null,
        request.type,
        request.start_date || null,
        request.end_date || null,
        request.selected_start_date || null,
        request.selected_end_date || null,
        request.reason || null,
        request.status,
        request.approved_by || null,
        request.approval_date || null,
        request.approval_reason || null,
        request.auto_rejection_reason || null
      ]
    );
  }
  console.log(`[Migration] Seeded ${data.requests?.length || 0} requests`);
  
  // Seed leave balances
  for (const balance of data.leave_balances || []) {
    db.run(
      `INSERT INTO leave_balances (id, user_id, annual_leave, used_leave, remaining_leave, year, days_worked, calculated_leave, manual_adjustment, adjustment_reason, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        balance.id,
        balance.user_id,
        balance.annual_leave || 30,
        balance.used_leave || 0,
        balance.remaining_leave || 30,
        balance.year || new Date().getFullYear(),
        balance.days_worked || 0,
        balance.calculated_leave || 0,
        balance.manual_adjustment || 0,
        balance.adjustment_reason || null
      ]
    );
  }
  console.log(`[Migration] Seeded ${data.leave_balances?.length || 0} leave balances`);
  
  // Seed activity logs
  for (const log of data.activity_logs || []) {
    db.run(
      `INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        log.id,
        log.user_id,
        log.action,
        log.resource_type || null,
        log.resource_id || null,
        log.details || null,
        log.ip_address || null,
        log.user_agent || null
      ]
    );
  }
  console.log(`[Migration] Seeded ${data.activity_logs?.length || 0} activity logs`);
  
  // Seed system settings
  for (const setting of data.system_settings || []) {
    db.run(
      `INSERT INTO system_settings (id, key, value, description, updated_at, updated_by, created_at)
       VALUES (?, ?, ?, ?, datetime('now'), ?, datetime('now'))`,
      [
        setting.id,
        setting.key,
        setting.value,
        setting.description || null,
        setting.updated_by || null
      ]
    );
  }
  console.log(`[Migration] Seeded ${data.system_settings?.length || 0} system settings`);
  
  await saveDatabase();
  console.log('[Migration] Database seeded successfully');
}

/**
 * Initialize default system settings
 */
export async function initializeDefaultSettings(): Promise<void> {
  const db = await getDbConnection();
  
  console.log('[Migration] Initializing default system settings...');
  
  const defaults = [
    { key: 'leave_calculation_days', value: '22', description: 'Number of worked days required to earn leave days' },
    { key: 'leave_calculation_rate', value: '1.5', description: 'Leave days earned per calculation period' },
    { key: 'auto_rejection_enabled', value: 'true', description: 'Auto-reject requests with insufficient balance' },
    { key: 'session_timeout_minutes', value: '60', description: 'Session timeout in minutes' },
    { key: 'log_retention_days', value: '90', description: 'Activity log retention period in days' },
  ];
  
  for (const setting of defaults) {
    db.run(
      `INSERT OR IGNORE INTO system_settings (key, value, description, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      [setting.key, setting.value, setting.description]
    );
  }
  
  await saveDatabase();
  console.log('[Migration] Default system settings initialized');
}

/**
 * Run full migration
 */
export async function runMigration(): Promise<void> {
  console.log('[Migration] Starting database migration...');
  
  await createTables();
  await createIndexes();
  await seedFromJson();
  await initializeDefaultSettings();
  
  console.log('[Migration] Migration completed successfully');
}
