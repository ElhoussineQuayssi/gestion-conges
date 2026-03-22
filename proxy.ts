import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Internal network IP ranges (adjust for your network)
const INTERNAL_IP_RANGES = [
  '10.',      // 10.0.0.0/8
  '192.168.', // 192.168.0.0/16
  '172.16.',  // 172.16.0.0/12 (partial)
  '127.',     // localhost
];

function isInternalNetwork(ip: string | null): boolean {
  if (!ip) return false;
  
  // Allow localhost in development
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return true;
  }
  
  // Check against internal IP ranges
  return INTERNAL_IP_RANGES.some(range => ip.startsWith(range));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token');
  
  // Network restriction check - only allow internal network access
  // Skip for API routes that need external access, static files, and setup page
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.startsWith('/_next') || pathname.startsWith('/favicon');
  const isSetupPage = pathname === '/setup';
  const isCheckInit = pathname === '/api/check-init';
  
  if (!isApiRoute && !isStaticFile && !isSetupPage && !isCheckInit) {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || null;
    
    // Network restriction enabled for production security
    // Blocks all external access - internal network only (RFC 1918)
    if (!isInternalNetwork(clientIp)) {
      console.log('[Security] Blocked external access from:', clientIp);
      return new NextResponse(
        JSON.stringify({ error: 'Accès restreint au réseau interne' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    console.log('[Network] Allowed internal access from:', clientIp);
  }

  // Décodeur de session simplifié pour le middleware
  let userId: number | null = null;
  let userRole: string | null = null;

  if (sessionToken?.value) {
    try {
      const decoded = Buffer.from(sessionToken.value, 'base64').toString('utf-8');
      const [userIdStr] = decoded.split(':');
      userId = parseInt(userIdStr, 10);

      // Récupérer le rôle depuis la base de données
      if (!isNaN(userId)) {
        // Note: En production, utiliser un cache ou une session sécurisée
        // Pour ce prototype, on vérifie simplement si l'utilisateur est connecté
        userRole = 'authenticated'; // Placeholder
      }
    } catch {
      userId = null;
    }
  }

  // Routes protégées par rôle
  const protectedRoutes: Record<string, string[]> = {
    '/dashboard': ['employee', 'hr_admin', 'owner'],
    '/employee': ['employee'],
    '/admin': ['hr_admin', 'owner'],
    '/owner': ['owner']
  };

  // Vérifier l'accès aux routes protégées
  for (const [route, roles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!userId) {
        // Rediriger vers la connexion
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // Note: La vérification complète du rôle se fait côté serveur
      // car le rôle n'est pas accessible dans le middleware sans DB
    }
  }

  // Don't redirect from /login even if logged in - let the page handle it
  // The login page will handle redirects after authentication
  if (pathname === '/login') {
    return NextResponse.next();
  }

  return NextResponse.next();
}