'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Offer } from '@/lib/types';

interface OfferFiltersProps {
  offers: Offer[];
  onFilterChange: (filtered: Offer[]) => void;
  compact?: boolean;
  embedded?: boolean;
  showSummary?: boolean;
}

interface FilterState {
  destination: string;
  dateFrom: string;
  dateTo: string;
  onlyAvailable: boolean;
}

export function OfferFilters({
  offers,
  onFilterChange,
  compact = false,
  embedded = false,
  showSummary = true,
}: OfferFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    destination: 'all',
    dateFrom: '',
    dateTo: '',
    onlyAvailable: false,
  });

  // Get unique destinations from offers
  const destinations = useMemo(() => {
    const uniqueDestinations = [...new Set(offers.map(o => o.destination || ''))];
    return uniqueDestinations.filter(d => d).sort();
  }, [offers]);

  // Apply filters whenever they change
  useEffect(() => {
    const filtered = offers.filter(offer => {
      // Destination filter
      if (filters.destination !== 'all' && offer.destination !== filters.destination) {
        return false;
      }

      // Date from filter
      if (filters.dateFrom && offer.start_date) {
        const offerStart = new Date(offer.start_date);
        const filterDate = new Date(filters.dateFrom);
        if (offerStart < filterDate) {
          return false;
        }
      }

      // Date to filter
      if (filters.dateTo && offer.end_date) {
        const offerEnd = new Date(offer.end_date);
        const filterDate = new Date(filters.dateTo);
        if (offerEnd > filterDate) {
          return false;
        }
      }

      // Availability filter
      if (filters.onlyAvailable && offer.status !== 'Disponible') {
        return false;
      }

      return true;
    });

    onFilterChange(filtered);
  }, [filters, offers, onFilterChange]);

  const handleClearFilters = () => {
    setFilters({
      destination: 'all',
      dateFrom: '',
      dateTo: '',
      onlyAvailable: false,
    });
  };

  const hasActiveFilters = 
    filters.destination !== 'all' || 
    filters.dateFrom !== '' || 
    filters.dateTo !== '' || 
    filters.onlyAvailable;

  const content = (
      <div className={embedded ? '' : compact ? 'px-6 pt-3.5 pb-6' : 'px-6 pt-4 pb-6'}>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'xl:grid-cols-2 gap-3' : 'lg:grid-cols-5 gap-4'}`}>
          {/* Destination Filter */}
          <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
            <label className="text-xs font-medium text-muted-foreground">
              Destination
            </label>
            <Select
              value={filters.destination}
              onValueChange={(value) => setFilters(prev => ({ ...prev, destination: value }))}
            >
              <SelectTrigger className={compact ? 'h-9 text-sm' : undefined}>
                <SelectValue placeholder="Toutes les destinations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les destinations</SelectItem>
                {destinations.map(dest => (
                  <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From Filter */}
          <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
            <label className="text-xs font-medium text-muted-foreground">
              À partir du
            </label>
            <div className="relative">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className={compact ? 'h-9 pr-9 text-sm' : 'pr-10'}
              />
              <Calendar className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${compact ? 'right-2.5 h-3.5 w-3.5' : 'right-3 h-4 w-4'}`} />
            </div>
          </div>

          {/* Date To Filter */}
          <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
            <label className="text-xs font-medium text-muted-foreground">
              Jusqu'au
            </label>
            <div className="relative">
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className={compact ? 'h-9 pr-9 text-sm' : 'pr-10'}
              />
              <Calendar className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${compact ? 'right-2.5 h-3.5 w-3.5' : 'right-3 h-4 w-4'}`} />
            </div>
          </div>

          {/* Availability Filter */}
          <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
            <label className="text-xs font-medium text-muted-foreground">
              Disponibilité
            </label>
            <Select
              value={filters.onlyAvailable ? 'available' : 'all'}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                onlyAvailable: value === 'available' 
              }))}
            >
              <SelectTrigger className={compact ? 'h-9 text-sm' : undefined}>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les offres</SelectItem>
                <SelectItem value="available">Disponibles uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className={compact ? 'h-9 w-full text-sm' : 'w-full'}
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Active Filters Summary */}
        {showSummary && hasActiveFilters && (
          <div className={`border-t text-muted-foreground ${compact ? 'mt-2.5 pt-2.5 text-xs' : 'mt-3 pt-3 text-sm'}`}>
            Filtres actifs: 
            {filters.destination !== 'all' && (
              <span className={`ml-1 rounded bg-primary/10 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}>
                {filters.destination}
              </span>
            )}
            {filters.dateFrom && (
              <span className={`ml-1 rounded bg-primary/10 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}>
                À partir du {format(new Date(filters.dateFrom), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
            {filters.dateTo && (
              <span className={`ml-1 rounded bg-primary/10 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}>
                Jusqu'au {format(new Date(filters.dateTo), 'dd MMM yyyy', { locale: fr })}
              </span>
            )}
            {filters.onlyAvailable && (
              <span className={`ml-1 rounded bg-green-100 text-green-800 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}`}>
                Disponible uniquement
              </span>
            )}
          </div>
        )}
      </div>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <Card className={compact ? 'mb-5' : 'mb-6'}>
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}
