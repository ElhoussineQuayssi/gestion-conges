/**
 * Shared type definitions for the application
 */

/**
 * Offer type used across the application
 * Used by offer filters, dashboard, and employee pages
 */
export interface Offer {
  id: number;
  title: string;
  description?: string;
  destination?: string;
  start_date: string;
  end_date?: string;
  duration?: string | null;
  price?: number;
  max_participants?: number;
  current_participants?: number;
  status?: string;
  created_by?: number;
}
