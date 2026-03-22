import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { findUserByEmail, findUserById, type User } from './db';
import { logInvalidToken, logTokenTampering } from './security-logging';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 heures
// Use a stable secret key for session signatures
// In production, this MUST be set via SESSION_SECRET environment variable
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-key-do-not-change-in-production-12345';

// Fonction pour générer une signature HMAC-SHA256
function generateHmacSignature(payload: string): string {
  return createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
}

// Fonction pour vérifier une signature HMAC-SHA256
function verifyHmacSignature(payload: string, signature: string): boolean {
  const expectedSignature = generateHmacSignature(payload);
  return signature === expectedSignature;
}

// Fonction pour hasher un mot de passe
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

// Fonction pour vérifier un mot de passe
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('[v0] Erreur lors de la vérification du mot de passe:', error);
    return false;
  }
}

// Fonction pour créer une session avec signature HMAC
export async function createSession(userId: number) {
  const cookieStore = await cookies();
  
  // Format: userId:timestamp.signature
  const payload = `${userId}:${Date.now()}`;
  const signature = generateHmacSignature(payload);
  const sessionToken = `${Buffer.from(payload).toString('base64')}.${signature}`;
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000
  });
}

// Fonction pour obtenir l'utilisateur actuel avec vérification de signature
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    
    if (!token) {
      return null;
    }

    // Parse token format: base64payload.signature
    const parts = token.split('.');
    if (parts.length !== 2) {
      logInvalidToken(undefined, undefined, 'missing signature');
      return null;
    }

    const [base64Payload, signature] = parts;
    
    // Decode payload first before verifying signature
    // The signature was generated from the decoded (raw) string, not the base64 version
    const decodedPayload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    
    // Verify signature using the decoded payload (matching how it was created in createSession)
    if (!verifyHmacSignature(decodedPayload, signature)) {
      // Log as invalid token (not necessarily tampering) - could be old session
      // This is common when server restarts or secret changes
      logInvalidToken(undefined, undefined, 'signature verification failed');
      return null;
    }

    // Use the already decoded payload
    const decoded = decodedPayload;
    const [userIdStr, timestamp] = decoded.split(':');
    const userId = parseInt(userIdStr, 10);
    const tokenTime = parseInt(timestamp, 10);

    // Validate parsed values
    if (isNaN(userId) || isNaN(tokenTime)) {
      logInvalidToken(undefined, undefined, 'invalid payload format');
      return null;
    }

    // Optional: Check token freshness (within 24 hours)
    const now = Date.now();
    if (now - tokenTime > SESSION_DURATION) {
      console.log('[Security] Token expired - session duration exceeded');
      return null;
    }

    const user = await findUserById(userId);
    return user || null;
  } catch (error) {
    console.error('[Security] Error in getCurrentUser:', error);
    return null;
  }
}

// Fonction pour détruire la session
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Fonction pour vérifier le rôle
export async function requireRole(...roles: string[]): Promise<User | null> {
  const user = await getCurrentUser();
  
  if (!user || !roles.includes(user.role)) {
    return null;
  }
  
  return user;
}

// Enhanced version that logs failed authorization attempts
export async function requireRoleWithLogging(
  endpoint: string,
  requiredRoles: string[],
  ...roles: string[]
): Promise<User | null> {
  const user = await getCurrentUser();
  
  if (!user || !roles.includes(user.role)) {
    // Log failed authorization
    if (user) {
      const { logFailedAuthorization } = await import('./security-logging');
      logFailedAuthorization(endpoint, requiredRoles, user.role, user.id);
    }
    return null;
  }
  
  return user;
}

// Fonction pour authentifier un utilisateur
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  
  if (!user || !user.password_hash) {
    return null;
  }

  // Check if user account is active
  if (user.status !== 'active') {
    console.log('[v0] Account inactive:', email, 'status:', user.status);
    return null;
  }

  try {
    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  } catch (error) {
    console.error('[v0] Erreur lors de la comparaison du mot de passe:', error);
    return null;
  }
}
