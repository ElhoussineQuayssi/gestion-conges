'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { RequestDetailsModal } from '@/components/request-details-modal';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
}

export default function DashboardDemandesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/requests', { cache: 'no-store' });
      const data = await response.json();
      
      const userRequests = (data.requests || []).filter(
        (r: Request) => r.user_id === user?.id
      );
      
      const enriched = userRequests.map((request: Request) => ({
        ...request,
        offer_title: request.offer_title || '',
        destination: request.destination || '',
      }));
      
      setRequests(enriched);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchRequests();
    }
  }, [authLoading, user, router, fetchRequests]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchRequests();
    }, 15000);

    return () => clearInterval(interval);
  }, [user, fetchRequests]);

  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRequests();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, fetchRequests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Acceptée':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Refusée':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Refus automatique':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'En cours / En attente RH':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Acceptée':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Refusée':
      case 'Refus automatique':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'En cours / En attente RH':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Stats
  const pendingCount = requests.filter(r => r.status === 'En cours / En attente RH').length;
  const approvedCount = requests.filter(r => r.status === 'Acceptée').length;
  const rejectedCount = requests.filter(r => r.status === 'Refusée' || r.status === 'Refus automatique').length;

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mes Demandes</h1>
        <p className="text-slate-600">Suivez l'état de vos demandes de congés et offres</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Acceptées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Refusées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des demandes</CardTitle>
          <CardDescription>
            Toutes vos demandes de congés et offres
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Offre/Demande</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Aucune demande trouvée
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {request.type === 'offer' ? 'Offre' : 'Congé'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {request.offer_title || request.reason || '-'}
                    </TableCell>
                    <TableCell>
                      {request.start_date && request.end_date
                        ? `${new Date(request.start_date).toLocaleDateString('fr-FR')} - ${new Date(request.end_date).toLocaleDateString('fr-FR')}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(request.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                      >
                        Voir détails
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRequest && (
        <RequestDetailsModal
          key={selectedRequest.id}
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}
