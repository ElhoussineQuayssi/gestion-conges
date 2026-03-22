import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../db/index';
import { offers, type Offer, type NewOffer, type OfferStatus } from '../db/schema';

/**
 * Offer Repository
 * Handles all database operations for vacation offers
 */
export class OfferRepository {
  /**
   * Find offer by ID
   */
  async findById(id: number): Promise<Offer | undefined> {
    const db = getDrizzleDb();
    const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    return result[0];
  }

  /**
   * Get all offers
   */
  async findAll(): Promise<Offer[]> {
    const db = getDrizzleDb();
    return db.select().from(offers).orderBy(desc(offers.created_at));
  }

  /**
   * Get offers by status
   */
  async findByStatus(status: OfferStatus): Promise<Offer[]> {
    const db = getDrizzleDb();
    return db.select().from(offers).where(eq(offers.status, status));
  }

  /**
   * Get active offers (Disponible status)
   */
  async findActive(): Promise<Offer[]> {
    const db = getDrizzleDb();
    return db
      .select()
      .from(offers)
      .where(eq(offers.status, 'Disponible'))
      .orderBy(offers.start_date);
  }

  /**
   * Get available offers (not full and not expired)
   */
  async findAvailable(): Promise<Offer[]> {
    const db = getDrizzleDb();
    const now = new Date().toISOString();
    
    return db
      .select()
      .from(offers)
      .where(
        and(
          eq(offers.status, 'Disponible'),
          sql`${offers.current_participants} < ${offers.max_participants}`
        )
      )
      .orderBy(offers.start_date);
  }

  /**
   * Get offers within date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Offer[]> {
    const db = getDrizzleDb();
    return db
      .select()
      .from(offers)
      .where(
        and(
          gte(offers.start_date, startDate),
          lte(offers.end_date, endDate)
        )
      );
  }

  /**
   * Get offers by creator
   */
  async findByCreator(createdBy: number): Promise<Offer[]> {
    const db = getDrizzleDb();
    return db
      .select()
      .from(offers)
      .where(eq(offers.created_by, createdBy))
      .orderBy(desc(offers.created_at));
  }

  /**
   * Create a new offer
   */
  async create(data: Omit<NewOffer, 'id' | 'created_at' | 'current_participants'>): Promise<number> {
    const db = getDrizzleDb();
    const result = await db.insert(offers).values({
      ...data,
      current_participants: 0,
      created_at: new Date().toISOString(),
    });
    return Number(result.lastInsertRowid);
  }

  /**
   * Update an offer
   */
  async update(id: number, data: Partial<Omit<NewOffer, 'id' | 'created_at'>>): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db
      .update(offers)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(offers.id, id));
    return result.changes > 0;
  }

  /**
   * Update offer participants count
   */
  async incrementParticipants(id: number): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db
      .update(offers)
      .set({
        current_participants: sql`${offers.current_participants} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(offers.id, id));
    
    // Auto-update status based on participants
    if (result.changes > 0) {
      const offer = await this.findById(id);
      if (offer && offer.current_participants >= offer.max_participants && offer.max_participants > 0) {
        await this.updateStatus(id, 'Complet');
      }
    }
    
    return result.changes > 0;
  }

  /**
   * Decrement offer participants count
   */
  async decrementParticipants(id: number): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db
      .update(offers)
      .set({
        current_participants: sql`${offers.current_participants} - 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(offers.id, id));
    
    // Auto-update status if no longer full
    if (result.changes > 0) {
      const offer = await this.findById(id);
      if (offer && offer.status === 'Complet' && offer.current_participants < offer.max_participants) {
        await this.updateStatus(id, 'Disponible');
      }
    }
    
    return result.changes > 0;
  }

  /**
   * Update offer status
   */
  async updateStatus(id: number, status: OfferStatus): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db
      .update(offers)
      .set({
        status,
        updated_at: new Date().toISOString(),
      })
      .where(eq(offers.id, id));
    return result.changes > 0;
  }

  /**
   * Auto-update offer statuses based on deadline and participants
   */
  async autoUpdateStatuses(): Promise<number> {
    const db = getDrizzleDb();
    const now = new Date();
    let updatedCount = 0;

    const allOffers = await db.select().from(offers);

    for (const offer of allOffers) {
      let needsUpdate = false;
      let newStatus = offer.status;

      // Check if deadline has passed
      if (offer.application_deadline && offer.status === 'Disponible') {
        const deadlineDate = new Date(offer.application_deadline);
        if (deadlineDate < now) {
          needsUpdate = true;
          newStatus = 'Expiré / indisponible';
        }
      }

      // Check if offer is full
      if (offer.status === 'Disponible' && 
          offer.current_participants >= offer.max_participants && 
          offer.max_participants > 0) {
        needsUpdate = true;
        newStatus = 'Complet';
      }

      // Check if expired offer should be reactivated
      if (offer.status === 'Expiré / indisponible' && offer.application_deadline) {
        const deadlineDate = new Date(offer.application_deadline);
        if (deadlineDate >= now && offer.current_participants < offer.max_participants) {
          needsUpdate = true;
          newStatus = 'Disponible';
        }
      }

      if (needsUpdate && newStatus !== offer.status) {
        await this.updateStatus(offer.id, newStatus);
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Delete an offer
   */
  async delete(id: number): Promise<boolean> {
    const db = getDrizzleDb();
    const result = await db.delete(offers).where(eq(offers.id, id));
    return result.changes > 0;
  }

  /**
   * Count offers
   */
  async count(): Promise<number> {
    const db = getDrizzleDb();
    const result = await db.select({ count: sql<number>`count(*)` }).from(offers);
    return result[0].count;
  }

  /**
   * Count offers by status
   */
  async countByStatus(status: OfferStatus): Promise<number> {
    const db = getDrizzleDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(offers)
      .where(eq(offers.status, status));
    return result[0].count;
  }
}

// Export singleton instance
export const offerRepository = new OfferRepository();
