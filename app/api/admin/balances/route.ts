import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAllUsers, getLeaveBalance } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('hr_admin', 'owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const users = await getAllUsers();
    const employees = users.filter(u => u.role === 'employee');

    // Get balances for all employees
    const balances = await Promise.all(
      employees.map(async (employee) => {
        const balance = await getLeaveBalance(employee.id);
        return {
          id: employee.id,
          full_name: employee.full_name,
          email: employee.email,
          department: employee.department,
          annual_leave: balance?.annual_leave || 0,
          used_leave: balance?.used_leave || 0,
          remaining_leave: balance?.remaining_leave || 0,
          days_worked: balance?.days_worked || 0,
          calculated_leave: balance?.calculated_leave || 0,
          manual_adjustment: balance?.manual_adjustment || 0,
          adjustment_reason: balance?.adjustment_reason || null
        };
      })
    );

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération des soldes:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
