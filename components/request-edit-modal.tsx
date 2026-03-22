'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar, User, MapPin, Clock, AlertCircle } from 'lucide-react';

interface RequestEditModalProps {
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
  } | null;
  onClose: () => void;
  onSave: (requestId: number, updates: any) => void;
  isLoading?: boolean;
}

export function RequestEditModal({
  request,
  onClose,
  onSave,
  isLoading = false
}: RequestEditModalProps) {
  const [formData, setFormData] = useState({
    reason: request?.reason || '',
    start_date: request?.start_date || '',
    end_date: request?.end_date || '',
    status: request?.status || 'pending',
    status_reason: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Sync form state when request prop changes (Bug 4 fix)
  useEffect(() => {
    if (request) {
      setFormData({
        reason: request.reason || '',
        start_date: request.start_date || '',
        end_date: request.end_date || '',
        status: request.status || 'pending',
        status_reason: ''
      });
      setErrors({});
    }
  }, [request]);

  if (!request) return null;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy-MM-dd');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (request.type === 'leave') {
      if (!formData.start_date) {
        newErrors.start_date = 'La date de début est requise';
      }
      if (!formData.end_date) {
        newErrors.end_date = 'La date de fin est requise';
      }
      if (formData.start_date && formData.end_date) {
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        if (start > end) {
          newErrors.end_date = 'La date de fin doit être postérieure à la date de début';
        }
      }
    }

    if (formData.status !== request.status && !formData.status_reason) {
      newErrors.status_reason = 'Un commentaire est requis pour changer le statut';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const updates: any = {};
    
    if (request.type === 'leave') {
      if (formData.start_date !== request.start_date) {
        updates.start_date = formData.start_date;
      }
      if (formData.end_date !== request.end_date) {
        updates.end_date = formData.end_date;
      }
    }

    if (formData.reason !== request.reason) {
      updates.reason = formData.reason;
    }

    if (formData.status !== request.status) {
      updates.status = convertStatusToFrench(formData.status);
      updates.status_reason = formData.status_reason;
      if (!updates.reason && formData.status_reason) {
        updates.reason = formData.status_reason;
      }
    }

    if (Object.keys(updates).length === 0) {
      setErrors({ general: 'Aucune modification détectée' });
      return;
    }

    onSave(request.id, updates);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Acceptée': return 'bg-green-100 text-green-800';
      case 'Refusée': return 'bg-red-100 text-red-800';
      case 'En cours / En attente RH': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Convert English status to French for API
  const convertStatusToFrench = (status: string): string => {
    switch (status) {
      case 'approved': return 'Acceptée';
      case 'rejected': return 'Refusée';
      case 'pending': return 'En cours / En attente RH';
      default: return status;
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[88vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 text-blue-800">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-lg">Modifier la demande</div>
              <div className="text-sm text-muted-foreground">
                ID: #{request.id} • {request.type === 'offer' ? 'Demande d\'offre' : 'Demande de congés'}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations de la demande
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Statut actuel:</span>
            <Badge variant="outline" className={getStatusColor(request.status)}>
              <Clock className="w-4 h-4 mr-1" />
              {request.status === 'Acceptée' ? 'Approuvée' : 
               request.status === 'Refusée' ? 'Rejetée' : 'En attente'}
            </Badge>
          </div>

          {/* Request Type Specific Fields */}
          {request.type === 'leave' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className={errors.start_date ? 'border-red-500' : ''}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-sm">{errors.start_date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className={errors.end_date ? 'border-red-500' : ''}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-sm">{errors.end_date}</p>
                )}
              </div>
            </div>
          )}

          {/* Reason/Comment */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motif / Commentaire</Label>
            <Textarea
              id="reason"
              placeholder="Entrez un motif ou commentaire pour cette demande..."
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              rows={4}
            />
          </div>

          {/* Status Change */}
          <div className="space-y-3">
            <Label>Changer le statut</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['pending', 'approved', 'rejected'] as const).map(status => (
                <Button
                  key={status}
                  variant={formData.status === status ? 'default' : 'outline'}
                  onClick={() => handleInputChange('status', status)}
                  className={`h-9 text-sm ${getStatusColor(status)}`}
                >
                  {status === 'approved' ? 'Approuvée' : 
                   status === 'rejected' ? 'Rejetée' : 'En attente'}
                </Button>
              ))}
            </div>
            
            {formData.status !== request.status && (
              <div className="space-y-2">
                <Label htmlFor="status_reason">Commentaire de changement de statut</Label>
                <Textarea
                  id="status_reason"
                  placeholder="Pourquoi changez-vous le statut de cette demande ?"
                  value={formData.status_reason}
                  onChange={(e) => handleInputChange('status_reason', e.target.value)}
                  className={errors.status_reason ? 'border-red-500' : ''}
                  rows={3}
                />
                {errors.status_reason && (
                  <p className="text-red-500 text-sm">{errors.status_reason}</p>
                )}
              </div>
            )}
          </div>

          {/* Request Information */}
          <div className="space-y-3">
            <h3 className="font-semibold">Informations de la demande</h3>
            <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 md:gap-4 bg-background border rounded-lg">
              <div>
                <label className="text-sm text-muted-foreground">Demandeur</label>
                <div className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {request.full_name}
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <div className="font-medium">{request.email}</div>
              </div>
              {request.type === 'offer' && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground">Offre</label>
                    <div className="font-medium">{request.offer_title}</div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Destination</label>
                    <div className="font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {request.destination}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error Display */}
          {errors.general && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-600 text-sm">{errors.general}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-between w-full pt-4 border-t shrink-0">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={isLoading}
              className="flex-shrink-0 h-9 text-sm px-3"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-shrink-0 h-9 text-sm px-3"
            >
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
