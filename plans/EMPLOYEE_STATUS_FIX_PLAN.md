# Employee Status Toggle Issue - Analysis & Fix Plan

## Issue Summary
When clicking "Désactiver" (Deactivate) on an employee, the status is not changing in the UI, even though a success toast is displayed. When the employee is already inactive, the button should change to "Activer" (Activate).

## Root Cause Analysis

After deep analysis of the codebase, I've identified that the issue is in the **frontend component** at [`app/owner/employees/page.tsx`](app/owner/employees/page.tsx). The problem is in how the status toggle button determines its text and behavior.

Looking at lines 462-473 in the frontend:
```typescript
<Button
  variant="outline"
  size="sm"
  className={employee.status === 'active' ? 'text-orange-600' : 'text-green-600'}
  onClick={() => {
    setStatusTargetEmployeeId(employee.id);
    setStatusAction(employee.status === 'active' ? 'deactivate' : 'activate');
    setStatusDialogOpen(true);
  }}
>
  {employee.status === 'active' ? 'Désactiver' : 'Réactiver'}
</Button>
```

The button text logic shows:
- "Désactiver" when status is 'active'
- "Réactiver" when status is NOT 'active' (i.e., 'inactive')

However, there's a potential race condition or state synchronization issue:
1. The status change API call succeeds
2. `fetchEmployees()` is called to refresh the list
3. But the state update might not be properly reflecting the changes

## Fix Plan

### Step 1: Verify the API is working correctly
Check if the PATCH request is properly updating the database by examining the [`lib/db.ts`](lib/db.ts:1139) `setEmployeeStatus` function.

### Step 2: Fix frontend state management
The issue is likely that after calling `fetchEmployees()`, the component state needs to be properly refreshed. We may need to:
- Add proper error handling in the API response
- Ensure the employee list is refreshed immediately after status change

### Step 3: Test the fix
Verify that:
- Clicking "Désactiver" changes the employee status to "inactive"
- The button text changes to "Réactiver" after deactivation
- Clicking "Réactiver" changes the status back to "active"
- The UI reflects the correct status after each action

## Files to Modify

1. **[`app/owner/employees/page.tsx`](app/owner/employees/page.tsx)** - Main employee management page
   - Ensure proper state refresh after status change
   - Verify the button text logic is correct

2. **[`lib/db.ts`](lib/db.ts:1139)** - Database functions (if needed)
   - May need to add logging to verify status updates

3. **[`app/api/owner/employees/[id]/route.ts`](app/api/owner/employees/[id]/route.ts)** - API endpoint (if needed)
   - May need to add response data with updated status

## Implementation Notes

The current database shows employees with status "inactive" already:
- Employee ID 1: Jean Employé - status: "inactive"
- Employee ID 5: emp - status: "inactive"

When trying to deactivate an already inactive employee, the code returns success but doesn't make changes. This is expected behavior, but the UI should still show the correct button state.

The key fix will be in the frontend to ensure the employee list is properly refreshed and the button text correctly reflects the current status.
