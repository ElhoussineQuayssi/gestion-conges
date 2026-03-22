# Owner Role P0 Gaps - Implementation Plan

**Date:** 2026-03-21  
**Priority:** P0 (Critical)  
**Scope:** 2 Critical Gaps from Owner Role Audit

---

## Gap 1: Admin RH Deactivate Functionality

### Current State
- Admin RH accounts can only be **permanently deleted**
- No `status` field exists on the `User` interface
- Deletion removes audit trail association

### Target State
- Admin RH accounts can be **deactivated** (soft delete)
- Reactivation possible without data loss
- Preserves full audit history

### Implementation Steps

#### 1.1 Database Schema Update
**File:** `lib/db.ts`

```typescript
// Add to User interface
export interface User {
  // ... existing fields
  status: 'active' | 'inactive' | 'suspended';
  deactivated_at: string | null;
  deactivated_by: number | null;
}
```

#### 1.2 Migration (Seed Script)
**File:** `scripts/seed-db.js` or automatic migration

- Set all existing users to `status: 'active'`
- Set `deactivated_at: null`, `deactivated_by: null`

#### 1.3 Authentication Update
**File:** `lib/auth.ts`

Update `authenticateUser()` to check user status:
```typescript
if (user.status !== 'active') {
  return null; // Or throw specific error for disabled account
}
```

#### 1.4 API Endpoints Update
**File:** `app/api/admin-users/route.ts`

- **PUT** `/api/admin-users` - Add `status` update capability
- **POST** `/api/admin-users/:id/deactivate` - New endpoint
- **POST** `/api/admin-users/:id/activate` - New endpoint

#### 1.5 UI Updates
**File:** `app/owner/admins/page.tsx`

- Add "Status" column to admins table
- Add "Deactivate" button (with confirmation)
- Add "Activate" button for inactive admins
- Add filter: "Active", "Inactive", "All"

---

## Gap 2: Global System Settings (Paramétrage)

### Current State
- No centralized settings page exists
- System behavior hardcoded

### Target State
- Owner can configure system via `/owner/settings`
- Settings persist in database
- Key parameters configurable

### Implementation Steps

#### 2.1 Database Schema
**File:** `lib/db.ts`

```typescript
export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string;
  updated_at: string;
  updated_by: number;
}

export interface Database {
  // ... existing tables
  system_settings: SystemSetting[];
}
```

**Default Settings:**
| Key | Value | Description |
|-----|-------|-------------|
| `leave_calculation_days` | `22` | Days worked per 1.5 leave days |
| `leave_calculation_rate` | `1.5` | Leave days earned |
| `auto_rejection_enabled` | `true` | Auto-reject insufficient balance |
| `session_timeout_minutes` | `60` | Idle session timeout |
| `log_retention_days` | `90` | Activity log retention |

#### 2.2 API Endpoints
**New File:** `app/api/settings/route.ts`

- **GET** `/api/settings` - List all settings (Owner only)
- **PUT** `/api/settings` - Update settings (Owner only)
- **GET** `/api/settings/:key` - Get specific setting (Owner only)

#### 2.3 Settings Page
**New File:** `app/owner/settings/page.tsx`

Components needed:
- Settings form with labeled inputs
- Save/Reset buttons
- Toast notifications for success/error
- Settings categories/tabs

#### 2.4 Navigation Update
**File:** `components/navigation.tsx`

Add "Paramétrage" link to Owner navigation menu.

#### 2.5 Integration Points

Update existing code to use settings:
- **Leave calculation:** Use `leave_calculation_days` and `leave_calculation_rate`
- **Auto-rejection:** Check `auto_rejection_enabled` flag
- **Session timeout:** Apply `session_timeout_minutes`

---

## File Changes Summary

| # | File | Change Type | Description |
|---|------|-------------|-------------|
| 1 | `lib/db.ts` | Modify | Add `status` to User, add SystemSetting interface |
| 2 | `data/db.json` | Modify | Add default settings, user status |
| 3 | `lib/auth.ts` | Modify | Check user status on authentication |
| 4 | `app/api/admin-users/route.ts` | Modify | Add activate/deactivate endpoints |
| 5 | `app/owner/admins/page.tsx` | Modify | Add status UI and actions |
| 6 | `app/api/settings/route.ts` | Create | New settings API |
| 7 | `app/owner/settings/page.tsx` | Create | New settings page |
| 8 | `components/navigation.tsx` | Modify | Add settings link |

---

## Testing Checklist

### Deactivate Functionality
- [ ] Admin RH can be deactivated
- [ ] Deactivated admin cannot login
- [ ] Reactivated admin can login again
- [ ] Audit logs preserved after deactivation
- [ ] Owner can see deactivated admins in list

### Settings Page
- [ ] Owner can view settings
- [ ] Owner can modify settings
- [ ] Settings persist after restart
- [ ] Non-owner gets 403 on settings API
- [ ] Leave calculation uses new settings

---

## Implementation Order

1. **Phase 1:** Database schema updates (lib/db.ts, data/db.json)
2. **Phase 2:** Authentication status check
3. **Phase 3:** Admin deactivate/activate API + UI
4. **Phase 4:** Settings API
5. **Phase 5:** Settings page + navigation
6. **Phase 6:** Integration and testing
