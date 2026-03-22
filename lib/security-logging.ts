/**
 * Security event logging utilities
 * Logs failed authorization attempts, suspicious activities, and security events
 */

import { type User } from './db';

export enum SecurityEventType {
  FAILED_AUTH = 'failed_auth',
  FAILED_AUTHORIZATION = 'failed_authorization',
  INVALID_TOKEN = 'invalid_token',
  TOKEN_TAMPERING = 'token_tampering',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_ESCALATION_ATTEMPT = 'role_escalation_attempt'
}

interface SecurityEvent {
  type: SecurityEventType;
  timestamp?: string;
  userId?: number;
  email?: string;
  ipAddress?: string;
  endpoint?: string;
  details?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// In-memory security event log (in production, use a database)
const securityEventLog: SecurityEvent[] = [];

/**
 * Log a security event
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  };

  // Add to in-memory log
  securityEventLog.push(logEntry);

  // Also log to console based on severity
  const logLevel = {
    low: console.debug,
    medium: console.warn,
    high: console.error,
    critical: console.error
  }[event.severity];

  logLevel(
    `[Security Event] ${event.type} - ${event.details || ''}`,
    {
      userId: event.userId,
      email: event.email,
      endpoint: event.endpoint,
      severity: event.severity
    }
  );

  // TODO: In production, send critical events to SIEM/alerting system
  if (event.severity === 'critical') {
    console.error('[CRITICAL SECURITY EVENT] Alert! Check logs immediately:', event);
  }
}

/**
 * Log failed authorization attempt
 */
export function logFailedAuthorization(
  endpoint: string,
  requiredRoles: string[],
  userRole?: string,
  userId?: number,
  ipAddress?: string
): void {
  logSecurityEvent({
    type: SecurityEventType.FAILED_AUTHORIZATION,
    severity: 'medium',
    userId,
    ipAddress,
    endpoint,
    details: `User with role '${userRole || 'unknown'}' attempted to access '${endpoint}' which requires roles: ${requiredRoles.join(', ')}`
  });
}

/**
 * Log failed authentication attempt
 */
export function logFailedAuth(
  email: string,
  ipAddress: string,
  reason: string = 'invalid credentials'
): void {
  logSecurityEvent({
    type: SecurityEventType.FAILED_AUTH,
    severity: 'low',
    email,
    ipAddress,
    endpoint: '/api/auth/login',
    details: `Failed login attempt: ${reason}`
  });
}

/**
 * Log invalid or tampered token
 */
export function logInvalidToken(
  userId?: number,
  ipAddress?: string,
  reason: string = 'invalid format'
): void {
  logSecurityEvent({
    type: SecurityEventType.INVALID_TOKEN,
    severity: userId ? 'high' : 'medium',
    userId,
    ipAddress,
    details: `Invalid token: ${reason}`
  });
}

/**
 * Log token tampering detection
 */
export function logTokenTampering(
  userId?: number,
  ipAddress?: string
): void {
  logSecurityEvent({
    type: SecurityEventType.TOKEN_TAMPERING,
    severity: 'critical',
    userId,
    ipAddress,
    details: 'Token signature verification failed - possible tampering detected'
  });
}

/**
 * Log rate limit exceeded
 */
export function logRateLimitExceeded(
  ipAddress: string,
  endpoint: string,
  email?: string
): void {
  logSecurityEvent({
    type: SecurityEventType.RATE_LIMIT_EXCEEDED,
    severity: 'medium',
    email,
    ipAddress,
    endpoint,
    details: `Rate limit exceeded for endpoint: ${endpoint}`
  });
}

/**
 * Get recent security events (for monitoring dashboards)
 */
export function getRecentSecurityEvents(limit: number = 100): SecurityEvent[] {
  return securityEventLog.slice(-limit);
}

/**
 * Get security events by type
 */
export function getSecurityEventsByType(
  type: SecurityEventType,
  hours: number = 24
): SecurityEvent[] {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);

  return securityEventLog.filter(
    event =>
      event.type === type &&
      new Date(event.timestamp || new Date().toISOString()) > cutoffTime
  );
}

/**
 * Get critical security events
 */
export function getCriticalSecurityEvents(hours: number = 24): SecurityEvent[] {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);

  return securityEventLog.filter(
    event =>
      event.severity === 'critical' &&
      new Date(event.timestamp || new Date().toISOString()) > cutoffTime
  );
}

/**
 * Count failed authorization attempts for a user
 */
export function countFailedAuthorizationAttempts(
  userId: number,
  hours: number = 24
): number {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);

  return securityEventLog.filter(
    event =>
      event.userId === userId &&
      event.type === SecurityEventType.FAILED_AUTHORIZATION &&
      new Date(event.timestamp || new Date().toISOString()) > cutoffTime
  ).length;
}

/**
 * Clear old security events (for maintenance)
 */
export function clearOldSecurityEvents(hours: number = 168): number {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);

  const beforeCount = securityEventLog.length;
  const afterIndex = securityEventLog.findIndex(
    event => new Date(event.timestamp || new Date().toISOString()) > cutoffTime
  );

  if (afterIndex > 0) {
    securityEventLog.splice(0, afterIndex);
  }

  return beforeCount - securityEventLog.length;
}
