import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { logActivity, updateUserProfile } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    let data;
    try {
      data = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Requête invalide' },
        { status: 400 }
      );
    }

    const { full_name, email, department } = data;

    if (!full_name || !email) {
      return NextResponse.json(
        { error: 'Le nom complet et l\'email sont requis' },
        { status: 400 }
      );
    }

    const trimmedFullName = full_name.trim();
    const trimmedEmail = email.trim();
    const normalizedDepartment = department === undefined ? undefined : department?.trim() || null;

    const success = await updateUserProfile(user.id, {
      full_name: trimmedFullName,
      email: trimmedEmail,
      department: normalizedDepartment,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Impossible de mettre à jour le profil. L\'email est peut-être déjà utilisé.' },
        { status: 400 }
      );
    }

    await logActivity(user.id, 'updated_profile', 'user', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur mise à jour profil :', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
