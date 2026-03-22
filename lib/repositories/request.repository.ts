import { eq, and, desc, gte, lte, sql, isNull } from 'drizzle-orm';
import { getDrizzleDb } from '../db/index';
import { requests, type Request, type NewRequest, type RequestStatus, type RequestType } from '../db/schema';

/**
 * Request Repository
 * Handles all database operations for leave and offer requests
 */
export class RequestRepository {
  /**
   * Find request by ID
   */
  async findById(id: number): Promise<Request | undefined> {
    const db = await getDrizzleDb();
    const result = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
    return result[0];
  }

  /**
   * Get all requests
   */
  async findAll(): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db.select().from(requests).orderBy(desc(requests.created_at));
  }

  /**
   * Get requests by user
   */
  async findByUserId(userId: number): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(eq(requests.user_id, userId))
      .orderBy(desc(requests.created_at));
  }

  /**
   * Get requests by status
   */
  async findByStatus(status: RequestStatus): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(eq(requests.status, status))
      .orderBy(desc(requests.created_at));
  }

  /**
   * Get pending requests (En cours / En attente RH)
   */
  async findPending(): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(eq(requests.status, 'En cours / En attente RH'))
      .orderBy(desc(requests.created_at));
  }

  /**
   * Get requests by type
   */
  async findByType(type: RequestType): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(eq(requests.type, type))
      .orderBy(desc(requests.created_at));
  }

  /**
   * Get requests by offer
   */
  async findByOfferId(offerId: number): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(eq(requests.offer_id, offerId))
      .orderBy(desc(requests.created_at));
  }

  /**
   * Get approved requests for an offer
   */
  async findApprovedByOfferId(offerId: number): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(
        and(
          eq(requests.offer_id, offerId),
          eq(requests.status, 'Acceptée')
        )
      );
  }

  /**
   * Get requests within date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(
        and(
          gte(requests.start_date, startDate),
          lte(requests.end_date, endDate)
        )
      );
  }

  /**
   * Get requests by reviewer
   */
  async findByReviewer(reviewerId: number): Promise<Request[]> {
    const db = await getDrizzleDb();
    return db
      .select()
      .from(requests)
      .where(eq(requests.approved_by, reviewerId))
      .orderBy(desc(requests.approval_date));
  }

  /**
   * Create a new request
   */
  async create(data: Omit<NewRequest, 'id' | 'created_at'>): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db.insert(requests).values({
      ...data,
      created_at: new Date().toISOString(),
    });
    return Number(result.lastInsertRowid);
  }

  /**
   * Update a request
   */
  async update(id: number, data: Partial<Omit<NewRequest, 'id' | 'created_at'>>): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db
      .update(requests)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(requests.id, id));
    return result.changes > 0;
  }

  /**
   * Update request status
   */
  async updateStatus(
    id: number,
    status: RequestStatus,
    approvedBy?: number,
    reason?: string
  ): Promise<boolean> {
    const db = await getDrizzleDb();
    const updateData: Partial<Request> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'En cours / En attente RH') {
      // Reset to pending
      updateData.approved_by = null;
      updateData.approval_date = null;
      updateData.approval_reason = null;
    } else {
      updateData.approved_by = approvedBy || null;
      updateData.approval_date = new Date().toISOString();
      if (reason) {
        updateData.approval_reason = reason;
      }
    }

    const result = await db.update(requests).set(updateData).where(eq(requests.id, id));
    return result.changes > 0;
  }

  /**
   * Approve a request
   */
  async approve(id: number, approvedBy: number, reason?: string): Promise<boolean> {
    return this.updateStatus(id, 'Acceptée', approvedBy, reason);
  }

  /**
   * Reject a request
   */
  async reject(id: number, approvedBy: number, reason?: string): Promise<boolean> {
    return this.updateStatus(id, 'Refusée', approvedBy, reason);
  }

  /**
   * Auto-reject a request
   */
  async autoReject(id: number, autoRejectionReason: string): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db
      .update(requests)
      .set({
        status: 'Refus automatique',
        auto_rejection_reason: autoRejectionReason,
        updated_at: new Date().toISOString(),
      })
      .where(eq(requests.id, id));
    return result.changes > 0;
  }

  /**
   * Update request details (dates, reason) without changing status
   */
  async updateDetails(
    id: number,
    details: { start_date?: string; end_date?: string; reason?: string }
  ): Promise<boolean> {
    const db = await getDrizzleDb();
    const updateData: Partial<Request> = {
      updated_at: new Date().toISOString(),
    };

    if (details.start_date !== undefined) {
      updateData.start_date = details.start_date;
    }
    if (details.end_date !== undefined) {
      updateData.end_date = details.end_date;
    }
    if (details.reason !== undefined) {
      updateData.reason = details.reason;
    }

    const result = await db.update(requests).set(updateData).where(eq(requests.id, id));
    return result.changes > 0;
  }

  /**
   * Delete a request
   */
  async delete(id: number): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db.delete(requests).where(eq(requests.id, id));
    return result.changes > 0;
  }

  /**
   * Count requests
   */
  async count(): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db.select({ count: sql<number>`count(*)` }).from(requests);
    return result[0].count;
  }

  /**
   * Count requests by status
   */
  async countByStatus(status: RequestStatus): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(eq(requests.status, status));
    return result[0].count;
  }

  /**
   * Count requests by user
   */
  async countByUserId(userId: number): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(eq(requests.user_id, userId));
    return result[0].count;
  }
}

// Export singleton instance
export const requestRepository = new RequestRepository();
