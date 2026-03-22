/**
 * Standardized Refusal Reasons
 * Used for HR rejection workflow
 */

export const REFUSAL_REASONS = [
  { 
    value: 'insufficient_balance', 
    label: 'Solde de congés insuffisant',
    description: 'Le collaborateur ne dispose pas suffisamment de jours de congés'
  },
  { 
    value: 'spots_full', 
    label: 'Places épuisées pour cette offre',
    description: 'Le nombre maximum de participants a été atteint'
  },
  { 
    value: 'dates_unavailable', 
    label: 'Dates non disponibles',
    description: 'Les dates demandées ne sont pas disponibles'
  },
  { 
    value: 'deadline_passed', 
    label: 'Date limite de candidature dépassée',
    description: 'La date limite pour postuler est passée'
  },
  { 
    value: 'eligibility', 
    label: "Non éligible à l'offre",
    description: "Le collaborateur ne répond pas aux critères d'éligibilité"
  },
  { 
    value: 'other', 
    label: 'Autre (préciser)',
    description: 'Raison personnalisée à spécifier'
  },
] as const;

export type RefusalReasonValue = typeof REFUSAL_REASONS[number]['value'];

/**
 * Get the label for a refusal reason value
 */
export function getRefusalReasonLabel(value: string): string {
  const reason = REFUSAL_REASONS.find(r => r.value === value);
  return reason?.label || value;
}

/**
 * Get a refusal reason by value
 */
export function getRefusalReason(value: string) {
  return REFUSAL_REASONS.find(r => r.value === value);
}
