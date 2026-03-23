'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, Download, Filter, X, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface FilterState {
  type: 'all' | 'leave' | 'offer';
  status: 'all' | 'En cours / En attente RH' | 'Acceptée' | 'Refusée' | 'Refus automatique';
  search: string;
  startDate: string;
  endDate: string;
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

const getTypeLabel = (type: Request['type']) => {
  return type === 'leave' ? 'Congé' : 'Offre';
};

const getTypeMeta = (type: Request['type']) => {
  switch (type) {
    case 'leave':
      return { label: 'Congé', className: 'bg-purple-100 text-purple-800' };
    case 'offer':
      return { label: 'Offre', className: 'bg-cyan-100 text-cyan-800' };
    default:
      return { label: type, className: 'bg-gray-100 text-gray-800' };
  }
};

export default function EmployeeHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    status: 'all',
    search: '',
    startDate: '',
    endDate: '',
  });

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

  // Filter requests based on current filters
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Type filter
      if (filters.type !== 'all' && request.type !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && request.status !== filters.status) {
        return false;
      }

      // Search filter (search in offer title, destination, or reason)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          (request.offer_title && request.offer_title.toLowerCase().includes(searchLower)) ||
          (request.destination && request.destination.toLowerCase().includes(searchLower)) ||
          (request.reason && request.reason.toLowerCase().includes(searchLower));
        if (!matchesSearch) {
          return false;
        }
      }

      // Date range filter (based on created_at)
      if (filters.startDate || filters.endDate) {
        const requestDate = new Date(request.created_at);
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          if (requestDate < startDate) {
            return false;
          }
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (requestDate > endDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [requests, filters]);

  // Stats calculations
  const stats = useMemo(() => {
    const leaveRequests = requests.filter((r) => r.type === 'leave');
    const offerRequests = requests.filter((r) => r.type === 'offer');

    const statsFor = (items: Request[]) => ({
      total: items.length,
      pending: items.filter((r) => r.status === 'En cours / En attente RH').length,
      accepted: items.filter((r) => r.status === 'Acceptée').length,
      rejected: items.filter((r) => r.status === 'Refusée' || r.status === 'Refus automatique').length,
    });

    return {
      all: {
        total: requests.length,
        pending: requests.filter((r) => r.status === 'En cours / En attente RH').length,
        accepted: requests.filter((r) => r.status === 'Acceptée').length,
        rejected: requests.filter((r) => r.status === 'Refusée' || r.status === 'Refus automatique').length,
      },
      leave: statsFor(leaveRequests),
      offer: statsFor(offerRequests),
    };
  }, [requests]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (dates: { start?: Date; end?: Date }) => {
    setFilters((prev) => ({
      ...prev,
      startDate: dates.start ? dates.start.toISOString().split('T')[0] : '',
      endDate: dates.end ? dates.end.toISOString().split('T')[0] : '',
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      search: '',
      startDate: '',
      endDate: '',
    });
  };

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    filters.search !== '' ||
    filters.startDate !== '' ||
    filters.endDate !== '';

  // CSV Export function
  const exportToCSV = () => {
    const headers = ['ID', 'Type', 'Titre/Offre', 'Destination', 'Dates', 'Motif', 'Statut', 'Date de création'];
    const csvData = filteredRequests.map((request) => {
      const dates = request.type === 'leave'
        ? `${request.start_date ? format(new Date(request.start_date), 'dd/MM/yyyy', { locale: fr }) : '—'} - ${request.end_date ? format(new Date(request.end_date), 'dd/MM/yyyy', { locale: fr }) : '—'}`
        : request.start_date && request.end_date
          ? `${format(new Date(request.start_date), 'dd/MM/yyyy', { locale: fr })} - ${format(new Date(request.end_date), 'dd/MM/yyyy', { locale: fr })}`
          : '—';

      return [
        request.id.toString(),
        getTypeLabel(request.type),
        request.type === 'offer' ? (request.offer_title || 'Offre interne') : (request.reason || '—'),
        request.destination || '—',
        dates,
        request.reason || '—',
        getStatusMeta(request.status).label,
        format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
      ];
    });

    const csvContent = [headers.join(','), ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historique_${format(new Date(), 'yyyy-MM-dd_HHmmss', { locale: fr })}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Historique</h1>
        <p className="text-slate-600">Suivez vos demandes de congés et candidatures aux offres.</p>
      </div>

      {error && (
        <Card>
          <CardContent className="text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
              <div className="text-center">
                <p className="text-xl font-semibold text-blue-600">{stats.all.total}</p>
                <p className="text-xs">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-green-600">{stats.all.accepted}</p>
                <p className="text-xs">Acceptées</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-red-600">{stats.all.rejected}</p>
                <p className="text-xs">Rejetées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Demandes de congés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
              <div className="text-center">
                <p className="text-xl font-semibold text-purple-600">{stats.leave.total}</p>
                <p className="text-xs">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-green-600">{stats.leave.accepted}</p>
                <p className="text-xs">Acceptées</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-red-600">{stats.leave.rejected}</p>
                <p className="text-xs">Rejetées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-cyan-500" />
              Candidatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
              <div className="text-center">
                <p className="text-xl font-semibold text-cyan-600">{stats.offer.total}</p>
                <p className="text-xs">Total</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-green-600">{stats.offer.accepted}</p>
                <p className="text-xs">Acceptées</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-red-600">{stats.offer.rejected}</p>
                <p className="text-xs">Rejetées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card className="overflow-visible">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Effacer
              </Button>
              <Button
                size="sm"
                onClick={exportToCSV}
                disabled={filteredRequests.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Exporter CSV ({filteredRequests.length})
              </Button>
            </div>
          </div>
          <CardDescription>
            Filtrer et exporter vos demandes et candidatures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Type Filter Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher par offre, destination ou motif..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'leave', 'offer'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={filters.type === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange('type', type)}
                    className="text-xs"
                  >
                    {type === 'all' && 'Tous'}
                    {type === 'leave' && 'Congés'}
                    {type === 'offer' && 'Offres'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status and Date Filter Row */}
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Statut</Label>
                <div className="flex gap-2 flex-wrap">
                  {(['all', 'En cours / En attente RH', 'Acceptée', 'Refusée'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={filters.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleFilterChange('status', status)}
                      className="text-xs"
                    >
                      {status === 'all' && 'Tous'}
                      {status === 'En cours / En attente RH' && 'En attente'}
                      {status === 'Acceptée' && 'Acceptée'}
                      {status === 'Refusée' && 'Refusée'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg flex-wrap">
                <span className="text-sm font-medium">Filtres actifs:</span>
                {filters.type !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Type: {filters.type === 'leave' ? 'Congé' : 'Offre'}
                  </Badge>
                )}
                {filters.status !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Statut: {getStatusMeta(filters.status).label}
                  </Badge>
                )}
                {filters.search && (
                  <Badge variant="secondary" className="text-xs">
                    Recherche: "{filters.search}"
                  </Badge>
                )}
                {(filters.startDate || filters.endDate) && (
                  <Badge variant="secondary" className="text-xs">
                    Période: {filters.startDate || 'Début'} - {filters.endDate || 'Fin'}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Combined Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Historique combiné</CardTitle>
            <Badge variant="outline">
              {filteredRequests.length} résultat{filteredRequests.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {hasActiveFilters
                ? 'Aucune demande ne correspond aux filtres sélectionnés.'
                : 'Aucun historique trouvé.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Titre / Offre</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={`${request.type}-${request.id}`}>
                    <TableCell>
                      <Badge className={getTypeMeta(request.type).className}>
                        {getTypeMeta(request.type).label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {request.type === 'offer' ? (request.offer_title || 'Offre interne') : (request.reason || 'Demande de congé')}
                      </div>
                      {request.type === 'leave' && request.reason && (
                        <div className="text-xs text-slate-500">{request.reason}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.destination || '—'}
                    </TableCell>
                    <TableCell>
                      {request.type === 'leave' ? (
                        <>
                          {request.start_date ? format(new Date(request.start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                          {' → '}
                          {request.end_date ? format(new Date(request.end_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </>
                      ) : (
                        <>
                          {request.start_date ? format(new Date(request.start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                          {' → '}
                          {request.end_date ? format(new Date(request.end_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusMeta(request.status).className}>
                        {getStatusMeta(request.status).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {request.created_at ? format(new Date(request.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
