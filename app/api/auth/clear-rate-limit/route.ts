import { NextRequest, NextResponse } from 'next/server';
import { clearAllRateLimits } from '@/lib/rate-limit';

export async function POST() {
  try {
    // Clear all rate limits - useful for testing or after rate limit lockout
    clearAllRateLimits();
    
    console.log('[Auth] All rate limits cleared');
    
    return NextResponse.json({
      success: true,
      message: 'Rate limits cleared successfully'
    });
  } catch (error) {
    console.error('[Error] Failed to clear rate limits:', error);
    return NextResponse.json(
      { error: 'Failed to clear rate limits' },
      { status: 500 }
    );
  }
}
