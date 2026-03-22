'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Briefcase,
  ClipboardList,
  Wallet,
  Users,
  Inbox,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  role: 'employee' | 'hr_admin' | 'owner';
  department: string | null;
}

interface Stats {
  totalOffers?: number;
  pendingRequests?: number;
  approvedRequests?: number;
  rejectedRequests?: number;
  totalEmployees?: number;
  totalAdmins?: number;
  myPendingRequests?: number;
  myApprovedRequests?: number;
  myRejectedRequests?: number;
  leaveBalance?: {
    remaining_leave: number;
    used_leave: number;
    annual_leave: number;
    calculated_leave?: number;
    manual_adjustment?: number;
    days_worked?: number;
  };
  recentRequests?: {
    id: number;
    full_name: string;
    type: 'offer' | 'leave';
    status: string;
    offer_title?: string | null;
    created_at: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) {
          router.push('/login');
          return;
        }
        const userData = await userResponse.json();
        setUser(userData.user);

        // Fetch stats based on role
        const statsResponse = await fetch('/api/dashboard/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        } else {
          // If no stats API, use basic data
          setStats({});
        }
      } catch (error) {
        console.error('[Dashboard] Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const roleNames: Record<string, string> = {
    employee: 'Employé',
    hr_admin: 'Administrateur RH',
    owner: 'Propriétaire',
  };

  const requestStatusBadge = (status: string) => {
    switch (status) {
      case 'Acceptée':
        return { label: 'Acceptée', className: 'bg-green-100 text-green-800' };
      case 'Refusée':
        return { label: 'Refusée', className: 'bg-red-100 text-red-800' };
      case 'Refus automatique':
        return { label: 'Refus automatique', className: 'bg-orange-100 text-orange-800' };
      default:
        return { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const requestTypeLabel = (type: 'offer' | 'leave') => (type === 'offer' ? 'Offre' : 'Congé');
  const hasRecentRequests = (stats.recentRequests?.length || 0) > 0;

  // Employee Dashboard
  if (user?.role === 'employee') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bienvenue, {user.full_name}</h1>
          <p className="text-slate-600">Tableau de bord {roleNames[user.role]}</p>
        </div>

        {/* Leave Balance Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-500" />
              Mon Solde de Congés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {(stats.leaveBalance?.annual_leave || 0) + (stats.leaveBalance?.calculated_leave || 0) + (stats.leaveBalance?.manual_adjustment || 0)}
                </p>
                <p className="text-sm text-slate-600">Jours acquis</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">{stats.leaveBalance?.used_leave || 0}</p>
                <p className="text-sm text-slate-600">Jours utilisés</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{stats.leaveBalance?.remaining_leave || 0}</p>
                <p className="text-sm text-slate-600">Jours restants</p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/solde">
                <Button variant="outline" className="w-full">Voir le détail</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Catalogue des Offres
              </CardTitle>
              <CardDescription>Parcourez les offres disponibles</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/offres">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">Voir les offres</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Mes Demandes
              </CardTitle>
              <CardDescription>Suivez l'état de vos demandes</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/demandes">
                <Button variant="outline" className="w-full">Voir mes demandes</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Request Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques de mes demandes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{stats.myPendingRequests || 0}</p>
                  <p className="text-sm text-slate-600">En attente</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.myApprovedRequests || 0}</p>
                  <p className="text-sm text-slate-600">Acceptées</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.myRejectedRequests || 0}</p>
                  <p className="text-sm text-slate-600">Refusées</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasRecentRequests && (
          <Card>
            <CardHeader>
              <CardTitle>Mes demandes récentes</CardTitle>
              <CardDescription>Les dernières demandes que vous avez soumises</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentRequests?.map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-4 border-b last:border-b-0 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {requestTypeLabel(request.type)} #{request.id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.offer_title || 'Demande interne'} • {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={requestStatusBadge(request.status).className}
                    >
                      {requestStatusBadge(request.status).label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // HR Admin Dashboard
  if (user?.role === 'hr_admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bienvenue, {user.full_name}</h1>
          <p className="text-slate-600">Tableau de bord {roleNames[user.role]}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Offres</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.totalOffers || 0}</p>
            </CardContent>
          </Card>

          <Card className={(stats.pendingRequests || 0) > 0 ? 'border-orange-400 bg-orange-50' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm font-medium ${(stats.pendingRequests || 0) > 0 ? 'text-orange-700' : 'text-slate-600'}`}>
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${(stats.pendingRequests || 0) > 0 ? 'text-orange-500' : ''}`} />
                  Demandes en attente
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link href="/admin/requests">
                <div className={`text-4xl font-bold cursor-pointer hover:underline ${(stats.pendingRequests || 0) > 0 ? 'text-orange-600' : 'text-slate-600'}`}>
                  {stats.pendingRequests || 0}
                </div>
                {(stats.pendingRequests || 0) > 0 && (
                  <p className="text-sm text-orange-600 mt-1">Cliquez pour traiter →</p>
                )}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Acceptées</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.approvedRequests || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Refusées</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{stats.rejectedRequests || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Inbox className="h-5 w-5 text-orange-500" />
                Validation
              </CardTitle>
              <CardDescription>Demandes en attente</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/requests">
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  {(stats.pendingRequests || 0) > 0 && (
                    <Badge className="mr-2 bg-white text-orange-600">
                      {stats.pendingRequests}
                    </Badge>
                  )}
                  Valider
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Offres
              </CardTitle>
              <CardDescription>Gérer les offres</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/offres">
                <Button variant="outline" className="w-full">Gérer</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Soldes
              </CardTitle>
              <CardDescription>Gérer les soldes</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/utilisateurs">
                <Button variant="outline" className="w-full">Voir</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Suivi
              </CardTitle>
              <CardDescription>Vue d'ensemble</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Voir les stats
              </Button>
            </CardContent>
          </Card>
        </div>

        {hasRecentRequests && (
          <Card>
            <CardHeader>
              <CardTitle>Demandes récentes</CardTitle>
              <CardDescription>Les dernières demandes sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentRequests?.map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-4 border-b last:border-b-0 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.full_name} • {requestTypeLabel(request.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.offer_title || 'Aucun titre'} • {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={requestStatusBadge(request.status).className}
                    >
                      {requestStatusBadge(request.status).label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Owner Dashboard
  if (user?.role === 'owner') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bienvenue, {user.full_name}</h1>
          <p className="text-slate-600">Tableau de bord {roleNames[user.role]}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Employés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.totalEmployees || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Admin RH</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats.totalAdmins || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Offres Actives</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.totalOffers || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">En Attente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingRequests || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                Gestion RH
              </CardTitle>
              <CardDescription>Gérer les administrateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/admins">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">Gérer</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-500" />
                Journaux d'Audit
              </CardTitle>
              <CardDescription>Voir l'activité</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/logs">
                <Button variant="outline" className="w-full">Voir</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Supervision
              </CardTitle>
              <CardDescription>Vue d'ensemble</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth'})}>
                Statistiques
              </Button>
            </CardContent>
          </Card>
        </div>

        {hasRecentRequests && (
          <Card>
            <CardHeader>
              <CardTitle>Demandes récentes</CardTitle>
              <CardDescription>Vue globale des derniers événements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentRequests?.map((request) => (
                  <div key={request.id} className="flex items-center justify-between gap-4 border-b last:border-b-0 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {request.full_name} • {requestTypeLabel(request.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.offer_title || 'Sans offre'} • {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={requestStatusBadge(request.status).className}
                    >
                      {requestStatusBadge(request.status).label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}
