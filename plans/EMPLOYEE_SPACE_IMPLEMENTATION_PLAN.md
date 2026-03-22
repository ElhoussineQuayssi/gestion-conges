# Espace Employé - Implementation Plan

## Overview

This document outlines the implementation of two missing features identified in the audit:
1. **Offer Slot Selection Calendar** - Allow employees to select date ranges within an offer's available window
2. **Pre-Validation UI** - Show condition status before submission

---

## Feature 1: Offer Slot Selection Calendar

### Purpose
Allow employees to select specific date ranges within an offer's available period, rather than applying to the entire fixed period.

### Files to Create/Modify

#### 1. New Component: `components/offer-calendar.tsx`

**Purpose:** Reusable calendar component for offer date selection

**Props Interface:**
```typescript
interface OfferCalendarProps {
  availableRange: {
    start: string;  // ISO date string
    end: string;    // ISO date string
  };
  onSelect: (range: { from: Date; to: Date } | undefined) => void;
  disabled?: boolean;
}
```

**Features:**
- Range selection mode (from/to dates)
- Restrict selection to offer's available window
- Visual feedback for selected range
- French locale support
- Disabled state support

**Dependencies:**
- `components/ui/calendar.tsx` (existing)
- `date-fns` (already installed)
- `lucide-react` (already installed)

---

#### 2. Modify: `app/employee/offers/[id]/page.tsx`

**Current State:**
- Shows offer details
- Apply button submits immediately with fixed offer dates

**Required Changes:**

1. **Add State Management:**
```typescript
const [selectedRange, setSelectedRange] = useState<{ from: Date; to: Date } | undefined>();
const [showCalendar, setShowCalendar] = useState(false);
```

2. **Add Conditional Calendar Display:**
- Show calendar when user clicks "Select Dates" (if offer allows flexibility)
- OR always show calendar for offers with `flexible_dates` flag

3. **Update Apply Handler:**
- Include selected dates in POST request
- Validate dates are selected before submission

4. **API Payload Update:**
```typescript
body: JSON.stringify({
  offer_id: offer.id,
  type: 'offer',
  selected_start_date: selectedRange?.from?.toISOString(),
  selected_end_date: selectedRange?.to?.toISOString()
})
```

---

#### 3. Modify: `app/api/requests/route.ts`

**Current State:**
- Validates offer availability, deadline, capacity
- Uses fixed offer dates

**Required Changes:**

1. **Handle Selected Dates:**
```typescript
if (data.type === 'offer' && data.offer_id) {
  // ... existing validation ...
  
  // Validate selected dates if provided
  if (data.selected_start_date && data.selected_end_date) {
    const selectedStart = new Date(data.selected_start_date);
    const selectedEnd = new Date(data.selected_end_date);
    const offerStart = new Date(offer.start_date);
    const offerEnd = new Date(offer.end_date);
    
    // Validate selected range is within offer window
    if (selectedStart < offerStart || selectedEnd > offerEnd) {
      autoRejectionReason = 'Dates sélectionnées hors de la période de l\'offre';
      requestStatus = 'Refus automatique';
    }
    
    // Validate duration doesn't exceed balance
    const days = Math.ceil((selectedEnd.getTime() - selectedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const balance = await getLeaveBalance(user.id);
    if (days > balance.remaining_leave) {
      autoRejectionReason = `Solde insuffisant pour la durée sélectionnée. Disponible: ${balance.remaining_leave} jours`;
      requestStatus = 'Refus automatique';
    }
  }
}
```

---

#### 4. Modify: `lib/db.ts` (Request Interface)

**Add Fields:**
```typescript
export interface Request {
  id: number;
  user_id: number;
  offer_id: number | null;
  type: 'offer' | 'leave';
  start_date: string | null;
  end_date: string | null;
  selected_start_date: string | null;  // NEW: For offer date selection
  selected_end_date: string | null;    // NEW: For offer date selection
  reason: string | null;
  status: RequestStatus;
  auto_rejection_reason: string | null;
  created_at: string;
  approval_date: string | null;
  approval_reason: string | null;
}
```

---

## Feature 2: Pre-Validation UI

### Purpose
Show users their eligibility status BEFORE they submit a request, preventing frustration from post-submission rejections.

### Files to Modify

#### 1. Modify: `app/employee/offers/[id]/page.tsx`

**Add Pre-Validation Section:**

```typescript
// Fetch user's balance and existing applications
const [userBalance, setUserBalance] = useState<number>(0);
const [existingRequest, setExistingRequest] = useState<boolean>(false);
const [checkingEligibility, setCheckingEligibility] = useState(true);

useEffect(() => {
  const checkEligibility = async () => {
    const [balanceRes, requestsRes] = await Promise.all([
      fetch('/api/leave-balance'),
      fetch('/api/requests')
    ]);
    
    const balanceData = await balanceRes.json();
    const requestsData = await requestsRes.json();
    
    setUserBalance(balanceData.balance?.remaining_leave || 0);
    
    // Check if already applied to this offer
    const hasApplied = requestsData.requests?.some(
      (r: any) => r.offer_id === offerId && 
                  r.status !== 'Refusée' && 
                  r.status !== 'Refus automatique'
    );
    setExistingRequest(hasApplied);
    setCheckingEligibility(false);
  };
  
  if (offer) checkEligibility();
}, [offer, offerId]);
```

**Add Validation UI Component:**

```typescript
const OfferEligibilityCard = () => {
  const offerDays = Math.ceil(
    (new Date(offer.end_date).getTime() - new Date(offer.start_date).getTime()) / 
    (1000 * 60 * 60 * 24)
  ) + 1;
  
  const hasEnoughBalance = userBalance >= offerDays;
  const canApply = hasEnoughBalance && !existingRequest && spotsAvailable > 0;
  
  return (
    <div className="p-4 bg-muted rounded-lg border">
      <h3 className="font-semibold mb-3">Vérification des conditions</h3>
      
      {/* Balance Check */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm">Votre solde disponible:</span>
        <span className={`font-bold ${userBalance < 5 ? 'text-red-600' : 'text-green-600'}`}>
          {userBalance} jours
        </span>
      </div>
      
      {/* Required Days */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm">Jours requis pour cette offre:</span>
        <span className="font-medium">{offerDays} jours</span>
      </div>
      
      {/* Status Icons */}
      <div className="space-y-2 mt-3 pt-3 border-t">
        <div className="flex items-center gap-2 text-sm">
          {hasEnoughBalance ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className={hasEnoughBalance ? 'text-green-700' : 'text-red-700'}>
            {hasEnoughBalance ? 'Solde suffisant' : 'Solde insuffisant'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {!existingRequest ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className={!existingRequest ? 'text-green-700' : 'text-red-700'}>
            {!existingRequest ? 'Pas de demande en cours' : 'Déjà postulé à cette offre'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          {spotsAvailable > 0 ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600" />
          )}
          <span className={spotsAvailable > 0 ? 'text-green-700' : 'text-red-700'}>
            {spotsAvailable > 0 ? `${spotsAvailable} places disponibles` : 'Offre complète'}
          </span>
        </div>
      </div>
      
      {/* Warning Message */}
      {!canApply && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Vous ne remplissez pas les conditions pour postuler à cette offre.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Apply Button */}
      <Button
        className="w-full mt-4"
        size="lg"
        disabled={!canApply || submitting}
        onClick={handleApply}
      >
        {submitting ? 'Candidature en cours...' : 
         !canApply ? 'Conditions non remplies' : 
         'Postuler à cette offre'}
      </Button>
    </div>
  );
};
```

---

## Implementation Steps

### Step 1: Create Offer Calendar Component
1. Create `components/offer-calendar.tsx`
2. Import and test with sample data
3. Verify range selection works

### Step 2: Update Offer Detail Page
1. Add pre-validation logic
2. Add eligibility card component
3. Integrate calendar component
4. Update apply handler

### Step 3: Update API Route
1. Handle selected dates in POST request
2. Add date validation logic
3. Update balance check for selected range

### Step 4: Update Database Schema
1. Add `selected_start_date` and `selected_end_date` to Request interface
2. Update `data/db.json` schema (if using JSON DB)

### Step 5: Update Request Display
1. Show selected dates in dashboard table
2. Show selected dates in request modal

---

## UI Mockup

```
┌─────────────────────────────────────────────┐
│  ← Retour aux offres                        │
├─────────────────────────────────────────────┤
│                                             │
│  Offer Title                    [Disponible]│
│  Destination                                │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Description...                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  VÉRIFICATION DES CONDITIONS        │   │
│  │                                     │   │
│  │  Votre solde:        15 jours ✓     │   │
│  │  Jours requis:       7 jours        │   │
│  │                                     │   │
│  │  ✓ Solde suffisant                  │   │
│  │  ✓ Pas de demande en cours          │   │
│  │  ✓ 8 places disponibles             │   │
│  │                                     │   │
│  │  [CHOISIR MES DATES]                │   │
│  │                                     │   │
│  │  ┌─────────────────────────────┐   │   │
│  │  │      [CALENDAR]             │   │   │
│  │  │   July 2026                 │   │   │
│  │  │   ...                       │   │   │
│  │  └─────────────────────────────┘   │   │
│  │                                     │   │
│  │  Sélection: 05/07 au 12/07          │   │
│  │                                     │   │
│  │  [POSTULER À CETTE OFFRE]           │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Testing Checklist

### Offer Calendar
- [ ] Calendar displays within offer date range
- [ ] Range selection works correctly
- [ ] Invalid ranges are blocked
- [ ] Selected dates display in UI
- [ ] Dates submit correctly to API

### Pre-Validation UI
- [ ] Balance displays correctly
- [ ] Eligibility updates when balance changes
- [ ] Existing application detection works
- [ ] Apply button disabled when ineligible
- [ ] Warning messages display correctly

### API Integration
- [ ] Selected dates validated server-side
- [ ] Balance check uses selected range
- [ ] Auto-rejection works for invalid dates
- [ ] Request created with selected dates

---

## Notes

1. **JavaScript vs TypeScript:** The examples above use TypeScript for clarity. If converting to JavaScript, remove type annotations and interfaces.

2. **Backward Compatibility:** The changes should maintain compatibility with existing requests that don't have selected dates (use offer default dates).

3. **Mobile Responsiveness:** Ensure calendar works well on mobile devices (may need touch-friendly sizing).

4. **Accessibility:** Add ARIA labels to calendar and validation indicators for screen readers.