'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { PlacesBadge } from '@/components/places-badge';
import { Offer } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPriceMAD } from '@/lib/utils';

export default function DashboardOffersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [submitting, setSubmitting] = useState<number | null>(null);

  // HR Admin form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
    duration: '',
    price: '',
    max_participants: '',
    status: 'Disponible',
  });

  const isHR = user?.role === 'hr_admin' || user?.role === 'owner';

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchOffers = async () => {
      try {
        const response = await fetch('/api/offers?active=true');
        const data = await response.json();
        setOffers(data.offers || []);
      } catch {
        setError('Erreur lors du chargement des offres');
      } finally {
        setOffersLoading(false);
      }
    };

    fetchOffers();
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(editingOffer?.id || 0);

    try {
      const method = editingOffer ? 'PUT' : 'POST';
      const url = editingOffer ? `/api/offers?id=${editingOffer.id}` : '/api/offers';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          max_participants: parseInt(formData.max_participants),
        }),
      });

      if (response.ok) {
        toast({
          title: editingOffer ? 'Offre mise à jour' : 'Offre créée',
          description: editingOffer ? 'L\'offre a été mise à jour avec succès.' : 'L\'offre a été créée avec succès.',
        });
        setIsDialogOpen(false);
        setEditingOffer(null);
        setFormData({
          title: '',
          description: '',
          destination: '',
          start_date: '',
          end_date: '',
          duration: '',
          price: '',
          max_participants: '',
          status: 'Disponible',
        });
        
        // Refresh offers
        const response = await fetch('/api/offers?active=true');
        const data = await response.json();
        setOffers(data.offers || []);
      } else {
        const data = await response.json();
        toast({
          title: 'Erreur',
          description: data.error || 'Une erreur est survenue.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'enregistrement.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const handleDelete = async (id: number) => {
    setSubmitting(id);
    try {
      const response = await fetch(`/api/offers?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({
          title: 'Offre supprimée',
          description: 'L\'offre a été supprimée avec succès.',
        });
        setOffers(offers.filter(o => o.id !== id));
      }
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'offre.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(null);
    }
  };

  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || '',
      destination: offer.destination || '',
      start_date: offer.start_date,
      end_date: offer.end_date || '',
      duration: offer.duration || '',
      price: offer.price?.toString() || '',
      max_participants: offer.max_participants?.toString() || '',
      status: offer.status || '',
    });
    setIsDialogOpen(true);
  };

  const destinations = useMemo(() => {
    const uniqueDestinations = [...new Set(offers.map((offer) => offer.destination || ''))];
    return uniqueDestinations.filter(Boolean).sort();
  }, [offers]);

  const displayedOffers = useMemo(() => {
    return offers.filter((offer) => {
      const matchesSearch =
        !searchTerm.trim() ||
        offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (offer.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (offer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      if (!matchesSearch) {
        return false;
      }

      if (destinationFilter !== 'all' && offer.destination !== destinationFilter) {
        return false;
      }

      if (dateFromFilter && offer.start_date) {
        const offerStart = new Date(offer.start_date);
        const filterDate = new Date(dateFromFilter);
        if (offerStart < filterDate) {
          return false;
        }
      }

      if (dateToFilter && offer.end_date) {
        const offerEnd = new Date(offer.end_date);
        const filterDate = new Date(dateToFilter);
        if (offerEnd > filterDate) {
          return false;
        }
      }

      if (availabilityFilter === 'available' && offer.status !== 'Disponible') {
        return false;
      }

      return true;
    });
  }, [offers, searchTerm, destinationFilter, dateFromFilter, dateToFilter, availabilityFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    destinationFilter !== 'all' ||
    dateFromFilter !== '' ||
    dateToFilter !== '' ||
    availabilityFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setDestinationFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setAvailabilityFilter('all');
  };

  if (authLoading || offersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isHR ? 'Gestion des Offres' : 'Catalogue des Offres'}
          </h1>
          <p className="text-slate-600">
            {isHR ? 'Gérez les offres de congés' : 'Parcourez les offres disponibles'}
          </p>
        </div>
        {isHR && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                setEditingOffer(null);
                setFormData({
                  title: '',
                  description: '',
                  destination: '',
                  start_date: '',
                  end_date: '',
                  duration: '',
                  price: '',
                  max_participants: '',
                  status: 'Disponible',
                });
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle offre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}
                </DialogTitle>
                <DialogDescription>
                  {editingOffer ? 'Modifiez les détails de l\'offre' : 'Créez une nouvelle offre de congés'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Titre</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Titre de l'offre"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Destination</label>
                    <Input
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="Destination"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full min-h-[100px] p-3 border rounded-md"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description de l'offre"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date de début</label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date de fin</label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Durée</label>
                    <Input
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="Ex: 7 jours"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prix (MAD)</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Participants max</label>
                    <Input
                      type="number"
                      value={formData.max_participants}
                      onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                      placeholder="10"
                      required
                    />
                  </div>
                </div>
                {isHR && editingOffer && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Disponible">Disponible</option>
                      <option value="Indisponible">Indisponible</option>
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={submitting !== null} className="bg-blue-600 hover:bg-blue-700">
                    {submitting !== null ? 'Enregistrement...' : editingOffer ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Recherche et filtres</CardTitle>
          <CardDescription>
            Affinez rapidement la liste des offres par mot-cle, destination, date et disponibilite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Rechercher par titre, destination ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Destination
              </label>
              <Select value={destinationFilter} onValueChange={setDestinationFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Toutes les destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les destinations</SelectItem>
                  {destinations.map((destination) => (
                    <SelectItem key={destination} value={destination}>
                      {destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                A partir du
              </label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Jusqu'au
              </label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Disponibilite
              </label>
              <Select value={availabilityFilter} onValueChange={(value: 'all' | 'available') => setAvailabilityFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les offres</SelectItem>
                  <SelectItem value="available">Disponibles uniquement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="h-9 px-0 text-sm text-muted-foreground hover:text-foreground"
              >
                Reinitialiser les filtres
              </Button>
            </div>
          </div>

          <div className="border-t pt-3 text-sm text-muted-foreground">
            {displayedOffers.length} offre{displayedOffers.length !== 1 ? 's' : ''} affichee{displayedOffers.length !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Offers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Places</TableHead>
                {isHR && <TableHead>Statut</TableHead>}
                {isHR && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedOffers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isHR ? 7 : 4} className="text-center py-8 text-slate-500">
                    Aucune offre trouvée
                  </TableCell>
                </TableRow>
              ) : (
                displayedOffers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">{offer.title}</TableCell>
                    <TableCell>{offer.destination}</TableCell>
                    <TableCell>
                      {new Date(offer.start_date).toLocaleDateString('fr-FR')}{offer.end_date ? ` - ${new Date(offer.end_date).toLocaleDateString('fr-FR')}` : ''}
                    </TableCell>
                    <TableCell>{formatPriceMAD(offer.price)}</TableCell>
                    <TableCell>
                      <PlacesBadge 
                        maxParticipants={offer.max_participants ?? 0}
                        currentParticipants={offer.current_participants ?? 0}
                      />
                    </TableCell>
                    {isHR && (
                      <TableCell>
                        <Badge variant={offer.status === 'Disponible' ? 'default' : 'secondary'}>
                          {offer.status}
                        </Badge>
                      </TableCell>
                    )}
                    {isHR && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(offer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer l'offre</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(offer.id)} className="bg-red-600 hover:bg-red-700">
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  );
}
