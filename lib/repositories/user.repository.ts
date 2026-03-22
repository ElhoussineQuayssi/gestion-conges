import { eq, and, desc, like, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../db/index';
import { users, type User, type NewUser, type UserStatus, type UserRole } from '../db/schema';

/**
 * User Repository
 * Handles all database operations for users
 */
export class UserRepository {
  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const db = await getDrizzleDb();
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | undefined> {
    const db = await getDrizzleDb();
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    const db = await getDrizzleDb();
    return db.select().from(users).orderBy(desc(users.created_at));
  }

  /**
   * Get users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    const db = await getDrizzleDb();
    return db.select().from(users).where(eq(users.role, role));
  }

  /**
   * Get users by status
   */
  async findByStatus(status: UserStatus): Promise<User[]> {
    const db = await getDrizzleDb();
    return db.select().from(users).where(eq(users.status, status));
  }

  /**
   * Search users by name or email
   */
  async search(query: string): Promise<User[]> {
    const db = await getDrizzleDb();
    const searchPattern = `%${query}%`;
    return db.select().from(users).where(
      sql`(${users.full_name} LIKE ${searchPattern} OR ${users.email} LIKE ${searchPattern})`
    );
  }

  /**
   * Create a new user
   */
  async create(data: Omit<NewUser, 'id' | 'created_at'>): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db.insert(users).values({
      ...data,
      created_at: new Date().toISOString(),
    });
    return Number(result.lastInsertRowid);
  }

  /**
   * Update a user
   */
  async update(id: number, data: Partial<Omit<NewUser, 'id' | 'created_at'>>): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db.update(users)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, id));
    return result.changes > 0;
  }

  /**
   * Deactivate a user
   */
  async deactivate(id: number, deactivatedBy: number): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db.update(users)
      .set({
        status: 'inactive',
        deactivated_at: new Date().toISOString(),
        deactivated_by: deactivatedBy,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, id));
    return result.changes > 0;
  }

  /**
   * Reactivate a user
   */
  async reactivate(id: number): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db.update(users)
      .set({
        status: 'active',
        deactivated_at: null,
        deactivated_by: null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, id));
    return result.changes > 0;
  }

  /**
   * Delete a user
   */
  async delete(id: number): Promise<boolean> {
    const db = await getDrizzleDb();
    const result = await db.delete(users).where(eq(users.id, id));
    return result.changes > 0;
  }

  /**
   * Count users
   */
  async count(): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0].count;
  }

  /**
   * Count users by role
   */
  async countByRole(role: UserRole): Promise<number> {
    const db = await getDrizzleDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, role));
    return result[0].count;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
