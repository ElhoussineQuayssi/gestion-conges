import { NextResponse } from 'next/server';
import { ensureDatabaseSeeded } from '@/lib/db/bootstrap';

export async function GET() {
  try {
    const result = await ensureDatabaseSeeded();

    return NextResponse.json({
      initialized: true,
      message: result.seededNow ? 'Base de donnees initialisee automatiquement' : 'Base de donnees deja initialisee'
    });
  } catch (error) {
    console.error('[v0] Erreur lors de la vérification/initialisation:', error);
    return NextResponse.json(
      { 
        initialized: false,
        error: 'Erreur lors de l\'initialisation: ' + (error instanceof Error ? error.message : 'Unknown error') 
      },
      { status: 500 }
    );
  }
}
