'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Users, Search, Edit, Wallet } from 'lucide-react';

interface EmployeeBalance {
  id: number;
  full_name: string;
  email: string;
  department: string | null;
  annual_leave: number;
  used_leave: number;
  remaining_leave: number;
  days_worked: number;
  calculated_leave: number;
  manual_adjustment: number;
}

export default function DashboardUtilisateursPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<EmployeeBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !['hr_admin', 'owner'].includes(user.role))) {
      router.push('/login');
      return;
    }

    const fetchBalances = async () => {
      try {
        const response = await fetch('/api/admin/balances');
        const data = await response.json();
        setBalances(data.employees || []);
      } catch (error) {
        console.error('Error loading balances:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && ['hr_admin', 'owner'].includes(user.role)) {
      fetchBalances();
    }
  }, [authLoading, user, router]);

  const filteredBalances = balances.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-slate-900">Gestion des Soldes</h1>
        <p className="text-slate-600">Gérez les soldes de congés des employés</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher un employé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Soldes des employés
          </CardTitle>
          <CardDescription>
            {filteredBalances.length} employé(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Département</TableHead>
                <TableHead className="text-center">Jours acquis</TableHead>
                <TableHead className="text-center">Jours utilisés</TableHead>
                <TableHead className="text-center">Jours restants</TableHead>
                <TableHead className="text-center">Ajustement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBalances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Aucun employé trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredBalances.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.full_name}</p>
                        <p className="text-sm text-slate-500">{employee.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.department || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {(employee.annual_leave || 0) + (employee.calculated_leave || 0) + (employee.manual_adjustment || 0)} jours
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">
                        {employee.used_leave} jours
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {employee.remaining_leave} jours
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {employee.manual_adjustment !== 0 ? (
                        <span className={employee.manual_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                          {employee.manual_adjustment > 0 ? '+' : ''}{employee.manual_adjustment}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
