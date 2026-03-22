import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { deleteEmployee, findUserByEmail, logActivity, setEmployeeStatus, updateEmployee } from '@/lib/db';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const employeeId = parseInt(resolvedParams.id, 10);
    if (Number.isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const fullName = (data.full_name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const password = data.password?.trim();
    const department = data.department?.trim();

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Nom et email sont requis' },
        { status: 400 }
      );
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser && existingUser.id !== employeeId) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    const success = await updateEmployee(employeeId, {
      full_name: fullName,
      email,
      department: department || null,
      password: password || undefined,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Employé non trouvé' },
        { status: 404 }
      );
    }

    await logActivity(user.id, 'updated_employee', 'user', employeeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur lors de la mise à jour d\'un employé:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const employeeId = parseInt(resolvedParams.id, 10);
    if (Number.isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    const success = await deleteEmployee(employeeId);

    if (!success) {
      return NextResponse.json(
        { error: 'Employé introuvable' },
        { status: 404 }
      );
    }

    await logActivity(user.id, 'deleted_employee', 'user', employeeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur lors de la suppression d\'un employé:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const employeeId = parseInt(resolvedParams.id, 10);
    if (Number.isNaN(employeeId)) {
      return NextResponse.json(
        { error: 'Identifiant invalide' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const status = data?.status;
    console.log('[PATCH /owner/employees/:id] Received request to set status to:', status, 'for employee:', employeeId);

    if (!['active', 'inactive'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const success = await setEmployeeStatus(employeeId, status, user.id);
    console.log('[PATCH /owner/employees/:id] setEmployeeStatus result:', success);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Employé introuvable' },
        { status: 404 }
      );
    }

    await logActivity(user.id, status === 'active' ? 'reactivated_employee' : 'deactivated_employee', 'user', employeeId);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('[v0] Erreur lors de la mise à jour du statut d\'un employé:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
