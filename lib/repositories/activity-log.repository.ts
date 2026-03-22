import { eq, and, desc, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../db/index';
import { activityLogs, type ActivityLog, type NewActivityLog } from '../db/schema';

/**
 * Activity Log Repository
 * Handles all database operations for activity logs
 */
export class ActivityLogRepository {
  /**
   * Find activity log by ID
   */
  async findById(id: number): Promise<ActivityLog | undefined> {
    const db = await getDrizzleDb();
    const result = await db.select().from(activityLogs).where(eq(activityLogs.id, id)).limit(1);
    return result[0];
  }

  /**
   * Get all activity logs
   */
  async findAll(limit?: number): Promise<ActivityLog[]> {
    const db = await getDrizzleDb();
    const baseQuery = db.select().from(activityLogs).orderBy(desc(activityLogs.created_at));
    if (limit) {
      return baseQuery.limit(limit);
    }
    
    return baseQuery;
  }

  /**
   * Get activity logs by user
   */
  async findByUserId(userId: number, limit?: number): Promise<ActivityLog[]> {
    const db = await getDrizzleDb();
    const baseQuery = db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.user_id, userId))
      .orderBy(desc(activityLogs.created_at));
    
    if (limit) {
      return baseQuery.limit(limit);
    }
    
    return baseQuery;
  }

  /**
   * Get activity logs by action
   */
  async findByAction(action: string, limit?: number): Promise<ActivityLog[]> {
    const db = await getDrizzleDb();
    const baseQuery = db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.action, action))
      .orderBy(desc(activityLogs.created_at));
    
    if (limit) {
      return baseQuery.limit(limit);
    }
    
    return baseQuery;
  }

  /**
   * Get activity logs by resource
   */
  async findByResource(resourceType: string, resourceId: number): Promise<ActivityLog[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.resource_type, resourceType),
          eq(activityLogs.resource_id, resourceId)
        )
      )
      .orderBy(desc(activityLogs.created_at));
  }

  /**
   * Get recent activity logs
   */
  async findRecent(days: number = 7, limit?: number): Promise<ActivityLog[]> {
    const db = await getDrizzleDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const baseQuery = db
      .select()
      .from(activityLogs)
      .where(sql`${activityLogs.created_at} >= ${cutoffDate.toISOString()}`)
      .orderBy(desc(activityLogs.created_at));
    
    if (limit) {
      return baseQuery.limit(limit);
    }
    
    return baseQuery;
  }

  /**
   * Create a new activity log
   */
  async create(data: Omit<NewActivityLog, 'id' | 'created_at'>): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db.insert(activityLogs).values({
      ...data,
      created_at: new Date().toISOString(),
    });
    return Number(result.lastInsertRowid);
  }

  /**
   * Log an activity
   */
  async log(
    userId: number,
    action: string,
    resourceType?: string,
    resourceId?: number,
    details?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<number> {
    return this.create({
      user_id: userId,
      action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      details: details || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
    });
  }

  /**
   * Delete an activity log
   */
  async delete(id: number): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db.delete(activityLogs).where(eq(activityLogs.id, id));
    return result.changes > 0;
  }

  /**
   * Delete old activity logs (cleanup)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const db = await getDrizzleDb();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db
      .delete(activityLogs)
      .where(sql`${activityLogs.created_at} < ${cutoffDate.toISOString()}`);
    
    return result.changes;
  }

  /**
   * Count activity logs
   */
  async count(): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db.select({ count: sql<number>`count(*)` }).from(activityLogs);
    return result[0].count;
  }

  /**
   * Count activity logs by user
   */
  async countByUserId(userId: number): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(eq(activityLogs.user_id, userId));
    return result[0].count;
  }
}

// Export singleton instance
export const activityLogRepository = new ActivityLogRepository();
