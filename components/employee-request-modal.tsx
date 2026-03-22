'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar, MapPin, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

interface EmployeeRequestModalProps {
  request: {
    id: number;
    type: 'offer' | 'leave';
    start_date: string | null;
    end_date: string | null;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'auto_rejected';
    offer_title?: string;
    destination?: string;
    hotel_name?: string;
    start_date_offer?: string;
    end_date_offer?: string;
    price?: number;
    created_at: string;
    approval_date?: string | null;
    approval_reason?: string | null;
    auto_rejection_reason?: string | null;
  } | null;
  open: boolean;
  onClose: () => void;
}

export function EmployeeRequestModal({
  request,
  open,
  onClose
}: EmployeeRequestModalProps) {
  if (!request) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Acceptée': return 'bg-green-100 text-green-800 border-green-200';
      case 'Refusée': return 'bg-red-100 text-red-800 border-red-200';
      case 'Refus automatique': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Acceptée': return 'Acceptée';
      case 'Refusée': return 'Refusée';
      case 'Refus automatique': return 'Refus automatique';
      default: return 'En cours / En attente RH';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Acceptée': return <CheckCircle className="w-4 h-4" />;
      case 'Refusée': 
      case 'Refus automatique': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Détails de la demande</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Type & Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={
                request.type === 'offer' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }>
                {request.type === 'offer' ? 'Offre' : 'Congés'}
              </Badge>
            </div>
            <Badge variant="outline" className={getStatusColor(request.status)}>
              <span className="flex items-center gap-1">
                {getStatusIcon(request.status)}
                {getStatusLabel(request.status)}
              </span>
            </Badge>
          </div>

          {/* Offer Details */}
          {request.type === 'offer' && (
            <>
              {request.offer_title && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{request.offer_title}</h3>
                  {request.destination && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{request.destination}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Période</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {request.start_date_offer ? formatDate(request.start_date_offer) : '-'} - {request.end_date_offer ? formatDate(request.end_date_offer) : '-'}
                    </span>
                  </div>
                </div>
                {request.price !== undefined && (
                  <div>
                    <div className="text-xs text-muted-foreground">Prix</div>
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{request.price} €</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Leave Details */}
          {request.type === 'leave' && (
            <div className="space-y-2">
              <h3 className="font-semibold">Demande de congés</h3>
              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {request.start_date ? formatDate(request.start_date) : '-'} - {request.end_date ? formatDate(request.end_date) : '-'}
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          {request.reason && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Motif</h3>
              <div className="p-4 bg-background border rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
              </div>
            </div>
          )}

          {/* Submission Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Soumise le {formatDate(request.created_at)}</span>
          </div>

          {/* Approval History */}
          {(request.approval_date || request.approval_reason) && (
            <div className="space-y-2 p-4 border rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Historique de validation
              </h3>
              {request.approval_date && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Validée le:</span>
                  <span>{formatDate(request.approval_date)}</span>
                </div>
              )}
              {request.approval_reason && (
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">Commentaire:</span>
                  <span>{request.approval_reason}</span>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
