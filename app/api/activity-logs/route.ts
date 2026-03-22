import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getDatabase, getAllUsers } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const db = await getDatabase();
    const users = await getAllUsers();
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let logs = db.activity_logs.map(log => ({
      ...log,
      full_name: users.find(u => u.id === log.user_id)?.full_name || 'Utilisateur inconnu',
      user_email: users.find(u => u.id === log.user_id)?.email || ''
    }));

    // Apply filters
    if (userId) {
      logs = logs.filter(log => log.user_id === parseInt(userId));
    }
    
    if (action) {
      logs = logs.filter(log => log.action.includes(action));
    }

    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter(log => new Date(log.created_at) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter(log => new Date(log.created_at) <= end);
    }

    // Sort by date descending (most recent first)
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Get total count before pagination
    const total = logs.length;

    // Apply pagination
    logs = logs.slice(offset, offset + limit);

    // Get unique action types for filter
    const actionTypes = [...new Set(db.activity_logs.map(log => log.action))].sort();

    // Get unique users who have activity
    const activeUsers = users
      .filter(u => db.activity_logs.some(log => log.user_id === u.id))
      .map(u => ({ id: u.id, full_name: u.full_name, email: u.email }));

    return NextResponse.json({ 
      logs,
      total,
      actionTypes,
      activeUsers
    });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération des journaux:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
