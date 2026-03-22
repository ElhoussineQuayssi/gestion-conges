'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface RequestBulkActionsProps {
  selectedRequests: number[];
  onSelectionChange: (ids: number[]) => void;
  onBulkApprove: (reason?: string) => void;
  onBulkReject: (reason?: string) => void;
  onExport: () => void;
  isLoading?: boolean;
  totalRequests: number;
  pendingRequests: number;
}

export function RequestBulkActions({
  selectedRequests,
  onSelectionChange,
  onBulkApprove,
  onBulkReject,
  onExport,
  isLoading = false,
  totalRequests,
  pendingRequests
}: RequestBulkActionsProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [bulkReason, setBulkReason] = useState('');

  // Track if all pending are selected
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    // Update selectAll state based on selection
    if (pendingRequests > 0 && selectedRequests.length === pendingRequests) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedRequests, pendingRequests]);

  const handleSelectAll = () => {
    if (selectAll) {
      onSelectionChange([]);
    } else {
      // This will be handled by parent - pass empty to trigger parent logic
      onSelectionChange(selectedRequests); // Parent will determine what to do
    }
  };

  const handleApprove = () => {
    onBulkApprove(bulkReason);
    setShowApproveDialog(false);
    setBulkReason('');
  };

  const handleReject = () => {
    onBulkReject(bulkReason);
    setShowRejectDialog(false);
    setBulkReason('');
  };

  const canPerformBulkActions = selectedRequests.length > 0;

  return (
    <div className="space-y-4">
      {/* Selection Controls */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {selectedRequests.length} demande{selectedRequests.length !== 1 ? 's' : ''} sélectionnée{selectedRequests.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Total: {totalRequests}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            En attente: {pendingRequests}
          </Badge>
        </div>
      </div>

      {/* Bulk Actions */}
      {canPerformBulkActions && (
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowApproveDialog(true)}
            disabled={isLoading}
            className="flex items-center gap-2 border-green-200 hover:bg-green-50 hover:border-green-300"
          >
            <CheckCircle className="w-4 h-4 text-green-600" />
            Approuver ({selectedRequests.length})
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowRejectDialog(true)}
            disabled={isLoading}
            className="flex items-center gap-2 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <XCircle className="w-4 h-4 text-red-600" />
            Rejeter ({selectedRequests.length})
          </Button>
          
          <Button
            variant="outline"
            onClick={onExport}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </Button>
        </div>
      )}

      {/* Always show export button for all requests */}
      {!canPerformBulkActions && totalRequests > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={onExport}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter toutes les demandes en CSV
          </Button>
        </div>
      )}

      {/* Bulk Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-bold">Approuver les demandes sélectionnées</div>
                <div className="text-sm text-muted-foreground">
                  {selectedRequests.length} demande(s) sélectionnée(s)
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Cette action approuvera toutes les demandes sélectionnées. Vous pouvez ajouter un commentaire général.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Attention:</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Cette action est irréversible. Les demandes approuvées mettront à jour les soldes de congés et les participations aux offres.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-reason">Commentaire (optionnel)</Label>
              <Textarea
                id="approve-reason"
                placeholder="Commentaire pour l'approbation en masse..."
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Approbation...' : 'Approuver tout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-600" />
              <div>
                <div className="font-bold">Rejeter les demandes sélectionnées</div>
                <div className="text-sm text-muted-foreground">
                  {selectedRequests.length} demande(s) sélectionnée(s)
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              Cette action rejettera toutes les demandes sélectionnées. Un commentaire est requis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Attention:</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Cette action est irréversible. Les demandes rejetées ne pourront pas être automatiquement réapprouvées.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reject-reason">Commentaire de rejet *</Label>
              <Textarea
                id="reject-reason"
                placeholder="Pourquoi rejetez-vous ces demandes ?"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                rows={4}
                className="border-red-300 focus:border-red-500"
              />
              <p className="text-xs text-muted-foreground">
                Un commentaire est requis pour le rejet en masse.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleReject}
                disabled={isLoading || !bulkReason.trim()}
                variant="destructive"
              >
                {isLoading ? 'Rejet...' : 'Rejeter tout'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
