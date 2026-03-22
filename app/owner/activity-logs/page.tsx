'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface ActivityLog {
  id: number;
  user_id: number;
  full_name: string;
  user_email: string;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  details: string | null;
  created_at: string;
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [activeUsers, setActiveUsers] = useState<{id: number; full_name: string; email: string}[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  // Filter state
  const [userId, setUserId] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (!loading && (!user || user.role !== 'owner')) {
      router.push('/login');
      return;
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user?.role === 'owner') {
      fetchLogs();
    }
  }, [loading, user, userId, action, startDate, endDate, offset]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      if (action) params.set('action', action);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const response = await fetch(`/api/activity-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setActionTypes(data.actionTypes || []);
        setActiveUsers(data.activeUsers || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearFilters = () => {
    setUserId('');
    setAction('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes('delete')) return 'destructive';
    if (action.includes('create') || action.includes('approve')) return 'default';
    if (action.includes('update') || action.includes('edit')) return 'secondary';
    return 'outline';
  };

  if (loading || loadingLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Journal d'activité</h1>
        <p className="text-muted-foreground">
          Historique complet des actions des utilisateurs
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-sm font-medium mb-1 block">Utilisateur</label>
                <select
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setOffset(0); }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Tous les utilisateurs</option>
                  {activeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type d'action</label>
                <select
                  value={action}
                  onChange={(e) => { setAction(e.target.value); setOffset(0); }}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Toutes les actions</option>
                  {actionTypes.map(a => (
                    <option key={a} value={a}>{formatAction(a)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date début</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date fin</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Affichage de {logs.length} sur {total} entrées
        </div>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Date</th>
                    <th className="text-left p-3 text-sm font-medium">Utilisateur</th>
                    <th className="text-left p-3 text-sm font-medium">Action</th>
                    <th className="text-left p-3 text-sm font-medium">Ressource</th>
                    <th className="text-left p-3 text-sm font-medium">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Aucune activité trouvée
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 text-sm">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3 text-sm">
                          <div>
                            <span className="font-medium">{log.full_name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{log.user_email}</div>
                        </td>
                        <td className="p-3 text-sm">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {formatAction(log.action)}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {log.resource_type ? (
                            <span className="capitalize">{log.resource_type}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          {log.resource_id && (
                            <span className="text-muted-foreground ml-1">#{log.resource_id}</span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {log.details || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {total > limit && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {Math.floor(offset / limit) + 1} de {Math.ceil(total / limit)}
            </span>
            <Button
              variant="outline"
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
            >
              Suivant
            </Button>
          </div>
        )}
    </div>
  );
}
