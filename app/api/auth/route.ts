import { NextResponse } from 'next/server';

// Handler for /api/auth - returns API info and redirects to /api/auth/me
export async function GET() {
  return NextResponse.json({
    message: 'Authentication API',
    endpoints: {
      me: '/api/auth/me - Get current user',
      login: '/api/auth/login - Login user',
      logout: '/api/auth/logout - Logout user',
      forceLogout: '/api/auth/force-logout - Force logout (admin)'
    },
    version: 'v1'
  });
}