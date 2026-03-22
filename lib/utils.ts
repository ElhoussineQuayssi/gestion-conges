import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPriceMAD(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const numericValue = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(numericValue)) {
    return '-';
  }

  return `${new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericValue)} MAD`;
}

export function getDashboardRoute(role: 'employee' | 'hr_admin' | 'owner' | null | undefined): string {
  switch (role) {
    case 'owner':
      return '/owner/dashboard';
    case 'hr_admin':
      return '/admin/dashboard';
    case 'employee':
      return '/employee/dashboard';
    default:
      return '/login';
  }
}

// French status labels for offers
export const offerStatusLabels: Record<string, string> = {
  'available': 'Disponible',
  'full': 'Complet',
  'active': 'En cours',
  'expired': 'Expiré / indisponible',
  'cancelled': 'Annulé',
  'inactive': 'Inactif'
};

// French status labels for requests
export const requestStatusLabels: Record<string, string> = {
  'pending': 'En attente',
  'approved': 'Approuvée',
  'rejected': 'Refusée',
  'auto_rejected': 'Refus automatique'
};

// Get French label for offer status
export function getOfferStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Inconnu';
  return offerStatusLabels[status] || status;
}

// Get French label for request status
export function getRequestStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Inconnu';
  return requestStatusLabels[status] || status;
}
