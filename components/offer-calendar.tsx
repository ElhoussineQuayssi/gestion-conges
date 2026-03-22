'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface OfferCalendarProps {
  availableRange: {
    start: string;
    end: string;
  };
  onSelect: (range: { from: Date; to: Date } | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function OfferCalendar({
  availableRange,
  onSelect,
  disabled = false,
  className
}: OfferCalendarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  const disabledDays = {
    before: new Date(availableRange.start),
    after: new Date(availableRange.end),
  };

  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    
    if (range?.from && range?.to) {
      onSelect({ from: range.from, to: range.to });
    } else {
      onSelect(undefined);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Choisir vos dates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleSelect}
            disabled={disabled ? disabledDays : undefined}
            numberOfMonths={1}
            className="rounded-md border"
            locale={fr}
            fromDate={new Date(availableRange.start)}
            toDate={new Date(availableRange.end)}
          />
        </div>
        
        {dateRange?.from && dateRange?.to && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium">
                Sélection: {formatDate(dateRange.from)} au {formatDate(dateRange.to)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {Math.ceil(
                (dateRange.to.getTime() - dateRange.from.getTime()) / 
                (1000 * 60 * 60 * 24)
              ) + 1} jour(s)
            </div>
          </div>
        )}
        
        {!dateRange?.from && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="w-4 h-4" />
              <span>Sélectionnez une période dans le calendrier</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Période disponible: {new Date(availableRange.start).toLocaleDateString('fr-FR')} - {new Date(availableRange.end).toLocaleDateString('fr-FR')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
