import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAllSystemSettings, getSystemSetting, updateSystemSetting, logActivity } from '@/lib/db';

// GET - List all settings (Owner only)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const settings = await getAllSystemSettings();

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération des paramètres:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// PUT - Update settings (Owner only)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireRole('owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { key, value, description } = data;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Clé et valeur requis' },
        { status: 400 }
      );
    }

    const success = await updateSystemSetting(key, value, user.id, description);

    if (!success) {
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du paramètre' },
        { status: 500 }
      );
    }

    await logActivity(user.id, 'updated_system_setting', 'system_setting', 0, `${key} = ${value}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur lors de la mise à jour des paramètres:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
