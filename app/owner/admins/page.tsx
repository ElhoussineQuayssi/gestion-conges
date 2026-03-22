'use client';

import { useState, useEffect } from 'react';
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
  AlertDialogTrigger,
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

interface Admin {
  id: number;
  full_name: string;
  email: string;
  department: string;
  created_at: string;
  status: 'active' | 'inactive' | 'suspended';
  deactivated_at: string | null;
}

export default function AdminsManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Deactivate/Reactivate state
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<'deactivate' | 'reactivate' | null>(null);
  const [statusId, setStatusId] = useState<number | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    department: ''
  });
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { toast } = useToast(); 

  const filteredAdmins = admins.filter(
    (admin) => statusFilter === 'all' || admin.status === statusFilter
  );

  useEffect(() => {
    if (!loading && (!user || user.role !== 'owner')) {
      router.push('/login');
      return;
    }

    const fetchAdmins = async () => {
      try {
        // Récupérer directement depuis le backend
        const response = await fetch('/api/admin-users');
        if (response.ok) {
          const data = await response.json();
          setAdmins(data.admins || []);
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Erreur lors du chargement des admins",
        });
      } finally {
        setAdminsLoading(false);
      }
    };

    if (!loading) {
      fetchAdmins();
    }
  }, [loading, user, router]);

  const refreshAdmins = async () => {
    try {
      const response = await fetch('/api/admin-users');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du chargement des admins",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name || !formData.password) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error || 'Erreur lors de la création',
        });
        return;
      }

      toast({
        description: 'Administrateur créé avec succès!',
      });
      setFormData({ email: '', full_name: '', password: '', department: '' });
      setOpenDialog(false);
      refreshAdmins();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: 'Erreur réseau',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Nom et email requis",
      });
      return;
    }

    if (!editingAdmin) return;

    setEditSubmitting(true);

    try {
      const response = await fetch('/api/admin-users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAdmin.id, ...formData })
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error || 'Erreur lors de la mise à jour',
        });
        return;
      }

      toast({
        description: 'Admin mis à jour avec succès!',
      });
      setEditOpen(false);
      setFormData({ email: '', full_name: '', password: '', department: '' });
      setEditingAdmin(null);
      refreshAdmins();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: 'Erreur réseau',
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const response = await fetch('/api/admin-users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingId })
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error || 'Erreur lors de la suppression',
        });
        return;
      }

      toast({
        description: 'Admin supprimé avec succès!',
      });
      setDeleteOpen(false);
      setDeletingId(null);
      refreshAdmins();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: 'Erreur réseau',
      });
    }
  };

  const handleStatusChange = async () => {
    if (!statusId || !statusAction) return;

    setStatusSubmitting(true);
    try {
      const response = await fetch('/api/admin-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: statusId, action: statusAction })
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error || 'Erreur lors du changement de statut',
        });
        return;
      }

      toast({
        description: statusAction === 'deactivate' ? 'Admin désactivé avec succès!' : 'Admin réactivé avec succès!',
      });
      setStatusOpen(false);
      setStatusId(null);
      setStatusAction(null);
      refreshAdmins();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: 'Erreur réseau',
      });
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (loading || adminsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestion des Administrateurs RH</h1>
          <p className="text-muted-foreground">
            Créez et gérez les comptes des administrateurs
          </p>
        </div>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
<DialogTrigger asChild>
              <Button>Ajouter un admin</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel administrateur RH</DialogTitle>
                <DialogDescription>
                  Créez un compte administrateur RH
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">


                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom complet *</label>
                  <Input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="jean@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mot de passe *</label>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Mot de passe sécurisé"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Département</label>
                  <Input
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Ressources Humaines"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Création en cours...' : 'Créer l\'administrateur'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier l'administrateur</DialogTitle>
                <DialogDescription>
                  Modifiez les informations de cet administrateur RH. Le mot de passe est optionnel.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom complet *</label>
                  <Input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email *</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="jean@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nouveau mot de passe (optionnel)</label>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Laisser vide pour conserver"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Département</label>
                  <Input
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Ressources Humaines"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={editSubmitting}>
                  {editSubmitting ? 'Mise à jour en cours...' : 'Mettre à jour'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Filter */}
        <div className="mb-6">
          <label className="text-sm font-medium mr-2">Filtrer par statut:</label>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>

        {admins.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Aucun administrateur créé pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Administrateurs RH</CardTitle>
              <CardDescription>
                {filteredAdmins.length} administrateur(s) affiché(s)
              </CardDescription>
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
                    {filteredAdmins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Aucun administrateur ne correspond au filtre sélectionné
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdmins.map((admin) => (
                        <TableRow key={admin.id} className={admin.status === 'inactive' ? 'opacity-60' : ''}>
                          <TableCell className="font-medium">{admin.full_name}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>{admin.department || 'Non spécifié'}</TableCell>
                          <TableCell>
                            <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                              {admin.status === 'active' ? 'Actif' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(admin.created_at).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            {admin.status === 'inactive' && admin.deactivated_at
                              ? new Date(admin.deactivated_at).toLocaleDateString('fr-FR')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (admin) {
                                    setEditingAdmin(admin);
                                    setFormData({
                                      email: admin.email,
                                      full_name: admin.full_name,
                                      password: '',
                                      department: admin.department || ''
                                    });
                                    setEditOpen(true);
                                  }
                                }}
                              >
                                Editer
                              </Button>
                              {admin.status === 'active' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600"
                                  onClick={() => {
                                    setStatusId(admin.id);
                                    setStatusAction('deactivate');
                                    setStatusOpen(true);
                                  }}
                                >
                                  Désactiver
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600"
                                  onClick={() => {
                                    setStatusId(admin.id);
                                    setStatusAction('reactivate');
                                    setStatusOpen(true);
                                  }}
                                >
                                  Réactiver
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                                onClick={() => {
                                  setDeletingId(admin.id);
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
        )}

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cet administrateur ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                Supprimer
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Status Change Dialog */}
        <AlertDialog open={statusOpen} onOpenChange={setStatusOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {statusAction === 'deactivate' ? 'Confirmer la désactivation' : 'Confirmer la réactivation'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {statusAction === 'deactivate' 
                  ? 'Êtes-vous sûr de vouloir désactiver cet administrateur ? Il ne pourra plus se connecter.'
                  : 'Êtes-vous sûr de vouloir réactiver cet administrateur ?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2">
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction 
                className={statusAction === 'deactivate' ? 'bg-orange-500 hover:bg-orange/90' : 'bg-green-500 hover:bg-green/90'}
                disabled={statusSubmitting}
                onClick={handleStatusChange}
              >
                {statusSubmitting ? 'Traitement...' : (statusAction === 'deactivate' ? 'Désactiver' : 'Réactiver')}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      <Toaster />
    </div>
  );
}
