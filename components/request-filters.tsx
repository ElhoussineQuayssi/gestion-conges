'use client';

import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Search, Filter, User, Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Label } from './ui/label';

interface RequestFiltersProps {
  onFiltersChange: (filters: {
    search: string;
    status: string;
    type: string;
    startDate: string;
    endDate: string;
  }) => void;
  currentFilters: {
    search: string;
    status: string;
    type: string;
    startDate: string;
    endDate: string;
  };
}

export function RequestFilters({ onFiltersChange, currentFilters }: RequestFiltersProps) {
  const [localFilters, setLocalFilters] = useState(currentFilters);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);

  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (dates: { start?: Date; end?: Date }) => {
    const newFilters = {
      ...localFilters,
      startDate: dates.start ? dates.start.toISOString().split('T')[0] : '',
      endDate: dates.end ? dates.end.toISOString().split('T')[0] : ''
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      status: 'all',
      type: 'all',
      startDate: '',
      endDate: ''
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = 
    localFilters.search !== '' ||
    localFilters.status !== 'all' ||
    localFilters.type !== 'all' ||
    localFilters.startDate !== '' ||
    localFilters.endDate !== '';

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher par nom, email ou ID..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'En cours / En attente RH', 'Acceptée', 'Refusée', 'Refus automatique'] as const).map(status => (
            <Button
              key={status}
              variant={localFilters.status === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('status', status)}
              className="text-xs"
            >
              {status === 'all' && 'Toutes'}
              {status === 'En cours / En attente RH' && 'En attente'}
              {status === 'Acceptée' && 'Approuvées'}
              {status === 'Refusée' && 'Rejetées'}
              {status === 'Refus automatique' && 'Refus auto'}
            </Button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex gap-4 flex-col md:flex-row items-end">
        {/* Type Filter */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Type de demande</Label>
          <div className="flex gap-2">
            {(['all', 'offer', 'leave'] as const).map(type => (
              <Button
                key={type}
                variant={localFilters.type === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('type', type)}
                className="text-xs"
              >
                {type === 'all' && 'Tous'}
                {type === 'offer' && 'Offre'}
                {type === 'leave' && 'Congé'}
              </Button>
            ))}
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Période de création</Label>
          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[280px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localFilters.startDate || localFilters.endDate ? (
                  <span>
                    {localFilters.startDate && `Du ${localFilters.startDate}`}
                    {localFilters.endDate && ` au ${localFilters.endDate}`}
                  </span>
                ) : (
                  <span>Sélectionner une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b">
                <div className="text-sm font-medium">Période de création</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Sélectionnez la date de début et de fin
                </div>
              </div>
              <CalendarComponent
                mode="range"
                selected={{
                  from: localFilters.startDate ? new Date(localFilters.startDate) : undefined,
                  to: localFilters.endDate ? new Date(localFilters.endDate) : undefined
                }}
                onSelect={(range) => {
                  handleDateRangeChange({
                    start: range?.from,
                    end: range?.to
                  });
                }}
                initialFocus
              />
              <div className="p-3 flex justify-between border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleDateRangeChange({ start: undefined, end: undefined });
                    setDateRangeOpen(false);
                  }}
                >
                  Effacer
                </Button>
                <Button
                  size="sm"
                  onClick={() => setDateRangeOpen(false)}
                >
                  Appliquer
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Clear Filters */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">Actions</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="text-xs"
            >
              <X className="w-4 h-4 mr-1" />
              Effacer les filtres
            </Button>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtres actifs:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {localFilters.search && (
              <Badge variant="secondary" className="text-xs">
                Recherche: "{localFilters.search}"
              </Badge>
            )}
            {localFilters.status !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Statut: {localFilters.status === 'En cours / En attente RH' ? 'En attente' : 
                       localFilters.status === 'approved' ? 'Approuvée' : 'Rejetée'}
              </Badge>
            )}
            {localFilters.type !== 'all' && (
              <Badge variant="secondary" className="text-xs">
                Type: {localFilters.type === 'offer' ? 'Offre' : 'Congé'}
              </Badge>
            )}
            {(localFilters.startDate || localFilters.endDate) && (
              <Badge variant="secondary" className="text-xs">
                Période: {localFilters.startDate || 'Début'} - {localFilters.endDate || 'Fin'}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="ml-auto text-xs"
          >
            Tout effacer
          </Button>
        </div>
      )}
    </div>
  );
}