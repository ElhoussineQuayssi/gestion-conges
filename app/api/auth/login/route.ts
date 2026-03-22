import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/auth';
import { isRateLimited, getClientIp, getLoginRateLimitKey } from '@/lib/rate-limit';
import { logFailedAuth, logRateLimitExceeded } from '@/lib/security-logging';

const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validation basique
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIp = getClientIp(request);
    const { ipKey, emailKey } = getLoginRateLimitKey(email, clientIp);

    // Check IP-based rate limit (prevent distributed attacks)
    if (isRateLimited(ipKey, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_MS)) {
      console.warn(`[Security] Login rate limit exceeded for IP: ${clientIp}`);
      logRateLimitExceeded(clientIp, '/api/auth/login', email);
      return NextResponse.json(
        { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.' },
        { status: 429 }
      );
    }

    // Check email-based rate limit (prevent targeted attacks)
    if (isRateLimited(emailKey, MAX_LOGIN_ATTEMPTS, RATE_LIMIT_WINDOW_MS)) {
      console.warn(`[Security] Login rate limit exceeded for email: ${email}`);
      logRateLimitExceeded(clientIp, '/api/auth/login', email);
      return NextResponse.json(
        { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.' },
        { status: 429 }
      );
    }

    // Authentifier l'utilisateur
    const user = await authenticateUser(email, password);

    if (!user) {
      // Log failed authentication attempt
      logFailedAuth(email, clientIp, 'invalid credentials');
      
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Login successful - create session
    await createSession(user.id);
    
    // Log successful login
    console.log(`[Auth] Successful login for user: ${user.email} (${user.role})`);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Error] Login error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
