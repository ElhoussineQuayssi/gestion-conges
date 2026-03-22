import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDatabase, getLeaveBalance, logActivity, createRequest, type RequestStatus, type Request, type Offer } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    
    // Les employés ne peuvent voir que leurs propres demandes
    let userRequests: any[];
    if (user.role === 'employee') {
      if (userId && parseInt(userId) !== user.id) {
        return NextResponse.json(
          { error: 'Non autorisé' },
          { status: 403 }
        );
      }
      const targetUserId = userId ? parseInt(userId) : user.id;
      userRequests = db.requests.filter(r => r.user_id === targetUserId);
    } else {
      // Les administrateurs RH et propriétaires peuvent voir toutes les demandes
      userRequests = db.requests;
    }
    
    // Join with offers and users to get complete request details
    const requests = userRequests.map(request => {
      const offer = db.offers.find(o => o.id === request.offer_id);
      const user = db.users.find(u => u.id === request.user_id);
      return {
        ...request,
        offer_title: offer?.title || null,
        destination: offer?.destination || null,
        full_name: user?.full_name || null,
        email: user?.email || null
      };
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('[v0] Erreur lors de la récupération des demandes:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

type DateRange = {
  start: Date;
  end: Date;
};

const parseISODate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const rangesOverlap = (a: DateRange, b: DateRange) => {
  return a.start <= b.end && b.start <= a.end;
};

const deriveRangeFromRequest = (req: Request, offers: Offer[]): DateRange | null => {
  if (req.type === 'leave') {
    const start = parseISODate(req.start_date);
    const end = parseISODate(req.end_date);
    if (start && end) {
      return { start, end };
    }
    return null;
  }

  if (req.type === 'offer') {
    const selectedStart = parseISODate(req.selected_start_date);
    const selectedEnd = parseISODate(req.selected_end_date);

    if (selectedStart && selectedEnd) {
      return { start: selectedStart, end: selectedEnd };
    }

    const offer = req.offer_id ? offers.find((o) => o.id === req.offer_id) : undefined;
    if (!offer) {
      return null;
    }

    const offerStart = parseISODate(offer.start_date);
    const offerEnd = parseISODate(offer.end_date);

    if (offerStart && offerEnd) {
      return { start: offerStart, end: offerEnd };
    }
  }

  return null;
};

const deriveRangeForPayload = (data: any, offer?: Offer): DateRange | null => {
  if (data.type === 'leave') {
    const start = parseISODate(data.start_date);
    const end = parseISODate(data.end_date);
    if (start && end) {
      return { start, end };
    }
    return null;
  }

  if (data.type === 'offer') {
    const selectedStart = parseISODate(data.selected_start_date);
    const selectedEnd = parseISODate(data.selected_end_date);

    if (selectedStart && selectedEnd) {
      return { start: selectedStart, end: selectedEnd };
    }

    if (!offer) return null;

    const offerStart = parseISODate(offer.start_date);
    const offerEnd = parseISODate(offer.end_date);

    if (offerStart && offerEnd) {
      return { start: offerStart, end: offerEnd };
    }
  }

  return null;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Only employees can submit requests (leave or offer)
    if (user.role !== 'employee') {
      return NextResponse.json(
        { error: 'Accès interdit: uniquement les employés peuvent soumettre des demandes' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const db = await getDatabase();
    let selectedOffer: Offer | null = null;

    // Track auto-rejection reason if business rules fail
    let autoRejectionReason: string | null = null;
    let requestStatus: RequestStatus = 'En cours / En attente RH';

    // Valider le solde de congés si c'est une demande de congé
    if (data.type === 'leave') {
      const balance = await getLeaveBalance(user.id);
      if (!balance) {
        return NextResponse.json(
          { error: 'Solde de congés non trouvé' },
          { status: 400 }
        );
      }

      const days = Math.ceil((new Date(data.end_date).getTime() - new Date(data.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (days > balance.remaining_leave) {
        // Create request with auto_rejected status instead of rejecting
        autoRejectionReason = `Solde insuffisant. Disponible: ${balance.remaining_leave} jours, Demandé: ${days} jours`;
        requestStatus = 'Refus automatique';
      }

      // Check for duplicate pending leave requests
      if (requestStatus !== 'Refus automatique') {
        const existingLeave = db.requests.find(r => 
          r.user_id === user.id && 
          r.type === 'leave' && 
          r.status === 'En cours / En attente RH'
        );

        if (existingLeave) {
          autoRejectionReason = 'Vous avez déjà une demande de congé en attente';
          requestStatus = 'Refus automatique';
        }
      }
    }

    // Valider les places disponibles si c'est une offre
    if (data.type === 'offer' && data.offer_id) {
      const offer = db.offers.find(o => o.id === data.offer_id);
      selectedOffer = offer || null;
      
      if (!offer) {
        return NextResponse.json(
          { error: 'Offre non trouvée' },
          { status: 404 }
        );
      }

      const now = new Date();

      if (offer.status !== 'Disponible') {
        autoRejectionReason = `Offre indisponible (statut: ${offer.status})`;
        requestStatus = 'Refus automatique';
      } else if (offer.application_deadline && new Date(offer.application_deadline) < now) {
        autoRejectionReason = 'Offre expirée (date limite dépassée)';
        requestStatus = 'Refus automatique';
      } else if (offer.current_participants >= offer.max_participants) {
        // Create request with auto_rejected status instead of rejecting
        autoRejectionReason = 'Offre complète';
        requestStatus = 'Refus automatique';
      }

      // Validate selected dates if provided (for offer date selection)
      if (requestStatus !== 'Refus automatique' && data.selected_start_date && data.selected_end_date) {
        const selectedStart = new Date(data.selected_start_date);
        const selectedEnd = new Date(data.selected_end_date);
        const offerStart = new Date(offer.start_date);
        const offerEnd = new Date(offer.end_date);
        
        // Validate selected range is within offer window
        if (selectedStart < offerStart || selectedEnd > offerEnd) {
          autoRejectionReason = 'Dates sélectionnées hors de la période de l\'offre';
          requestStatus = 'Refus automatique';
        }
        
        // Validate duration against balance
        if (requestStatus !== 'Refus automatique') {
          const selectedDays = Math.ceil(
            (selectedEnd.getTime() - selectedStart.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;
          
          const balance = await getLeaveBalance(user.id);
          if (balance && selectedDays > balance.remaining_leave) {
            autoRejectionReason = `Solde insuffisant pour la durée sélectionnée. Disponible: ${balance.remaining_leave} jours, Sélectionné: ${selectedDays} jours`;
            requestStatus = 'Refus automatique';
          }
        }
      }

      // Vérifier si l'utilisateur a déjà postulé
      const existing = db.requests.find(r => 
        r.user_id === user.id && 
        r.offer_id === data.offer_id && 
        r.status !== 'Refusée' &&
        r.status !== 'Refus automatique'
      );

      if (existing) {
        return NextResponse.json(
          { error: 'Vous avez déjà postulé à cette offre' },
          { status: 409 }
        );
      }
    }

    const newRequestRange = deriveRangeForPayload(data, selectedOffer ?? undefined);

    if (newRequestRange) {
      const conflict = db.requests.find((existingRequest) => {
        if (existingRequest.user_id !== user.id) {
          return false;
        }

        if (existingRequest.status !== 'En cours / En attente RH' && existingRequest.status !== 'Acceptée') {
          return false;
        }

        const existingRange = deriveRangeFromRequest(existingRequest, db.offers);
        return existingRange ? rangesOverlap(existingRange, newRequestRange) : false;
      });

      if (conflict) {
        return NextResponse.json(
          { error: 'Un autre congé ou une autre offre couvre déjà cette période' },
          { status: 409 }
        );
      }
    }

    // Create the request using the database functions
    const requestId = await createRequest(
      user.id,
      data.type,
      data.offer_id,
      data.start_date,
      data.end_date,
      data.reason,
      requestStatus,
      autoRejectionReason || undefined,
      data.selected_start_date,
      data.selected_end_date
    );

    await logActivity(user.id, `created_${data.type}_request`, 'request', requestId);

    // Log auto-rejection if applicable
    if (requestStatus === 'Refus automatique' && autoRejectionReason) {
      await logActivity(user.id, 'auto_rejected_request', 'request', requestId, autoRejectionReason);
    }

    // Return appropriate response based on status
    if (requestStatus === 'Refus automatique') {
      return NextResponse.json({
        success: true,
        requestId,
        autoRejected: true,
        message: autoRejectionReason || 'Demande refusée automatiquement'
      });
    }

    return NextResponse.json({
      success: true,
      requestId
    });
  } catch (error) {
    console.error('[v0] Erreur lors de la création de la demande:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
