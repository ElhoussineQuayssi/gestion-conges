'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

export default function OwnerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use the dedicated stats API which provides all owner stats
        const [statsRes, adminsRes, requestsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/admin-users'),
          fetch('/api/requests')
        ]);

        const statsData = await statsRes.json();
        const adminsData = await adminsRes.json();
        const requestsData = await requestsRes.json();

        setStats(statsData);
        setAdmins(adminsData.admins || []);
        setRequests(requestsData.requests || []);
        
        // Fetch activity logs
        try {
          const logsRes = await fetch('/api/activity-logs');
          const logsData = await logsRes.json();
          setActivityLogs(logsData.logs || []);
        } catch (e) {
          console.log('No activity logs available');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleResetDatabase = async () => {
    setResetting(true);
    try {
      const response = await fetch('/api/owner/reset-db', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        alert('Base de données réinitialisée avec succès!\nComptes conservés: ' + data.remaining_users.map((u: any) => u.email).join(', '));
        window.location.reload();
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (error) {
      alert('Erreur lors de la réinitialisation');
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Statistiques globales - use stats API which returns computed values
  const totalEmployees = stats?.totalEmployees || 0;
  const totalAdmins = stats?.totalAdmins || 0;
  const totalActiveAdmins = admins.filter((a: any) => a.status === 'active').length;
  const totalOffersCount = stats?.totalOffers || 0;
  const pendingRequestsCount = stats?.pendingRequests || 0;

  // Statistiques par type de demande
  const approvedOffers = requests.filter((r: any) => r.type === 'offer' && r.status === 'Acceptée').length;
  const approvedLeaves = requests.filter((r: any) => r.type === 'leave' && r.status === 'Acceptée').length;
  const rejectedRequestsCount = requests.filter((r: any) => r.status === 'Refusée').length;

  // Statistiques par admin RH (demandes traitées)
  const adminStats = admins.map((admin: any) => {
    const approved = requests.filter((r: any) => r.approved_by === admin.id && r.status === 'Acceptée').length;
    const rejected = requests.filter((r: any) => r.approved_by === admin.id && r.status === 'Refusée').length;
    const total = approved + rejected;
    return {
      id: admin.id,
      name: admin.full_name,
      email: admin.email,
      status: admin.status,
      approved,
      rejected,
      total
    };
  }).sort((a: any, b: any) => b.total - a.total);

  // System stats
  const inactiveAdmins = admins.filter((a: any) => a.status !== 'active').length;
  const totalRequestsCount = requests.length;

  // Activité récente - use activity logs with fallback for unknown users
  const recentActivity = activityLogs
    .map((log: any) => ({
      ...log,
      // activity logs have user info embedded or use default
      full_name: log.user_name || log.full_name || 'Utilisateur inconnu'
    }))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tableau de bord propriétaire</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble complète de la plateforme
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Employés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Admins RH</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAdmins}</div>
            {inactiveAdmins > 0 && (
              <p className="text-xs text-orange-600">{inactiveAdmins} inactifs</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Offres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOffersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingRequestsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Demandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalRequestsCount}</div>
            <p className="text-xs text-muted-foreground">{approvedOffers + approvedLeaves} traitées</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques détaillées */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Demandes approuvées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Offres</span>
                <span className="text-2xl font-bold text-green-600">{approvedOffers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Congés</span>
                <span className="text-2xl font-bold text-green-600">{approvedLeaves}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Accès rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/admin/requests">
                <Button variant="outline" className="w-full justify-start">
                  Valider les demandes
                </Button>
              </Link>
              <Link href="/admin/offers">
                <Button variant="outline" className="w-full justify-start">
                  Gérer les offres
                </Button>
              </Link>
              <Link href="/owner/admins">
                <Button variant="outline" className="w-full justify-start">
                  Gérer les admins
                </Button>
              </Link>
              <Link href="/owner/activity-logs">
                <Button variant="outline" className="w-full justify-start">
                  Journaux d'activité
                </Button>
              </Link>
              <Link href="/owner/settings">
                <Button variant="outline" className="w-full justify-start">
                  Paramètres système
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full justify-start mt-4">
                    Réinitialiser la base de données
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera définitivement toutes les données de la base de données
                      (demandes, offres, congés, journaux d'activité) et tous les comptes sauf:
                      <ul className="mt-2 list-disc list-inside text-sm">
                        <li>owner@example.com (propriétaire)</li>
                        <li>admin@example.com (admin RH)</li>
                        <li>employee@example.com (employé)</li>
                      </ul>
                      Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetDatabase}
                      disabled={resetting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {resetting ? 'Réinitialisation...' : 'Confirmer la réinitialisation'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HR Admin Performance Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance des administrateurs RH</CardTitle>
              <CardDescription>
                Aperçu de l'activité des admins ({totalActiveAdmins} actifs / {totalAdmins} total)
              </CardDescription>
            </div>
            <Link href="/owner/admins">
              <Button variant="outline" size="sm">Gérer</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {adminStats.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucun administrateur RH
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium">Admin</th>
                    <th className="text-left p-2 text-sm font-medium">Statut</th>
                    <th className="text-center p-2 text-sm font-medium">Approuvées</th>
                    <th className="text-center p-2 text-sm font-medium">Rejetées</th>
                    <th className="text-center p-2 text-sm font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {adminStats.map((admin: any) => (
                    <tr key={admin.id} className="border-b hover:bg-muted/30">
                      <td className="p-2">
                        <div className="font-medium text-sm">{admin.name}</div>
                        <div className="text-xs text-muted-foreground">{admin.email}</div>
                      </td>
                      <td className="p-2">
                        <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                          {admin.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-green-600 font-medium">{admin.approved}</span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-red-600 font-medium">{admin.rejected}</span>
                      </td>
                      <td className="p-2 text-center font-medium">
                        {admin.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activité récente */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Historique des 10 dernières actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune activité
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action?.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(activity.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {activity.resource_type && (
                    <Badge variant="outline" className="text-xs">
                      {activity.resource_type}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
