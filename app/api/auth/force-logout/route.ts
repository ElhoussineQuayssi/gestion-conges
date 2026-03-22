import { NextResponse } from 'next/server';

export async function GET() {
  // Force clear session cookie regardless of token validity
  const response = NextResponse.json({ 
    success: true, 
    message: 'Session cleared. Please log in again.' 
  });
  
  // Clear the session cookie
  response.cookies.set('session_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0)
  });
  
  return response;
}
