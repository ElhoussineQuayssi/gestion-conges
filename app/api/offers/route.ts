import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { getAllOffers, getActiveOffers, getOfferById, createOffer, updateOffer, deleteOffer, logActivity, autoUpdateOfferStatuses } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const onlyActive = searchParams.get('active') === 'true';
    const offerId = searchParams.get('id');

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Auto-update offer statuses based on participants (only for admin/HR)
    if (user.role === 'hr_admin' || user.role === 'owner') {
      await autoUpdateOfferStatuses();
    }

    // If ID is provided, return single offer
    if (offerId) {
      const offer = await getOfferById(parseInt(offerId));
      if (!offer) {
        return NextResponse.json(
          { error: 'Offre non trouvée' },
          { status: 404 }
        );
      }
      return NextResponse.json({ offer });
    }

    const offers = onlyActive ? await getActiveOffers() : await getAllOffers();

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération des offres:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('hr_admin', 'owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { 
      title, 
      description, 
      destination, 
      start_date, 
      end_date, 
      duration,
      price, 
      max_participants,
      application_deadline,
      hotel_name,
      conditions,
      images
    } = data;

    // Validation
    if (!title || !destination || !start_date || !end_date || !price || !max_participants) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const offerId = await createOffer(
      title,
      description || null,
      destination,
      start_date,
      end_date,
      price,
      max_participants,
      user.id,
      application_deadline || null,
      hotel_name || null,
      conditions || null,
      images || [],
      duration || null
    );

    await logActivity(user.id, 'create_offer', 'offer', offerId, `Création d'offre: ${title}`);

    return NextResponse.json({
      success: true,
      offer_id: offerId
    });
  } catch (error) {
    console.error('[v0] Erreur lors de la création de l\'offre:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

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
    const { 
      id, 
      title, 
      description, 
      destination, 
      start_date, 
      end_date, 
      duration,
      price, 
      max_participants, 
      status,
      application_deadline,
      hotel_name,
      conditions,
      images
    } = data;

    if (!id || !title || !destination || !start_date || !end_date || !price || !max_participants) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const success = await updateOffer(id, {
      title,
      description: description || null,
      destination,
      start_date,
      end_date,
      duration: duration || null,
      price,
      max_participants,
      application_deadline: application_deadline || null,
      hotel_name: hotel_name || null,
      conditions: conditions || null,
      images: images || [],
      status
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Offre non trouvée' },
        { status: 404 }
      );
    }

    await logActivity(user.id, 'update_offer', 'offer', id, `Mise à jour de l'offre: ${title}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur lors de la mise à jour de l\'offre:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireRole('hr_admin', 'owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { id } = data;

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis' },
        { status: 400 }
      );
    }

    const success = await deleteOffer(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Offre non trouvée' },
        { status: 404 }
      );
    }

    await logActivity(user.id, 'delete_offer', 'offer', id, `Suppression de l'offre ID: ${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur lors de la suppression de l\'offre:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
