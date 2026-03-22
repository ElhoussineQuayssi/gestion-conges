import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDatabase, getAllOffers, getAllUsers, getPendingRequests, getUserRequests, getLeaveBalance } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const users = await getAllUsers();
    const offers = await getAllOffers();
    const requests = db.requests;

    const sortByDate = (items: typeof requests) =>
      [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const buildRequestSummary = (request: typeof requests[number]) => {
      const author = users.find(u => u.id === request.user_id);
      const offer = request.offer_id ? offers.find(o => o.id === request.offer_id) : null;
      return {
        id: request.id,
        full_name: author?.full_name || 'Utilisateur',
        type: request.type,
        status: request.status,
        offer_title: offer?.title || null,
        created_at: request.created_at
      };
    };

    const stats: any = {};

    if (user.role === 'employee') {
      // Employee stats
      const userRequests = requests.filter(r => r.user_id === user.id);
      const leaveBalance = await getLeaveBalance(user.id);

      stats.myPendingRequests = userRequests.filter(r => r.status === 'En cours / En attente RH').length;
      stats.myApprovedRequests = userRequests.filter(r => r.status === 'Acceptée').length;
      stats.myRejectedRequests = userRequests.filter(r => r.status === 'Refusée' || r.status === 'Refus automatique').length;
      stats.leaveBalance = leaveBalance;
      stats.recentRequests = sortByDate(userRequests).slice(0, 3).map(buildRequestSummary);
    } else if (user.role === 'hr_admin') {
      // HR Admin stats
      stats.totalOffers = offers.length;
      stats.pendingRequests = requests.filter(r => r.status === 'En cours / En attente RH').length;
      stats.approvedRequests = requests.filter(r => r.status === 'Acceptée').length;
      stats.rejectedRequests = requests.filter(r => r.status === 'Refusée').length;
      stats.recentRequests = sortByDate(requests).slice(0, 5).map(buildRequestSummary);
    } else if (user.role === 'owner') {
      // Owner stats
      stats.totalEmployees = users.filter(u => u.role === 'employee').length;
      stats.totalAdmins = users.filter(u => u.role === 'hr_admin').length;
      stats.totalOffers = offers.length;
      stats.pendingRequests = requests.filter(r => r.status === 'En cours / En attente RH').length;
      stats.recentRequests = sortByDate(requests).slice(0, 5).map(buildRequestSummary);
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
