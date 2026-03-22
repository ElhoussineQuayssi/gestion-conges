import { getCurrentUser } from '@/lib/auth';
import { getActiveOffers } from '@/lib/db';
import { Navigation } from '@/components/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPriceMAD } from '@/lib/utils';

export default async function OffersPage() {
  const user = await getCurrentUser();
  const offers = await getActiveOffers();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div>
      <Navigation user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Offres de Vacances</h1>
          <p className="text-muted-foreground">
            Découvrez les destinations exclusives proposées par votre entreprise
          </p>
        </div>

        {offers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Aucune offre disponible pour le moment</p>
                {user?.role === 'hr_admin' && (
                  <Link href="/admin/offers">
                    <Button variant="outline">Créer une offre</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                <TableRow>
                  <TableHead className="w-[80px]">Photo</TableHead>
                  <TableHead className="w-[200px]">Titre</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Durée</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-center">Places</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => {
                  const days = calculateDays(offer.start_date, offer.end_date);
                  const spotsAvailable = offer.max_participants - offer.current_participants;
                  const isAlmostFull = spotsAvailable <= 3;

                  return (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div className="w-16 h-12 rounded overflow-hidden bg-muted">
                          {offer.images && offer.images.length > 0 ? (
                            <img
                              src={offer.images[0]}
                              alt={offer.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              N/A
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{offer.title}</div>
                          {offer.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
                              {offer.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{offer.destination}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(offer.start_date)} - {formatDate(offer.end_date)}
                      </TableCell>
                      <TableCell className="text-right">{days} jour{days !== 1 ? 's' : ''}</TableCell>
                      <TableCell className="text-right font-medium">{formatPriceMAD(offer.price)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={isAlmostFull ? 'destructive' : 'outline'}>
                          {spotsAvailable} place{spotsAvailable !== 1 ? 's' : ''}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {offer.current_participants}/{offer.max_participants}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!user ? (
                          <Link href="/login">
                            <Button variant="outline" size="sm">
                              Se connecter
                            </Button>
                          </Link>
                        ) : user.role === 'employee' ? (
                          <Link href={`/employee/offers/${offer.id}`}>
                            <Button size="sm">
                              Voir détails
                            </Button>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Réservé employés
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
