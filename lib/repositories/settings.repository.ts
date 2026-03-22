import { eq, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../db/index';
import { systemSettings, type SystemSetting, type NewSystemSetting } from '../db/schema';

/**
 * Settings Repository
 * Handles all database operations for system settings
 */
export class SettingsRepository {
  /**
   * Find setting by ID
   */
  async findById(id: number): Promise<SystemSetting | undefined> {
    const db = await getDrizzleDb();
    const result = await db.select().from(systemSettings).where(eq(systemSettings.id, id)).limit(1);
    return result[0];
  }

  /**
   * Find setting by key
   */
  async findByKey(key: string): Promise<SystemSetting | undefined> {
    const db = await getDrizzleDb();
    const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
    return result[0];
  }

  /**
   * Get setting value by key
   */
  async getValue(key: string): Promise<string | undefined> {
    const setting = await this.findByKey(key);
    return setting?.value;
  }

  /**
   * Get all settings
   */
  async findAll(): Promise<SystemSetting[]> {
    const db = await getDrizzleDb();
    return db.select().from(systemSettings);
  }

  /**
   * Create a new setting
   */
  async create(data: Omit<NewSystemSetting, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const db = await getDrizzleDb();
    const now = new Date().toISOString();
    const result = await db.insert(systemSettings).values({
      ...data,
      created_at: now,
      updated_at: now,
    });
    return Number(result.lastInsertRowid);
  }

  /**
   * Update a setting
   */
  async update(key: string, value: string, updatedBy?: number): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db
      .update(systemSettings)
      .set({
        value,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(systemSettings.key, key));
    return result.changes > 0;
  }

  /**
   * Set a setting (create or update)
   */
  async set(key: string, value: string, description?: string, updatedBy?: number): Promise<boolean> {
    const existing = await this.findByKey(key);
    if (existing) {
      return this.update(key, value, updatedBy);
    }
    await this.create({
      key,
      value,
      description: description || null,
      updated_by: updatedBy || null,
    });
    return true;
  }

  /**
   * Delete a setting
   */
  async delete(key: string): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db.delete(systemSettings).where(eq(systemSettings.key, key));
    return result.changes > 0;
  }

  /**
   * Count settings
   */
  async count(): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db.select({ count: sql<number>`count(*)` }).from(systemSettings);
    return result[0].count;
  }

  /**
   * Initialize default settings
   */
  async initializeDefaults(): Promise<void> {
    const defaults = [
      { key: 'leave_calculation_days', value: '22', description: 'Number of worked days required to earn leave days' },
      { key: 'leave_calculation_rate', value: '1.5', description: 'Leave days earned per calculation period' },
      { key: 'auto_rejection_enabled', value: 'true', description: 'Auto-reject requests with insufficient balance' },
      { key: 'session_timeout_minutes', value: '60', description: 'Session timeout in minutes' },
      { key: 'log_retention_days', value: '90', description: 'Activity log retention period in days' },
    ];

    for (const setting of defaults) {
      await this.set(setting.key, setting.value, setting.description);
    }
  }
}

// Export singleton instance
export const settingsRepository = new SettingsRepository();
