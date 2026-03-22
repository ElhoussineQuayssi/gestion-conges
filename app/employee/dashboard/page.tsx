'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmployeeRequestModal } from '@/components/employee-request-modal';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user from API
        const userRes = await fetch('/api/auth/me');
        if (!userRes.ok) {
          router.push('/login');
          return;
        }
        const userData = await userRes.json();
        const currentUser = userData.user;
        
        if (!currentUser || currentUser.role !== 'employee') {
          router.push('/login');
          return;
        }
        setUser(currentUser);

        // Fetch data from APIs
        const [balanceRes, requestsRes, offersRes] = await Promise.all([
          fetch('/api/leave-balance'),
          fetch('/api/requests'),
          fetch('/api/offers')
        ]);

        const balanceData = await balanceRes.json();
        const requestsData = await requestsRes.json();
        const offersData = await offersRes.json();

        setBalance(balanceData.balance);
        
        // Filter requests for current user and enrich with offer data
        const userRequests = requestsData.requests?.filter((r: any) => r.user_id === currentUser.id) || [];
        const enriched = userRequests.map((request: any) => ({
          ...request,
          offer_title: offersData.offers?.find((o: any) => o.id === request.offer_id)?.title || '',
          destination: offersData.offers?.find((o: any) => o.id === request.offer_id)?.destination || '',
          hotel_name: offersData.offers?.find((o: any) => o.id === request.offer_id)?.hotel_name || '',
          start_date_offer: offersData.offers?.find((o: any) => o.id === request.offer_id)?.start_date || '',
          end_date_offer: offersData.offers?.find((o: any) => o.id === request.offer_id)?.end_date || '',
          price: offersData.offers?.find((o: any) => o.id === request.offer_id)?.price || 0
        }));
        
        setRequests(enriched);
        setOffers(offersData.offers || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Acceptée':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Refusée':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Refus automatique':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'; // En cours / En attente RH - blue per spec
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Acceptée':
        return 'Acceptée';
      case 'Refusée':
        return 'Refusée';
      case 'Refus automatique':
        return 'Refus automatique';
      default:
        return 'En cours / En attente RH';
    }
  };

  const handleCancel = async (requestId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette demande?')) return;
    
    setCancelling(requestId);
    try {
      const response = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        alert('Demande annulée avec succès');
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'annulation');
      }
    } catch {
      alert('Erreur réseau');
    } finally {
      setCancelling(null);
    }
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Bienvenue {user.full_name}
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {balance && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Jours acquis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {(balance.annual_leave || 0) + (balance.calculated_leave || 0) + (balance.manual_adjustment || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total (base + calculé + ajustement)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Jours travaillés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{balance?.days_worked || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    22 jours = 1.5 jour de congé
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Jours utilisés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{balance?.used_leave || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cette année
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mb-8">
          <div className="flex gap-4">
            <Link href="/employee/leave-request">
              <Button>Demander des congés</Button>
            </Link>
            <Link href="/employee/offers">
              <Button variant="outline">Voir les offres</Button>
            </Link>
          </div>
        </div>

        {/* Demandes récentes */}
        <Card>
          <CardHeader>
            <CardTitle>Mes demandes</CardTitle>
            <CardDescription>
              Historique de vos demandes de congés et offres
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Aucune demande pour le moment
              </p>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                    <TableRow>
                      <TableHead className="w-[120px]">Date de demande</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Période choisie</TableHead>
                      <TableHead className="text-center w-[120px]">Statut</TableHead>
                      <TableHead className="text-right w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(request.created_at).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {request.type === 'offer' ? request.offer_title || request.destination : 'Congés'}
                          </div>
                          {request.type === 'offer' && request.destination && (
                            <div className="text-xs text-muted-foreground">
                              {request.destination}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {request.type === 'offer'
                            ? `${request.start_date_offer ? new Date(request.start_date_offer).toLocaleDateString('fr-FR') : '-'} - ${request.end_date_offer ? new Date(request.end_date_offer).toLocaleDateString('fr-FR') : '-'}`
                            : `${request.start_date ? new Date(request.start_date).toLocaleDateString('fr-FR') : '-'} - ${request.end_date ? new Date(request.end_date).toLocaleDateString('fr-FR') : '-'}`
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={getStatusColor(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(request)}
                            >
                              Détails
                            </Button>
                            {request.status === 'En cours / En attente RH' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={cancelling === request.id}
                                onClick={() => handleCancel(request.id)}
                              >
                                {cancelling === request.id ? '...' : 'Annuler'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Details Modal */}
        {showModal && selectedRequest && (
          <EmployeeRequestModal
            request={selectedRequest}
            open={showModal}
            onClose={() => {
              setShowModal(false);
              setSelectedRequest(null);
            }}
          />
        )}
      </div>
  );
}
