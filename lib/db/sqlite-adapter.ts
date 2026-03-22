import { getDrizzleDb } from './index';
import {
  users,
  offers,
  requests,
  leaveBalances,
  activityLogs,
  systemSettings,
  type OfferStatus,
} from './schema';
import { eq, desc, and, sql, like } from 'drizzle-orm';

// Initialize database and create tables
export async function initializeDatabase(): Promise<void> {
  const { runMigration } = await import('./migrate');
  runMigration();
}

// User functions
export async function findUserByEmail(email: string) {
  const db = await getDrizzleDb();
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function findUserById(id: number) {
  const db = await getDrizzleDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDrizzleDb();
  return db.select().from(users).orderBy(desc(users.created_at));
}

// Offer functions
export async function getAllOffers() {
  const db = await getDrizzleDb();
  return db.select().from(offers).orderBy(desc(offers.created_at));
}

export async function getActiveOffers() {
  const db = await getDrizzleDb();
  return db.select().from(offers).where(eq(offers.status, 'Disponible'));
}

export async function getOfferById(id: number) {
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
export async function getUserRequests(userId: number) {
  const db = await getDrizzleDb();
  return db.select().from(requests).where(eq(requests.user_id, userId)).orderBy(desc(requests.created_at));
}

export async function getPendingRequests() {
  const db = await getDrizzleDb();
  return db.select().from(requests).where(eq(requests.status, 'En cours / En attente RH'));
}

export async function getRequestById(id: number) {
  const db = await getDrizzleDb();
  const result = await db.select().from(requests).where(eq(requests.id, id)).limit(1);
  return result[0];
}

// Leave balance functions
export async function getLeaveBalance(userId: number) {
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
  });
  return Number(result.lastInsertRowid);
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
  });
  
  return Number(result.lastInsertRowid);
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
    status?: 'Disponible' | 'Complet' | 'Expiré / indisponible';
  }
): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(offers)
    .set({ ...updates, updated_at: new Date().toISOString() })
    .where(eq(offers.id, id));
  return result.changes > 0;
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
    .where(eq(leaveBalances.id, b.id));
  
  return result.changes > 0;
}

export async function deleteOffer(id: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(offers).where(eq(offers.id, id));
  return result.changes > 0;
}

export async function createRequest(
  userId: number,
  type: 'offer' | 'leave',
  offerId?: number,
  startDate?: string,
  endDate?: string,
  reason?: string,
  status: 'En cours / En attente RH' | 'Acceptée' | 'Refusée' | 'Refus automatique' = 'En cours / En attente RH',
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
  });
  return Number(result.lastInsertRowid);
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
    .where(eq(requests.id, requestId));
  return result.changes > 0;
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
    .where(eq(requests.id, requestId));
  return result.changes > 0;
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
    .where(eq(leaveBalances.id, balance[0].id));
  
  return result.changes > 0;
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
  });
  
  return Number(result.lastInsertRowid);
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
  status: 'En cours / En attente RH' | 'Acceptée' | 'Refusée' | 'Refus automatique',
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
    .where(eq(requests.id, requestId));
  return result.changes > 0;
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
    .where(eq(requests.id, requestId));
  return result.changes > 0;
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
    .where(eq(offers.id, offerId));
  
  return result.changes > 0;
}

export async function deleteRequest(requestId: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(requests).where(eq(requests.id, requestId));
  return result.changes > 0;
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
    .where(eq(leaveBalances.id, balance[0].id));
  
  return result.changes > 0;
}

export function calculateLeaveFromWorkDays(daysWorked: number): number {
  return Math.floor(daysWorked / 22) * 1.5;
}

export async function updateLeaveBalanceFromWorkDays(userId: number, daysWorked: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const currentYear = new Date().getFullYear();
  const balance = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, currentYear)))
    .limit(1);
  
  if (!balance[0]) return false;
  
  const calculatedLeave = calculateLeaveFromWorkDays(daysWorked);
  const totalLeave = balance[0].annual_leave + calculatedLeave + balance[0].manual_adjustment;
  
  const result = await db.update(leaveBalances)
    .set({
      days_worked: daysWorked,
      calculated_leave: calculatedLeave,
      remaining_leave: totalLeave - balance[0].used_leave,
      updated_at: new Date().toISOString(),
    })
    .where(eq(leaveBalances.id, balance[0].id));
  
  return result.changes > 0;
}

export async function updateOfferStatus(offerId: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const offer = await getOfferById(offerId);
  if (!offer) return false;
  
  const now = new Date();
  const deadline = offer.application_deadline ? new Date(offer.application_deadline) : null;
  
  let newStatus: OfferStatus = 'Disponible';
  if (deadline && deadline < now) {
    newStatus = 'Expiré / indisponible';
  } else if (offer.current_participants >= offer.max_participants) {
    newStatus = 'Complet';
  }
  
  const result = await db.update(offers)
    .set({ status: newStatus, updated_at: new Date().toISOString() })
    .where(eq(offers.id, offerId));
  
  return result.changes > 0;
}

export async function updateAllOffersStatus(): Promise<void> {
  const db = await getDrizzleDb();
  const now = new Date();
  const allOffers = await db.select().from(offers);
  
  for (const offer of allOffers) {
    const deadline = offer.application_deadline ? new Date(offer.application_deadline) : null;
    
    let newStatus: OfferStatus = 'Disponible';
    if (deadline && deadline < now) {
      newStatus = 'Expiré / indisponible';
    } else if (offer.current_participants >= offer.max_participants) {
      newStatus = 'Complet';
    }
    
    if (newStatus !== offer.status) {
      await db.update(offers)
        .set({ status: newStatus, updated_at: new Date().toISOString() })
        .where(eq(offers.id, offer.id));
    }
  }
}

export async function getHrAdmins() {
  const db = await getDrizzleDb();
  return db.select().from(users).where(eq(users.role, 'hr_admin'));
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return !!user;
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
  const user = await findUserById(id);
  if (!user || user.role !== 'hr_admin') return false;
  
  if (updates.email !== user.email) {
    const emailExists = await checkEmailExists(updates.email);
    if (emailExists) return false;
  }
  
  const { hashPassword } = await import('../auth');
  
  const updateData: any = {
    full_name: updates.full_name,
    email: updates.email,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.department !== undefined) updateData.department = updates.department;
  if (updates.password) updateData.password_hash = hashPassword(updates.password);
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id));
  
  return result.changes > 0;
}

export async function deleteHrAdmin(id: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(users).where(and(eq(users.id, id), eq(users.role, 'hr_admin')));
  return result.changes > 0;
}

export async function deactivateHrAdmin(id: number, deactivatedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(users)
    .set({
      status: 'inactive',
      deactivated_at: new Date().toISOString(),
      deactivated_by: deactivatedBy,
      updated_at: new Date().toISOString(),
    })
    .where(and(eq(users.id, id), eq(users.role, 'hr_admin')));
  return result.changes > 0;
}

export async function reactivateHrAdmin(id: number, reactivatedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(users)
    .set({
      status: 'active',
      deactivated_at: null,
      deactivated_by: null,
      updated_at: new Date().toISOString(),
    })
    .where(and(eq(users.id, id), eq(users.role, 'hr_admin')));
  
  if (result.changes > 0) {
    await logActivity(reactivatedBy, 'reactivated_hr_admin', 'user', id);
  }
  
  return result.changes > 0;
}

export async function getEmployees() {
  const db = await getDrizzleDb();
  return db.select().from(users).where(eq(users.role, 'employee'));
}

export async function updateEmployee(id: number, updates: {
  full_name: string;
  email: string;
  department?: string | null;
  password?: string;
}): Promise<boolean> {
  const db = await getDrizzleDb();
  const user = await findUserById(id);
  if (!user || user.role !== 'employee') return false;
  
  if (updates.email !== user.email) {
    const emailExists = await checkEmailExists(updates.email);
    if (emailExists) return false;
  }
  
  const { hashPassword } = await import('../auth');
  
  const updateData: any = {
    full_name: updates.full_name,
    email: updates.email,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.department !== undefined) updateData.department = updates.department;
  if (updates.password) updateData.password_hash = hashPassword(updates.password);
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id));
  
  return result.changes > 0;
}

export async function updateUserProfile(id: number, updates: {
  full_name: string;
  email: string;
  department?: string | null;
  password?: string;
}): Promise<boolean> {
  const db = await getDrizzleDb();
  const user = await findUserById(id);
  if (!user) return false;
  
  if (updates.email !== user.email) {
    const emailExists = await checkEmailExists(updates.email);
    if (emailExists) return false;
  }
  
  const { hashPassword } = await import('../auth');
  
  const updateData: any = {
    full_name: updates.full_name,
    email: updates.email,
    updated_at: new Date().toISOString(),
  };
  
  if (updates.department !== undefined) updateData.department = updates.department;
  if (updates.password) updateData.password_hash = hashPassword(updates.password);
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id));
  
  return result.changes > 0;
}

export async function setEmployeeStatus(id: number, status: 'active' | 'inactive' | 'suspended', changedBy?: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const user = await findUserById(id);
  if (!user || user.role !== 'employee') return false;
  
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  
  if (status === 'inactive') {
    updateData.deactivated_at = new Date().toISOString();
    updateData.deactivated_by = changedBy || null;
  } else {
    updateData.deactivated_at = null;
    updateData.deactivated_by = null;
  }
  
  const result = await db.update(users)
    .set(updateData)
    .where(eq(users.id, id));
  
  return result.changes > 0;
}

// Additional functions needed for backward compatibility
export async function getAllLeaveBalances() {
  const db = await getDrizzleDb();
  return db.select().from(leaveBalances).orderBy(desc(leaveBalances.year));
}

export async function getAllRequests() {
  const db = await getDrizzleDb();
  return db.select().from(requests).orderBy(desc(requests.created_at));
}

export async function getAllActivityLogs() {
  const db = await getDrizzleDb();
  return db.select().from(activityLogs).orderBy(desc(activityLogs.created_at));
}

export async function getAllSystemSettings() {
  const db = await getDrizzleDb();
  return db.select().from(systemSettings);
}

export async function getSettingByKey(key: string) {
  const db = await getDrizzleDb();
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
  return result[0];
}

export async function updateSystemSetting(key: string, value: string, updatedBy?: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(systemSettings)
    .set({ value, updated_by: updatedBy || null, updated_at: new Date().toISOString() })
    .where(eq(systemSettings.key, key));
  return result.changes > 0;
}

export async function createSystemSetting(key: string, value: string, description?: string, updatedBy?: number): Promise<number> {
  const db = await getDrizzleDb();
  const result = await db.insert(systemSettings).values({
    key,
    value,
    description: description || null,
    updated_by: updatedBy || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return Number(result.lastInsertRowid);
}

export async function deleteSystemSetting(key: string): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(systemSettings).where(eq(systemSettings.key, key));
  return result.changes > 0;
}

export async function createLeaveBalance(data: {
  user_id: number;
  annual_leave: number;
  used_leave: number;
  remaining_leave: number;
  year: number;
  days_worked: number;
  calculated_leave: number;
  manual_adjustment: number;
  adjustment_reason?: string;
}): Promise<number> {
  const db = await getDrizzleDb();
  const now = new Date().toISOString();
  const result = await db.insert(leaveBalances).values({
    ...data,
    adjustment_reason: data.adjustment_reason || null,
    updated_at: now,
    created_at: now,
  });
  return Number(result.lastInsertRowid);
}

export async function updateLeaveBalanceById(id: number, data: {
  annual_leave?: number;
  used_leave?: number;
  remaining_leave?: number;
  days_worked?: number;
  calculated_leave?: number;
  manual_adjustment?: number;
  adjustment_reason?: string;
}): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.update(leaveBalances)
    .set({ ...data, updated_at: new Date().toISOString() })
    .where(eq(leaveBalances.id, id));
  return result.changes > 0;
}

export async function deleteLeaveBalance(id: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(leaveBalances).where(eq(leaveBalances.id, id));
  return result.changes > 0;
}

export async function findLeaveBalanceById(id: number) {
  const db = await getDrizzleDb();
  const result = await db.select().from(leaveBalances).where(eq(leaveBalances.id, id)).limit(1);
  return result[0];
}

export async function findLeaveBalanceByUserAndYear(userId: number, year: number) {
  const db = await getDrizzleDb();
  const result = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.user_id, userId), eq(leaveBalances.year, year)))
    .limit(1);
  return result[0];
}

export async function getLeaveBalancesByUser(userId: number) {
  const db = await getDrizzleDb();
  return db.select().from(leaveBalances)
    .where(eq(leaveBalances.user_id, userId))
    .orderBy(desc(leaveBalances.year));
}

export async function createActivityLog(data: {
  user_id: number;
  action: string;
  resource_type?: string;
  resource_id?: number;
  details?: string;
  ip_address?: string;
  user_agent?: string;
}): Promise<number> {
  const db = await getDrizzleDb();
  const result = await db.insert(activityLogs).values({
    user_id: data.user_id,
    action: data.action,
    resource_type: data.resource_type || null,
    resource_id: data.resource_id || null,
    details: data.details || null,
    ip_address: data.ip_address || null,
    user_agent: data.user_agent || null,
    created_at: new Date().toISOString(),
  });
  return Number(result.lastInsertRowid);
}

export async function findActivityLogById(id: number) {
  const db = await getDrizzleDb();
  const result = await db.select().from(activityLogs).where(eq(activityLogs.id, id)).limit(1);
  return result[0];
}

export async function getActivityLogsByUser(userId: number) {
  const db = await getDrizzleDb();
  return db.select().from(activityLogs)
    .where(eq(activityLogs.user_id, userId))
    .orderBy(desc(activityLogs.created_at));
}

export async function getActivityLogsByAction(action: string) {
  const db = await getDrizzleDb();
  return db.select().from(activityLogs)
    .where(eq(activityLogs.action, action))
    .orderBy(desc(activityLogs.created_at));
}

export async function deleteActivityLog(id: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const result = await db.delete(activityLogs).where(eq(activityLogs.id, id));
  return result.changes > 0;
}

export async function approveRequestAndApply(requestId: number, approvedBy: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDrizzleDb();
  const request = await getRequestById(requestId);
  
  if (!request) {
    return { success: false, error: 'Demande non trouvée' };
  }
  
  if (request.status !== 'En cours / En attente RH') {
    return { success: false, error: 'La demande n\'est plus en attente de validation' };
  }
  
  if (request.type === 'offer') {
    const offer = request.offer_id ? await getOfferById(request.offer_id) : null;
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
  }
  
  if (request.type === 'leave') {
    // Use selected dates if available, otherwise fall back to start_date/end_date
    const startDate = request.selected_start_date || request.start_date;
    const endDate = request.selected_end_date || request.end_date;
    
    const currentYear = new Date().getFullYear();
    const balance = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.user_id, request.user_id), eq(leaveBalances.year, currentYear)))
      .limit(1);
    
    if (!balance[0]) {
      return { success: false, error: 'Aucun solde de congés trouvé pour cet employé' };
    }
    
    if (!startDate || !endDate) {
      return { success: false, error: 'Les dates de début et de fin sont requises' };
    }
    
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    
    if (days > balance[0].remaining_leave) {
      return { success: false, error: `Solde de congés insuffisant. Solde disponible: ${balance[0].remaining_leave} jour(s), jours demandés: ${days}` };
    }
    
    await db.update(leaveBalances)
      .set({
        used_leave: balance[0].used_leave + days,
        remaining_leave: balance[0].remaining_leave - days,
        updated_at: new Date().toISOString(),
      })
      .where(eq(leaveBalances.id, balance[0].id));
    
    await logActivity(approvedBy, 'leave_balance_decrement', 'leave_balance', request.user_id, `Congé approuvé: ${days} jours utilisés pour la demande ${requestId}`);
  }
  
  await db.update(requests)
    .set({
      status: 'Acceptée',
      approved_by: approvedBy,
      approval_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(requests.id, requestId));
  
  return { success: true };
}

export async function reverseApprovalChanges(requestId: number, reversedBy: number): Promise<boolean> {
  const db = await getDrizzleDb();
  const request = await getRequestById(requestId);
  
  if (!request || request.status !== 'Acceptée') {
    return false;
  }
  
  if (request.type === 'offer' && request.offer_id) {
    const offer = await getOfferById(request.offer_id);
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
  
  if (request.type === 'leave') {
    // Use selected dates if available, otherwise fall back to start_date/end_date
    const startDate = request.selected_start_date || request.start_date;
    const endDate = request.selected_end_date || request.end_date;
    
    const currentYear = new Date().getFullYear();
    const balance = await db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.user_id, request.user_id), eq(leaveBalances.year, currentYear)))
      .limit(1);
    
    if (balance[0] && startDate && endDate) {
      const days = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      
      await db.update(leaveBalances)
        .set({
          used_leave: balance[0].used_leave - days,
          remaining_leave: balance[0].remaining_leave + days,
          updated_at: new Date().toISOString(),
        })
        .where(eq(leaveBalances.id, balance[0].id));
      
      await logActivity(reversedBy, 'leave_balance_increment', 'leave_balance', request.user_id, `Congé rejeté: ${days} jours restitués pour la demande ${requestId}`);
    }
  }
  
  return true;
}
