import { eq, and, desc, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../db/index';
import { leaveBalances, type LeaveBalance, type NewLeaveBalance } from '../db/schema';

/**
 * Leave Balance Repository
 * Handles all database operations for leave balances
 */
export class LeaveBalanceRepository {
  /**
   * Find leave balance by ID
   */
  async findById(id: number): Promise<LeaveBalance | undefined> {
    const db = getDrizzleDb();
    const result = await db.select().from(leaveBalances).where(eq(leaveBalances.id, id)).limit(1);
    return result[0];
  }

  /**
   * Find leave balance by user ID
   */
  async findByUserId(userId: number): Promise<LeaveBalance | undefined> {
    const db = getDrizzleDb();
    const result = await db
      .select()
      .from(leaveBalances)
      .where(eq(leaveBalances.user_id, userId))
      .limit(1);
    return result[0];
  }

  /**
   * Find leave balance by user ID and year
   */
  async findByUserIdAndYear(userId: number, year: number): Promise<LeaveBalance | undefined> {
    const db = getDrizzleDb();
    const result = await db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, year)))
      .limit(1);
    return result[0];
  }

  /**
   * Get all leave balances
   */
  async findAll(): Promise<LeaveBalance[]> {
    const db = getDrizzleDb();
    return db.select().from(leaveBalances).orderBy(desc(leaveBalances.year));
  }

  /**
   * Get leave balances by year
   */
  async findByYear(year: number): Promise<LeaveBalance[]> {
    const db = getDrizzleDb();
    return db
      .select()
      .from(leaveBalances)
      .where(eq(leaveBalances.year, year))
      .orderBy(desc(leaveBalances.user_id));
  }

  /**
   * Get all leave balances for a user
   */
  async findAllByUserId(userId: number): Promise<LeaveBalance[]> {
    const db = getDrizzleDb();
    return db
      .select()
      .from(leaveBalances)
      .where(eq(leaveBalances.user_id, userId))
      .orderBy(desc(leaveBalances.year));
  }

  /**
   * Create a new leave balance
   */
  async create(data: Omit<NewLeaveBalance, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const db = getDrizzleDb();
    const now = new Date().toISOString();
    const result = await db.insert(leaveBalances).values({
      ...data,
      created_at: now,
      updated_at: now,
    });
    return Number(result.lastInsertRowid);
  }

  /**
   * Initialize leave balance for a user
   */
  async initialize(
    userId: number,
    annualLeave: number = 30,
    daysWorked: number = 0,
    year?: number
  ): Promise<number> {
    const db = getDrizzleDb();
    const currentYear = year || new Date().getFullYear();

    // Calculate leave from worked days: 22 days = 1.5 days leave
    const calculatedLeave = Math.floor(daysWorked / 22) * 1.5;
    const totalLeave = annualLeave + calculatedLeave;

    const now = new Date().toISOString();
    const result = await db.insert(leaveBalances).values({
      user_id: userId,
      annual_leave: annualLeave,
      used_leave: 0,
      remaining_leave: totalLeave,
      year: currentYear,
      days_worked: daysWorked,
      calculated_leave: calculatedLeave,
      manual_adjustment: 0,
      adjustment_reason: null,
      created_at: now,
      updated_at: now,
    });

    return Number(result.lastInsertRowid);
  }

  /**
   * Update a leave balance
   */
  async update(id: number, data: Partial<Omit<NewLeaveBalance, 'id' | 'created_at'>>): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db
      .update(leaveBalances)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(leaveBalances.id, id));
    return result.changes > 0;
  }

  /**
   * Update used leave
   */
  async updateUsedLeave(userId: number, usedLeave: number, year?: number): Promise<boolean> {
    const db = getDrizzleDb();
    const currentYear = year || new Date().getFullYear();
    
    const balance = await this.findByUserIdAndYear(userId, currentYear);
    if (!balance) return false;

    const result = await db
      .update(leaveBalances)
      .set({
        used_leave: usedLeave,
        remaining_leave: balance.annual_leave + balance.calculated_leave + balance.manual_adjustment - usedLeave,
        updated_at: new Date().toISOString(),
      })
      .where(eq(leaveBalances.id, balance.id));

    return result.changes > 0;
  }

  /**
   * Adjust leave balance manually
   */
  async adjust(
    userId: number,
    annualLeave?: number,
    usedLeave?: number,
    manualAdjustment?: number,
    reason?: string,
    year?: number
  ): Promise<boolean> {
    const db = getDrizzleDb();
    const currentYear = year || new Date().getFullYear();

    const balance = await this.findByUserIdAndYear(userId, currentYear);
    if (!balance) return false;

    const updateData: Partial<LeaveBalance> = {
      updated_at: new Date().toISOString(),
    };

    if (annualLeave !== undefined) {
      updateData.annual_leave = annualLeave;
    }
    if (usedLeave !== undefined) {
      updateData.used_leave = usedLeave;
    }
    if (manualAdjustment !== undefined) {
      updateData.manual_adjustment = manualAdjustment;
      updateData.adjustment_reason = reason || null;
    }

    // Recalculate remaining
    const calculatedLeave = Math.floor(balance.days_worked / 22) * 1.5;
    const totalLeave = (updateData.annual_leave ?? balance.annual_leave) + 
                       calculatedLeave + 
                       (updateData.manual_adjustment ?? balance.manual_adjustment);
    updateData.remaining_leave = totalLeave - (updateData.used_leave ?? balance.used_leave);

    const result = await db
      .update(leaveBalances)
      .set(updateData)
      .where(eq(leaveBalances.id, balance.id));

    return result.changes > 0;
  }

  /**
   * Delete a leave balance
   */
  async delete(id: number): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db.delete(leaveBalances).where(eq(leaveBalances.id, id));
    return result.changes > 0;
  }

  /**
   * Delete leave balance by user ID
   */
  async deleteByUserId(userId: number): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db.delete(leaveBalances).where(eq(leaveBalances.user_id, userId));
    return result.changes > 0;
  }

  /**
   * Count leave balances
   */
  async count(): Promise<number> {
    const db = getDrizzleDb();
    const result = await db.select({ count: sql<number>`count(*)` }).from(leaveBalances);
    return result[0].count;
  }

  /**
   * Calculate days between two dates
   */
  calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  }
}

// Export singleton instance
export const leaveBalanceRepository = new LeaveBalanceRepository();
