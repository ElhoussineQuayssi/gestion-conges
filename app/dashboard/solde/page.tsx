'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Calendar, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getDashboardRoute } from '@/lib/utils';

interface LeaveBalance {
  remaining_leave: number;
  used_leave: number;
  annual_leave: number;
  days_worked: number;
  calculated_leave: number;
  manual_adjustment: number;
}

interface Request {
  id: number;
  user_id: number;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
}

export default function DashboardSoldePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!authLoading && user && user.role !== 'employee') {
      // Only employees can view this page
      router.push(getDashboardRoute(user.role));
      return;
    }

    const fetchData = async () => {
      try {
        const [balanceRes, requestsRes] = await Promise.all([
          fetch('/api/leave-balance'),
          fetch('/api/requests'),
        ]);

        const balanceData = await balanceRes.json();
        const requestsData = await requestsRes.json();

        setBalance(balanceData.balance);
        
        // Filter user's requests
        const userRequests = (requestsData.requests || []).filter(
          (r: Request) => r.user_id === user?.id
        );
        setRequests(userRequests);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'employee') {
      fetchData();
    }
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate total acquired days
  const totalAcquired = balance 
    ? (balance.annual_leave || 0) + (balance.calculated_leave || 0) + (balance.manual_adjustment || 0)
    : 0;
  
  // Calculate percentages
  const usedPercentage = totalAcquired > 0 ? Math.round((balance?.used_leave || 0) / totalAcquired * 100) : 0;
  const remainingPercentage = 100 - usedPercentage;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mon Solde de Congés</h1>
        <p className="text-slate-600">Visualisez vos droits et demandes de congés</p>
      </div>

      {/* Main Balance Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-500" />
            Situation actuelle
          </CardTitle>
          <CardDescription>
            Année en cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-6 bg-slate-50 rounded-lg">
              <p className="text-4xl font-bold text-blue-600">{totalAcquired}</p>
              <p className="text-sm text-slate-600 mt-1">Jours acquis</p>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-lg">
              <p className="text-4xl font-bold text-orange-600">{balance?.used_leave || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Jours utilisés</p>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-lg">
              <p className="text-4xl font-bold text-green-600">{balance?.remaining_leave || 0}</p>
              <p className="text-sm text-slate-600 mt-1">Jours restants</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">Utilisation</span>
              <span className="font-medium">{usedPercentage}%</span>
            </div>
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-300"
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Détails du calcul
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Jours travaillés</span>
              <span className="font-medium">{balance?.days_worked || 0} jours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Congés acquis (calcul)</span>
              <span className="font-medium">{balance?.calculated_leave || 0} jours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Ajustement manuel</span>
              <span className={`font-medium ${(balance?.manual_adjustment || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(balance?.manual_adjustment || 0) >= 0 ? '+' : ''}{balance?.manual_adjustment || 0} jours
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Statistiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                En attente
              </span>
              <Badge variant="secondary">
                {requests.filter(r => r.status === 'En cours / En attente RH').length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Acceptées
              </span>
              <Badge className="bg-green-100 text-green-800">
                {requests.filter(r => r.status === 'Acceptée').length}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Refusées
              </span>
              <Badge variant="destructive">
                {requests.filter(r => r.status === 'Refusée').length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Demandes récentes</CardTitle>
          <CardDescription>
            Vos dernières demandes de congés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.slice(0, 5).map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {request.type === 'offer' ? 'Offre' : 'Congé'}
                  </Badge>
                  <span className="text-sm">
                    {request.start_date && request.end_date
                      ? `${new Date(request.start_date).toLocaleDateString('fr-FR')} - ${new Date(request.end_date).toLocaleDateString('fr-FR')}`
                      : '-'}
                  </span>
                </div>
                <Badge
                  className={
                    request.status === 'Acceptée'
                      ? 'bg-green-100 text-green-800'
                      : request.status === 'Refusée'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-orange-100 text-orange-800'
                  }
                >
                  {request.status}
                </Badge>
              </div>
            ))}
            {requests.length === 0 && (
              <p className="text-center text-slate-500 py-4">
                Aucune demande
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
