import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { getLeaveBalance, adjustLeaveBalance, updateLeaveBalanceFromWorkDays, calculateLeaveFromWorkDays, logActivity } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // Les employés ne peuvent voir que leur propre solde
    if (user.role === 'employee' && userId && parseInt(userId) !== user.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const targetUserId = userId ? parseInt(userId) : user.id;
    const balance = await getLeaveBalance(targetUserId);

    if (!balance) {
      return NextResponse.json(
        { error: 'Solde non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération du solde:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT - Manual balance adjustment by HR admin
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole('hr_admin', 'owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { user_id, annual_leave, used_leave, days_worked, manual_adjustment, reason } = data;

    if (!user_id) {
      return NextResponse.json(
        { error: 'ID utilisateur requis' },
        { status: 400 }
      );
    }

    // If updating days_worked, recalculate leave
    if (days_worked !== undefined) {
      await updateLeaveBalanceFromWorkDays(user_id, days_worked);
      await logActivity(user.id, 'adjust_balance_workdays', 'leave_balance', user_id, 
        `Mise à jour des jours travaillés: ${days_worked} jours`);
    }

    // Manual adjustment
    if (manual_adjustment !== undefined || annual_leave !== undefined || used_leave !== undefined) {
      const success = await adjustLeaveBalance(
        user_id,
        annual_leave,
        used_leave,
        manual_adjustment,
        reason
      );

      if (!success) {
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour du solde' },
          { status: 500 }
        );
      }

      await logActivity(user.id, 'adjust_balance', 'leave_balance', user_id, 
        `Ajustement manuel: ${reason || 'Sans motif'}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur lors de l\'ajustement du solde:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
