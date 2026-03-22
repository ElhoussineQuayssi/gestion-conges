import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, hashPassword } from '@/lib/auth';
import { getDatabase, logActivity, getHrAdmins, checkEmailExists, createHrAdmin, updateHrAdmin, deleteHrAdmin, deactivateHrAdmin, reactivateHrAdmin } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const admins = await getHrAdmins();

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération des admins:', error);
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

    // Validation
    if (!data.email || !data.full_name || !data.password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const emailExists = await checkEmailExists(data.email);
    if (emailExists) {
      return NextResponse.json(
        { error: 'Cet email existe déjà' },
        { status: 400 }
      );
    }

    // Créer l'administrateur
    const adminId = await createHrAdmin(
      data.email,
      hashPassword(data.password),
      data.full_name,
      data.department
    );

    await logActivity(user.id, 'created_hr_admin', 'user', adminId);

    return NextResponse.json({
      success: true,
      adminId
    });
  } catch (error) {
    console.error('[v0] Erreur lors de la création de l\'admin:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole('owner');
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const data = await request.json();
    const { id, full_name, email, department, password } = data;

    if (!id || !full_name || !email) {
      return NextResponse.json({ error: 'ID, nom et email requis' }, { status: 400 });
    }

    const success = await updateHrAdmin(id, { full_name, email, department, password });
    if (!success) {
      return NextResponse.json({ error: 'Admin non trouvé ou erreur mise à jour' }, { status: 400 });
    }

    await logActivity(user.id, 'updated_hr_admin', 'user', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur mise à jour admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole('owner');
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const data = await request.json();
    const { id } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const success = await deleteHrAdmin(id);
    if (!success) {
      return NextResponse.json({ error: 'Admin non trouvé' }, { status: 404 });
    }

    await logActivity(user.id, 'deleted_hr_admin', 'user', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur suppression admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH for deactivate/reactivate admin accounts
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireRole('owner');
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const data = await request.json();
    const { id, action } = data;

    if (!id || !action) {
      return NextResponse.json({ error: 'ID et action requis' }, { status: 400 });
    }

    let success = false;
    if (action === 'deactivate') {
      success = await deactivateHrAdmin(id, user.id);
      if (success) {
        await logActivity(user.id, 'deactivated_hr_admin', 'user', id);
      }
    } else if (action === 'reactivate') {
      success = await reactivateHrAdmin(id, user.id);
      if (success) {
        await logActivity(user.id, 'reactivated_hr_admin', 'user', id);
      }
    } else {
      return NextResponse.json({ error: 'Action invalide. Utilisez: deactivate ou reactivate' }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: 'Admin non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur activation/desactivation admin:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
