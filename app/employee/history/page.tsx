'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

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

const getStatusMeta = (status: Request['status']) => {
  switch (status) {
    case 'Acceptée':
      return { label: 'Acceptée', className: 'bg-green-100 text-green-800' };
    case 'Refusée':
      return { label: 'Refusée', className: 'bg-red-100 text-red-800' };
    case 'Refus automatique':
      return { label: 'Refus automatique', className: 'bg-orange-100 text-orange-800' };
    default:
      return { label: 'En attente', className: 'bg-blue-100 text-blue-800' };
  }
};

export default function EmployeeHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && user.role !== 'employee') {
      router.push('/login');
      return;
    }

    if (!user || authLoading) {
      return;
    }

    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/requests', { cache: 'no-store' });
        const data = await response.json();
        const ownRequests = (data.requests || []).filter(
          (request: Request) => request.user_id === user.id
        );
        const sorted = ownRequests.sort((a: Request, b: Request) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRequests(sorted);
      } catch (err) {
        console.error(err);
        setError('Impossible de charger l\'historique');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [authLoading, user, router]);

  const leaveRequests = useMemo(() => requests.filter((r) => r.type === 'leave'), [requests]);
  const offerRequests = useMemo(() => requests.filter((r) => r.type === 'offer'), [requests]);

  const statsFor = (items: Request[]) => ({
    total: items.length,
    pending: items.filter((r) => r.status === 'En cours / En attente RH').length,
    accepted: items.filter((r) => r.status === 'Acceptée').length,
    rejected: items.filter((r) => r.status === 'Refusée' || r.status === 'Refus automatique').length,
  });

  const leaveStats = statsFor(leaveRequests);
  const offerStats = statsFor(offerRequests);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Historique</h1>
        <p className="text-slate-600">Suivez vos demandes de congés et candidatures aux offres.</p>
      </div>

      {error && (
        <Card>
          <CardContent className="text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-6 gap-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Demandes de congés
            </CardTitle>
            <CardDescription>{leaveStats.total} enregistrements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
              <div className="text-center">
                <p className="text-2xl font-semibold text-blue-600">{leaveStats.pending}</p>
                <p>En attente</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">{leaveStats.accepted}</p>
                <p>Acceptées</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-600">{leaveStats.rejected}</p>
                <p>Rejetées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Candidatures aux offres
            </CardTitle>
            <CardDescription>{offerStats.total} candidatures</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
              <div className="text-center">
                <p className="text-2xl font-semibold text-blue-600">{offerStats.pending}</p>
                <p>En attente</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-600">{offerStats.accepted}</p>
                <p>Acceptées</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-600">{offerStats.rejected}</p>
                <p>Rejetées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Demandes de congés</h2>
            <p className="text-sm text-slate-500">Historique complet de vos congés demandés.</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {leaveStats.total} total
          </Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            {leaveRequests.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Aucune demande de congés trouvée.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dates</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={`leave-${request.id}`}>
                      <TableCell>
                        {request.start_date ? new Date(request.start_date).toLocaleDateString('fr-FR') : '—'}
                        {' '}–{' '}
                        {request.end_date ? new Date(request.end_date).toLocaleDateString('fr-FR') : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {request.reason || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusMeta(request.status).className}>
                          {getStatusMeta(request.status).label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Candidatures aux offres</h2>
            <p className="text-sm text-slate-500">Suivez les offres pour lesquelles vous avez postulé.</p>
          </div>
          <Badge variant="outline" className="text-sm">
            {offerStats.total} total
          </Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            {offerRequests.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">Vous n'avez pas encore postulé à une offre.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offre</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offerRequests.map((request) => (
                    <TableRow key={`offer-${request.id}`}>
                      <TableCell>
                        <div className="font-medium">{request.offer_title || 'Offre interne'}</div>
                        <div className="text-xs text-slate-500">
                          {request.created_at ? new Date(request.created_at).toLocaleDateString('fr-FR') : '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.destination || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusMeta(request.status).className}>
                          {getStatusMeta(request.status).label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
