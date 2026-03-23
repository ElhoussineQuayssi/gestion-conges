# Owner Dashboard Database Integration Audit Report

**Date:** 2026-03-23  
**Dashboard URL:** http://localhost:3000/owner/dashboard  
**Mode:** Architect - Comprehensive Analysis

---

## Executive Summary

This report documents all database integration issues in the owner dashboard. The dashboard makes multiple API calls but has critical issues with data flow, particularly an API response mismatch that causes most statistics to show incorrect or zero values.

---

## 1. Data Flow Architecture

### Current Implementation
The dashboard makes **4 separate API calls** on load:

| Line | API Endpoint | Purpose | Data Retrieved |
|------|---------------|---------|-----------------|
| 34 | `/api/admin-users` | Users list | Only returns `{ admins: [] }` (HR admins only) |
| 35 | `/api/offers` | Offers list | Returns `{ offers: [] }` ✅ Connected |
| 36 | `/api/requests` | Requests list | Returns `{ requests: [] }` ✅ Connected |
| 49 | `/api/activity-logs` | Activity logs | Returns `{ logs: [] }` ✅ Connected |

### Critical Issue: API Response Mismatch

**Location:** [`app/owner/dashboard/page.tsx:43`](app/owner/dashboard/page.tsx:43)

```javascript
setUsers(usersData.users || []);  // ❌ WRONG - expects 'users'
```

The code expects `usersData.users` but the API [`/api/admin-users`](app/api/admin-users/route.ts) returns `{ admins: [] }` (only HR admins, not employees).

This causes:
- `totalEmployees` = 0 (line 94)
- `totalAdmins` = 0 (line 95)  
- `totalActiveAdmins` = 0 (line 96)
- `inactiveAdmins` = 0 (line 125)
- `adminStats` = empty (line 109)

### Unused Dedicated Stats API

**Location:** [`/api/dashboard/stats`](app/api/dashboard/stats/route.ts:56-63)

A dedicated stats endpoint EXISTS for owners but is **NOT USED**:

```javascript
// This endpoint returns:
// - totalEmployees
// - totalAdmins  
// - totalOffers
// - pendingRequests
// - recentRequests
```

**Recommendation:** Use this single endpoint instead of 4 separate calls.

---

## 2. Stats Cards - Data Source Analysis

### Primary Stats Cards (Lines 147-196)

| Card | Component | Lines | Data Source | Status | Issue |
|------|-----------|-------|--------------|--------|-------|
| **Employés** | Card | 148-155 | `users.filter(role === 'employee')` | ❌ **BROKEN** | API returns no employees |
| **Admins RH** | Card | 157-167 | `users.filter(role === 'hr_admin')` | ❌ **BROKEN** | API returns only admins |
| **Offres** | Card | 169-176 | `offers.length` | ✅ Connected | Works correctly |
| **En attente** | Card | 178-185 | `requests.filter(status === 'En cours / En attente RH')` | ✅ Connected | Works correctly |
| **Demandes** | Card | 187-196 | `requests.length` | ✅ Connected | Works correctly |

### Detailed Stats Cards (Lines 199-216)

| Card | Component | Lines | Data Source | Status |
|------|-----------|-------|--------------|--------|
| **Demandes approuvées - Offres** | Card | 206-209 | `requests.filter(type === 'offer' && status === 'Acceptée')` | ✅ Connected |
| **Demandes approuvées - Congés** | Card | 210-213 | `requests.filter(type === 'leave' && status === 'Acceptée')` | ✅ Connected |

---

## 3. Navigation Sidebar - Badge Integration

### Location: [`components/dashboard-sidebar.tsx`](components/dashboard-sidebar.tsx)

| Navigation Item | Role | Badge Value | Status |
|----------------|------|-------------|--------|
| Validation des demandes | hr_admin | 0 (line 120) | ❌ **HARDCODED** - Not connected to pending requests |
| Gestion des demandes | owner | 0 (line 165) | ❌ **HARDCODED** - Not connected to pending requests |

**Comment in code:** `// Will be updated dynamically` (line 120)

**Actual Status:** Never updated - remains hardcoded at 0.

---

## 4. Quick Access Section

### Location: [`app/owner/dashboard/page.tsx:218-283`](app/owner/dashboard/page.tsx:218-283)

| Button | Target URL | Status | Notes |
|--------|------------|--------|-------|
| Valider les demandes | `/admin/requests` | ⚠️ **WRONG** | Should be `/owner/requests` or `/admin/requests` - needs verification |
| Gérer les offres | `/admin/offers` | ⚠️ **WRONG** | Should be `/owner/offers` or `/admin/offers` - needs verification |
| Gérer les admins | `/owner/admins` | ✅ Connected | Correct |
| Journaux d'activité | `/owner/activity-logs` | ✅ Connected | Correct |
| Paramètres système | `/owner/settings` | ✅ Connected | Correct |
| Réinitialiser la base de données | Alert Dialog | ✅ Connected | Functional |

---

## 5. HR Admin Performance Table

### Location: [`app/owner/dashboard/page.tsx:286-346`](app/owner/dashboard/page.tsx:286-346)

**Component:** Performance des administrateurs RH

| Field | Data Source | Status | Issue |
|-------|-------------|--------|-------|
| Admin Name | `users.filter(role === 'hr_admin')` | ❌ **BROKEN** | Empty due to API mismatch |
| Admin Email | `users.filter(role === 'hr_admin')` | ❌ **BROKEN** | Empty due to API mismatch |
| Status (Actif/Inactif) | `admin.status` | ❌ **BROKEN** | Empty due to API mismatch |
| Approuvées | `requests.filter(approved_by === admin.id)` | ⚠️ **PARTIAL** | Shows 0 because admin data is empty |
| Rejetées | `requests.filter(approved_by === admin.id)` | ⚠️ **PARTIAL** | Shows 0 because admin data is empty |
| Total | Calculated (approved + rejected) | ⚠️ **PARTIAL** | Shows 0 because admin data is empty |

**Table Display:** Shows "Aucun administrateur RH" (line 303) when `adminStats.length === 0`.

---

## 6. Recent Activity Section

### Location: [`app/owner/dashboard/page.tsx:348-388`](app/owner/dashboard/page.tsx:348-388)

**Component:** Activité récente

| Field | Data Source | Status |
|-------|-------------|--------|
| User Full Name | `users.find(id === log.user_id)` | ❌ **BROKEN** - Users array is empty due to API mismatch |
| Action | `log.action` | ✅ Connected |
| Date/Time | `log.created_at` | ✅ Connected |
| Resource Type | `log.resource_type` | ✅ Connected |

**Note:** The activity logs API is connected correctly, but the user lookup fails because `users` array is empty.

---

## 7. Database Reset Functionality

### Location: [`app/owner/dashboard/page.tsx:65-83`](app/owner/dashboard/page.tsx:65-83)

**Component:** Alert Dialog with Reset Database button

| Function | API Called | Status |
|----------|------------|--------|
| Reset Database | `/api/owner/reset-db` (POST) | ✅ Connected |

This functionality works correctly.

---

## 8. Summary of Unimplemented Database Connections

### Critical Issues (Broken)

| Component | Location | Issue | Fix Required |
|-----------|----------|-------|---------------|
| **Employés stat card** | Line 153 | Shows 0 | Fix API call to get all users, not just admins |
| **Admins RH stat card** | Line 162 | Shows 0 | Fix API response parsing (`admins` not `users`) |
| **Admin Performance table** | Lines 319-340 | Empty table | Fix API call and response parsing |
| **Recent Activity user names** | Line 366 | Shows "Utilisateur inconnu" | Fix users data source |

### Missing Integration (Not Connected)

| Component | Location | Current Value | Should Fetch From |
|-----------|----------|---------------|-------------------|
| **Sidebar badge** (hr_admin) | dashboard-sidebar.tsx:120 | Hardcoded: 0 | `/api/requests?status=En cours` |
| **Sidebar badge** (owner) | dashboard-sidebar.tsx:165 | Hardcoded: 0 | `/api/requests?status=En cours` |
| **All stats** | Lines 93-126 | Multiple API calls | Use `/api/dashboard/stats` (single optimized endpoint) |

### Incorrect Navigation Targets

| Button | Current Target | Should Be |
|--------|----------------|------------|
| Valider les demandes | `/admin/requests` | Verify correct path |
| Gérer les offres | `/admin/offers` | Verify correct path |

---

## 9. Recommended Fixes

### Priority 1: Fix API Response Mismatch
In [`app/owner/dashboard/page.tsx`](app/owner/dashboard/page.tsx), change:
```javascript
// FROM:
setUsers(usersData.users || []);

// TO:
setUsers(usersData.admins || []);
```

### Priority 2: Use Dedicated Stats API
Replace the 4 separate API calls with single call to `/api/dashboard/stats`:
```javascript
const statsRes = await fetch('/api/dashboard/stats');
const stats = await statsRes.json();
// stats contains: totalEmployees, totalAdmins, totalOffers, pendingRequests
```

### Priority 3: Connect Sidebar Badges
Add dynamic badge fetching in [`dashboard-sidebar.tsx`](components/dashboard-sidebar.tsx):
```javascript
// Fetch pending requests count and update badge values
```

### Priority 4: Fix Navigation Targets
Verify and update quick access button URLs in [`app/owner/dashboard/page.tsx`](app/owner/dashboard/page.tsx:224-248).

---

## 10. Components Already Connected (Working)

| Component | Location | API | Status |
|-----------|----------|-----|--------|
| **Offres stat** | Line 174 | `/api/offers` | ✅ Working |
| **En attente stat** | Line 183 | `/api/requests` | ✅ Working |
| **Demandes stat** | Line 192 | `/api/requests` | ✅ Working |
| **Approved Offers** | Line 208 | `/api/requests` | ✅ Working |
| **Approved Leaves** | Line 212 | `/api/requests` | ✅ Working |
| **Recent Activity list** | Lines 363-384 | `/api/activity-logs` | ✅ Working (user names broken) |
| **Reset Database** | Lines 65-83 | `/api/owner/reset-db` | ✅ Working |

---

## Conclusion

The owner dashboard has **4 fully working database connections** and **7 broken/missing integrations**. The primary issue is the API response mismatch where the code expects `users` but receives `admins`. Once fixed, most statistics will display correctly. The sidebar badges remain hardcoded and need dynamic integration.