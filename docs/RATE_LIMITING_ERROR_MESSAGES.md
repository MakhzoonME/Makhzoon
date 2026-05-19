# Rate Limiting - User-Friendly Error Messages

All rate-limited endpoints now return helpful, action-specific error messages that tell users exactly what went wrong and when they can try again.

---

## Error Message Format

### Response Structure
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 45
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-05-01T14:30:00.000Z

{
  "error": "Too many attempts to sign in. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

### Headers Included
- `Retry-After`: Seconds until rate limit resets (for HTTP clients)
- `X-RateLimit-Limit`: Maximum requests allowed in window
- `X-RateLimit-Remaining`: Requests remaining (always 0 when rate limited)
- `X-RateLimit-Reset`: ISO timestamp when limit resets

---

## Error Messages by Endpoint

### 1. Sign In (Session Creation)
**Endpoint:** `POST /api/auth/session`  
**Limit:** 5 per IP per 15 minutes  
**Action:** "sign in"

#### Example Error Message
```
"Too many attempts to sign in. Please try again in 2 minutes."
```

#### When This Happens
- User tries to log in more than 5 times in 15 minutes
- Common causes: Wrong password attempts, automated attacks
- Helpful because: Prevents brute force attacks while allowing legitimate users to retry

---

### 2. Sign Up
**Endpoint:** `POST /api/organizations/self-serve`  
**Limit:** 3 organizations per IP per 24 hours  
**Action:** "create new organizations"

#### Example Error Message
```
"Too many attempts to create new organizations. Please try again in 18 hours."
```

#### When This Happens
- User/IP creates more than 3 organizations in 24 hours
- Common causes: Spam account creation, testing
- Helpful because: Prevents account creation spam

---

### 3. Contact Form
**Endpoint:** `POST /api/contact`  
**Limits:**
- 5 per IP per hour (action-based)
- 1 per email per 24 hours (email-specific)

#### Example Error Messages

**Rate Limited by IP:**
```
"Too many attempts to submit contact form. Please try again in 12 minutes."
```

**Rate Limited by Email:**
```
"You have already submitted a contact form from this email address today. Please try again in 4 hours."
```

#### When This Happens
- Submitting contact form more than 5 times from same IP per hour
- OR submitting from same email more than once per day
- Helpful because: Prevents form spam while allowing multiple users from same office

---

### 4. Early Access
**Endpoint:** `POST /api/early-access`  
**Limits:**
- 5 per IP per 24 hours (action-based)
- 1 per email per 7 days (email-specific)

#### Example Error Messages

**Rate Limited by IP:**
```
"Too many attempts to request early access. Please try again in 18 hours."
```

**Rate Limited by Email:**
```
"You have already requested early access from this email. Please check your inbox for updates."
```

#### When This Happens
- Requesting early access more than 5 times from same IP per 24 hours
- OR requesting from same email more than once per week
- Helpful because: Email-specific message is more helpful ("check your inbox")

---

## Time Formatting

The error messages automatically format remaining time in a user-friendly way:

### Format Examples
| Seconds | Display |
|---------|---------|
| 30 | "30 seconds" |
| 45 | "45 seconds" |
| 60 | "1 minute" |
| 90 | "2 minutes" |
| 3600 | "60 minutes" |
| 7200 | "2 hours" |
| 86400 | "24 hours" |

**Logic:** Formats seconds as "X seconds", or rounds up to minutes/hours for longer durations.

---

## HTTP Headers for Clients

All 429 responses include standard HTTP rate-limiting headers:

### For Native Apps / API Clients
```javascript
// JavaScript example
const response = await fetch('/api/auth/session', { method: 'POST' });

if (response.status === 429) {
  const retryAfter = parseInt(response.headers.get('Retry-After')); // seconds
  const data = await response.json();
  
  console.log(`Rate limited: ${data.error}`);
  console.log(`Retry after ${retryAfter} seconds`);
  
  // Automatically retry after specified time
  setTimeout(() => {
    // Retry request
  }, retryAfter * 1000);
}
```

### For Web Browsers
```javascript
// Browser example with fetch
const response = await fetch('/api/contact', { method: 'POST', body: formData });

if (response.status === 429) {
  const { error, retryAfter } = await response.json();
  
  // Show user-friendly error in UI
  showError(error);
  
  // Disable form for retryAfter seconds
  disableFormFor(retryAfter * 1000);
}
```

---

## Implementation Details

### Rate Limit Key Structure
Keys are constructed to isolate limits by user/source:

```
// Session creation: by IP
"session:192.168.1.1"

// Signup: by IP
"signup:203.0.113.45"

// Contact form: by IP and email
"contact:ip:203.0.113.45"
"contact:email:user@example.com"

// Early access: by IP and email
"early-access:ip:203.0.113.45"
"early-access:email:user@example.com"
```

### Customizable Error Messages

**Two Methods for Custom Messages:**

#### Method 1: Action-Based
```typescript
checkRateLimit(key, limit, window, { action: 'sign in' })
// Result: "Too many attempts to sign in. Please try again in X minutes."
```

#### Method 2: Custom Message
```typescript
checkRateLimit(key, limit, window, {
  errorMessage: 'You have already requested this. Please check your inbox.'
})
// Result: "You have already requested this. Please check your inbox. Please try again in X hours."
```

---

## Testing Rate Limits Locally

### Simulate Rate Limit
```bash
# Make 6 requests rapidly (limit is 5)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/session \
    -H "Content-Type: application/json" \
    -d '{"idToken":"test"}'
done
```

### Expected Response (6th request)
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 900
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-05-01T14:20:00.000Z

{
  "error": "Too many attempts to sign in. Please try again in 15 minutes.",
  "retryAfter": 900
}
```

---

## User Experience Improvements

### Before (Generic Message)
```
"Too many requests. Please try again later."
```
- User doesn't know what action triggered the limit
- User doesn't know when they can retry
- User doesn't know if they should try a different approach

### After (Specific Message)
```
"Too many attempts to sign in. Please try again in 2 minutes."
```
- ✅ User knows exactly what action is limited
- ✅ User knows exactly when to retry
- ✅ User has clear, actionable feedback
- ✅ Reduces support requests about rate limiting

---

## Production Considerations

### Current Implementation (In-Memory)
- ✅ Works for single-server deployments
- ✅ Low latency (O(1) memory lookup)
- ⚠️ Doesn't work across multiple servers

### For Multi-Server Production
**Migrate to Redis/Vercel KV:**

```typescript
// Example: Using Vercel KV
import { kv } from '@vercel/kv';

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const count = await kv.incr(key);
  if (count === 1) {
    await kv.expire(key, Math.ceil(windowMs / 1000));
  }
  
  if (count > limit) {
    const ttl = await kv.ttl(key);
    return NextResponse.json(
      { error: `Too many requests. Try again in ${ttl} seconds.` },
      { status: 429 }
    );
  }
  return null;
}
```

---

## Security Benefits

1. **Better UX = Less Bypass Attempts**
   - Users understand the limit and wait rather than trying workarounds
   - Reduces load on the service

2. **Actionable Feedback**
   - "Too many sign-in attempts" tells users to wait
   - "Too many contact form submissions from your email" tells them to use a different email

3. **Standard HTTP Headers**
   - Clients can automatically implement exponential backoff
   - Compatible with all HTTP clients and libraries

4. **Timestamp Precision**
   - Clients know exact time limit resets
   - Enables scheduled retry logic

---

## Summary

All rate-limited endpoints now provide:
- ✅ Clear, action-specific error messages
- ✅ Exact time remaining until retry available
- ✅ Standard HTTP rate-limiting headers
- ✅ User-friendly language appropriate to context
- ✅ Better user experience with lower support burden
