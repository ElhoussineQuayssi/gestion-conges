'use client';

import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface PlacesBadgeProps {
  maxParticipants: number;
  currentParticipants: number;
  showDetails?: boolean;
  className?: string;
  compact?: boolean;
}

export function PlacesBadge({
  maxParticipants,
  currentParticipants,
  showDetails = true,
  className = '',
  compact = false,
}: PlacesBadgeProps) {
  const spotsAvailable = maxParticipants - currentParticipants;
  const isFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  
  // Determine badge variant based on availability
  const getVariant = () => {
    if (isFull) return 'destructive';  // Red - Complet
    if (spotsAvailable <= 3) return 'warning';       // Orange - Almost full
    return 'success';                                // Green - Available
  };

  const getLabel = () => {
    return `${currentParticipants}/${maxParticipants}`;
  };

  const getDetailsLabel = () => {
    if (isFull) return 'Complet';
    return `${spotsAvailable} place${spotsAvailable !== 1 ? 's' : ''} restante${spotsAvailable !== 1 ? 's' : ''}`;
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <Badge 
        variant={getVariant()} 
        className={compact ? 'flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium' : 'flex items-center gap-1.5 px-3 py-1 text-sm font-medium'}
      >
        <Users className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {getLabel()}
      </Badge>
      {showDetails && (
        <span className={compact ? `text-[11px] ${isFull ? 'text-red-600' : 'text-muted-foreground'}` : `text-xs ${isFull ? 'text-red-600' : 'text-muted-foreground'}`}>
          {getDetailsLabel()}
        </span>
      )}
    </div>
  );
}
