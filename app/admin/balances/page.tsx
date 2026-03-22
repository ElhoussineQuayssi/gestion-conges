'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, X } from 'lucide-react';

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

export default function BalancesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [balances, setBalances] = useState<EmployeeBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<EmployeeBalance | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'remaining' | 'used'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    balances.forEach(b => {
      if (b.department) depts.add(b.department);
    });
    return Array.from(depts).sort();
  }, [balances]);

  // Filter and sort balances
  const filteredBalances = useMemo(() => {
    let result = balances.filter(balance => {
      // Search filter
      const matchesSearch = !searchTerm || 
        balance.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        balance.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Department filter
      const matchesDepartment = departmentFilter === 'all' || balance.department === departmentFilter;
      
      // Balance status filter
      let matchesStatus = true;
      if (balanceStatusFilter === 'low') {
        // Low balance: less than 5 days remaining
        matchesStatus = balance.remaining_leave < 5;
      } else if (balanceStatusFilter === 'normal') {
        // Normal: 5-15 days remaining
        matchesStatus = balance.remaining_leave >= 5 && balance.remaining_leave <= 15;
      } else if (balanceStatusFilter === 'high') {
        // High: more than 15 days remaining
        matchesStatus = balance.remaining_leave > 15;
      } else if (balanceStatusFilter === 'none') {
        // No remaining days
        matchesStatus = balance.remaining_leave <= 0;
      }
      
      return matchesSearch && matchesDepartment && matchesStatus;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.full_name.localeCompare(b.full_name);
      } else if (sortBy === 'remaining') {
        comparison = a.remaining_leave - b.remaining_leave;
      } else if (sortBy === 'used') {
        comparison = a.used_leave - b.used_leave;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [balances, searchTerm, departmentFilter, balanceStatusFilter, sortBy, sortOrder]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setBalanceStatusFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  const hasActiveFilters = searchTerm || departmentFilter !== 'all' || balanceStatusFilter !== 'all';

  // Adjustment form state
  const [adjustForm, setAdjustForm] = useState({
    annual_leave: '',
    used_leave: '',
    days_worked: '',
    manual_adjustment: '',
    reason: ''
  });

  useEffect(() => {
    if (!loading && (!user || !['hr_admin', 'owner'].includes(user.role))) {
      router.push('/login');
      return;
    }

    const fetchBalances = async () => {
      try {
        const response = await fetch('/api/admin/balances');
        const data = await response.json();
        setBalances(data.balances || []);
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Erreur lors du chargement des soldes',
        });
      } finally {
        setLoadingBalances(false);
      }
    };

    if (!loading && user) {
      fetchBalances();
    }
  }, [loading, user, router, toast]);

  const handleAdjustClick = (balance: EmployeeBalance) => {
    setSelectedBalance(balance);
    setAdjustForm({
      annual_leave: balance.annual_leave.toString(),
      used_leave: balance.used_leave.toString(),
      days_worked: balance.days_worked?.toString() || '0',
      manual_adjustment: balance.manual_adjustment?.toString() || '0',
      reason: ''
    });
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBalance) return;

    setAdjusting(true);

    try {
      const response = await fetch('/api/leave-balance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedBalance.id,
          annual_leave: parseInt(adjustForm.annual_leave) || 0,
          used_leave: parseInt(adjustForm.used_leave) || 0,
          days_worked: parseInt(adjustForm.days_worked) || 0,
          manual_adjustment: parseInt(adjustForm.manual_adjustment) || 0,
          reason: adjustForm.reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: data.error || 'Erreur lors de l\'ajustement',
        });
        return;
      }

      toast({
        description: 'Solde ajusté avec succès!',
      });
      setAdjustModalOpen(false);
      setSelectedBalance(null);

      // Refresh balances
      const response2 = await fetch('/api/admin/balances');
      const data2 = await response2.json();
      setBalances(data2.balances || []);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur réseau',
      });
    } finally {
      setAdjusting(false);
    }
  };

  if (loading || loadingBalances) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  const totalAnnual = filteredBalances.reduce((sum, b) => sum + (b.annual_leave || 0) + (b.calculated_leave || 0) + (b.manual_adjustment || 0), 0);
  const totalUsed = filteredBalances.reduce((sum, b) => sum + b.used_leave, 0);
  const totalRemaining = filteredBalances.reduce((sum, b) => sum + b.remaining_leave, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestion des soldes de congés</h1>
        <p className="text-muted-foreground">
          Visualisez et gérez les soldes de congés de tous les employés
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Effacer
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Département</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous les départements</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Balance Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Solde</label>
              <select
                value={balanceStatusFilter}
                onChange={(e) => setBalanceStatusFilter(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous les soldes</option>
                <option value="none">Épuisé (0 jour)</option>
                <option value="low">Faible (&lt; 5 jours)</option>
                <option value="normal">Normal (5-15 jours)</option>
                <option value="high">Élevé (&gt; 15 jours)</option>
              </select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Trier par</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'remaining' | 'used')}
                  className="flex-1 border rounded-md px-2 py-2 text-sm"
                >
                  <option value="name">Nom</option>
                  <option value="remaining">Restants</option>
                  <option value="used">Utilisés</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Recherche: "{searchTerm}"
                </Badge>
              )}
              {departmentFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Département: {departmentFilter}
                </Badge>
              )}
              {balanceStatusFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  Solde: {balanceStatusFilter === 'none' ? 'Épuisé' : 
                         balanceStatusFilter === 'low' ? 'Faible' : 
                         balanceStatusFilter === 'normal' ? 'Normal' : 'Élevé'}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                ({filteredBalances.length} résultat{filteredBalances.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats globales */}
      <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total annuels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAnnual}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Jours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total utilisés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{totalUsed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Jours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total restants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalRemaining}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Jours
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tableau des soldes */}
        <Card>
          <CardHeader>
            <CardTitle>Soldes détaillés par employé</CardTitle>
            <CardDescription>
              Statut des congés de tous les employés • 22 jours travaillés = 1.5 jours de congé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Employé</th>
                    <th className="text-left py-3 px-4 font-medium">Département</th>
                    <th className="text-right py-3 px-4 font-medium">Annuels</th>
                    <th className="text-right py-3 px-4 font-medium">Calculés*</th>
                    <th className="text-right py-3 px-4 font-medium">Utilisés</th>
                    <th className="text-right py-3 px-4 font-medium">Restants</th>
                    <th className="text-center py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((balance) => {
                    const totalAcquired = (balance.annual_leave || 0) + (balance.calculated_leave || 0) + (balance.manual_adjustment || 0);
                    const percentageUsed = totalAcquired > 0
                      ? Math.round((balance.used_leave / totalAcquired) * 100)
                      : 0;

                    return (
                      <tr key={balance.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{balance.full_name}</p>
                            <p className="text-xs text-muted-foreground">{balance.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-muted-foreground">
                            {balance.department || '-'}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          {totalAcquired}
                          <p className="text-xs text-muted-foreground font-normal">
                            ({balance.annual_leave} base + {balance.calculated_leave || 0} calc + {balance.manual_adjustment || 0} adj)
                          </p>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className="text-blue-600 font-medium">
                            +{balance.calculated_leave || 0}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            ({balance.days_worked || 0} jours)
                          </p>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={balance.used_leave > 0 ? 'text-yellow-600 font-medium' : ''}>
                            {balance.used_leave}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={balance.remaining_leave < 5 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {balance.remaining_leave}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustClick(balance)}
                          >
                            Ajuster
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              * Les jours calculés proviennent du ratio 22 jours travaillés = 1.5 jour de congé
            </p>
          </CardContent>
        </Card>

        {/* Adjustment Modal */}
        <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajuster le solde</DialogTitle>
              <DialogDescription>
                Modifiez le solde de congés de {selectedBalance?.full_name}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jours annuels</label>
                <Input
                  type="number"
                  value={adjustForm.annual_leave}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, annual_leave: e.target.value }))}
                  placeholder="30"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jours utilisés</label>
                <Input
                  type="number"
                  value={adjustForm.used_leave}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, used_leave: e.target.value }))}
                  placeholder="5"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jours travaillés (22 jours = 1.5 jour)</label>
                <Input
                  type="number"
                  value={adjustForm.days_worked}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, days_worked: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ajustement manuel</label>
                <Input
                  type="number"
                  value={adjustForm.manual_adjustment}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, manual_adjustment: e.target.value }))}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motif de l'ajustement</label>
                <Input
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ex: Correction d'erreur, don de congés..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={adjusting}>
                {adjusting ? 'Mise à jour...' : 'Enregistrer'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
