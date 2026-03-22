import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ==================== ENUMS ====================

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const UserRole = {
  EMPLOYEE: 'employee',
  HR_ADMIN: 'hr_admin',
  OWNER: 'owner',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export const OfferStatus = {
  DISPONIBLE: 'Disponible',
  COMPLET: 'Complet',
  EXPIRE: 'Expiré / indisponible',
} as const;

export type OfferStatus = typeof OfferStatus[keyof typeof OfferStatus];

export const RequestStatus = {
  EN_COURS: 'En cours / En attente RH',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  REFUS_AUTOMATIQUE: 'Refus automatique',
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

export const RequestType = {
  OFFER: 'offer',
  LEAVE: 'leave',
} as const;

export type RequestType = typeof RequestType[keyof typeof RequestType];

// ==================== TABLES ====================

/**
 * Users table
 * Stores employee, HR admin, and owner accounts
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: text('role', { enum: ['employee', 'hr_admin', 'owner'] }).notNull().default('employee'),
  department: text('department'),
  status: text('status', { enum: ['active', 'inactive', 'suspended'] }).notNull().default('active'),
  deactivated_at: text('deactivated_at'),
  deactivated_by: integer('deactivated_by'),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
  updated_at: text('updated_at'),
});

/**
 * Offers table
 * Stores vacation offers that employees can apply for
 */
export const offers = sqliteTable('offers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  destination: text('destination').notNull(),
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  duration: text('duration'),
  price: real('price').notNull(),
  max_participants: integer('max_participants').notNull().default(0),
  current_participants: integer('current_participants').notNull().default(0),
  application_deadline: text('application_deadline'),
  hotel_name: text('hotel_name'),
  conditions: text('conditions'),
  images: text('images', { mode: 'json' }).$type<string[]>().default([]),
  status: text('status', { 
    enum: ['Disponible', 'Complet', 'Expiré / indisponible'] 
  }).notNull().default('Disponible'),
  created_by: integer('created_by').notNull().references(() => users.id),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
  updated_at: text('updated_at'),
});

/**
 * Requests table
 * Stores employee leave and offer requests
 */
export const requests = sqliteTable('requests', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  offer_id: integer('offer_id').references(() => offers.id),
  type: text('type', { enum: ['offer', 'leave'] }).notNull(),
  start_date: text('start_date'),
  end_date: text('end_date'),
  selected_start_date: text('selected_start_date'),
  selected_end_date: text('selected_end_date'),
  reason: text('reason'),
  status: text('status', { 
    enum: ['En cours / En attente RH', 'Acceptée', 'Refusée', 'Refus automatique'] 
  }).notNull().default('En cours / En attente RH'),
  approved_by: integer('approved_by').references(() => users.id),
  approval_date: text('approval_date'),
  approval_reason: text('approval_reason'),
  auto_rejection_reason: text('auto_rejection_reason'),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
  updated_at: text('updated_at'),
});

/**
 * Leave balances table
 * Stores annual leave information for each user per year
 */
export const leaveBalances = sqliteTable('leave_balances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  annual_leave: real('annual_leave').notNull().default(30),
  used_leave: real('used_leave').notNull().default(0),
  remaining_leave: real('remaining_leave').notNull().default(30),
  year: integer('year').notNull(),
  days_worked: real('days_worked').notNull().default(0),
  calculated_leave: real('calculated_leave').notNull().default(0),
  manual_adjustment: real('manual_adjustment').notNull().default(0),
  adjustment_reason: text('adjustment_reason'),
  updated_at: text('updated_at').notNull().default(new Date().toISOString()),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
});

/**
 * Activity logs table
 * Stores user activity history
 */
export const activityLogs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: integer('user_id').notNull().references(() => users.id),
  action: text('action').notNull(),
  resource_type: text('resource_type'),
  resource_id: integer('resource_id'),
  details: text('details'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
});

/**
 * System settings table
 * Stores global system configuration
 */
export const systemSettings = sqliteTable('system_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updated_at: text('updated_at').notNull().default(new Date().toISOString()),
  updated_by: integer('updated_by').references(() => users.id),
  created_at: text('created_at').notNull().default(new Date().toISOString()),
});

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many }) => ({
  requests: many(requests),
  leaveBalances: many(leaveBalances),
  activityLogs: many(activityLogs),
  offers: many(offers),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  creator: one(users, {
    fields: [offers.created_by],
    references: [users.id],
  }),
  requests: many(requests),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  user: one(users, {
    fields: [requests.user_id],
    references: [users.id],
  }),
  offer: one(offers, {
    fields: [requests.offer_id],
    references: [offers.id],
  }),
  reviewer: one(users, {
    fields: [requests.approved_by],
    references: [users.id],
  }),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  user: one(users, {
    fields: [leaveBalances.user_id],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.user_id],
    references: [users.id],
  }),
}));

// ==================== TYPE EXPORTS ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type NewOffer = typeof offers.$inferInsert;

export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;

export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type NewLeaveBalance = typeof leaveBalances.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
