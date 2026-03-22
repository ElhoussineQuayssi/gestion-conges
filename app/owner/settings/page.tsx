'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state for editable settings
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && (!user || user.role !== 'owner')) {
      router.push('/login');
      return;
    }

    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data.settings || []);
          // Initialize form data
          const initialData: Record<string, string> = {};
          data.settings?.forEach((s: SystemSetting) => {
            initialData[s.key] = s.value;
          });
          setFormData(initialData);
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "Erreur lors du chargement des paramètres",
        });
      } finally {
        setSettingsLoading(false);
      }
    };

    if (!loading) {
      fetchSettings();
    }
  }, [loading, user, router, toast]);

  const handleSave = async (key: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: formData[key] })
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error || 'Erreur lors de la sauvegarde',
        });
        return;
      }

      toast({
        description: 'Paramètre sauvegardé avec succès!',
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: 'Erreur réseau',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getSettingDetails = (key: string) => {
    const details: Record<string, { label: string; type: string; placeholder: string }> = {
      leave_calculation_days: { 
        label: 'Jours travaillés pour le calcul', 
        type: 'number', 
        placeholder: '22' 
      },
      leave_calculation_rate: { 
        label: 'Jours de congés par période', 
        type: 'number', 
        placeholder: '1.5' 
      },
      auto_rejection_enabled: { 
        label: 'Rejet automatique activé', 
        type: 'boolean', 
        placeholder: '' 
      },
      session_timeout_minutes: { 
        label: 'Délai d\'expiration de session (minutes)', 
        type: 'number', 
        placeholder: '60' 
      },
      log_retention_days: { 
        label: 'Rétention des journaux (jours)', 
        type: 'number', 
        placeholder: '90' 
      }
    };
    return details[key] || { label: key, type: 'text', placeholder: '' };
  };

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Paramètres système</h1>
        <p className="text-muted-foreground">
          Configurez les paramètres globaux de la plateforme
        </p>
      </div>

      <div className="space-y-6">
          {/* Leave Calculation Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Calcul des congés</CardTitle>
              <CardDescription>
                Configurez les règles de calcul des jours de congés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leave_calculation_days">
                    {getSettingDetails('leave_calculation_days').label}
                  </Label>
                  <Input
                    id="leave_calculation_days"
                    type="number"
                    value={formData.leave_calculation_days || ''}
                    onChange={(e) => handleInputChange('leave_calculation_days', e.target.value)}
                    placeholder={getSettingDetails('leave_calculation_days').placeholder}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nombre de jours travaillés nécessaires pour accumuler des jours de congés
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leave_calculation_rate">
                    {getSettingDetails('leave_calculation_rate').label}
                  </Label>
                  <Input
                    id="leave_calculation_rate"
                    type="number"
                    step="0.1"
                    value={formData.leave_calculation_rate || ''}
                    onChange={(e) => handleInputChange('leave_calculation_rate', e.target.value)}
                    placeholder={getSettingDetails('leave_calculation_rate').placeholder}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nombre de jours de congés accumulés par période
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => handleSave('leave_calculation_days')} 
                disabled={saving}
              >
                Sauvegarder
              </Button>
            </CardContent>
          </Card>

          {/* Request Processing Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Traitement des demandes</CardTitle>
              <CardDescription>
                Configurez le comportement des demandes de congés
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_rejection_enabled">
                    {getSettingDetails('auto_rejection_enabled').label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Rejeter automatiquement les demandes lorsque le solde est insuffisant
                  </p>
                </div>
                <Switch
                  id="auto_rejection_enabled"
                  checked={formData.auto_rejection_enabled === 'true'}
                  onCheckedChange={(checked) => handleInputChange('auto_rejection_enabled', checked.toString())}
                />
              </div>
              <Button 
                onClick={() => handleSave('auto_rejection_enabled')} 
                disabled={saving}
              >
                Sauvegarder
              </Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>
                Configurez les paramètres de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session_timeout_minutes">
                  {getSettingDetails('session_timeout_minutes').label}
                </Label>
                <Input
                  id="session_timeout_minutes"
                  type="number"
                  value={formData.session_timeout_minutes || ''}
                  onChange={(e) => handleInputChange('session_timeout_minutes', e.target.value)}
                  placeholder={getSettingDetails('session_timeout_minutes').placeholder}
                />
                <p className="text-xs text-muted-foreground">
                  Durée d'inactivité avant déconnexion automatique
                </p>
              </div>
              <Button 
                onClick={() => handleSave('session_timeout_minutes')} 
                disabled={saving}
              >
                Sauvegarder
              </Button>
            </CardContent>
          </Card>

          {/* Audit Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Journalisation</CardTitle>
              <CardDescription>
                Configurez la rétention des journaux d'activité
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="log_retention_days">
                  {getSettingDetails('log_retention_days').label}
                </Label>
                <Input
                  id="log_retention_days"
                  type="number"
                  value={formData.log_retention_days || ''}
                  onChange={(e) => handleInputChange('log_retention_days', e.target.value)}
                  placeholder={getSettingDetails('log_retention_days').placeholder}
                />
                <p className="text-xs text-muted-foreground">
                  Nombre de jours de conservation des journaux d'activité
                </p>
              </div>
              <Button 
                onClick={() => handleSave('log_retention_days')} 
                disabled={saving}
              >
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Information</h3>
          <p className="text-sm text-muted-foreground">
            Ces paramètres affectent le comportement global du système. 
            Les modifications sont appliquées immédiatement.
          </p>
        </div>
      <Toaster />
    </div>
  );
}
