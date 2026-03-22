'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RequestDetailsModal } from '@/components/request-details-modal';
import { RequestEditModal } from '@/components/request-edit-modal';
import { RequestFilters } from '@/components/request-filters';
import { RequestBulkActions } from '@/components/request-bulk-actions';

interface Request {
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
  auto_rejection_reason?: string | null;
}

interface Filters {
  search: string;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
}

export default function RequestsManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    type: 'all',
    startDate: '',
    endDate: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Selection state
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  
  // Bulk action state
  const [submitting, setSubmitting] = useState(false);

  const getStatusBadge = (status: Request['status']) => {
    if (status === 'Acceptée') {
      return { label: 'Approuvée', className: 'bg-green-100 text-green-800 hover:bg-green-100' };
    }
    if (status === 'Refusée') {
      return { label: 'Rejetée', className: 'bg-red-100 text-red-800 hover:bg-red-100' };
    }
    if (status === 'Refus automatique') {
      return { label: 'Refus automatique', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' };
    }
    return { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' };
  };

  useEffect(() => {
    if (!loading && (!user || !['hr_admin', 'owner'].includes(user.role))) {
      router.push('/login');
      return;
    }

    const fetchRequests = async () => {
      try {
        const response = await fetch('/api/requests');
        const data = await response.json();
        setRequests(data.requests || []);
      } catch {
        setError('Erreur lors du chargement des demandes');
      } finally {
        setRequestsLoading(false);
      }
    };

    if (!loading) {
      fetchRequests();
    }
  }, [loading, user, router]);

  // Filter requests based on current filters
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Status filter
      if (filters.status !== 'all' && req.status !== filters.status) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && req.type !== filters.type) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = req.full_name?.toLowerCase().includes(searchLower);
        const matchesEmail = req.email?.toLowerCase().includes(searchLower);
        const matchesId = req.id.toString() === filters.search;
        if (!matchesName && !matchesEmail && !matchesId) {
          return false;
        }
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        const requestDate = new Date(req.created_at);
        if (filters.startDate && requestDate < new Date(filters.startDate)) {
          return false;
        }
        if (filters.endDate && requestDate > new Date(filters.endDate + 'T23:59:59')) {
          return false;
        }
      }

      return true;
    });
  }, [requests, filters]);

  // Get pending requests for bulk actions
  const pendingRequests = useMemo(() => {
    return filteredRequests.filter(r => r.status === 'En cours / En attente RH');
  }, [filteredRequests]);

  // Handle filter changes
  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    // Clear selection when filters change
    setSelectedRequests([]);
    setSelectAll(false);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Handle page navigation
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle row selection
  const handleSelectRow = (requestId: number) => {
    setSelectedRequests(prev => {
      if (prev.includes(requestId)) {
        return prev.filter(id => id !== requestId);
      } else {
        return [...prev, requestId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(pendingRequests.map(r => r.id));
    }
    setSelectAll(!selectAll);
  };

  // Sync selectAll with actual selection
  useEffect(() => {
    if (pendingRequests.length > 0 && selectedRequests.length === pendingRequests.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedRequests, pendingRequests]);

  // Handle bulk approve
  const handleBulkApprove = async (reason?: string) => {
    if (selectedRequests.length === 0) return;
    
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/requests/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestIds: selectedRequests,
          action: 'approve',
          reason: reason || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de l\'approbation');
        return;
      }

      // Check for partial failures
      const failedCount = data.results?.failed?.length || 0;
      const successCount = data.results?.success?.length || 0;

      if (failedCount > 0) {
        // Show detailed error for first failed request
        const firstError = data.results.failed[0];
        const errorMsg = `${failedCount} demande(s) n\'ont pas pu être approuvée(s): ${firstError.error}`;
        setError(errorMsg);
        toast({
          title: 'Attention',
          description: errorMsg,
          variant: 'destructive'
        });
      }

      // Show success message
      toast({
        title: 'Opération réussie',
        description: `${successCount} demande(s) approuvée(s)`,
        variant: 'default'
      });

      setSuccess(`${data.results?.success?.length || 0} demande(s) approuvée(s) avec succès!`);
      setSelectedRequests([]);
      setSelectAll(false);

      // Refresh requests
      const response2 = await fetch('/api/requests');
      const data2 = await response2.json();
      setRequests(data2.requests || []);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle bulk reject
  const handleBulkReject = async (reason?: string) => {
    if (selectedRequests.length === 0) return;
    if (!reason?.trim()) {
      setError('Un motif est requis pour le rejet');
      return;
    }
    
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/requests/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestIds: selectedRequests,
          action: 'reject',
          reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors du rejet');
        return;
      }

      toast({
        title: 'Opération réussie',
        description: `${data.results?.success?.length || 0} demande(s) rejetée(s)`,
        variant: 'default'
      });

      setSuccess(`${data.results?.success?.length || 0} demande(s) rejetée(s) avec succès!`);
      setSelectedRequests([]);
      setSelectAll(false);

      // Refresh requests
      const response2 = await fetch('/api/requests');
      const data2 = await response2.json();
      setRequests(data2.requests || []);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({ format: 'csv' });
      if (filters.search) params.set('search', filters.search);
      if (filters.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters.type && filters.type !== 'all') params.set('type', filters.type);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const response = await fetch(`/api/requests/bulk?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `requests-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export réussi',
        description: 'Le fichier CSV a été téléchargé',
        variant: 'default'
      });
    } catch {
      setError('Erreur lors de l\'export');
    }
  };

  // Handle single request review (approve/reject)
  // Returns true on success, false on failure
  const handleReview = async (requestId: number, status: 'approved' | 'rejected', reason?: string): Promise<{ success: boolean; error?: string }> => {
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status === 'approved' ? 'Acceptée' : 'Refusée',
          reason: reason || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Erreur lors de la validation';
        setError(errorMsg);
        toast({
          title: 'Erreur',
          description: errorMsg,
          variant: 'destructive'
        });
        // Refresh data to show current status
        const response2 = await fetch('/api/requests');
        const data2 = await response2.json();
        setRequests(data2.requests || []);
        setSubmitting(false);
        return { success: false, error: errorMsg };
      }

      // Handle case where API returns success:false in body
      if (data.success === false) {
        const errorMsg = data.error || 'Erreur lors de la validation';
        setError(errorMsg);
        toast({
          title: 'Erreur',
          description: errorMsg,
          variant: 'destructive'
        });
        // Refresh data to show current status
        const response2 = await fetch('/api/requests');
        const data2 = await response2.json();
        setRequests(data2.requests || []);
        setSubmitting(false);
        return { success: false, error: errorMsg };
      }

      const successMessage = `Demande ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès!`;
      setSuccess(successMessage);
      
      // Show toast notification
      toast({
        title: 'Opération réussie',
        description: status === 'approved' ? 'La demande a été approuvée' : 'La demande a été rejetée',
        variant: 'default'
      });

      // Refresh requests
      const response2 = await fetch('/api/requests');
      const data2 = await response2.json();
      setRequests(data2.requests || []);
      
      setSubmitting(false);
      return { success: true };
    } catch {
      const errorMsg = 'Erreur réseau';
      setError(errorMsg);
      toast({
        title: 'Erreur',
        description: errorMsg,
        variant: 'destructive'
      });
      setSubmitting(false);
      return { success: false, error: errorMsg };
    }
  };

  // Handle request edit save
  const handleSaveEdit = async (requestId: number, updates: any) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la mise à jour');
        return;
      }

      setSuccess('Demande mise à jour avec succès!');
      setEditingRequest(null);

      // Refresh requests
      const response2 = await fetch('/api/requests');
      const data2 = await response2.json();
      setRequests(data2.requests || []);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || requestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="mb-2 text-2xl font-bold">Gestion des demandes</h1>
        <p className="text-muted-foreground">
          Gérez toutes les demandes de congés et d'offres (en attente, approuvées et rejetées)
        </p>
      </div>

      {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters Component */}
        <RequestFilters 
          onFiltersChange={handleFiltersChange}
          currentFilters={filters}
        />

        {/* Bulk Actions Component */}
        <RequestBulkActions
          selectedRequests={selectedRequests}
          onSelectionChange={setSelectedRequests}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onExport={handleExportCSV}
          isLoading={submitting}
          totalRequests={filteredRequests.length}
          pendingRequests={pendingRequests.length}
        />

        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">
                {filters.search || filters.status !== 'all' || filters.type !== 'all' 
                  ? 'Aucune demande trouvée avec les filtres actuels'
                  : 'Aucune demande trouvée'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-md border text-sm">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                <TableRow>
           <TableHead className="w-12">
                     <Checkbox
                       checked={selectAll}
                       onCheckedChange={handleSelectAll}
                       disabled={pendingRequests.length === 0}
                     />
                   </TableHead>
                   <TableHead className="w-36">Employé</TableHead>
                   <TableHead className="w-24">Type</TableHead>
                   <TableHead>Détails</TableHead>
                   <TableHead className="w-30">Date</TableHead>
                   <TableHead className="text-center w-24">Statut</TableHead>
                   <TableHead className="text-right w-30">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow key={request.id} className={selectedRequests.includes(request.id) ? 'bg-muted/50' : ''}>
                    <TableCell className="py-3">
                      <Checkbox
                        checked={selectedRequests.includes(request.id)}
                        onCheckedChange={() => handleSelectRow(request.id)}
                        disabled={request.status !== 'En cours / En attente RH'}
                      />
                    </TableCell>
                    <TableCell className="py-3">
                      <div>
                        <div className="font-medium">{request.full_name}</div>
                        <div className="text-xs text-muted-foreground">{request.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className={
                        request.type === 'offer' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }>
                        {request.type === 'offer' ? 'Offre' : 'Congés'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3">
                      {request.type === 'offer' ? (
                        <div>
                          <div className="font-medium">{request.offer_title || 'Offre'}</div>
                          <div className="text-xs text-muted-foreground">{request.destination || '-'}</div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Du</span>{' '}
                          {request.start_date ? new Date(request.start_date).toLocaleDateString('fr-FR') : '-'}{' '}
                          <span className="text-muted-foreground">au</span>{' '}
                          {request.end_date ? new Date(request.end_date).toLocaleDateString('fr-FR') : '-'}
                          {request.reason && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Motif:</span> {request.reason}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3">
                      {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {(() => {
                        const statusBadge = getStatusBadge(request.status);
                        return (
                          <Badge
                            variant="outline"
                            className={statusBadge.className}
                          >
                            {statusBadge.label}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        variant="outline"
                        className="h-8 px-3 text-xs"
                      >
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="flex items-center justify-between px-2 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Affichage de {startIndex + 1} à {Math.min(endIndex, filteredRequests.length)} sur {filteredRequests.length} demande{filteredRequests.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} sur {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Request Details Modal */}
        {selectedRequest && (
          <RequestDetailsModal
            key={selectedRequest.id}
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onEdit={(request) => {
              setSelectedRequest(null);
              setEditingRequest(request);
            }}
            onApprove={async (requestId, reason) => {
              const result = await handleReview(requestId, 'approved', reason);
              if (result.success) {
                setSelectedRequest(null);
              }
              return result;
            }}
            onReject={async (requestId, reason) => {
              const result = await handleReview(requestId, 'rejected', reason);
              if (result.success) {
                setSelectedRequest(null);
              }
              return result;
            }}
            isLoading={submitting}
          />
        )}

        {/* Request Edit Modal */}
        <RequestEditModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSave={handleSaveEdit}
          isLoading={submitting}
        />
    </div>
  );
}
