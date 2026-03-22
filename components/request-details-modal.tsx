'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar, User, Mail, MapPin, DollarSign, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { REFUSAL_REASONS } from '@/lib/refusal-reasons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface RequestDetailsModalProps {
  request: {
    id: number;
    user_id: number;
    offer_id: number | null;
    type: 'offer' | 'leave';
    start_date: string | null;
    end_date: string | null;
    reason: string | null;
    status: 'En cours / En attente RH' | 'Acceptée' | 'Refusée' | 'Refus automatique';
    full_name: string;
    email: string;
    offer_title?: string;
    destination?: string;
    created_at: string;
    approved_by?: number | null;
    approval_date?: string | null;
    approval_reason?: string | null;
    auto_rejection_reason?: string | null;
  } | null;
  onClose: () => void;
  onEdit?: (request: any) => void;
  onApprove?: (requestId: number, reason?: string) => Promise<{ success: boolean; error?: string }>;
  onReject?: (requestId: number, reason?: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
}

export function RequestDetailsModal({
  request,
  onClose,
  onEdit,
  onApprove,
  onReject,
  isLoading = false
}: RequestDetailsModalProps) {
  if (!request) return null;

  const { toast } = useToast();

  // Local state for action in progress (separate from isLoading to handle modal-specific loading)
  const [actionInProgress, setActionInProgress] = useState<'approve' | 'reject' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset internal states when request changes to prevent state contamination
  useEffect(() => {
    if (request) {
      setActionError(null);
      setActionInProgress(null);
    }
  }, [request?.id]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Acceptée': return 'bg-green-100 text-green-800';
      case 'Refusée': return 'bg-red-100 text-red-800';
      case 'Refus automatique': return 'bg-orange-100 text-orange-800';
      case 'En cours / En attente RH': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Acceptée': return <CheckCircle className="w-4 h-4" />;
      case 'Refusée': return <XCircle className="w-4 h-4" />;
      case 'Refus automatique': return <XCircle className="w-4 h-4" />;
      case 'En cours / En attente RH': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  // State for rejection reason modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRefusalReason, setSelectedRefusalReason] = useState<string>('');
  const [customRefusalReason, setCustomRefusalReason] = useState('');

  // State for approval reason modal (optional)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveReason, setApproveReason] = useState('');

  // Check if "other" reason is selected
  const isOtherReason = selectedRefusalReason === 'other';

  // Get the final rejection reason (combines standardized + custom if "other")
  const getFinalRejectReason = () => {
    if (isOtherReason && customRefusalReason.trim()) {
      return customRefusalReason.trim();
    }
    if (selectedRefusalReason) {
      const reason = REFUSAL_REASONS.find(r => r.value === selectedRefusalReason);
      return reason?.label || rejectReason;
    }
    return rejectReason;
  };

  const handleRejectClick = () => {
    setRejectReason('');
    setSelectedRefusalReason('');
    setCustomRefusalReason('');
    setActionError(null);
    setShowRejectModal(true);
  };

  const handleApproveClick = () => {
    setApproveReason('');
    setActionError(null);
    setShowApproveModal(true);
  };

  const handleConfirmApprove = async () => {
    if (!onApprove) return;
    
    setActionInProgress('approve');
    setActionError(null);
    setShowApproveModal(false);
    
    try {
      const result = await onApprove(request.id, approveReason || undefined);
      if (result.success) {
        // Modal will close from parent after success
      } else {
        setActionError(result.error || 'Erreur lors de l\'approbation de la demande');
        setActionInProgress(null);
      }
    } catch (error) {
      setActionError('Erreur réseau lors de l\'approbation');
      setActionInProgress(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!onReject) return;
    
    const finalReason = getFinalRejectReason();
    if (!finalReason.trim()) {
      setActionError('Veuillez sélectionner ou saisir un motif de refus');
      return;
    }
    setActionInProgress('reject');
    setActionError(null);
    setShowRejectModal(false);
    
    try {
      const result = await onReject(request.id, finalReason);
      if (result.success) {
        // Modal will close from parent after success
      } else {
        setActionError(result.error || 'Erreur lors du rejet de la demande');
        setActionInProgress(null);
      }
    } catch (error) {
      setActionError('Erreur réseau lors du rejet');
      setActionInProgress(null);
    }
  };

  // Note: handleConfirmApprove is defined above with handleApproveClick

  return (
    <Dialog open={!!request} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${getStatusColor(request.status)}`}>
              {getStatusIcon(request.status)}
            </div>
            <div>
              <div className="font-bold text-lg">
                {request.type === 'offer' ? 'Demande d\'offre' : 'Demande de congés'}
              </div>
              <div className="text-sm text-muted-foreground">
                ID: #{request.id} • Créée le {formatDate(request.created_at)}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Détails complets de la demande
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* User Information */}
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 md:gap-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{request.full_name}</div>
                <div className="text-sm text-muted-foreground">{request.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={getStatusColor(request.status)}>
                {getStatusIcon(request.status)}
                <span className="ml-1">
                  {request.status === 'Acceptée' && 'Approuvée'}
                  {request.status === 'Refusée' && 'Rejetée'}
                  {request.status === 'Refus automatique' && 'Refus automatique'}
                  {request.status === 'En cours / En attente RH' && 'En attente'}
                </span>
              </Badge>
            </div>
          </div>

          {/* Request Type Specific Details */}
          {request.type === 'offer' ? (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Détails de l'offre
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Offre</label>
                  <div className="font-medium">{request.offer_title}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Destination</label>
                  <div className="font-medium">{request.destination}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Période de congés
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Date de début</label>
                  <div className="font-medium">{request.start_date ? formatDate(request.start_date) : 'Non spécifiée'}</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Date de fin</label>
                  <div className="font-medium">{request.end_date ? formatDate(request.end_date) : 'Non spécifiée'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          {request.reason && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Motif / Commentaire
              </h3>
              <div className="p-4 bg-background border rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
              </div>
            </div>
          )}

          {/* Approval History */}
          {(request.approval_date || request.approval_reason) && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Historique de validation
              </h3>
              <div className="p-4 bg-background border rounded-lg space-y-2">
                {request.approval_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Validée le:</span>
                    <span>{formatDate(request.approval_date)}</span>
                  </div>
                )}
                {request.approval_reason && (
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Commentaire:</span>
                    <span>{request.approval_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {actionError}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={actionInProgress !== null}>
              Fermer
            </Button>
            
            {/* Edit button - available for all request statuses */}
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(request)} disabled={actionInProgress !== null}>
                Modifier
              </Button>
            )}

            {/* Quick action buttons for pending requests only */}
            {request.status === 'En cours / En attente RH' && (
              <>
                {onReject && (
                  <Button
                    variant="destructive"
                    onClick={handleRejectClick}
                    disabled={isLoading || actionInProgress !== null}
                  >
                    {actionInProgress === 'reject' ? 'Rejet en cours...' : 'Rejeter'}
                  </Button>
                )}
                {onApprove && (
                  <Button
                    onClick={handleApproveClick}
                    disabled={isLoading || actionInProgress !== null}
                  >
                    {actionInProgress === 'approve' ? 'Approbation en cours...' : 'Approuver'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Rejeter la demande
            </DialogTitle>
            <DialogDescription>
              Veuillez fournir un motif pour le rejet de cette demande. Ce motif sera visible par l'employé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Standardized Reason Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motif du refus <span className="text-destructive">*</span>
              </label>
              <Select
                value={selectedRefusalReason}
                onValueChange={(value) => {
                  setSelectedRefusalReason(value);
                  const reason = REFUSAL_REASONS.find(r => r.value === value);
                  setRejectReason(reason?.label || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un motif standardisé" />
                </SelectTrigger>
                <SelectContent>
                  {REFUSAL_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      <div className="flex flex-col">
                        <span>{reason.label}</span>
                        <span className="text-xs text-muted-foreground">{reason.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason Text Area (shown when "Autre" is selected) */}
            {isOtherReason && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Précisez le motif <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={customRefusalReason}
                  onChange={(e) => setCustomRefusalReason(e.target.value)}
                  placeholder="Expliquez en détail pourquoi cette demande est refusée..."
                  className="w-full px-3 py-2 border rounded-md text-sm min-h-[100px]"
                  required
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmReject}
                disabled={!getFinalRejectReason().trim() || isLoading}
              >
                Confirmer le refus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Reason Dialog (Optional) */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Approuver la demande
            </DialogTitle>
            <DialogDescription>
              Vous pouvez ajouter un commentaire pour l'approbation de cette demande (optionnel). Ce commentaire sera visible par l'employé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Commentaire d'approbation <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                value={approveReason}
                onChange={(e) => setApproveReason(e.target.value)}
                placeholder="Félicitations ! Votre demande a été acceptée..."
                className="w-full px-3 py-2 border rounded-md text-sm min-h-[100px]"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowApproveModal(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleConfirmApprove}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                Confirmer l'approbation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
