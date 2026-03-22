'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavigationProps {
  user: {
    id: number;
    email: string;
    full_name: string;
    role: 'employee' | 'hr_admin' | 'owner';
  } | null;
}

export function Navigation({ user }: NavigationProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('[v0] Erreur lors de la déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const roleNames = {
    employee: 'Employé',
    hr_admin: 'Admin RH',
    owner: 'Propriétaire'
  };

  if (!user) {
    return (
      <nav className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Gestion des Congés
          </Link>
          <Link href="/login">
            <Button variant="outline">Se connecter</Button>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-semibold text-lg">
            Gestion des Congés
          </Link>
          <div className="hidden md:flex gap-4">
            {user.role === 'employee' && (
              <>
                <Link href="/employee/dashboard" className="text-sm hover:text-primary">
                  Tableau de bord
                </Link>
                <Link href="/employee/offers" className="text-sm hover:text-primary">
                  Offres
                </Link>
                <Link href="/employee/history" className="text-sm hover:text-primary">
                  Historique
                </Link>
              </>
            )}
            {user.role === 'hr_admin' && (
              <>
                <Link href="/admin/dashboard" className="text-sm hover:text-primary">
                  Tableau de bord
                </Link>
                <Link href="/admin/offers" className="text-sm hover:text-primary">
                  Offres
                </Link>
                <Link href="/admin/requests" className="text-sm hover:text-primary">
                  Demandes
                </Link>
              </>
            )}
            {user.role === 'owner' && (
              <>
                <Link href="/owner/dashboard" className="text-sm hover:text-primary">
                  Tableau de bord
                </Link>
                <Link href="/owner/admins" className="text-sm hover:text-primary">
                  Gestion Admins
                </Link>
                <Link href="/owner/activity-logs" className="text-sm hover:text-primary">
                  Journaux
                </Link>
                <Link href="/owner/settings" className="text-sm hover:text-primary">
                  Paramétrage
                </Link>
              </>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="text-right">
                <div className="text-sm font-medium">{user.full_name}</div>
                <div className="text-xs text-muted-foreground">{roleNames[user.role]}</div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.full_name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} disabled={loading}>
              {loading ? 'Déconnexion...' : 'Se déconnecter'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
