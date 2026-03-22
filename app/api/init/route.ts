import { NextResponse } from 'next/server';
import { ensureDatabaseSeeded } from '@/lib/db/bootstrap';

export async function POST() {
  try {
    console.log('[v0] Initialisation de la base de données...');
    const result = await ensureDatabaseSeeded();

    return NextResponse.json({
      success: result.seededNow,
      message: result.seededNow ? 'Base de donnees initialisee avec succes' : 'Base de donnees deja initialisee',
      users: [
        { email: 'employee@example.com', password: 'Employee123!' },
        { email: 'admin@example.com', password: 'Admin123!' },
        { email: 'owner@example.com', password: 'Owner123!' }
      ]
    });
  } catch (error) {
    console.error('[v0] Erreur lors de l\'initialisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
