import { NextResponse } from 'next/server';
import { getDrizzleDb } from '@/lib/db/index';
import { saveDatabase as persistDatabase } from '@/lib/db/index';
import { users, offers, requests, leaveBalances, activityLogs, systemSettings } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// Accounts to keep - must match login page
const KEEP_ACCOUNTS = [
  'employee@example.com',
  'admin@example.com',
  'owner@example.com'
];

export async function POST() {
  try {
    console.log('[Reset DB] Starting database reset...');
    const db = await getDrizzleDb();

    // Count before deletion
    const allUsers = await db.select().from(users);
    const allOffers = await db.select().from(offers);
    const allRequests = await db.select().from(requests);
    const allLeaveBalances = await db.select().from(leaveBalances);
    const allActivityLogs = await db.select().from(activityLogs);
    const allSettings = await db.select().from(systemSettings);

    const usersToDelete = allUsers.filter((u: any) => !KEEP_ACCOUNTS.includes(u.email));
    const usersDeletedCount = usersToDelete.length;

    // Delete in order to respect foreign keys
    // 1. Delete activity logs
    await db.delete(activityLogs);
    console.log('[Reset DB] Deleted all activity logs');

    // 2. Delete requests
    await db.delete(requests);
    console.log('[Reset DB] Deleted all requests');

    // 3. Delete leave balances
    await db.delete(leaveBalances);
    console.log('[Reset DB] Deleted all leave balances');

    // 4. Delete offers
    await db.delete(offers);
    console.log('[Reset DB] Deleted all offers');

    // 5. Delete system settings
    await db.delete(systemSettings);
    console.log('[Reset DB] Deleted all system settings');

    // 6. Delete users except the 3 keep accounts
    for (const user of usersToDelete) {
      await db.delete(users).where(eq(users.id, user.id));
    }
    console.log(`[Reset DB] Deleted ${usersDeletedCount} users`);

    // Persist the database
    await persistDatabase();

    // Verify remaining users
    const remainingUsers = await db.select().from(users);
    console.log('[Reset DB] Remaining users:', remainingUsers.map((u: any) => u.email));

    return NextResponse.json({
      success: true,
      message: 'Base de données réinitialisée avec succès',
      deleted: {
        users: usersDeletedCount,
        offers: allOffers.length,
        requests: allRequests.length,
        leave_balances: allLeaveBalances.length,
        activity_logs: allActivityLogs.length,
        system_settings: allSettings.length
      },
      remaining_users: remainingUsers.map((u: any) => ({
        email: u.email,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('[Reset DB] Error resetting database:', error);
    return NextResponse.json(
      { error: 'Error resetting database: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
