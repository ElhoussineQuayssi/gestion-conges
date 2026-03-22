// SQLite Database Adapter
// This file provides backward compatibility by wrapping the SQLite implementation
// All functions use the SQLite database instead of JSON file storage

import { getDrizzleDb } from './db/index';
import { users, offers, requests, leaveBalances, activityLogs, systemSettings, type User, type Offer, type Request, type LeaveBalance, type ActivityLog, type SystemSetting, type UserStatus, type OfferStatus, type RequestStatus, type RequestType } from './db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { hashPassword } from './auth';

// Re-export types from schema for backward compatibility
export type { User, Offer, Request, LeaveBalance, ActivityLog, SystemSetting, UserStatus, OfferStatus, RequestStatus, RequestType };

interface Database {
  users: User[];
  offers: Offer[];
  requests: Request[];
  leave_balances: LeaveBalance[];
  activity_logs: ActivityLog[];
  system_settings: SystemSetting[];
}

// Initialize database
export async function initializeDatabase(): Promise<void> {
  const { runMigration } = await import('./db/migrate');
  await runMigration();
}

// Get database for backward compatibility
export async function getDatabase(): Promise<Database> {
  const db = await getDrizzleDb();
  return {
    users: await db.select().from(users) as User[],
    offers: await db.select().from(offers) as Offer[],
    requests: await db.select().from(requests) as Request[],
    leave_balances: await db.select().from(leaveBalances) as LeaveBalance[],
    activity_logs: await db.select().from(activityLogs) as ActivityLog[],
    system_settings: await db.select().from(systemSettings) as SystemSetting[],
  };
}

export async function getFreshDatabase(): Promise<Database> {
  return getDatabase();
}

// No-op saveDatabase for backward compatibility (SQLite auto-saves)
export async function saveDatabase(): Promise<void> {
  // SQLite handles persistence automatically - no action needed
}

// Alias for backward compatibility
export const updateSystemSetting = setSystemSetting;

// User functions
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDrizzleDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function findUserById(id: number): Promise<User | undefined> {
  const db = await getDrizzleDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDrizzleDb();
  return await db.select().from(users).orderBy(desc(users.created_at));
}

// Offer functions
export async function getAllOffers(): Promise<Offer[]> {
  const db = await getDrizzleDb();
  return await db.select().from(offers).orderBy(desc(offers.created_at));
}

export async function getActiveOffers(): Promise<Offer[]> {
  const db = await getDrizzleDb();
  return await db.select().from(offers).where(eq(offers.status, 'Disponible'));
}

export async function getOfferById(id: number): Promise<Offer | undefined> {
  const db = await getDrizzleDb();
  const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  return result[0];
}

export async function autoUpdateOfferStatuses(): Promise<number> {
  const db = await getDrizzleDb();
  const now = new Date();
  let updatedCount = 0;

  const allOffers = await db.select().from(offers);

  for (const offer of allOffers) {
    let needsUpdate = false;
    let newStatus = offer.status;

    if (offer.application_deadline && offer.status === 'Disponible') {
      const deadlineDate = new Date(offer.application_deadline);
      if (deadlineDate < now) {
        needsUpdate = true;
        newStatus = 'Expiré / indisponible';
      }
    }

    if (offer.status === 'Disponible' && 
        offer.current_participants >= offer.max_participants && 
        offer.max_participants > 0) {
      needsUpdate = true;
      newStatus = 'Complet';
    }

    if (offer.status === 'Expiré / indisponible' && offer.application_deadline) {
      const deadlineDate = new Date(offer.application_deadline);
      if (deadlineDate >= now && offer.current_participants < offer.max_participants) {
        needsUpdate = true;
        newStatus = 'Disponible';
      }
    }

    if (needsUpdate && newStatus !== offer.status) {
      await db.update(offers)
        .set({ status: newStatus, updated_at: new Date().toISOString() })
        .where(eq(offers.id, offer.id));
      updatedCount++;
    }
  }

  return updatedCount;
}

export async function updateOfferStatusBasedOnParticipants(offerId: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const offer = await getOfferById(offerId);
  if (!offer) return false;

  if (offer.status === 'Disponible' && 
      offer.current_participants >= offer.max_participants && 
      offer.max_participants > 0) {
    await db.update(offers)
      .set({ status: 'Complet', updated_at: new Date().toISOString() })
      .where(eq(offers.id, offerId));
    return true;
  }

  if (offer.status === 'Complet' && offer.current_participants < offer.max_participants) {
    if (offer.application_deadline) {
      const deadlineDate = new Date(offer.application_deadline);
      if (deadlineDate >= new Date()) {
        await db.update(offers)
          .set({ status: 'Disponible', updated_at: new Date().toISOString() })
          .where(eq(offers.id, offerId));
        return true;
      }
    } else {
      await db.update(offers)
        .set({ status: 'Disponible', updated_at: new Date().toISOString() })
        .where(eq(offers.id, offerId));
      return true;
    }
  }

  return false;
}

// Request functions
export async function getUserRequests(userId: number): Promise<Request[]> {
  const db = await getDrizzleDb();
  return await db.select().from(requests).where(eq(requests.user_id, userId)).orderBy(desc(requests.created_at));
}

export async function getPendingRequests(): Promise<Request[]> {
  const db = await getDrizzleDb();
  return await db.select().from(requests).where(eq(requests.status, 'En cours / En attente RH'));
}

export async function getRequestById(id: number): Promise<Request | undefined> {
  const db = await getDrizzleDb();
  const result = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  return result[0];
}

export async function getAllRequests(): Promise<Request[]> {
  const db = await getDrizzleDb();
  return await db.select().from(requests).orderBy(desc(requests.created_at));
}

// Leave balance functions
export async function getLeaveBalance(userId: number): Promise<LeaveBalance | undefined> {
  const db = await getDrizzleDb();
  const currentYear = new Date().getFullYear();
  const result = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, currentYear)))
    .limit(1);
  return result[0];
}

// Create functions
export async function createUser(
  email: string,
  passwordHash: string,
  fullName: string,
  role: 'employee' | 'hr_admin' | 'owner',
  department?: string
): Promise<number> {
  const db = await getDrizzleDb();
  const result = await db.insert(users).values({
    email,
    password_hash: passwordHash,
    full_name: fullName,
    role,
    department: department || null,
    status: 'active',
    deactivated_at: null,
    deactivated_by: null,
    created_at: new Date().toISOString(),
  }).returning({ id: users.id });
  return result[0]?.id ?? 0;
}

export async function createOffer(
  title: string,
  description: string | null,
  destination: string,
  startDate: string,
  endDate: string,
  price: number,
  maxParticipants: number,
  createdBy: number,
  applicationDeadline?: string | null,
  hotelName?: string | null,
  conditions?: string | null,
  images?: string[],
  duration?: string | null
): Promise<number> {
  const db = await getDrizzleDb();
  const offerStatus = maxParticipants === 0 ? 'Complet' : 'Disponible';
  
  const result = await db.insert(offers).values({
    title,
    description,
    destination,
    start_date: startDate,
    end_date: endDate,
    duration: duration || null,
    price,
    max_participants: maxParticipants,
    current_participants: 0,
    application_deadline: applicationDeadline || null,
    hotel_name: hotelName || null,
    conditions: conditions || null,
    images: images || [],
    status: offerStatus,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }).returning({ id: offers.id });

  return result[0]?.id ?? 0;
}

export async function updateOffer(
  id: number,
  updates: {
    title?: string;
    description?: string | null;
    destination?: string;
    start_date?: string;
    end_date?: string;
    duration?: string | null;
    price?: number;
    max_participants?: number;
    application_deadline?: string | null;
    hotel_name?: string | null;
    conditions?: string | null;
    images?: string[];
    status?: OfferStatus;
  }
): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(offers)
    .set({ ...updates, updated_at: new Date().toISOString() })
    .where(eq(offers.id, id))
    .returning({ id: offers.id });
  return result.length > 0;
}

export async function adjustLeaveBalance(
  userId: number,
  annualLeave?: number,
  usedLeave?: number,
  manualAdjustment?: number,
  reason?: string
): Promise<boolean> {
  const db = await getDrizzleDb();
  const currentYear = new Date().getFullYear();
  const balance = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, currentYear)))
    .limit(1);
  
  if (!balance[0]) return false;
  
  const b = balance[0];
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (annualLeave !== undefined) updateData.annual_leave = annualLeave;
  if (usedLeave !== undefined) updateData.used_leave = usedLeave;
  if (manualAdjustment !== undefined) {
    updateData.manual_adjustment = manualAdjustment;
    updateData.adjustment_reason = reason || null;
  }
  
  const calculatedLeave = Math.floor(b.days_worked / 22) * 1.5;
  const totalLeave = (updateData.annual_leave ?? b.annual_leave) + calculatedLeave + (updateData.manual_adjustment ?? b.manual_adjustment);
  updateData.remaining_leave = totalLeave - (updateData.used_leave ?? b.used_leave);
  
  const result = await db.update(leaveBalances)
    .set(updateData)
    .where(eq(leaveBalances.id, b.id))
    .returning({ id: leaveBalances.id });

  return result.length > 0;
}

export async function deleteOffer(id: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(offers).where(eq(offers.id, id)).returning({ id: offers.id });
  return result.length > 0;
}

export async function createRequest(
  userId: number,
  type: 'offer' | 'leave',
  offerId?: number,
  startDate?: string,
  endDate?: string,
  reason?: string,
  status: RequestStatus = 'En cours / En attente RH',
  autoRejectionReason?: string,
  selectedStartDate?: string,
  selectedEndDate?: string
): Promise<number> {
  const db = await getDrizzleDb();
  const result = await db.insert(requests).values({
    user_id: userId,
    offer_id: offerId || null,
    type,
    start_date: startDate || null,
    end_date: endDate || null,
    selected_start_date: selectedStartDate || null,
    selected_end_date: selectedEndDate || null,
    reason: reason || null,
    status,
    approved_by: null,
    approval_date: null,
    approval_reason: null,
    auto_rejection_reason: autoRejectionReason || null,
    created_at: new Date().toISOString(),
  }).returning({ id: requests.id });
  return result[0]?.id ?? 0;
}

export async function approveRequest(requestId: number, approvedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(requests)
    .set({
      status: 'Acceptée',
      approved_by: approvedBy,
      approval_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(requests.id, requestId))
    .returning({ id: requests.id });
  return result.length > 0;
}

export async function rejectRequest(requestId: number, approvedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(requests)
    .set({
      status: 'Refusée',
      approved_by: approvedBy,
      approval_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(requests.id, requestId))
    .returning({ id: requests.id });
  return result.length > 0;
}

export async function updateLeaveBalance(userId: number, usedLeave: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const currentYear = new Date().getFullYear();
  const balance = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, currentYear)))
    .limit(1);
  
  if (!balance[0]) return false;
  
  const result = await db.update(leaveBalances)
    .set({
      used_leave: usedLeave,
      remaining_leave: balance[0].annual_leave - usedLeave,
      updated_at: new Date().toISOString(),
    })
    .where(eq(leaveBalances.id, balance[0].id))
    .returning({ id: leaveBalances.id });

  return result.length > 0;
}

export async function initializeLeaveBalance(userId: number, annualLeave: number = 30, daysWorked: number = 0): Promise<number> {
  const db = await getDrizzleDb();
  const currentYear = new Date().getFullYear();
  const calculatedLeave = Math.floor(daysWorked / 22) * 1.5;
  const totalLeave = annualLeave + calculatedLeave;
  
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
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  }).returning({ id: leaveBalances.id });

  return result[0]?.id ?? 0;
}

export async function logActivity(
  userId: number,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: string
): Promise<void> {
  const db = await getDrizzleDb();
  await db.insert(activityLogs).values({
    user_id: userId,
    action,
    resource_type: resourceType || null,
    resource_id: resourceId || null,
    details: details || null,
    created_at: new Date().toISOString(),
  });
}

export async function updateRequest(
  requestId: number,
  status: RequestStatus,
  approvedBy: number,
  reason?: string
): Promise<boolean> {
  const db = await getDrizzleDb();
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'En cours / En attente RH') {
    updateData.approved_by = null;
    updateData.approval_date = null;
    updateData.approval_reason = null;
  } else {
    updateData.approved_by = approvedBy;
    updateData.approval_date = new Date().toISOString();
    if (reason) {
      updateData.approval_reason = reason;
    }
  }
  
  const result = await db.update(requests)
    .set(updateData)
    .where(eq(requests.id, requestId))
    .returning({ id: requests.id });
  return result.length > 0;
}

export async function updateRequestDetails(
  requestId: number,
  details: { start_date?: string; end_date?: string; reason?: string }
): Promise<boolean> {
  const db = await getDrizzleDb();
  const updateData: any = { updated_at: new Date().toISOString() };
  
  if (details.start_date !== undefined) updateData.start_date = details.start_date;
  if (details.end_date !== undefined) updateData.end_date = details.end_date;
  if (details.reason !== undefined) updateData.reason = details.reason;
  
  const result = await db.update(requests)
    .set(updateData)
    .where(eq(requests.id, requestId))
    .returning({ id: requests.id });
  return result.length > 0;
}

export async function updateOfferParticipants(offerId: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const offer = await getOfferById(offerId);
  if (!offer) return false;
  
  const result = await db.update(offers)
    .set({
      current_participants: offer.current_participants + 1,
      updated_at: new Date().toISOString(),
    })
    .where(eq(offers.id, offerId))
    .returning({ id: offers.id });

  return result.length > 0;
}

export async function deleteRequest(requestId: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(requests).where(eq(requests.id, requestId)).returning({ id: requests.id });
  return result.length > 0;
}

export async function updateLeaveBalanceUsage(userId: number, days: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const currentYear = new Date().getFullYear();
  const balance = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, currentYear)))
    .limit(1);
  
  if (!balance[0]) return false;
  
  const result = await db.update(leaveBalances)
    .set({
      used_leave: balance[0].used_leave + days,
      remaining_leave: balance[0].remaining_leave - days,
      updated_at: new Date().toISOString(),
    })
    .where(eq(leaveBalances.id, balance[0].id))
    .returning({ id: leaveBalances.id });

  return result.length > 0;
}

export function calculateLeaveFromWorkDays(daysWorked: number): number {
  return Math.floor(daysWorked / 22) * 1.5;
}

// Update leave balance with worked days
export async function updateLeaveBalanceFromWorkDays(userId: number, daysWorked: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const currentYear = new Date().getFullYear();
  const balance = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, currentYear)))
    .limit(1);
  
  if (!balance[0]) return false;
  
  const calculatedLeave = calculateLeaveFromWorkDays(daysWorked);
  const totalLeave = balance[0].annual_leave + calculatedLeave + balance[0].manual_adjustment;
  
  await db.update(leaveBalances)
    .set({
      days_worked: daysWorked,
      calculated_leave: calculatedLeave,
      remaining_leave: totalLeave - balance[0].used_leave,
      updated_at: new Date().toISOString(),
    })
    .where(eq(leaveBalances.id, balance[0].id));
  
  return true;
}

// Update offer status
export async function updateOfferStatus(offerId: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const offer = await getOfferById(offerId);
  
  if (!offer) return false;
  
  const now = new Date();
  const deadline = offer.application_deadline ? new Date(offer.application_deadline) : null;
  
  let newStatus: OfferStatus;
  if (deadline && deadline < now) {
    newStatus = 'Expiré / indisponible';
  } else if (offer.current_participants >= offer.max_participants) {
    newStatus = 'Complet';
  } else {
    newStatus = 'Disponible';
  }
  
  await db.update(offers)
    .set({ status: newStatus, updated_at: new Date().toISOString() })
    .where(eq(offers.id, offerId));
  
  return true;
}

// Update all offers status
export async function updateAllOffersStatus(): Promise<void> {
  const db = await getDrizzleDb();
  const allOffers = await db.select().from(offers);
  const now = new Date();
  
  for (const offer of allOffers) {
    const deadline = offer.application_deadline ? new Date(offer.application_deadline) : null;
    
    let newStatus: OfferStatus;
    if (deadline && deadline < now) {
      newStatus = 'Expiré / indisponible';
    } else if (offer.current_participants >= offer.max_participants) {
      newStatus = 'Complet';
    } else {
      newStatus = 'Disponible';
    }
    
    if (newStatus !== offer.status) {
      await db.update(offers)
        .set({ status: newStatus, updated_at: new Date().toISOString() })
        .where(eq(offers.id, offer.id));
    }
  }
}

// Admin functions
export async function getHrAdmins(): Promise<User[]> {
  const db = await getDrizzleDb();
  return await db.select().from(users).where(eq(users.role, 'hr_admin'));
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0;
}

export async function createHrAdmin(
  email: string,
  passwordHash: string,
  fullName: string,
  department?: string
): Promise<number> {
  return createUser(email, passwordHash, fullName, 'hr_admin', department);
}

export async function updateHrAdmin(id: number, updates: {
  full_name: string;
  email: string;
  department?: string;
  password?: string;
}): Promise<boolean> {
  const db = await getDrizzleDb();
  const user = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'hr_admin'))).limit(1);
  
  if (!user[0]) return false;
  
  if (updates.email !== user[0].email) {
    const emailExists = await checkEmailExists(updates.email);
    if (emailExists) return false;
  }

  const updateData: any = {
    full_name: updates.full_name,
    email: updates.email,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.department !== undefined) {
    updateData.department = updates.department || null;
  }
  if (updates.password) {
    updateData.password_hash = hashPassword(updates.password);
  }
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return result.length > 0;
}

export async function deleteHrAdmin(id: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(users).where(and(eq(users.id, id), eq(users.role, 'hr_admin'))).returning({ id: users.id });
  return result.length > 0;
}

export async function deactivateHrAdmin(id: number, deactivatedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(users)
    .set({
      status: 'inactive',
      deactivated_at: new Date().toISOString(),
      deactivated_by: deactivatedBy,
    })
    .where(and(eq(users.id, id), eq(users.role, 'hr_admin')))
    .returning({ id: users.id });
  return result.length > 0;
}

export async function reactivateHrAdmin(id: number, reactivatedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(users)
    .set({
      status: 'active',
      deactivated_at: null,
      deactivated_by: null,
    })
    .where(and(eq(users.id, id), eq(users.role, 'hr_admin')))
    .returning({ id: users.id });

  if (result.length > 0) {
    await logActivity(reactivatedBy, 'reactivated_hr_admin', 'user', id);
  }

  return result.length > 0;
}

export async function getEmployees(): Promise<User[]> {
  const db = await getDrizzleDb();
  return await db.select().from(users).where(eq(users.role, 'employee'));
}

export async function updateEmployee(id: number, updates: {
  full_name: string;
  email: string;
  department?: string | null;
  password?: string;
}): Promise<boolean> {
  const db = await getDrizzleDb();
  const user = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'employee'))).limit(1);
  
  if (!user[0]) return false;
  
  if (updates.email !== user[0].email) {
    const emailExists = await checkEmailExists(updates.email);
    if (emailExists) return false;
  }

  const updateData: any = {
    full_name: updates.full_name,
    email: updates.email,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.department !== undefined) {
    updateData.department = updates.department?.trim() || null;
  }
  if (updates.password) {
    updateData.password_hash = hashPassword(updates.password);
  }
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return result.length > 0;
}

// Delete employee function
export async function deleteEmployee(id: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(users).where(and(eq(users.id, id), eq(users.role, 'employee'))).returning({ id: users.id });
  return result.length > 0;
}

export async function updateUserProfile(id: number, updates: {
  full_name: string;
  email: string;
  department?: string | null;
  password?: string;
}): Promise<boolean> {
  const db = await getDrizzleDb();
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  
  if (!user[0]) return false;
  
  if (updates.email !== user[0].email) {
    const emailExists = await checkEmailExists(updates.email);
    if (emailExists) return false;
  }

  const updateData: any = {
    full_name: updates.full_name,
    email: updates.email,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.department !== undefined) {
    updateData.department = updates.department?.trim() || null;
  }
  if (updates.password) {
    updateData.password_hash = hashPassword(updates.password);
  }
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return result.length > 0;
}

export async function setEmployeeStatus(id: number, status: UserStatus, changedBy?: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const user = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'employee'))).limit(1);
  
  if (!user[0]) return false;
  
  if (user[0].status === status) return true;
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'inactive') {
    updateData.deactivated_at = new Date().toISOString();
    if (changedBy) updateData.deactivated_by = changedBy;
  } else if (status === 'active') {
    updateData.deactivated_at = null;
    updateData.deactivated_by = null;
  }
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return result.length > 0;
}

// System Settings functions
export async function getSystemSetting(key: string): Promise<string | null> {
  const db = await getDrizzleDb();
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result[0]?.value || null;
}

export async function setSystemSetting(key: string, value: string, updatedBy: number = 0, description?: string): Promise<boolean> {
  const db = await getDrizzleDb();
  const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  
  if (existing[0]) {
    const result = await db.update(systemSettings)
      .set({ value, updated_at: new Date().toISOString(), updated_by: updatedBy })
      .where(eq(systemSettings.id, existing[0].id))
      .returning({ id: systemSettings.id });
    return result.length > 0;
  } else {
    await db.insert(systemSettings).values({
      key,
      value,
      description: description || '',
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    });
    return true;
  }
}

export async function getAllSystemSettings(): Promise<SystemSetting[]> {
  const db = await getDrizzleDb();
  return await db.select().from(systemSettings);
}

// Activity Log functions
export async function getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
  const db = await getDrizzleDb();
  return await db.select().from(activityLogs).orderBy(desc(activityLogs.created_at)).limit(limit);
}

export async function getUserActivityLogs(userId: number, limit: number = 50): Promise<ActivityLog[]> {
  const db = await getDrizzleDb();
  return await db.select().from(activityLogs)
    .where(eq(activityLogs.user_id, userId))
    .orderBy(desc(activityLogs.created_at))
    .limit(limit);
}

// Request with details
export async function getRequestWithDetails(requestId: number): Promise<any> {
  const db = await getDrizzleDb();
  const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
  
  if (!request[0]) return null;
  
  const user = await db.select().from(users).where(eq(users.id, request[0].user_id)).limit(1);
  
  let offer = null;
  if (request[0].offer_id) {
    const offerResult = await db.select().from(offers).where(eq(offers.id, request[0].offer_id)).limit(1);
    offer = offerResult[0] || null;
  }
  
  return {
    ...request[0],
    user: user[0] || null,
    offer,
  };
}

// Bulk operations
export async function bulkUpdateRequestStatus(
  requestIds: number[],
  status: RequestStatus,
  approvedBy: number,
  reason?: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const requestId of requestIds) {
    const result = await updateRequest(requestId, status, approvedBy, reason);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  return { success, failed };
}

type DateRange = {
  start: Date;
  end: Date;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseISODate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildRangeFromValues = (startValue?: string | null, endValue?: string | null): DateRange | null => {
  const start = parseISODate(startValue);
  const end = parseISODate(endValue);
  if (!start || !end) return null;
  if (end.getTime() < start.getTime()) return null;
  return { start, end };
};

async function deriveRequestDateRange(request: Request, fallbackOffer?: Offer): Promise<DateRange | null> {
  if (request.type === 'leave') {
    return buildRangeFromValues(
      request.selected_start_date || request.start_date,
      request.selected_end_date || request.end_date
    );
  }

  const selectedRange = buildRangeFromValues(request.selected_start_date, request.selected_end_date);
  if (selectedRange) {
    return selectedRange;
  }

  const effectiveOffer = fallbackOffer ?? (request.offer_id ? await getOfferById(request.offer_id) : undefined);
  if (!effectiveOffer) {
    return null;
  }

  return buildRangeFromValues(effectiveOffer.start_date, effectiveOffer.end_date);
}

const calculateInclusiveDays = (range: DateRange): number => {
  return Math.ceil((range.end.getTime() - range.start.getTime()) / MS_PER_DAY) + 1;
};

// Approve request with business logic
export async function approveRequestAndApply(requestId: number, approvedBy: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDrizzleDb();
  const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);

  if (!request[0]) {
    return { success: false, error: 'Demande non trouvée' };
  }

  if (request[0].status !== 'En cours / En attente RH') {
    return { success: false, error: 'La demande n\'est plus en attente de validation' };
  }

  let requestOffer: Offer | undefined;

  // Validate and apply business rules
  if (request[0].type === 'offer') {
    const offer = await getOfferById(request[0].offer_id!);
    if (!offer) {
      return { success: false, error: 'L\'offre associée n\'existe pas' };
    }

    const now = new Date();
    if (offer.status !== 'Disponible') {
      return { success: false, error: 'L\'offre n\'est plus disponible' };
    }

    if (offer.application_deadline && new Date(offer.application_deadline) < now) {
      return { success: false, error: 'La date limite de candidature a expiré' };
    }

    if (offer.current_participants >= offer.max_participants) {
      return { success: false, error: 'L\'offre est complète (nombre maximum de participants atteint)' };
    }

    await db.update(offers)
      .set({ 
        current_participants: offer.current_participants + 1,
        updated_at: new Date().toISOString(),
      })
      .where(eq(offers.id, offer.id));
    
    await logActivity(approvedBy, 'offer_participant_increment', 'offer', offer.id, `Participant ajouté pour la demande ${requestId}`);
    requestOffer = offer;
  }

  const range = await deriveRequestDateRange(request[0], requestOffer);
  if (!range) {
    return { success: false, error: 'Les dates de début et de fin sont requises' };
  }

  const days = calculateInclusiveDays(range);
  const balance = await getLeaveBalance(request[0].user_id);
  if (!balance) {
    return { success: false, error: 'Aucun solde de congés trouvé pour cet employé' };
  }

  if (days > balance.remaining_leave) {
    return { success: false, error: `Solde de congés insuffisant. Solde disponible: ${balance.remaining_leave} jour(s), jours demandés: ${days}` };
  }

  await db.update(leaveBalances)
    .set({
      used_leave: balance.used_leave + days,
      remaining_leave: balance.remaining_leave - days,
      updated_at: new Date().toISOString(),
    })
    .where(eq(leaveBalances.id, balance.id));

  const logDescription = request[0].type === 'offer'
    ? `Offre approuvée: ${days} jours utilisés pour la demande ${requestId}`
    : `Congé approuvé: ${days} jours utilisés pour la demande ${requestId}`;

  await logActivity(approvedBy, 'leave_balance_decrement', 'leave_balance', balance.user_id, logDescription);

  await approveRequest(requestId, approvedBy);
  return { success: true };
}

// Reverse approval changes
export async function reverseApprovalChanges(requestId: number, reversedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const request = await db.select().from(requests).where(eq(requests.id, requestId)).limit(1);

  if (!request[0] || request[0].status !== 'Acceptée') {
    return false;
  }

  if (request[0].type === 'offer') {
    const offer = await getOfferById(request[0].offer_id!);
    if (offer && offer.current_participants > 0) {
      await db.update(offers)
        .set({
          current_participants: offer.current_participants - 1,
          updated_at: new Date().toISOString(),
        })
        .where(eq(offers.id, offer.id));
      await logActivity(reversedBy, 'offer_participant_decrement', 'offer', offer.id, `Participant retiré suite au rejet de la demande ${requestId}`);
    }
  }

  const reversalRange = await deriveRequestDateRange(request[0]);
  if (reversalRange) {
    const days = calculateInclusiveDays(reversalRange);
    const balance = await getLeaveBalance(request[0].user_id);

    if (balance) {
      await db.update(leaveBalances)
        .set({
          used_leave: balance.used_leave - days,
          remaining_leave: balance.remaining_leave + days,
          updated_at: new Date().toISOString(),
        })
        .where(eq(leaveBalances.id, balance.id));
      
      const logDescription = request[0].type === 'offer'
        ? `Offre rejetée: ${days} jours restitués pour la demande ${requestId}`
        : `Congé rejeté: ${days} jours restitués pour la demande ${requestId}`;

      await logActivity(reversedBy, 'leave_balance_increment', 'leave_balance', balance.user_id, logDescription);
    }
  }

  return true;
}
