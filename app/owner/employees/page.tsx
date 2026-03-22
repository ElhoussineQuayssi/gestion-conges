'use client';

import type { ChangeEvent, FormEvent } from 'react';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Employee {
  id: number;
  full_name: string;
  email: string;
  department: string | null;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  deactivated_at: string | null;
  deactivated_by: number | null;
}

export default function OwnerEmployeesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTargetEmployeeId, setStatusTargetEmployeeId] = useState<number | null>(null);
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate' | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    department: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const response = await fetch('/api/owner/employees');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de récupérer la liste des employés',
      });
    } finally {
      setEmployeesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'owner')) {
      router.push('/login');
      return;
    }

    if (!loading) {
      fetchEmployees();
    }
  }, [loading, user, router, fetchEmployees]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.full_name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({
        variant: 'destructive',
        title: 'Champs manquants',
        description: 'Le nom, l\'email et le mot de passe sont requis',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/owner/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          department: formData.department.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: data.error || 'Création échouée',
        });
        return;
      }

      toast({
        title: 'Employé créé',
        description: 'Le nouvel employé a été ajouté avec succès',
      });
      setFormData({ full_name: '', email: '', password: '', department: '' });
      setCreateOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur réseau',
        description: 'Impossible de créer l\'employé',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedEmployee) return;

    if (!formData.full_name.trim() || !formData.email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Champs requis',
        description: 'Le nom et l\'email sont obligatoires',
      });
      return;
    }

    setEditSubmitting(true);

    try {
      const response = await fetch(`/api/owner/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim() || undefined,
          department: formData.department.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: data.error || 'Mise à jour impossible',
        });
        return;
      }

      toast({
        title: 'Modifications enregistrées',
        description: 'Les informations de l\'employé ont été mises à jour',
      });
      setEditOpen(false);
      setSelectedEmployee(null);
      setFormData({ full_name: '', email: '', password: '', department: '' });
      fetchEmployees();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur réseau',
        description: 'Impossible de mettre à jour',
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setDeleteSubmitting(true);

    try {
      const response = await fetch(`/api/owner/employees/${deletingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: data.error || 'Suppression impossible',
        });
        return;
      }

      toast({
        title: 'Employé supprimé',
        description: 'Le compte a bien été supprimé',
      });
      setDeleteOpen(false);
      setDeletingId(null);
      fetchEmployees();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur réseau',
        description: 'Impossible de supprimer l\'employé',
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusTargetEmployeeId || !statusAction) return;

    setStatusSubmitting(true);

    try {
      const desiredStatus = statusAction === 'deactivate' ? 'inactive' : 'active';
      console.log('[StatusChange] Sending PATCH request with status:', desiredStatus, 'for employee:', statusTargetEmployeeId);
      
      const response = await fetch(`/api/owner/employees/${statusTargetEmployeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: desiredStatus }),
      });

      const data = await response.json().catch(() => ({}));
      console.log('[StatusChange] Response:', response.status, data);

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: data?.error ?? data?.message ?? 'Impossible de mettre à jour le statut',
        });
        return;
      }

      // Check if the update was actually successful
      if (!data.success) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: data?.error ?? 'La mise à jour a échoué',
        });
        return;
      }

      toast({
        title: statusAction === 'deactivate' ? 'Employé désactivé' : 'Employé réactivé',
        description:
          statusAction === 'deactivate'
            ? 'Cet employé ne pourra plus se connecter.'
            : 'Le compte est de nouveau actif.',
      });
      setStatusDialogOpen(false);
      setStatusTargetEmployeeId(null);
      setStatusAction(null);
      
      // Wait a small delay to ensure database is saved, then fetch
      setTimeout(() => {
        fetchEmployees();
      }, 100);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur réseau',
        description: 'Impossible de changer le statut',
      });
    } finally {
      setStatusSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = [employee.full_name, employee.email, employee.department]
      .filter(Boolean)
      .some((value) =>
        value!.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || employeesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Gestion des employés</h1>
          <p className="text-muted-foreground">Créez, mettez à jour et suivez tous les collaborateurs</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Ajouter un employé</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvel employé</DialogTitle>
              <DialogDescription>Créez rapidement un compte employé</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom complet *</label>
                <Input
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Nom de l\'employé"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="prenom@entreprise.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mot de passe *</label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Mot de passe temporaire"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Département</label>
                <Input
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Département"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Création en cours...' : 'Créer l\'employé'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Input
          placeholder="Rechercher par nom, email ou département"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2 text-sm">
          <label className="font-medium">Statut</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employés</CardTitle>
          <CardDescription>{filteredEmployees.length} employé(s) affiché(s)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Désactivé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Aucun employé trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className={employee.status === 'inactive' ? 'opacity-80' : ''}>
                      <TableCell className="font-medium">{employee.full_name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.department || 'Non défini'}</TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                          {employee.status === 'active'
                            ? 'Actif'
                            : employee.status === 'inactive'
                              ? 'Désactivé'
                              : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(employee.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {employee.deactivated_at
                          ? new Date(employee.deactivated_at).toLocaleDateString('fr-FR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDetailEmployee(employee);
                              setDetailOpen(true);
                            }}
                          >
                            Voir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={employee.status === 'active' ? 'text-orange-600' : 'text-green-600'}
                            onClick={() => {
                              setStatusTargetEmployeeId(employee.id);
                              setStatusAction(employee.status === 'active' ? 'deactivate' : 'activate');
                              setStatusDialogOpen(true);
                            }}
                          >
                            {employee.status === 'active' ? 'Désactiver' : 'Réactiver'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setFormData({
                                full_name: employee.full_name,
                                email: employee.email,
                                password: '',
                                department: employee.department || '',
                              });
                              setEditOpen(true);
                            }}
                          >
                            Editer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600"
                            onClick={() => {
                              setDeletingId(employee.id);
                              setDeleteOpen(true);
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) {
          setSelectedEmployee(null);
          setFormData({ full_name: '', email: '', password: '', department: '' });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l\'employé</DialogTitle>
            <DialogDescription>Mettre à jour les informations de contact</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom complet *</label>
              <Input name="full_name" value={formData.full_name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input type="email" name="email" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <Input type="password" name="password" value={formData.password} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Département</label>
              <Input name="department" value={formData.department} onChange={handleInputChange} />
            </div>
            <Button type="submit" className="w-full" disabled={editSubmitting}>
              {editSubmitting ? 'Mise à jour en cours...' : 'Enregistrer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setDetailEmployee(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails de l\'employé</DialogTitle>
            <DialogDescription>Informations visibles uniquement au propriétaire</DialogDescription>
          </DialogHeader>
          {detailEmployee && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Nom</p>
                <p className="text-sm font-medium">{detailEmployee.full_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{detailEmployee.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Département</p>
                <p className="text-sm font-medium">{detailEmployee.department || 'Non défini'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <p className="text-sm font-medium">{detailEmployee.status}</p>
              </div>
              {detailEmployee.status === 'inactive' && (
                <div>
                  <p className="text-xs text-muted-foreground">Connexion</p>
                  <p className="text-sm text-red-600">Ce compte est désactivé et ne peut plus se connecter.</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Créé le</p>
                <p className="text-sm font-medium">
                  {new Date(detailEmployee.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              {detailEmployee.deactivated_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Désactivé le</p>
                  <p className="text-sm font-medium text-red-600">
                    {new Date(detailEmployee.deactivated_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open);
          if (!open) {
            setStatusTargetEmployeeId(null);
            setStatusAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusAction === 'deactivate' ? 'Confirmer la désactivation' : 'Confirmer la réactivation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction === 'deactivate'
                ? 'L\'employé ne pourra plus se connecter tant que son compte est désactivé.'
                : 'Le compte redeviendra actif et pourra se connecter.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={
                statusAction === 'deactivate'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-green-500 hover:bg-green-600'
              }
              onClick={handleStatusChange}
              disabled={statusSubmitting}
            >
              {statusSubmitting
                ? 'Traitement...'
                : statusAction === 'deactivate'
                  ? 'Désactiver'
                  : 'Réactiver'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le compte de l\'employé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
