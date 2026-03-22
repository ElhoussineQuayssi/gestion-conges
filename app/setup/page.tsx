'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);

  const handleInitialize = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/init', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Une erreur est survenue');
        setLoading(false);
        return;
      }

      setCredentials(data.users);
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-2">Configuration initiale</h1>
          <p className="text-muted-foreground mb-6">
            Cliquez sur le bouton ci-dessous pour initialiser la base de données avec des données de test.
          </p>

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Base de données initialisée avec succès!
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {credentials && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border">
              <h3 className="font-semibold mb-3">Identifiants de test:</h3>
              <div className="space-y-2">
                {credentials.map((cred: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <p><strong>Email:</strong> {cred.email}</p>
                    <p><strong>Mot de passe:</strong> {cred.password}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleInitialize}
            disabled={loading || success}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success ? 'Base initialisée ✓' : 'Initialiser la base de données'}
          </Button>

          {success && (
            <Button
              onClick={() => (window.location.href = '/login')}
              className="w-full mt-2"
              variant="outline"
            >
              Aller à la connexion
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
