import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole } from '@/lib/auth';
import { getDatabase, logActivity, getRequestById, updateRequest, updateRequestDetails, approveRequestAndApply, reverseApprovalChanges, deleteRequest } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('hr_admin', 'owner');

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reason, start_date, end_date, status_reason } = body;

    const requestId = parseInt(id);
    
    // Get the current request
    const req = await getRequestById(requestId);

    if (!req) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Case 1: Editing request details (dates, reason) without status change
    if (!status && (start_date !== undefined || end_date !== undefined || reason !== undefined)) {
      const details: { start_date?: string; end_date?: string; reason?: string } = {};
      
      if (start_date !== undefined) {
        details.start_date = start_date;
      }
      if (end_date !== undefined) {
        details.end_date = end_date;
      }
      if (reason !== undefined) {
        details.reason = reason;
      }

      const updateSuccess = await updateRequestDetails(requestId, details);

      if (!updateSuccess) {
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour des détails' },
          { status: 500 }
        );
      }

      logActivity(user.id, 'edit_request', 'request', requestId, 'Détails de la demande modifiés');

      return NextResponse.json({ success: true });
    }

    // Case 2: Status change (approve/reject)
    if (status) {
      // Validation: reason is required for rejection
      if (status === 'Refusée' && (!reason || !reason.trim())) {
        return NextResponse.json(
          { error: 'Un motif est requis pour le rejet' },
          { status: 400 }
        );
      }

      if (!['Acceptée', 'Refusée', 'En cours / En attente RH'].includes(status)) {
        return NextResponse.json(
          { error: 'Statut invalide' },
          { status: 400 }
        );
      }

      // First update any details if provided
      if (start_date !== undefined || end_date !== undefined || reason !== undefined) {
        const details: { start_date?: string; end_date?: string; reason?: string } = {};
        
        if (start_date !== undefined) {
          details.start_date = start_date;
        }
        if (end_date !== undefined) {
          details.end_date = end_date;
        }
        if (reason !== undefined) {
          details.reason = reason;
        }
        
        await updateRequestDetails(requestId, details);
      }

      let updateSuccess = false;

      if (status === 'Acceptée') {
        // Atomic update for approval + dependent updates
        const result = await approveRequestAndApply(requestId, user.id);
        updateSuccess = result.success;
        if (!result.success && result.error) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          );
        }
      } else {
        // For rejection or reset to pending, reverse any previous approval changes
        if (req.status === 'Acceptée') {
          await reverseApprovalChanges(requestId, user.id);
        }
        updateSuccess = await updateRequest(requestId, status, user.id, reason || status_reason);
      }

      if (!updateSuccess) {
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la demande' },
          { status: 500 }
        );
      }

      logActivity(user.id, `${status}_request`, 'request', requestId, reason || status_reason);

      return NextResponse.json({ success: true });
    }

    // No valid operation
    return NextResponse.json(
      { error: 'Aucune modification détectée' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[v0] Erreur lors de la mise à jour de la demande:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Employee cancels their own pending request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const requestId = parseInt(id);
    
    // Get the request to check ownership
    const req = await getRequestById(requestId);

    if (!req) {
      return NextResponse.json(
        { error: 'Demande non trouvée' },
        { status: 404 }
      );
    }

    // Only the request owner can delete their request
    if (req.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Non autorisé à supprimer cette demande' },
        { status: 403 }
      );
    }

    // Only pending requests can be deleted
    if (req.status !== 'En cours / En attente RH') {
      return NextResponse.json(
        { error: 'Seules les demandes en attente peuvent être annulées' },
        { status: 400 }
      );
    }

    const deleteSuccess = await deleteRequest(requestId);

    if (!deleteSuccess) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'annulation de la demande' },
        { status: 500 }
      );
    }

    logActivity(user.id, 'cancel_request', 'request', requestId, 'Demande annulée par l\'employé');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Erreur lors de l\'annulation de la demande:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
