# 🔐 SECURITY IMPLEMENTATION QUICK REFERENCE

**Last Updated:** March 21, 2026  
**Status:** Production-Ready

---

## ⚡ QUICK LINKS

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **IP Restriction** | `middleware.ts` | 42-51 | Block external networks |
| **Session Signing** | `lib/auth.ts` | 11-21 | HMAC-SHA256 token signing |
| **Token Verification** | `lib/auth.ts` | 66-108 | Verify token integrity |
| **Rate Limiting** | `lib/rate-limit.ts` | All | Brute force prevention |
| **Security Logging** | `lib/security-logging.ts` | All | Event tracking |
| **Login Security** | `app/api/auth/login/route.ts` | 6-54 | Rate limiting + logging |

---

## 🔑 ENVIRONMENT VARIABLES

### Required for Production

```bash
# Session token signing secret (CRITICAL)
SESSION_SECRET=<generate-with-openssl-rand-32-hex>

# Node environment
NODE_ENV=production
```

### Generate SESSION_SECRET

```bash
# Linux/macOS
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## 🧪 TESTING QUICK START

### Test IP Restriction
```bash
# External IP should be blocked
curl -H "X-Forwarded-For: 8.8.8.8" http://localhost:3000/api/auth/me
# Expected: 403 Forbidden

# Internal IP should be allowed
curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:3000/api/offers
# Expected: 200 or 401 (auth required, not network denied)
```

### Test Rate Limiting
```bash
# Make 5+ failed login attempts rapidly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# Attempts 1-5: 401 Unauthorized
# Attempt 6: 429 Too Many Requests
```

### Test Token Tampering
```bash
# After successful login, get session cookie
# Modify the token (change userId in base64 portion)
# Use modified token in request
# Expected: User gets null, redirected to login
```

### Test Role-Based Access
```bash
# Login as employee
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@example.com","password":"password"}'

# Try to access admin endpoint
curl http://localhost:3000/api/admin-users \
  -H "Cookie: session_token=<token>"
# Expected: 403 Forbidden
```

---

## 🛡️ SECURITY FUNCTIONS QUICK REFERENCE

### Rate Limiting
```typescript
import { isRateLimited, getClientIp, getLoginRateLimitKey } from '@/lib/rate-limit';

// Check if request is rate limited
const clientIp = getClientIp(request);
const { ipKey, emailKey } = getLoginRateLimitKey(email, clientIp);

if (isRateLimited(ipKey, 5, 15 * 60 * 1000)) {
  return NextResponse.json(
    { error: 'Rate limited' },
    { status: 429 }
  );
}
```

### Security Logging
```typescript
import { logSecurityEvent, logFailedAuthorization, logTokenTampering } from '@/lib/security-logging';

// Log authorization failure
logFailedAuthorization(
  '/api/admin-users',
  ['owner'],
  userRole,
  userId,
  ipAddress
);

// Log token tampering
logTokenTampering(userId, ipAddress);

// Log rate limit
logRateLimitExceeded(ipAddress, endpoint, email);
```

### Enhanced Role Checking
```typescript
import { requireRoleWithLogging } from '@/lib/auth';

// Use in API routes for automatic logging
const user = await requireRoleWithLogging(
  '/api/admin-users',
  ['owner'],
  'owner'
);

if (!user) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## 📊 MONITORING & ALERTS

### Critical Events to Monitor
```typescript
// Check lib/security-logging.ts for critical events
const criticalEvents = getCriticalSecurityEvents(24); // Last 24 hours

// Should alert on:
// - Token tampering attempts
// - Repeated role escalation attempts
// - Brute force attacks on specific accounts
```

### Security Event Types
| Type | Severity | Action |
|------|----------|--------|
| `token_tampering` | CRITICAL | Immediate alert + investigation |
| `failed_authorization` | MEDIUM | Log + monitor patterns |
| `rate_limit_exceeded` | MEDIUM | Log + consider blocking IP |
| `invalid_token` | MEDIUM | Log + redirect to login |
| `failed_auth` | LOW | Log + monitor patterns |

---

## 🔧 MAINTENANCE TASKS

### Daily
- Monitor critical security events
- Check for repeated rate limit violations

### Weekly
- Review security event logs
- Check for unauthorized access patterns
- Verify IP restrictions are working

### Monthly
- Rotate SESSION_SECRET (optional but recommended)
- Clear old security events (>30 days)
- Review and update rate limit thresholds if needed

### Quarterly
- Security audit of new code changes
- Penetration testing recommendation
- Review and update threat model

---

## ⚠️ KNOWN LIMITATIONS

### Current Implementation
- Rate limiting is **in-memory only**
- Security logging is **in-memory only**
- Works for **single-server deployments** only

### For Multi-Server Deployments
- ❌ Rate limits not synchronized across servers
- ❌ Security logs not shared across servers
- 🔧 Solution: Migrate to Redis for both components

### Migration to Redis (Future)
```typescript
// Example pseudocode for future Redis migration
import redis from 'redis';

const client = redis.createClient();

export async function isRateLimitedRedis(key: string) {
  const count = await client.incr(`ratelimit:${key}`);
  if (count === 1) {
    await client.expire(`ratelimit:${key}`, 900); // 15 minutes
  }
  return count > 5;
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before going live:

- [ ] Set `SESSION_SECRET` environment variable
- [ ] Test all 22 security test cases
- [ ] Verify IP restriction blocks external IPs
- [ ] Verify rate limiting works on failed logins
- [ ] Monitor security logs in production
- [ ] Enable alerts for CRITICAL security events
- [ ] Document incident response procedures
- [ ] Plan SESSION_SECRET rotation schedule
- [ ] Plan migration to Redis (if multi-server)
- [ ] Schedule follow-up security audit

---

## 📝 DOCUMENTATION

| Document | Location | Purpose |
|----------|----------|---------|
| Full Audit | `SECURITY_AUDIT_COMPLETION.md` | Complete implementation report |
| Test Cases | `tasks.md` (Phase 5) | 22 test cases ready to run |
| Implementation | `lib/rate-limit.ts` | Rate limiting code + comments |
| Implementation | `lib/security-logging.ts` | Security logging code + comments |
| Security Events | `lib/auth.ts` | Token signing + verification |

---

## 🆘 TROUBLESHOOTING

### Session Token Issues
**Problem:** Users getting logged out unexpectedly  
**Check:**
1. Verify `SESSION_SECRET` hasn't changed (would invalidate all tokens)
2. Check if token timestamp is beyond 24-hour window
3. Look for token tampering logs

### Rate Limiting Not Working
**Problem:** Users can still make unlimited login attempts  
**Check:**
1. Verify `isRateLimited()` is being called in login route
2. Check if IP extraction is working (test with X-Forwarded-For header)
3. Clear rate limit store if stuck: `clearAllRateLimits()`

### IP Restriction Not Working
**Problem:** External IPs can access the app  
**Check:**
1. Verify lines 42-51 of middleware.ts are uncommented
2. Check if external IP is actually external (not proxy)
3. Review middleware logic for correct RFC 1918 ranges

---

**Last Updated:** March 21, 2026  
**Next Review:** After test suite completion  
**Maintainer:** Security Team
