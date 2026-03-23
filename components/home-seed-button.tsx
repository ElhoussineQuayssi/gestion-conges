'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SeedResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  users?: Array<{ email: string; password: string }>;
};

export function HomeSeedButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<SeedResponse['users']>(null);

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/seed', { method: 'POST' });
      const data = (await response.json()) as SeedResponse;

      if (!response.ok) {
        setError(data.error || data.message || 'Une erreur est survenue pendant le seeding.');
        setLoading(false);
        return;
      }

      setMessage(data.message || 'Base de donnees prete avec des donnees de demo.');
      setCredentials(data.users || null);
      router.refresh();
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={handleSeed} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Chargement des donnees...' : 'Seeder la base'}
        </Button>
      </div>

      {message && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {credentials && credentials.length > 0 && (
        <div className="rounded-lg border bg-background/80 p-4 text-sm">
          <p className="mb-3 font-semibold">Comptes de test</p>
          <div className="space-y-2">
            {credentials.map((credential) => (
              <div key={credential.email}>
                <p><strong>Email:</strong> {credential.email}</p>
                <p><strong>Mot de passe:</strong> {credential.password}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
