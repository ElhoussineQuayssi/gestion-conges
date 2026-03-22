'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getDashboardRoute } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-initialize database on component mount
  useEffect(() => {
    const initDb = async () => {
      try {
        await fetch('/api/check-init', { method: 'GET' });
      } catch (err) {
        console.log('[v0] DB check failed (expected if already initialized)');
      }
    };
    initDb();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      console.log('[v0] Login response:', { status: response.status, data });

      if (!response.ok) {
        setError(data.error || 'Erreur de connexion');
        console.log('[v0] Login failed:', data.error);
        return;
      }

      console.log('[v0] Login successful, user:', data.user);
      // Redirection basée sur le rôle
      // IMPORTANT: Use window.location.href instead of router.push() to ensure
      // the session cookie is properly set before the navigation occurs.
      // router.push() is a client-side navigation that can cause the cookie
      // to not be available on the first server request, causing a brief flash
      // of the login page before the redirect kicks in.
      const dashboardHref = getDashboardRoute(data.user.role);
      console.log(`[v0] Redirecting to ${dashboardHref}`);
      window.location.href = dashboardHref;
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Accédez à votre espace personnel de gestion des congés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Identifiants de test:
            </p>
            <div className="space-y-2 text-xs">
              <div>
                <strong>Employé:</strong> employee@example.com / Employee123!
              </div>
              <div>
                <strong>Admin RH:</strong> admin@example.com / Admin123!
              </div>
              <div>
                <strong>Owner:</strong> owner@example.com / Owner123!
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
