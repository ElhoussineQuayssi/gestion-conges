import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword } from '@/lib/auth';
import { checkEmailExists, createUser, getEmployees, initializeLeaveBalance, logActivity } from '@/lib/db';

export async function GET() {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const employees = await getEmployees();

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération des employés:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const email = (data.email || '').trim().toLowerCase();
    const fullName = (data.full_name || '').trim();
    const password = data.password?.trim();
    const department = data.department?.trim();

    if (!email || !fullName || !password) {
      return NextResponse.json(
        { error: 'Nom, email et mot de passe sont requis' },
        { status: 400 }
      );
    }

    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(password);
    const employeeId = await createUser(email, hashedPassword, fullName, 'employee', department || undefined);
    await initializeLeaveBalance(employeeId);
    await logActivity(user.id, 'created_employee', 'user', employeeId);

    return NextResponse.json({ success: true, employeeId });
  } catch (error) {
    console.error('[v0] Erreur lors de la création d\'un employé:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
