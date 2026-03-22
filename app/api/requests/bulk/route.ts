import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { getDatabase, logActivity, getRequestById, updateRequest, updateOfferParticipants, updateLeaveBalanceUsage } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('hr_admin', 'owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { requestIds, action, reason } = body;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucun ID de demande fourni' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide' },
        { status: 400 }
      );
    }

    // Reason is required for rejection
    if (action === 'reject' && (!reason || !reason.trim())) {
      return NextResponse.json(
        { error: 'Un motif est requis pour le rejet' },
        { status: 400 }
      );
    }

    const status = action === 'approve' ? 'Acceptée' : 'Refusée';
    const db = await getDatabase();
    
    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[]
    };

    for (const requestId of requestIds) {
      try {
        const req = await getRequestById(requestId);
        
        if (!req) {
          results.failed.push({ id: requestId, error: 'Demande non trouvée' });
          continue;
        }

        // Only process pending requests for bulk actions
        if (req.status !== 'En cours / En attente RH') {
          results.failed.push({ id: requestId, error: `Statut actuel: ${req.status}` });
          continue;
        }

        const updateSuccess = await updateRequest(requestId, status, user.id, reason);
        
        if (!updateSuccess) {
          results.failed.push({ id: requestId, error: 'Erreur de mise à jour' });
          continue;
        }

        // If approved, update offer participants or leave balance
        if (status === 'Acceptée') {
          // For offer requests - check availability first
          if (req.offer_id) {
            const offer = db.offers.find(o => o.id === req.offer_id);
            if (!offer) {
              results.failed.push({ id: requestId, error: 'L\'offre n\'existe plus' });
              continue;
            }
            if (offer.status !== 'Disponible') {
              results.failed.push({ id: requestId, error: 'L\'offre n\'est plus disponible' });
              continue;
            }
            const now = new Date();
            if (offer.application_deadline && new Date(offer.application_deadline) < now) {
              results.failed.push({ id: requestId, error: 'La date limite de candidature a expiré' });
              continue;
            }
            if (offer.current_participants >= offer.max_participants) {
              results.failed.push({ id: requestId, error: 'L\'offre est complète' });
              continue;
            }
            await updateOfferParticipants(req.offer_id);
          }
          
          // For leave requests - check balance first
          if (req.type === 'leave') {
            // Use selected dates if available, otherwise fall back to start_date/end_date
            const startDate = req.selected_start_date || req.start_date;
            const endDate = req.selected_end_date || req.end_date;
            
            if (!startDate || !endDate) {
              results.failed.push({ id: requestId, error: 'Les dates de début et de fin sont requises' });
              continue;
            }
            
            // Filter by current year to get correct balance
            const currentYear = new Date().getFullYear();
            const balance = db.leave_balances.find(lb => lb.user_id === req.user_id && lb.year === currentYear);
            if (!balance) {
              results.failed.push({ id: requestId, error: 'Aucun solde de congés trouvé pour l\'année en cours' });
              continue;
            }
            const days = Math.ceil(
              (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;
            if (days > balance.remaining_leave) {
              results.failed.push({ id: requestId, error: `Solde insuffisant. Disponible: ${balance.remaining_leave} jour(s), demandé: ${days} jour(s)` });
              continue;
            }
            await updateLeaveBalanceUsage(req.user_id, days);
          }
        }

        await logActivity(user.id, `${status}_request`, 'request', requestId, reason);
        results.success.push(requestId);
      } catch (error) {
        results.failed.push({ id: requestId, error: 'Erreur interne' });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: requestIds.length,
        processed: results.success.length,
        failed: results.failed.length
      }
    });
  } catch (error) {
    console.error('[v0] Erreur lors de l\'opération en masse:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// Export requests to CSV
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole('hr_admin', 'owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format');
    const searchRaw = (searchParams.get('search') || '').trim();
    const searchLower = searchRaw.toLowerCase();
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');
    const startDateFilter = searchParams.get('startDate');
    const endDateFilter = searchParams.get('endDate');

    const db = await getDatabase();
    
    // Get all requests with user and offer details
    const requests = db.requests.map(request => {
      const offer = db.offers.find(o => o.id === request.offer_id);
      const dbUser = db.users.find(u => u.id === request.user_id);
      return {
        ...request,
        offer_title: offer?.title || null,
        destination: offer?.destination || null,
        full_name: dbUser?.full_name || null,
        email: dbUser?.email || null
      };
    });

    // Apply same filters as front-end before exporting
    const filteredRequests = requests.filter(req => {
      if (statusFilter && statusFilter !== 'all' && req.status !== statusFilter) {
        return false;
      }

      if (typeFilter && typeFilter !== 'all' && req.type !== typeFilter) {
        return false;
      }

      if (searchLower) {
        const matchesName = req.full_name ? req.full_name.toLowerCase().includes(searchLower) : false;
        const matchesEmail = req.email ? req.email.toLowerCase().includes(searchLower) : false;
        const matchesId = searchRaw && req.id.toString() === searchRaw;
        if (!matchesName && !matchesEmail && !matchesId) {
          return false;
        }
      }

      if (startDateFilter || endDateFilter) {
        const requestDate = new Date(req.created_at);
        if (startDateFilter && requestDate < new Date(startDateFilter)) {
          return false;
        }
        if (endDateFilter && requestDate > new Date(`${endDateFilter}T23:59:59`)) {
          return false;
        }
      }

      return true;
    });

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID',
        'Employé',
        'Email',
        'Type',
        'Statut',
        'Titre offre',
        'Destination',
        'Date début',
        'Date fin',
        'Motif',
        'Date création',
        'Approuvé par',
        'Date approbation',
        'Commentaire'
      ];

      const rows = filteredRequests.map(r => [
        r.id,
        r.full_name || '',
        r.email || '',
        r.type === 'offer' ? 'Offre' : 'Congé',
        r.status === 'Acceptée' ? 'Approuvée' : r.status === 'Refusée' ? 'Rejetée' : 'En attente',
        r.offer_title || '',
        r.destination || '',
        r.start_date || '',
        r.end_date || '',
        r.reason || '',
        r.created_at,
        r.approved_by || '',
        r.approval_date || '',
        r.approval_reason || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="requests-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json({ requests: filteredRequests });
  } catch (error) {
    console.error('[v0] Erreur lors de l\'export des demandes:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
