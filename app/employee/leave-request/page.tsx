'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaveBalance {
  remaining_leave: number;
  used_leave: number;
  annual_leave: number;
  days_worked?: number;
  calculated_leave?: number;
  manual_adjustment?: number;
}

export default function LeaveRequestPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/leave-balance');
        const data = await response.json();
        setBalance(data.balance);
      } catch {
        setError('Erreur lors du chargement du solde');
      } finally {
        setBalanceLoading(false);
      }
    };

    if (!loading) {
      fetchBalance();
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError('Veuillez sélectionner les dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    if (balance && days > balance.remaining_leave) {
      setError(`Solde insuffisant. Vous avez ${balance.remaining_leave} jours disponibles.`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'leave',
          start_date: startDate,
          end_date: endDate,
          reason: reason || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Erreur lors de la demande');
        return;
      }

      // Handle auto-rejected requests
      if (data.autoRejected) {
        setSuccess(`Demande refusée automatiquement: ${data.message}`);
      } else {
        setSuccess('Demande de congés envoyée avec succès! Elle sera traitée par un administrateur.');
      }
      setStartDate('');
      setEndDate('');
      setReason('');

      // Rediriger après 2 secondes
      setTimeout(() => {
        router.push('/employee/dashboard');
      }, 2000);
    } catch {
      setError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || balanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Demander des congés</h1>
          <p className="text-muted-foreground">
            Soumettez votre demande de congés pour validation
          </p>
        </div>

        {/* Solde */}
        {balance && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Votre solde de congés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {(balance.annual_leave || 0) + (balance.calculated_leave || 0) + (balance.manual_adjustment || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Jours acquis (base + calculé + ajustement)</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{balance.used_leave}</div>
                  <p className="text-xs text-muted-foreground">Utilisés</p>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${balance.remaining_leave < 5 ? 'text-red-600' : ''}`}>
                    {balance.remaining_leave}
                  </div>
                  <p className="text-xs text-muted-foreground">Disponibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Nouvelle demande</CardTitle>
            <CardDescription>
              Remplissez le formulaire pour demander des congés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="startDate" className="text-sm font-medium">
                    Date de début
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="startDate"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? new Date(startDate).toLocaleDateString('fr-FR') : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate ? new Date(startDate) : undefined}
                        onSelect={(date) => setStartDate(date ? date.toISOString().split('T')[0] : '')}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label htmlFor="endDate" className="text-sm font-medium">
                    Date de fin
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="endDate"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? new Date(endDate).toLocaleDateString('fr-FR') : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate ? new Date(endDate) : undefined}
                        onSelect={(date) => setEndDate(date ? date.toISOString().split('T')[0] : '')}
                        disabled={(date) => startDate ? date < new Date(startDate) : date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {startDate && endDate && new Date(startDate) <= new Date(endDate) && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <span className="font-medium">Durée:</span>{' '}
                    {Math.ceil(
                      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 
                      (1000 * 60 * 60 * 24)
                    ) + 1} jour(s)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-medium">
                  Motif (optionnel)
                </label>
                <textarea
                  id="reason"
                  placeholder="Expliquez le motif de votre demande..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Envoi en cours...' : 'Soumettre ma demande'}
              </Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
