// Build timestamp: 2026-03-20T00:00:00Z - Forces rebuild
import { getCurrentUser } from '@/lib/auth';
import { Navigation } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDashboardRoute } from '@/lib/utils';
import Link from 'next/link';
import { 
  CalendarDays, 
  Building2, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Users,
  Heart,
  Search,
  Plane,
  PartyPopper
} from 'lucide-react';

async function initializeDatabase() {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/check-init`, {
      method: 'GET',
      cache: 'no-store'
    });
  } catch (error) {
    console.log('[v0] Auto-init check failed (expected if DB already initialized)');
  }
}

export default async function Home() {
  // Auto-initialize database on first load
  await initializeDatabase();
  
  const user = await getCurrentUser();
  const dashboardHref = getDashboardRoute(user?.role);

  return (
    <div>
      {user ? (
        // Logged in view - only show dashboard button
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Bienvenue sur la plateforme</h1>
            <p className="text-muted-foreground mb-6">Vous êtes déjà connecté</p>
            <Link href={dashboardHref}>
              <Button size="lg">Aller au Dashboard</Button>
            </Link>
          </div>
        </div>
      ) : (
        // Not logged in - show full page with navigation
        <>
          <Navigation user={user} />
          
          <main>
        {/* Internal Use Badge - Local Network Only */}
        <div className="bg-primary/10 border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="border-primary/30 bg-primary/20 px-2.5 py-0.5 text-xs text-primary">
                <Building2 className="w-3 h-3 mr-1" />
                Accès Réservé - Réseau Interne Fenie Brossette Maroc
              </Badge>
            </div>
            <div className="flex items-center justify-center mt-1">
              <span className="text-xs text-muted-foreground">Cette plateforme est accessible uniquement depuis le réseau local de l'entreprise</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="border-b bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
            <div className="max-w-2xl">
              <h1 className="mb-5 text-3xl font-bold text-balance md:text-4xl">
                Plateforme de Gestion des Congés et Offres de Vacances
              </h1>
              <p className="mb-4 text-base text-muted-foreground md:text-lg">
                Outil interne de gestion des congés et des offres de vacances pour les employés de Fenie Brossette Maroc.
              </p>
              <p className="mb-4 text-sm font-medium text-primary md:text-base">
                Cette plateforme permet aux employés de consulter les offres de vacances et de soumettre des demandes de congés, tandis que le service RH peut gérer les soldes et les validations.
              </p>
              {!user && (
                <>
                  <div className="mb-5 flex gap-3">
                    <Link href="/login">
                      <Button size="lg">Se Connecter</Button>
                    </Link>
                    <Link href="/setup">
                      <Button size="lg" variant="outline">Configuration initiale</Button>
                    </Link>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Les statuts détaillés des offres et la soumission de demandes nécessitent une connexion.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* À propos de cette plateforme */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-18">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="mb-5 flex items-center justify-center gap-2 text-2xl font-bold">
              <Sparkles className="w-6 h-6 text-primary" />
              À propos de cette plateforme
            </h2>
            <Card className="bg-muted/20 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-6">
                  Cette plateforme intranet est un outil interne réservé aux employés de <strong>Fenie Brossette Maroc</strong>. Elle permet de gérer les congés et de bénéficier d'offres de vacances exclusives négociées par l'entreprise.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 text-left">
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Qui peut accéder ?</p>
                      <p className="text-sm text-muted-foreground">Les salariés Fenie Brossette Maroc munis de leurs identifiants</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Heart className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Notre objectif</p>
                      <p className="text-sm text-muted-foreground">Centraliser les offres, simplifier les demandes et visualiser les validations</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Fonctionnalités / Benefits Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="mb-10">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">Fonctionnalités principales</h2>
            <p className="text-muted-foreground">
              Une solution complète pour optimiser la gestion des ressources humaines
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Gestion des Congés</CardTitle>
                </div>
                <CardDescription>
                  Soumettez vos demandes en quelques clics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Soumettez vos demandes de congés en quelques clics, sans paperasse. Suivez l'état de vos demandes en temps réel.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Plane className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Offres de Vacances</CardTitle>
                </div>
                <CardDescription>
                  Des destinations exclusives à prix négociés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Accédez à des offres exclusives négociées par votre entreprise. Profitez de tarifs préférentiels sur des destinations de rêve.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Suivi en Temps Réel</CardTitle>
                </div>
                <CardDescription>
                  Restez informé à chaque étape
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Consultez votre solde de congés à jour et recevez des notifications sur l'avancement de vos demandes.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bg-muted/30 border-t border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
            <div className="mb-10 text-center">
              <h2 className="mb-4 text-2xl font-bold md:text-3xl">Comment ça marche</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Le processus pour bénéficier des offres de vacances est simple et transparent
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="text-center relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-2">01</div>
                <h3 className="font-semibold mb-2">Découvrez</h3>
                <p className="text-sm text-muted-foreground">
                  Parcourez les offres publiées par votre entreprise
                </p>
                <ArrowRight className="w-5 h-5 text-muted-foreground mx-auto mt-4 md:hidden" />
              </div>

              {/* Arrow connector (desktop only) */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-muted-300" />
              </div>

              {/* Step 2 */}
              <div className="text-center relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-2">02</div>
                <h3 className="font-semibold mb-2">Vérifiez</h3>
                <p className="text-sm text-muted-foreground">
                  Assurez-vous d'avoir suffisamment de jours de congés disponibles
                </p>
                <ArrowRight className="w-5 h-5 text-muted-foreground mx-auto mt-4 md:hidden" />
              </div>

              {/* Arrow connector (desktop only) */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-muted-300" />
              </div>

              {/* Step 3 */}
              <div className="text-center relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-2">03</div>
                <h3 className="font-semibold mb-2">Postulez</h3>
                <p className="text-sm text-muted-foreground">
                  Faites une demande pour l'offre qui vous intéresse
                </p>
                <ArrowRight className="w-5 h-5 text-muted-foreground mx-auto mt-4 md:hidden" />
              </div>

              {/* Arrow connector (desktop only) */}
              <div className="hidden md:flex items-center justify-center">
                <ArrowRight className="w-8 h-8 text-muted-300" />
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PartyPopper className="w-8 h-8 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary mb-2">04</div>
                <h3 className="font-semibold mb-2">Profitez</h3>
                <p className="text-sm text-muted-foreground">
                  Après approbation, vos congés sont réservés automatiquement
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Notre Entreprise */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold">Notre Entreprise</h2>
            </div>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="font-semibold text-lg mb-4">Fenie Brossette Maroc</p>
                <p className="text-muted-foreground mb-6">
                  Nous nous engageons à offrir à nos employés une expérience RH exceptionnelle. 
                  Cette plateforme fait partie de notre démarche continue pour améliorer le bien-être 
                  et la satisfaction de nos équipes.
                </p>
                <p className="text-muted-foreground">
                  En proposant des avantages vacances exclusifs et en simplifiant la gestion des congés, 
                  nous voulons vous permettre de profiter pleinement de vos moments de repos.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Admin Section */}
        <section className="bg-muted/30 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-4">Pour les Administrateurs</h2>
              <p className="text-muted-foreground">
                Outils puissants pour gérer l'ensemble de votre plateforme
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gestion des Offres</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Créez, modifiez et supprimez les offres de vacances. Gérez les places disponibles et les prix.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Validation des Demandes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Approuvez ou rejetez les demandes de congés et les inscriptions aux offres avec un contrôle complet.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Gestion des Soldes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Suivez et ajustez les soldes de congés annuels pour chaque employé.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rapports et Statistiques</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Consultez les rapports détaillés sur l'utilisation des congés et les participations aux offres.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted/30 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © 2024 Fenie Brossette Maroc - Plateforme de gestion RH interne - accès réservé aux salariés
              </p>
              <div className="flex gap-6">
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
                  À propos
                </Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
                  Contact
                </Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary">
                  Mentions légales
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
      </>
      )}
    </div>
  );
}
