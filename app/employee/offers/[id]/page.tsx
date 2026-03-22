'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertTriangle, Wallet } from 'lucide-react';
import { OfferCalendar } from '@/components/offer-calendar';
import { formatPriceMAD } from '@/lib/utils';

interface Offer {
  id: number;
  title: string;
  description: string;
  destination: string;
  start_date: string;
  end_date: string;
  duration: string | null;
  price: number;
  max_participants: number;
  current_participants: number;
  status: string;
  hotel_name: string | null;
  conditions: string | null;
  images: string[];
}

interface LeaveBalance {
  remaining_leave: number;
  used_leave: number;
  annual_leave: number;
}

export default function OfferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // New state for pre-validation and calendar
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [existingRequest, setExistingRequest] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date } | undefined>();

  const offerId = params.id ? parseInt(params.id as string) : null;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!offerId) {
      setError('ID d\'offre invalide');
      setLoading(false);
      return;
    }

    const fetchOfferAndBalance = async () => {
      try {
        // Fetch offer data
        const [offerResponse, balanceResponse, requestsResponse] = await Promise.all([
          fetch(`/api/offers?id=${offerId}`),
          fetch('/api/leave-balance'),
          fetch('/api/requests')
        ]);
        
        const offerData = await offerResponse.json();
        const balanceData = await balanceResponse.json();
        const requestsData = await requestsResponse.json();
        
        if (!offerResponse.ok) {
          setError(offerData.error || 'Offre non trouvée');
          return;
        }
        
        setOffer(offerData.offer);
        setBalance(balanceData.balance);
        
        // Check if user already applied to this offer
        const hasExistingRequest = requestsData.requests?.some(
          (r: any) => r.offer_id === offerId && 
                      r.status !== 'Refusée' && 
                      r.status !== 'Refus automatique'
        );
        setExistingRequest(!!hasExistingRequest);
      } catch {
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
        setBalanceLoading(false);
      }
    };

    if (!authLoading && user) {
      fetchOfferAndBalance();
    }
  }, [authLoading, user, offerId, router]);

  const handleApply = async () => {
    if (!offer) return;
    
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: offer.id,
          type: 'offer',
          // Include selected date range if available
          selected_start_date: selectedRange?.from?.toISOString().split('T')[0],
          selected_end_date: selectedRange?.to?.toISOString().split('T')[0]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la candidature');
        return;
      }

      // Handle auto-rejected requests
      if (data.autoRejected) {
        alert(`Candidature refusée automatiquement: ${data.message}`);
      } else {
        alert('Candidature envoyée avec succès! Attendez la validation de l\'administrateur.');
      }
      router.push('/employee/offers');
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading || balanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-muted-foreground">Offre non trouvée</p>
            <Link href="/employee/offers">
              <Button variant="outline">Retour aux offres</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const spotsAvailable = offer.max_participants - offer.current_participants;
  const isAlmostFull = spotsAvailable <= 3;
  const days = Math.ceil(
    (new Date(offer.end_date).getTime() - new Date(offer.start_date).getTime()) / 
    (1000 * 60 * 60 * 24)
  ) + 1;

  return (
    <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/employee/offers" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour aux offres
          </Link>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl">{offer.title}</CardTitle>
                <CardDescription className="text-lg mt-1">{offer.destination}</CardDescription>
              </div>
              <Badge variant={offer.status === 'Disponible' ? 'default' : 'secondary'}>
                {offer.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{offer.description || 'Aucune description disponible'}</p>
            </div>

            {/* Images Gallery */}
            {offer.images && offer.images.length > 0 && (
              <div className="pt-6">
                <h3 className="font-semibold mb-3">Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {offer.images.map((imageUrl, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                      <img
                        src={imageUrl}
                        alt={`${offer.title} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to placeholder on error
                          (e.target as HTMLImageElement).src = '/placeholder.jpg';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Dates</h3>
                <p className="text-muted-foreground">
                  {new Date(offer.start_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })} - {' '}
                  {new Date(offer.end_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Durée</h3>
                <p className="text-muted-foreground">{days} jour{days !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Prix</h3>
                <p className="text-2xl font-bold">{formatPriceMAD(offer.price)}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Disponibilité</h3>
                <p className={`font-medium ${isAlmostFull ? 'text-red-600' : ''}`}>
                  {spotsAvailable} place{spotsAvailable !== 1 ? 's' : ''} disponible{spotsAvailable !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  {offer.current_participants} / {offer.max_participants} participants
                </p>
              </div>
              {offer.hotel_name && (
                <div>
                  <h3 className="font-semibold mb-2">Hébergement</h3>
                  <p className="text-muted-foreground">{offer.hotel_name}</p>
                </div>
              )}
            </div>

            {offer.conditions && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-2">Conditions</h3>
                <p className="text-muted-foreground whitespace-pre-line">{offer.conditions}</p>
              </div>
            )}

            {/* Pre-Validation UI - Condition Check */}
            <div className="pt-6 border-t">
              {user?.role === 'employee' && (
                <div className="space-y-6">
                  {/* Eligibility Card */}
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Vérification des conditions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Balance Display */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Votre solde disponible:</span>
                        <span className={`font-bold ${(balance?.remaining_leave || 0) < 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance?.remaining_leave || 0} jours
                        </span>
                      </div>
                      
                      {/* Required Days */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Jours requis pour cette offre:</span>
                        <span className="font-medium">{days} jours</span>
                      </div>
                      
                      <div className="border-t pt-3 space-y-2">
                        {/* Balance Check */}
                        <div className="flex items-center gap-2 text-sm">
                          {(balance?.remaining_leave || 0) >= days ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={(balance?.remaining_leave || 0) >= days ? 'text-green-700' : 'text-red-700'}>
                            {(balance?.remaining_leave || 0) >= days ? 'Solde suffisant' : 'Solde insuffisant'}
                          </span>
                        </div>
                        
                        {/* Existing Application Check */}
                        <div className="flex items-center gap-2 text-sm">
                          {!existingRequest ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={!existingRequest ? 'text-green-700' : 'text-red-700'}>
                            {!existingRequest ? 'Pas de demande en cours' : 'Déjà postulé à cette offre'}
                          </span>
                        </div>
                        
                        {/* Availability Check */}
                        <div className="flex items-center gap-2 text-sm">
                          {spotsAvailable > 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={spotsAvailable > 0 ? 'text-green-700' : 'text-red-700'}>
                            {spotsAvailable > 0 ? `${spotsAvailable} places disponibles` : 'Offre complète'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Calendar for Date Selection */}
                  <OfferCalendar
                    availableRange={{
                      start: offer.start_date,
                      end: offer.end_date
                    }}
                    onSelect={(range) => setSelectedRange(range)}
                    disabled={submitting}
                  />

                  {/* Warning Message */}
                  {(!((balance?.remaining_leave || 0) >= days) || existingRequest || spotsAvailable === 0) && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Vous ne remplissez pas les conditions pour postuler à cette offre.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Apply Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={
                      spotsAvailable === 0 || 
                      submitting || 
                      offer.status !== 'active' ||
                      existingRequest ||
                      (balance?.remaining_leave || 0) < days
                    }
                    onClick={handleApply}
                  >
                    {submitting
                      ? 'Candidature en cours...'
                      : spotsAvailable === 0
                      ? 'Offre complète'
                      : offer.status !== 'active'
                      ? 'Offre inactive'
                      : existingRequest
                      ? 'Déjà postulé'
                      : (balance?.remaining_leave || 0) < days
                      ? 'Solde insuffisant'
                      : 'Postuler à cette offre'}
                  </Button>
                </div>
              )}
              
              {user?.role !== 'employee' && (
                <p className="text-center text-muted-foreground text-sm">
                  Seuls les employés peuvent postuler à cette offre
                </p>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
