/**
 * Simple in-memory rate limiting for authentication endpoints
 * Format: Map<key, {count: number, resetTime: number}>
 * 
 * WARNING: This is a simple in-memory implementation. For production with multiple
 * server instances, use Redis or a distributed cache.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
// In production, migrate to Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if request should be rate limited
 * 
 * @param key - Unique identifier (e.g., 'login:192.168.1.1' or 'login:user@example.com')
 * @param maxAttempts - Maximum attempts allowed
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns true if request should be blocked, false if allowed
 */
export function isRateLimited(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous attempts
  if (!entry) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return false;
  }

  // Window expired, reset counter
  if (now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return false;
  }

  // Still within window
  entry.count++;

  // Check if exceeded limit
  if (entry.count > maxAttempts) {
    return true; // Rate limited
  }

  return false; // Not rate limited yet
}

/**
 * Get current attempt count for a key
 */
export function getAttemptCount(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() > entry.resetTime) {
    return 0;
  }
  return entry.count;
}

/**
 * Get remaining time (ms) until rate limit resets
 */
export function getResetTime(key: string): number {
  const entry = rateLimitStore.get(key);
  if (!entry) {
    return 0;
  }
  const remaining = entry.resetTime - Date.now();
  return Math.max(0, remaining);
}

/**
 * Manually clear a rate limit key (for testing or after security incident)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get client IP from request headers
 * Handles proxies and load balancers
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  
  // Check for IP from proxy headers (in order of preference)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection IP (may not work behind proxy)
  // @ts-ignore - Socket info may be available
  return request.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Get rate limit key for login attempts
 * Combines both IP and email for defense against distributed attacks
 */
export function getLoginRateLimitKey(email: string, ip: string): {
  ipKey: string;
  emailKey: string;
} {
  return {
    ipKey: `login:ip:${ip}`,
    emailKey: `login:email:${email.toLowerCase()}`
  };
}
