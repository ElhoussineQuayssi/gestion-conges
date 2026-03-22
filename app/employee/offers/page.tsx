'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { PlacesBadge } from '@/components/places-badge';
import { OfferFilters } from '@/components/offer-filters';
import { Offer } from '@/lib/types';
import { formatPriceMAD } from '@/lib/utils';

export default function EmployeeOffersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<number | null>(null);

  // Update filtered offers when offers change
  useEffect(() => {
    setFilteredOffers(offers);
  }, [offers]);

  useEffect(() => {
    if (!loading && !user) {
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

    if (!loading) {
      fetchOffers();
    }
  }, [loading, user, router]);

  const handleApply = async (offerId: number) => {
    setSubmitting(offerId);
    setError('');

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: offerId,
          type: 'offer'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la candidature');
        return;
      }

      // Recharger les offres
      const offersResponse = await fetch('/api/offers?active=true');
      const offersData = await offersResponse.json();
      setOffers(offersData.offers || []);

      // Handle auto-rejected requests
      if (data.autoRejected) {
        alert(`Candidature refusée automatiquement: ${data.message}`);
      } else {
        alert('Candidature envoyée avec succès! Attendez la validation de l\'administrateur.');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading || offersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">Chargement des offres...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-5">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold">Offres de Vacances</h1>
          <p className="text-muted-foreground">
            Découvrez les destinations proposées et postulez à vos préférées
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <OfferFilters 
          offers={offers} 
          onFilterChange={setFilteredOffers} 
          compact
        />

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredOffers.length} offre{filteredOffers.length !== 1 ? 's' : ''} disponible{filteredOffers.length !== 1 ? 's' : ''}
        </div>

        {filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Aucune offre disponible correspondant aux filtres</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-md border text-sm">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                <TableRow>
                  <TableHead className="w-[200px]">Titre</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Durée</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-center">Places restantes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffers.map((offer) => {
                  const endDate = offer.end_date ? new Date(offer.end_date) : null;
                  const days = endDate 
                    ? Math.ceil(
                        (endDate.getTime() - new Date(offer.start_date).getTime()) / 
                        (1000 * 60 * 60 * 24)
                      ) + 1
                    : 0;

                  return (
                    <TableRow key={offer.id}>
                      <TableCell className="py-3">
                        <div>
                          <div className="font-semibold">{offer.title}</div>
                          {offer.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
                              {offer.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">{offer.destination || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap py-3">
                        {new Date(offer.start_date).toLocaleDateString('fr-FR')}{endDate ? ` - ${endDate.toLocaleDateString('fr-FR')}` : ''}
                      </TableCell>
                      <TableCell className="py-3 text-right">{days} jour{days !== 1 ? 's' : ''}</TableCell>
                      <TableCell className="py-3 text-right font-medium">{formatPriceMAD(offer.price)}</TableCell>
                      <TableCell className="py-3 text-center">
                        <PlacesBadge 
                          maxParticipants={offer.max_participants ?? 0}
                          currentParticipants={offer.current_participants ?? 0}
                          compact
                        />
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button
                          disabled={offer.status !== 'Disponible' || submitting === offer.id}
                          onClick={() => handleApply(offer.id)}
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          {submitting === offer.id
                            ? 'En cours...'
                            : offer.status !== 'Disponible'
                            ? 'Indisponible'
                            : 'Postuler'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
    </div>
  );
}
