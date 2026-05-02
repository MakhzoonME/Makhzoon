# Test Cases — Makhzoon
Generated from codebase on 2026-05-02

---

## Platform 1: Organization Platform

### Authentication

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-AUTH-001 | Login with valid email and password | User account exists with active status | 1. Navigate to `/login` 2. Enter valid email and password 3. Click login | User is authenticated and redirected to `/{orgSlug}/dashboard` | Functional | P1 |
| ORG-AUTH-002 | Login with invalid password | User account exists | 1. Navigate to `/login` 2. Enter valid email with wrong password 3. Click login | Error message displayed; user remains on login page | Functional | P1 |
| ORG-AUTH-003 | Login with non-existent email | — | 1. Navigate to `/login` 2. Enter email not registered 3. Click login | Error message displayed; user remains on login page | Functional | P1 |
| ORG-AUTH-004 | Login with deactivated account | User account exists with `status: deactivated` | 1. Navigate to `/login` 2. Enter credentials of deactivated user 3. Click login | Access denied with appropriate message | Security | P1 |
| ORG-AUTH-005 | Unauthenticated access to org dashboard | No session cookie | 1. Navigate directly to `/{orgSlug}/dashboard` | Redirected to `/login` | Security | P1 |
| ORG-AUTH-006 | Unauthenticated access to org assets | No session cookie | 1. Navigate directly to `/{orgSlug}/assets` | Redirected to `/login` | Security | P1 |
| ORG-AUTH-007 | Session cookie expiry redirects to login | Valid session that has expired | 1. Wait for session to expire 2. Attempt to access any org page | Redirected to `/login` | Security | P1 |
| ORG-AUTH-008 | Initiating SSO flow | SSO is configured for the organization | 1. Navigate to `/login` 2. Click "Sign in with SSO" 3. Enter org subdomain | Redirected to SSO provider | Functional | P2 |
| ORG-AUTH-009 | SSO callback with valid token | SSO provider returns valid token | 1. Complete SSO provider auth 2. SSO callback fires at `/api/auth/sso/callback` | Session created; user redirected to `/{orgSlug}/dashboard` | Functional | P2 |
| ORG-AUTH-010 | SSO check for unconfigured org | Organization has no SSO config | 1. POST `/api/auth/sso/check` with org subdomain | Returns appropriate response indicating SSO not configured | Functional | P2 |
| ORG-AUTH-011 | Password reset — valid email | User account exists | 1. Navigate to `/login` 2. Click "Forgot password" 3. Enter valid email 4. Submit | Password reset email sent; confirmation shown | Functional | P2 |
| ORG-AUTH-012 | Password reset — non-existent email | — | 1. POST `/api/auth/password-reset` with unknown email | Returns neutral response (no user enumeration) | Security | P2 |
| ORG-AUTH-013 | Cross-org access attempt | Authenticated as org A user | 1. Attempt to access `/{orgSlugB}/dashboard` (different org) | 403 or redirect; cannot see org B's data | Security | P1 |
| ORG-AUTH-014 | Staff cannot access superadmin | Authenticated as staff user | 1. Navigate to `/superadmin` | Redirected or 403; cannot access superadmin | Security | P1 |
| ORG-AUTH-015 | GET /api/auth/me returns current user | Authenticated user | 1. GET `/api/auth/me` | Returns user's role, organizationId, permissions, and feature flags | Functional | P1 |
| ORG-AUTH-016 | GET /api/auth/me without session | No session cookie | 1. GET `/api/auth/me` | Returns 401 Unauthorized | Security | P1 |

---

### Dashboard

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-DASH-001 | Dashboard loads for admin user | Authenticated admin with active subscription | 1. Navigate to `/{orgSlug}/dashboard` | Dashboard renders with asset count, expiring warranties, recent activity | Functional | P1 |
| ORG-DASH-002 | Dashboard loads for staff user | Authenticated staff user | 1. Navigate to `/{orgSlug}/dashboard` | Dashboard renders; staff-visible data only | Functional | P1 |
| ORG-DASH-003 | Dashboard shows correct asset count | 5 assets exist in org | 1. Navigate to `/{orgSlug}/dashboard` | Asset count widget shows 5 | Functional | P2 |
| ORG-DASH-004 | Dashboard shows expiring warranties | 2 warranties expire within 30 days | 1. Navigate to `/{orgSlug}/dashboard` | Expiring warranties section shows 2 items | Functional | P2 |
| ORG-DASH-005 | Dashboard empty state — new org | No assets, warranties, or activity | 1. Navigate to `/{orgSlug}/dashboard` as new org | Empty state messages displayed; no errors | UI | P2 |
| ORG-DASH-006 | Dashboard loading state | Slow network conditions | 1. Navigate to `/{orgSlug}/dashboard` | Loading skeleton/spinner shown while data fetches | UI | P3 |
| ORG-DASH-007 | Dashboard — expired subscription | Subscription status is EXPIRED | 1. Navigate to `/{orgSlug}/dashboard` | Access denied or limited view with subscription expired notice | Functional | P1 |
| ORG-DASH-008 | Dashboard — suspended subscription | Subscription status is SUSPENDED | 1. Navigate to `/{orgSlug}/dashboard` | Access denied or limited view with appropriate notice | Functional | P1 |
| ORG-DASH-009 | Dashboard feature flag — disabled feature hidden | `reports` feature disabled in subscription | 1. Navigate to `/{orgSlug}/dashboard` | Reports link hidden from navigation | Functional | P2 |
| ORG-DASH-010 | Dashboard recent activity shows audit entries | Several actions performed in the org | 1. Navigate to `/{orgSlug}/dashboard` | Recent activity section shows latest audit log entries | Functional | P2 |

---

### Assets

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-ASSET-001 | List assets — authorized admin | Authenticated admin, `assets` feature enabled | 1. GET `/api/assets` with org context | Returns paginated list of org assets | Functional | P1 |
| ORG-ASSET-002 | List assets — authorized staff | Authenticated staff with `assets.view` permission | 1. GET `/api/assets` | Returns paginated list of org assets | Functional | P1 |
| ORG-ASSET-003 | List assets — unauthenticated | No session | 1. GET `/api/assets` | Returns 401 Unauthorized | Security | P1 |
| ORG-ASSET-004 | List assets — empty state | No assets exist in org | 1. GET `/api/assets` | Returns empty array with 200 | Edge Case | P2 |
| ORG-ASSET-005 | List assets — filter by status | 3 Active, 2 Retired assets | 1. GET `/api/assets?status=Active` | Returns only 3 Active assets | Functional | P2 |
| ORG-ASSET-006 | List assets — filter by category | Assets with varying categories | 1. GET `/api/assets?category=Technology` | Returns only Technology assets | Functional | P2 |
| ORG-ASSET-007 | List assets — search by name | Asset named "MacBook Pro" | 1. GET `/api/assets?search=macbook` | Returns matching asset | Functional | P2 |
| ORG-ASSET-008 | List assets — pagination | 50 assets exist | 1. GET `/api/assets?page=1&limit=20` | Returns first 20 assets with pagination metadata | Functional | P2 |
| ORG-ASSET-009 | Create asset — valid input | Authenticated admin with `assets.create` permission | 1. POST `/api/assets` with `{name, category, status}` | Asset created; returns 201 with asset data | Functional | P1 |
| ORG-ASSET-010 | Create asset — missing required fields | Admin authenticated | 1. POST `/api/assets` with `{}` (empty body) | Returns 422 Unprocessable Entity with validation errors | Functional | P1 |
| ORG-ASSET-011 | Create asset — unauthorized (staff without create permission) | Staff user without `assets.create` | 1. POST `/api/assets` | Returns 403 Forbidden | Security | P1 |
| ORG-ASSET-012 | Create asset — unauthenticated | No session | 1. POST `/api/assets` | Returns 401 Unauthorized | Security | P1 |
| ORG-ASSET-013 | Create asset — subscription limit reached | Org at maxAssets limit | 1. POST `/api/assets` | Returns 403 with limit exceeded message | Edge Case | P2 |
| ORG-ASSET-014 | Create asset — with optional fields | Admin authenticated | 1. POST `/api/assets` with all optional fields (serialNumber, purchaseDate, etc.) | Asset created with all fields stored | Functional | P2 |
| ORG-ASSET-015 | Create asset — audit log generated | Admin creates asset | 1. POST `/api/assets` | Audit log entry `ASSET_CREATED` appears in audit logs | Functional | P2 |
| ORG-ASSET-016 | Get asset details — valid | Asset exists, admin authenticated | 1. GET `/api/assets/{assetId}` | Returns full asset details | Functional | P1 |
| ORG-ASSET-017 | Get asset details — not found | Non-existent assetId | 1. GET `/api/assets/nonexistent` | Returns 404 Not Found | Functional | P1 |
| ORG-ASSET-018 | Get asset details — wrong org | Asset belongs to another org | 1. GET `/api/assets/{otherOrgAssetId}` | Returns 404 (cross-org isolation enforced) | Security | P1 |
| ORG-ASSET-019 | Update asset — valid input | Admin with `assets.update`, asset exists | 1. PUT `/api/assets/{assetId}` with updated fields | Asset updated; returns 200 | Functional | P1 |
| ORG-ASSET-020 | Update asset — partial update | Admin authenticated | 1. PUT `/api/assets/{assetId}` with only `name` field | Only name updated; other fields unchanged | Functional | P2 |
| ORG-ASSET-021 | Update asset — invalid data | Admin authenticated | 1. PUT `/api/assets/{assetId}` with invalid field values | Returns 422 validation error | Functional | P2 |
| ORG-ASSET-022 | Update asset — unauthorized (staff) | Staff without `assets.update` | 1. PUT `/api/assets/{assetId}` | Returns 403 Forbidden | Security | P1 |
| ORG-ASSET-023 | Update asset — not found | Non-existent assetId | 1. PUT `/api/assets/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-ASSET-024 | Update asset — audit log generated | Admin updates asset | 1. PUT `/api/assets/{assetId}` | Audit log entry `ASSET_UPDATED` with oldValue and newValue | Functional | P2 |
| ORG-ASSET-025 | Delete/Retire asset — authorized | Admin with `assets.delete`, asset exists | 1. DELETE `/api/assets/{assetId}` | Asset retired/deleted; returns 200 | Functional | P1 |
| ORG-ASSET-026 | Delete asset — unauthorized (staff) | Staff without `assets.delete` | 1. DELETE `/api/assets/{assetId}` | Returns 403 Forbidden | Security | P1 |
| ORG-ASSET-027 | Delete asset — not found | Non-existent assetId | 1. DELETE `/api/assets/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-ASSET-028 | Delete asset — audit log generated | Admin deletes asset | 1. DELETE `/api/assets/{assetId}` | Audit log entry `ASSET_RETIRED` created | Functional | P2 |
| ORG-ASSET-029 | Export assets as CSV | Admin with `assets.view` | 1. GET `/api/assets/export` | Returns CSV file with all asset data | Functional | P2 |
| ORG-ASSET-030 | Export assets — empty org | No assets exist | 1. GET `/api/assets/export` | Returns CSV with headers only | Edge Case | P3 |
| ORG-ASSET-031 | Import assets from CSV — valid file | Admin with `assets.import`, valid CSV | 1. POST `/api/assets/import` with CSV | Assets created; returns success with count | Functional | P2 |
| ORG-ASSET-032 | Import assets — invalid CSV format | Admin with `assets.import` | 1. POST `/api/assets/import` with malformed CSV | Returns 422 with error details | Functional | P2 |
| ORG-ASSET-033 | Import assets — unauthorized (staff) | Staff without `assets.import` | 1. POST `/api/assets/import` | Returns 403 Forbidden | Security | P2 |
| ORG-ASSET-034 | Get asset QR code — valid | Asset exists, admin authenticated | 1. GET `/api/assets/{assetId}/qr` | Returns QR code image/data for asset | Functional | P3 |
| ORG-ASSET-035 | Asset page UI — navigate to assets | Admin authenticated | 1. Navigate to `/{orgSlug}/assets` | Assets table renders with pagination and filters | UI | P1 |
| ORG-ASSET-036 | Asset detail page — navigate to asset | Admin authenticated | 1. Navigate to `/{orgSlug}/assets/{assetId}` | Asset detail page renders with checkouts, maintenance, notes tabs | UI | P1 |
| ORG-ASSET-037 | Staff cannot see Create Asset button | Staff user with `assets.view` only | 1. Navigate to `/{orgSlug}/assets` | Create Asset button not visible | UI | P2 |
| ORG-ASSET-038 | Asset — feature disabled | `assets` feature disabled in subscription | 1. Navigate to `/{orgSlug}/assets` | 403 or redirect; assets module inaccessible | Functional | P1 |

---

### Asset Checkouts

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-CHECKOUT-001 | Check out asset — valid | Admin with `assets.checkout`, asset not checked out | 1. POST `/api/assets/{assetId}/checkout` with `{checkedOutTo, dueDate}` | Checkout record created; asset marked as checked out | Functional | P1 |
| ORG-CHECKOUT-002 | Check out asset — unauthorized (staff) | Staff without `assets.checkout` | 1. POST `/api/assets/{assetId}/checkout` | Returns 403 Forbidden | Security | P1 |
| ORG-CHECKOUT-003 | Check out asset — already checked out | Asset has active checkout | 1. POST `/api/assets/{assetId}/checkout` | Returns 409 Conflict or appropriate error | Edge Case | P2 |
| ORG-CHECKOUT-004 | Check out asset — missing required fields | Admin authenticated | 1. POST `/api/assets/{assetId}/checkout` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-CHECKOUT-005 | Check out asset — asset not found | Non-existent assetId | 1. POST `/api/assets/nonexistent/checkout` | Returns 404 Not Found | Functional | P2 |
| ORG-CHECKOUT-006 | Check out asset — feature disabled | `assetCheckouts` feature disabled | 1. POST `/api/assets/{assetId}/checkout` | Returns 403 feature not enabled | Functional | P2 |
| ORG-CHECKOUT-007 | Return asset checkout — valid | Active checkout exists, admin authenticated | 1. POST `/api/assets/{assetId}/checkout/{checkoutId}` (return action) | Checkout marked returned; `returnedAt` set | Functional | P1 |
| ORG-CHECKOUT-008 | Return asset — already returned | Checkout already returned | 1. POST to return already returned checkout | Returns 409 or appropriate error | Edge Case | P2 |
| ORG-CHECKOUT-009 | Get checkout history — valid | Admin authenticated | 1. GET `/api/assets/{assetId}/checkout` | Returns list of all checkout records for asset | Functional | P1 |
| ORG-CHECKOUT-010 | Get checkout history — unauthenticated | No session | 1. GET `/api/assets/{assetId}/checkout` | Returns 401 Unauthorized | Security | P1 |
| ORG-CHECKOUT-011 | Get checkout history — empty | No checkouts for asset | 1. GET `/api/assets/{assetId}/checkout` | Returns empty array with 200 | Edge Case | P3 |
| ORG-CHECKOUT-012 | Checkout audit log generated | Admin checks out asset | 1. POST `/api/assets/{assetId}/checkout` | Audit log entry for checkout created | Functional | P2 |
| ORG-CHECKOUT-013 | Return audit log generated | Admin returns checkout | 1. POST to return checkout | Audit log entry for return created | Functional | P2 |

---

### Asset Maintenance

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-MAINT-001 | Create maintenance record — valid | Admin with `assets.maintenance`, asset exists | 1. POST `/api/assets/{assetId}/maintenance` with `{type, description, date}` | Maintenance record created; returns 201 | Functional | P1 |
| ORG-MAINT-002 | Create maintenance record — missing required fields | Admin authenticated | 1. POST `/api/assets/{assetId}/maintenance` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-MAINT-003 | Create maintenance record — unauthorized (staff) | Staff without `assets.maintenance` | 1. POST `/api/assets/{assetId}/maintenance` | Returns 403 Forbidden | Security | P1 |
| ORG-MAINT-004 | Create maintenance record — feature disabled | `maintenance` feature disabled | 1. POST `/api/assets/{assetId}/maintenance` | Returns 403 feature not enabled | Functional | P2 |
| ORG-MAINT-005 | Get maintenance records — valid | Records exist, admin authenticated | 1. GET `/api/assets/{assetId}/maintenance` | Returns list of maintenance records | Functional | P1 |
| ORG-MAINT-006 | Get maintenance records — empty | No records for asset | 1. GET `/api/assets/{assetId}/maintenance` | Returns empty array with 200 | Edge Case | P3 |
| ORG-MAINT-007 | Update maintenance record — valid | Record exists, admin authenticated | 1. PUT `/api/assets/{assetId}/maintenance/{recordId}` | Record updated; returns 200 | Functional | P2 |
| ORG-MAINT-008 | Update maintenance record — not found | Non-existent recordId | 1. PUT `/api/assets/{assetId}/maintenance/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-MAINT-009 | Update maintenance record — unauthorized | Staff user | 1. PUT `/api/assets/{assetId}/maintenance/{recordId}` | Returns 403 Forbidden | Security | P2 |
| ORG-MAINT-010 | Delete maintenance record — valid | Record exists, admin authenticated | 1. DELETE `/api/assets/{assetId}/maintenance/{recordId}` | Record deleted; returns 200 | Functional | P2 |
| ORG-MAINT-011 | Delete maintenance record — not found | Non-existent recordId | 1. DELETE `/api/assets/{assetId}/maintenance/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-MAINT-012 | Delete maintenance record — unauthorized | Staff user | 1. DELETE `/api/assets/{assetId}/maintenance/{recordId}` | Returns 403 Forbidden | Security | P2 |

---

### Asset Notes

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-NOTES-001 | Add note to asset — valid | Admin with `assets.notes`, asset exists | 1. POST `/api/assets/{assetId}/notes` with `{note}` | Note created; returns 201 | Functional | P2 |
| ORG-NOTES-002 | Add note — missing note field | Admin authenticated | 1. POST `/api/assets/{assetId}/notes` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-NOTES-003 | Add note — unauthorized (staff without notes perm) | Staff without `assets.notes` | 1. POST `/api/assets/{assetId}/notes` | Returns 403 Forbidden | Security | P2 |
| ORG-NOTES-004 | Add note — feature disabled | `assetNotes` feature disabled | 1. POST `/api/assets/{assetId}/notes` | Returns 403 feature not enabled | Functional | P2 |
| ORG-NOTES-005 | Get asset notes — valid | Notes exist, admin authenticated | 1. GET `/api/assets/{assetId}/notes` | Returns list of notes | Functional | P2 |
| ORG-NOTES-006 | Get asset notes — empty | No notes for asset | 1. GET `/api/assets/{assetId}/notes` | Returns empty array with 200 | Edge Case | P3 |
| ORG-NOTES-007 | Delete note — valid | Note exists, admin authenticated | 1. DELETE `/api/assets/{assetId}/notes/{noteId}` | Note deleted; returns 200 | Functional | P2 |
| ORG-NOTES-008 | Delete note — not found | Non-existent noteId | 1. DELETE `/api/assets/{assetId}/notes/nonexistent` | Returns 404 Not Found | Functional | P3 |
| ORG-NOTES-009 | Delete note — unauthorized | Staff user | 1. DELETE `/api/assets/{assetId}/notes/{noteId}` | Returns 403 Forbidden | Security | P2 |
| ORG-NOTES-010 | Note max length — boundary | Admin authenticated | 1. POST `/api/assets/{assetId}/notes` with 10,000 char note | Validates and either accepts or returns 422 with limit message | Edge Case | P3 |

---

### Warranties

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-WARR-001 | List warranties — admin | Authenticated admin, `warranties` feature enabled | 1. GET `/api/warranties` | Returns list of org warranties | Functional | P1 |
| ORG-WARR-002 | List warranties — staff with view permission | Staff with `warranties.view` | 1. GET `/api/warranties` | Returns list of org warranties | Functional | P1 |
| ORG-WARR-003 | List warranties — unauthenticated | No session | 1. GET `/api/warranties` | Returns 401 Unauthorized | Security | P1 |
| ORG-WARR-004 | List warranties — empty state | No warranties exist | 1. GET `/api/warranties` | Returns empty array with 200 | Edge Case | P2 |
| ORG-WARR-005 | Create warranty — valid | Admin with `warranties.create` | 1. POST `/api/warranties` with `{assetId, vendor, startDate, endDate, reminder}` | Warranty created; returns 201 | Functional | P1 |
| ORG-WARR-006 | Create warranty — missing required fields | Admin authenticated | 1. POST `/api/warranties` with `{}` | Returns 422 validation error | Functional | P1 |
| ORG-WARR-007 | Create warranty — endDate before startDate | Admin authenticated | 1. POST `/api/warranties` with endDate < startDate | Returns 422 validation error | Edge Case | P2 |
| ORG-WARR-008 | Create warranty — unauthorized (staff) | Staff without `warranties.create` | 1. POST `/api/warranties` | Returns 403 Forbidden | Security | P1 |
| ORG-WARR-009 | Create warranty — subscription limit reached | Org at maxWarranties limit | 1. POST `/api/warranties` | Returns 403 with limit exceeded message | Edge Case | P2 |
| ORG-WARR-010 | Create warranty — feature disabled | `warranties` feature disabled | 1. POST `/api/warranties` | Returns 403 feature not enabled | Functional | P1 |
| ORG-WARR-011 | Get warranty — valid | Warranty exists, admin authenticated | 1. GET `/api/warranties/{warrantyId}` | Returns warranty details | Functional | P1 |
| ORG-WARR-012 | Get warranty — not found | Non-existent warrantyId | 1. GET `/api/warranties/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-WARR-013 | Get warranty — wrong org | Warranty belongs to other org | 1. GET `/api/warranties/{otherOrgWarrantyId}` | Returns 404 (cross-org isolation) | Security | P1 |
| ORG-WARR-014 | Update warranty — valid | Admin with `warranties.update`, warranty exists | 1. PUT `/api/warranties/{warrantyId}` with updated fields | Warranty updated; returns 200 | Functional | P1 |
| ORG-WARR-015 | Update warranty — invalid input | Admin authenticated | 1. PUT `/api/warranties/{warrantyId}` with invalid dates | Returns 422 validation error | Functional | P2 |
| ORG-WARR-016 | Update warranty — unauthorized | Staff user | 1. PUT `/api/warranties/{warrantyId}` | Returns 403 Forbidden | Security | P1 |
| ORG-WARR-017 | Update warranty — not found | Non-existent warrantyId | 1. PUT `/api/warranties/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-WARR-018 | Delete warranty — valid | Admin with `warranties.delete`, warranty exists | 1. DELETE `/api/warranties/{warrantyId}` | Warranty deleted; returns 200 | Functional | P1 |
| ORG-WARR-019 | Delete warranty — unauthorized | Staff user | 1. DELETE `/api/warranties/{warrantyId}` | Returns 403 Forbidden | Security | P1 |
| ORG-WARR-020 | Delete warranty — not found | Non-existent warrantyId | 1. DELETE `/api/warranties/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-WARR-021 | Export warranties as CSV | Admin with `warranties.view` | 1. GET `/api/warranties/export` | Returns CSV file with all warranty data | Functional | P2 |
| ORG-WARR-022 | Warranty audit log — create | Admin creates warranty | 1. POST `/api/warranties` | Audit log entry `WARRANTY_CREATED` generated | Functional | P2 |
| ORG-WARR-023 | Warranty UI — expiry status badge | Warranty expiring in 15 days | 1. Navigate to `/{orgSlug}/warranties` | Warranty shows "Expiring Soon" badge | UI | P2 |
| ORG-WARR-024 | Warranty UI — expired badge | Warranty expiration date passed | 1. Navigate to `/{orgSlug}/warranties` | Warranty shows "Expired" badge | UI | P2 |

---

### Requests (Asset Requests)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-REQ-001 | Submit REFILL request — valid | Staff with `requests.create` | 1. POST `/api/requests` with `{type: "REFILL", description}` | Request created with status PENDING; returns 201 | Functional | P1 |
| ORG-REQ-002 | Submit RETIRE request — valid | Staff with `requests.create`, assetId provided | 1. POST `/api/requests` with `{type: "RETIRE", assetId, description}` | Request created; returns 201 | Functional | P1 |
| ORG-REQ-003 | Submit BUY_NEW request — valid | Staff with `requests.create` | 1. POST `/api/requests` with `{type: "BUY_NEW", description}` | Request created; returns 201 | Functional | P1 |
| ORG-REQ-004 | Submit EXTEND_WARRANTY request — valid | Staff with `requests.create`, warrantyId provided | 1. POST `/api/requests` with `{type: "EXTEND_WARRANTY", warrantyId, description}` | Request created; returns 201 | Functional | P1 |
| ORG-REQ-005 | Submit request — missing description | Staff authenticated | 1. POST `/api/requests` with `{type: "REFILL"}` (no description) | Returns 422 validation error | Functional | P2 |
| ORG-REQ-006 | Submit request — invalid type | Staff authenticated | 1. POST `/api/requests` with `{type: "INVALID", description: "..."}` | Returns 422 validation error | Functional | P2 |
| ORG-REQ-007 | Submit request — unauthenticated | No session | 1. POST `/api/requests` | Returns 401 Unauthorized | Security | P1 |
| ORG-REQ-008 | Submit request — feature disabled | `requests` feature disabled | 1. POST `/api/requests` | Returns 403 feature not enabled | Functional | P1 |
| ORG-REQ-009 | Submit request — subscription limit reached | Org at maxRequests limit | 1. POST `/api/requests` | Returns 403 limit exceeded | Edge Case | P2 |
| ORG-REQ-010 | Request audit log — creation | Staff creates request | 1. POST `/api/requests` | Audit log entry `REQUEST_SUBMITTED` created | Functional | P2 |
| ORG-REQ-011 | List requests — admin sees all requests | Admin with `requests.view` | 1. GET `/api/requests` | Returns all org requests | Functional | P1 |
| ORG-REQ-012 | List requests — staff sees own requests only | Staff user | 1. GET `/api/requests` | Returns only requests created by this staff user | Functional | P1 |
| ORG-REQ-013 | List requests — unauthenticated | No session | 1. GET `/api/requests` | Returns 401 Unauthorized | Security | P1 |
| ORG-REQ-014 | List requests — empty state | No requests exist | 1. GET `/api/requests` | Returns empty array with 200 | Edge Case | P3 |
| ORG-REQ-015 | Get request — authorized | Admin authenticated, request exists | 1. GET `/api/requests/{requestId}` | Returns request details | Functional | P1 |
| ORG-REQ-016 | Get request — not found | Non-existent requestId | 1. GET `/api/requests/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-REQ-017 | Get request — staff accessing own request | Staff who created the request | 1. GET `/api/requests/{requestId}` | Returns request details | Functional | P2 |
| ORG-REQ-018 | Approve request — valid | Admin with `requests.approve`, request is PENDING | 1. POST `/api/requests/{requestId}/approve` | Request status → APPROVED; decisionBy set | Functional | P1 |
| ORG-REQ-019 | Approve request — already approved | Request status is already APPROVED | 1. POST `/api/requests/{requestId}/approve` | Returns 409 Conflict or appropriate error | Edge Case | P2 |
| ORG-REQ-020 | Approve RETIRE request — cascades asset status | Pending RETIRE request with valid assetId | 1. POST `/api/requests/{requestId}/approve` | Request approved AND asset status updated to Retired | Functional | P2 |
| ORG-REQ-021 | Approve request — unauthorized (staff) | Staff without `requests.approve` | 1. POST `/api/requests/{requestId}/approve` | Returns 403 Forbidden | Security | P1 |
| ORG-REQ-022 | Approve request — not found | Non-existent requestId | 1. POST `/api/requests/nonexistent/approve` | Returns 404 Not Found | Functional | P2 |
| ORG-REQ-023 | Approve request — audit log | Admin approves request | 1. POST `/api/requests/{requestId}/approve` | Audit log entry `REQUEST_APPROVED` created | Functional | P2 |
| ORG-REQ-024 | Reject request — valid | Admin with `requests.approve`, request is PENDING | 1. POST `/api/requests/{requestId}/reject` | Request status → REJECTED; decisionBy set | Functional | P1 |
| ORG-REQ-025 | Reject request — unauthorized (staff) | Staff user | 1. POST `/api/requests/{requestId}/reject` | Returns 403 Forbidden | Security | P1 |
| ORG-REQ-026 | Reject request — not found | Non-existent requestId | 1. POST `/api/requests/nonexistent/reject` | Returns 404 Not Found | Functional | P2 |
| ORG-REQ-027 | Reject request — audit log | Admin rejects request | 1. POST `/api/requests/{requestId}/reject` | Audit log entry `REQUEST_REJECTED` created | Functional | P2 |
| ORG-REQ-028 | Request UI — staff sees create button | Staff with `requests.create` | 1. Navigate to `/{orgSlug}/requests` | Create request button visible | UI | P2 |
| ORG-REQ-029 | Request UI — pending requests show for admin | PENDING requests exist | 1. Admin navigates to `/{orgSlug}/requests` | Pending requests listed with approve/reject actions | UI | P1 |

---

### Inventory Items

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-INV-001 | List inventory items — authorized admin | Authenticated admin, `inventory` feature enabled | 1. GET `/api/inventory` | Returns list of inventory items | Functional | P1 |
| ORG-INV-002 | List inventory items — staff with view permission | Staff with `inventory.view` | 1. GET `/api/inventory` | Returns list of inventory items | Functional | P1 |
| ORG-INV-003 | List inventory items — unauthenticated | No session | 1. GET `/api/inventory` | Returns 401 Unauthorized | Security | P1 |
| ORG-INV-004 | List inventory items — empty state | No items in inventory | 1. GET `/api/inventory` | Returns empty array with 200 | Edge Case | P2 |
| ORG-INV-005 | List inventory — filter by low stock | Some items below minimumThreshold | 1. GET `/api/inventory?stockStatus=low` | Returns only low-stock items | Functional | P2 |
| ORG-INV-006 | List inventory — filter by out of stock | Items with quantityOnHand = 0 | 1. GET `/api/inventory?stockStatus=out` | Returns only out-of-stock items | Functional | P2 |
| ORG-INV-007 | Create inventory item — valid | Admin with `inventory.create` | 1. POST `/api/inventory` with `{name, category, unit, quantityOnHand, minimumThreshold}` | Item created; returns 201 | Functional | P1 |
| ORG-INV-008 | Create inventory item — missing required fields | Admin authenticated | 1. POST `/api/inventory` with `{}` | Returns 422 validation error | Functional | P1 |
| ORG-INV-009 | Create inventory item — negative quantity | Admin authenticated | 1. POST `/api/inventory` with `{quantityOnHand: -5}` | Returns 422 validation error | Edge Case | P2 |
| ORG-INV-010 | Create inventory item — unauthorized (staff) | Staff without `inventory.create` | 1. POST `/api/inventory` | Returns 403 Forbidden | Security | P1 |
| ORG-INV-011 | Create inventory item — feature disabled | `inventory` feature disabled | 1. POST `/api/inventory` | Returns 403 feature not enabled | Functional | P1 |
| ORG-INV-012 | Get inventory item — valid | Item exists, admin authenticated | 1. GET `/api/inventory/{itemId}` | Returns full item details | Functional | P1 |
| ORG-INV-013 | Get inventory item — not found | Non-existent itemId | 1. GET `/api/inventory/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-INV-014 | Get inventory item — wrong org | Item belongs to another org | 1. GET `/api/inventory/{otherOrgItemId}` | Returns 404 (cross-org isolation) | Security | P1 |
| ORG-INV-015 | Update inventory item — valid | Admin with `inventory.update`, item exists | 1. PUT `/api/inventory/{itemId}` with updated fields | Item updated; returns 200 | Functional | P1 |
| ORG-INV-016 | Update inventory item — invalid data | Admin authenticated | 1. PUT `/api/inventory/{itemId}` with invalid unit value | Returns 422 validation error | Functional | P2 |
| ORG-INV-017 | Update inventory item — unauthorized | Staff without `inventory.update` | 1. PUT `/api/inventory/{itemId}` | Returns 403 Forbidden | Security | P1 |
| ORG-INV-018 | Update inventory item — not found | Non-existent itemId | 1. PUT `/api/inventory/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-INV-019 | Delete inventory item — valid | Admin with `inventory.delete`, item exists | 1. DELETE `/api/inventory/{itemId}` | Item deleted; returns 200 | Functional | P1 |
| ORG-INV-020 | Delete inventory item — unauthorized | Staff user | 1. DELETE `/api/inventory/{itemId}` | Returns 403 Forbidden | Security | P1 |
| ORG-INV-021 | Delete inventory item — not found | Non-existent itemId | 1. DELETE `/api/inventory/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-INV-022 | Inventory audit log — create item | Admin creates item | 1. POST `/api/inventory` | Audit log entry `INVENTORY_ITEM_CREATED` created | Functional | P2 |
| ORG-INV-023 | Stock status computed correctly — ok | Item qty 100, threshold 20 | 1. GET `/api/inventory/{itemId}` | `stockStatus` = "ok" | Functional | P2 |
| ORG-INV-024 | Stock status computed correctly — low | Item qty 15, threshold 20 | 1. GET `/api/inventory/{itemId}` | `stockStatus` = "low" | Functional | P2 |
| ORG-INV-025 | Stock status computed correctly — out | Item qty 0, threshold 20 | 1. GET `/api/inventory/{itemId}` | `stockStatus` = "out" | Functional | P2 |
| ORG-INV-026 | Inventory UI — navigate to inventory page | Admin authenticated | 1. Navigate to `/{orgSlug}/inventory` | Inventory table renders with stock status indicators | UI | P1 |

---

### Inventory Transactions

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-INVTX-001 | Record transaction — stock in (valid) | Admin with `inventory.transactions`, item exists | 1. POST `/api/inventory/{itemId}/transactions` with `{type: "in", quantity: 10, reason}` | Transaction recorded; `quantityOnHand` increased by 10 | Functional | P1 |
| ORG-INVTX-002 | Record transaction — stock out (valid) | Admin with `inventory.transactions`, sufficient qty | 1. POST `/api/inventory/{itemId}/transactions` with `{type: "out", quantity: 5, reason}` | Transaction recorded; `quantityOnHand` decreased by 5 | Functional | P1 |
| ORG-INVTX-003 | Record transaction — adjustment | Admin with `inventory.transactions` | 1. POST `/api/inventory/{itemId}/transactions` with `{type: "adjustment", quantity: 50, reason}` | Transaction recorded; quantity set to 50 | Functional | P1 |
| ORG-INVTX-004 | Record transaction — out quantity exceeds stock | Item qty 3, transaction out qty 10 | 1. POST `/api/inventory/{itemId}/transactions` with `{type: "out", quantity: 10}` | Returns 422 or appropriate error; qty cannot go negative | Edge Case | P2 |
| ORG-INVTX-005 | Record transaction — zero quantity | Admin authenticated | 1. POST `/api/inventory/{itemId}/transactions` with `{quantity: 0}` | Returns 422 validation error | Edge Case | P2 |
| ORG-INVTX-006 | Record transaction — missing required fields | Admin authenticated | 1. POST `/api/inventory/{itemId}/transactions` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-INVTX-007 | Record transaction — unauthorized | Staff without `inventory.transactions` | 1. POST `/api/inventory/{itemId}/transactions` | Returns 403 Forbidden | Security | P1 |
| ORG-INVTX-008 | Get transaction history — valid | Transactions exist, admin authenticated | 1. GET `/api/inventory/{itemId}/transactions` | Returns list of all transactions for item | Functional | P1 |
| ORG-INVTX-009 | Get transaction history — empty | No transactions for item | 1. GET `/api/inventory/{itemId}/transactions` | Returns empty array with 200 | Edge Case | P3 |
| ORG-INVTX-010 | Transaction records before/after quantities | Transaction recorded | 1. POST transaction, then GET transactions | Each record has `quantityBefore` and `quantityAfter` fields | Functional | P2 |
| ORG-INVTX-011 | Transaction audit log | Admin records transaction | 1. POST `/api/inventory/{itemId}/transactions` | Audit log entry `INVENTORY_TRANSACTION_RECORDED` created | Functional | P2 |

---

### Inventory Audits

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-INVAUD-001 | Create inventory audit — valid | Admin with `inventory.audits` | 1. POST `/api/inventory/audits` with `{title, startDate}` | Audit created with status "draft"; returns 201 | Functional | P2 |
| ORG-INVAUD-002 | Create audit — missing required fields | Admin authenticated | 1. POST `/api/inventory/audits` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-INVAUD-003 | Create audit — unauthorized | Staff without `inventory.audits` | 1. POST `/api/inventory/audits` | Returns 403 Forbidden | Security | P2 |
| ORG-INVAUD-004 | List audits — valid | Audits exist, admin authenticated | 1. GET `/api/inventory/audits` | Returns list of audits | Functional | P2 |
| ORG-INVAUD-005 | List audits — empty | No audits created | 1. GET `/api/inventory/audits` | Returns empty array with 200 | Edge Case | P3 |
| ORG-INVAUD-006 | Get audit — valid | Audit exists | 1. GET `/api/inventory/audits/{auditId}` | Returns audit details | Functional | P2 |
| ORG-INVAUD-007 | Get audit — not found | Non-existent auditId | 1. GET `/api/inventory/audits/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-INVAUD-008 | Update audit status — to in_progress | Audit in draft status, admin | 1. PUT `/api/inventory/audits/{auditId}` with `{status: "in_progress"}` | Status updated; returns 200 | Functional | P2 |
| ORG-INVAUD-009 | Update audit status — to completed | Audit in_progress, admin | 1. PUT `/api/inventory/audits/{auditId}` with `{status: "completed", completedDate}` | Status updated to completed; completedDate set | Functional | P2 |
| ORG-INVAUD-010 | Record audit items — valid | Audit in_progress, admin | 1. POST `/api/inventory/audits/{auditId}/items` with counted items | Items recorded; returns 200 | Functional | P2 |

---

### Users Management

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-USER-001 | List org users — admin | Admin authenticated | 1. GET `/api/users` | Returns list of all org users | Functional | P1 |
| ORG-USER-002 | List org users — staff (unauthorized) | Staff user | 1. GET `/api/users` | Returns 403 Forbidden | Security | P1 |
| ORG-USER-003 | List org users — unauthenticated | No session | 1. GET `/api/users` | Returns 401 Unauthorized | Security | P1 |
| ORG-USER-004 | Get user — admin | Admin authenticated, user exists | 1. GET `/api/users/{userId}` | Returns user details | Functional | P1 |
| ORG-USER-005 | Get user — not found | Non-existent userId | 1. GET `/api/users/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-USER-006 | Get user — cross-org IDOR attempt | Admin of org A, userId belongs to org B | 1. GET `/api/users/{orgBUserId}` | Returns 404 (cross-org isolation) | Security | P1 |
| ORG-USER-007 | Invite user — admin invites staff | Admin authenticated | 1. POST `/api/users` with `{email, displayName, role: "staff"}` | Invite sent; user record created; email sent | Functional | P1 |
| ORG-USER-008 | Invite user — admin invites admin | Admin authenticated | 1. POST `/api/users` with `{email, displayName, role: "admin"}` | Invite sent; user record created | Functional | P1 |
| ORG-USER-009 | Invite user — with custom permissions | Admin with custom permissions set | 1. POST `/api/users` with `{role: "staff", permissions: {...}}` | User created with custom permissions | Functional | P2 |
| ORG-USER-010 | Invite user — duplicate email | User with email already in org | 1. POST `/api/users` with existing email | Returns 409 Conflict | Edge Case | P2 |
| ORG-USER-011 | Invite user — missing required fields | Admin authenticated | 1. POST `/api/users` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-USER-012 | Invite user — subscription user limit reached | Org at maxUsers limit | 1. POST `/api/users` | Returns 403 limit exceeded | Edge Case | P2 |
| ORG-USER-013 | Invite user — unauthorized (staff) | Staff user | 1. POST `/api/users` | Returns 403 Forbidden | Security | P1 |
| ORG-USER-014 | Invite user — audit log | Admin invites user | 1. POST `/api/users` | Audit log entry `USER_INVITED` created | Functional | P2 |
| ORG-USER-015 | Update user permissions — valid | Admin authenticated, user exists | 1. PUT `/api/users/{userId}` with new permissions | Permissions updated; returns 200 | Functional | P1 |
| ORG-USER-016 | Update user displayName — valid | Admin authenticated | 1. PUT `/api/users/{userId}` with `{displayName: "New Name"}` | Display name updated | Functional | P2 |
| ORG-USER-017 | Update user — unauthorized (staff) | Staff user | 1. PUT `/api/users/{userId}` | Returns 403 Forbidden | Security | P1 |
| ORG-USER-018 | Update user — not found | Non-existent userId | 1. PUT `/api/users/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-USER-019 | Update user — audit log | Admin updates user | 1. PUT `/api/users/{userId}` | Audit log entry `USER_UPDATED` with permission diff | Functional | P2 |
| ORG-USER-020 | Deactivate user — valid | Admin authenticated, user exists | 1. DELETE `/api/users/{userId}` | User status → deactivated; returns 200 | Functional | P1 |
| ORG-USER-021 | Deactivate user — cannot deactivate org_owner | Admin tries to deactivate org_owner | 1. DELETE `/api/users/{ownerId}` | Returns 403 or appropriate error | Edge Case | P2 |
| ORG-USER-022 | Deactivate user — unauthorized (staff) | Staff user | 1. DELETE `/api/users/{userId}` | Returns 403 Forbidden | Security | P1 |
| ORG-USER-023 | Deactivate user — audit log | Admin deactivates user | 1. DELETE `/api/users/{userId}` | Audit log entry `USER_DEACTIVATED` created | Functional | P2 |
| ORG-USER-024 | Deactivated user cannot login | User with `status: deactivated` | 1. Attempt login with deactivated user credentials | Login rejected; access denied | Security | P1 |

---

### Invites

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-INVITE-001 | Get invite by token — valid | Valid pending invite token | 1. GET `/api/invites/{token}` | Returns invite details (org name, role, invitee info) | Functional | P1 |
| ORG-INVITE-002 | Get invite by token — not found | Non-existent token | 1. GET `/api/invites/invalidtoken` | Returns 404 Not Found | Functional | P2 |
| ORG-INVITE-003 | Get invite by token — expired | Invite token past expiresAt | 1. GET `/api/invites/{expiredToken}` | Returns 410 Gone or 404 with appropriate message | Edge Case | P2 |
| ORG-INVITE-004 | Get invite by token — revoked | Invite with status "revoked" | 1. GET `/api/invites/{revokedToken}` | Returns appropriate error | Edge Case | P2 |
| ORG-INVITE-005 | Accept invite — valid | Valid pending invite, user fills form | 1. POST `/api/invites/{token}/accept` with `{password}` | Firebase user created; org user record created; invite marked accepted | Functional | P1 |
| ORG-INVITE-006 | Accept invite — expired | Expired invite token | 1. POST `/api/invites/{expiredToken}/accept` | Returns 410 Gone or error | Edge Case | P2 |
| ORG-INVITE-007 | Accept invite — revoked | Revoked invite token | 1. POST `/api/invites/{revokedToken}/accept` | Returns appropriate error | Edge Case | P2 |
| ORG-INVITE-008 | Accept invite — already accepted | Invite already accepted once | 1. POST `/api/invites/{acceptedToken}/accept` | Returns 409 Conflict | Edge Case | P2 |
| ORG-INVITE-009 | Accept invite — weak password | Valid invite, weak password | 1. POST `/api/invites/{token}/accept` with `{password: "123"}` | Returns 422 validation error | Security | P2 |
| ORG-INVITE-010 | Accept invite — rate limit | More than 5 accept attempts per IP per hour | 1. POST to accept 6 times within one hour | 6th request returns 429 Too Many Requests | Security | P2 |
| ORG-INVITE-011 | Accept invite — audit log | User accepts invite | 1. POST `/api/invites/{token}/accept` | Audit log entry `INVITE_ACCEPTED` created | Functional | P2 |
| ORG-INVITE-012 | List pending invites — admin | Admin authenticated | 1. GET `/api/invites` | Returns list of pending invites | Functional | P2 |
| ORG-INVITE-013 | Revoke invite — valid | Admin authenticated, pending invite | 1. POST `/api/invites/{token}/revoke` | Invite status → revoked; returns 200 | Functional | P2 |
| ORG-INVITE-014 | Revoke invite — unauthorized (staff) | Staff user | 1. POST `/api/invites/{token}/revoke` | Returns 403 Forbidden | Security | P2 |
| ORG-INVITE-015 | Invite page UI — shows role and org name | User navigates to `/invites/{token}` | 1. Navigate to invite acceptance URL | Page shows org name, role, and invitee name | UI | P1 |

---

### Reports

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-REPORT-001 | Get reports — authorized admin | Admin with `reports.view`, `reports` feature enabled | 1. GET `/api/reports` | Returns asset utilization, warranty, and depreciation reports | Functional | P1 |
| ORG-REPORT-002 | Get reports — unauthorized (staff) | Staff without `reports.view` | 1. GET `/api/reports` | Returns 403 Forbidden | Security | P1 |
| ORG-REPORT-003 | Get reports — feature disabled | `reports` feature disabled | 1. GET `/api/reports` | Returns 403 feature not enabled | Functional | P1 |
| ORG-REPORT-004 | Get reports — unauthenticated | No session | 1. GET `/api/reports` | Returns 401 Unauthorized | Security | P1 |
| ORG-REPORT-005 | Reports with no data — empty org | No assets or warranties | 1. GET `/api/reports` | Returns empty/zero reports without errors | Edge Case | P2 |
| ORG-REPORT-006 | Reports UI — navigate to reports page | Admin with reports access | 1. Navigate to `/{orgSlug}/reports` | Reports page renders with charts/tables | UI | P2 |
| ORG-REPORT-007 | Reports — staff cannot access page | Staff user | 1. Navigate to `/{orgSlug}/reports` | 403 or redirect; access denied | Security | P1 |
| ORG-REPORT-008 | Reports — asset utilization reflects checkouts | Assets checked out/returned | 1. GET `/api/reports` | Utilization report shows checkout data accurately | Functional | P2 |

---

### Audit Logs

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-AUDITLOG-001 | Get audit logs — authorized admin | Admin with `auditLogs.view` | 1. GET `/api/audit-logs` | Returns paginated audit log entries for org | Functional | P1 |
| ORG-AUDITLOG-002 | Get audit logs — unauthorized (staff) | Staff without `auditLogs.view` | 1. GET `/api/audit-logs` | Returns 403 Forbidden | Security | P1 |
| ORG-AUDITLOG-003 | Get audit logs — unauthenticated | No session | 1. GET `/api/audit-logs` | Returns 401 Unauthorized | Security | P1 |
| ORG-AUDITLOG-004 | Get audit logs — cross-org isolation | Authenticated as org A user | 1. GET `/api/audit-logs` | Returns only org A's audit logs; org B logs not visible | Security | P1 |
| ORG-AUDITLOG-005 | Get audit logs — empty state | No actions performed yet | 1. GET `/api/audit-logs` | Returns empty array with 200 | Edge Case | P3 |
| ORG-AUDITLOG-006 | Export audit logs as CSV | Admin with `auditLogs.view` | 1. GET `/api/audit-logs/export` | Returns CSV file with all audit log entries | Functional | P2 |
| ORG-AUDITLOG-007 | Audit logs UI — navigate to page | Admin authenticated | 1. Navigate to `/{orgSlug}/audit-logs` | Audit log table renders with actor, action, module, timestamp | UI | P1 |
| ORG-AUDITLOG-008 | Audit log shows diff for updates | Admin updated an asset | 1. View audit log for ASSET_UPDATED | Shows oldValue and newValue for changed fields | Functional | P2 |

---

### Support Tickets

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-SUPPORT-001 | Create support ticket — valid | Authenticated user with `support.create` | 1. POST `/api/support` with `{subject, description, priority}` | Ticket created with status OPEN; returns 201 | Functional | P1 |
| ORG-SUPPORT-002 | Create ticket — missing required fields | Admin authenticated | 1. POST `/api/support` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-SUPPORT-003 | Create ticket — unauthenticated | No session | 1. POST `/api/support` | Returns 401 Unauthorized | Security | P1 |
| ORG-SUPPORT-004 | Create ticket — feature disabled | `support` feature disabled | 1. POST `/api/support` | Returns 403 feature not enabled | Functional | P1 |
| ORG-SUPPORT-005 | List support tickets — admin | Admin with `support.view` | 1. GET `/api/support` | Returns all org tickets | Functional | P1 |
| ORG-SUPPORT-006 | List support tickets — staff | Staff with `support.view` | 1. GET `/api/support` | Returns tickets (staff sees own or all per config) | Functional | P2 |
| ORG-SUPPORT-007 | Get ticket — valid | Ticket exists, user authenticated | 1. GET `/api/support/{ticketId}` | Returns ticket details | Functional | P1 |
| ORG-SUPPORT-008 | Get ticket — not found | Non-existent ticketId | 1. GET `/api/support/nonexistent` | Returns 404 Not Found | Functional | P2 |
| ORG-SUPPORT-009 | Add message to ticket — valid | Ticket exists, user authenticated | 1. POST `/api/support/{ticketId}/messages` with `{body}` | Message added; returns 201 | Functional | P1 |
| ORG-SUPPORT-010 | Add message — empty body | User authenticated | 1. POST `/api/support/{ticketId}/messages` with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-SUPPORT-011 | Get ticket messages — valid | Messages exist, user authenticated | 1. GET `/api/support/{ticketId}/messages` | Returns list of messages with author info | Functional | P1 |
| ORG-SUPPORT-012 | Update ticket status — admin | Admin authenticated, ticket open | 1. PUT `/api/support/{ticketId}` with `{status: "RESOLVED"}` | Ticket status updated; returns 200 | Functional | P2 |
| ORG-SUPPORT-013 | Update ticket status — unauthorized (staff) | Staff user | 1. PUT `/api/support/{ticketId}` | Returns 403 Forbidden | Security | P2 |
| ORG-SUPPORT-014 | Support UI — navigate to support page | User authenticated | 1. Navigate to `/{orgSlug}/support` | Tickets list renders with status badges | UI | P1 |
| ORG-SUPPORT-015 | Support ticket detail — message thread | Ticket with multiple messages | 1. Navigate to `/{orgSlug}/support/{ticketId}` | Message thread renders chronologically | UI | P1 |

---

### Subscription

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-SUB-001 | View subscription info — admin | Admin authenticated | 1. Navigate to `/{orgSlug}/subscription` | Subscription page shows plan name, features, and renewal date | Functional | P1 |
| ORG-SUB-002 | View subscription via API | Admin authenticated | 1. GET `/api/organizations/{orgId}/subscription` | Returns subscription details with feature flags | Functional | P1 |
| ORG-SUB-003 | Disabled feature is inaccessible via API | Feature disabled in subscription | 1. Call API endpoint requiring disabled feature | Returns 403 feature not enabled | Functional | P1 |
| ORG-SUB-004 | Disabled feature hidden in UI | Feature disabled | 1. Navigate to org platform | Feature's nav link and page are not accessible | UI | P1 |
| ORG-SUB-005 | Expired subscription blocks access | Subscription status = EXPIRED | 1. Attempt to access any org feature API | Returns 403 subscription expired | Functional | P1 |
| ORG-SUB-006 | Suspended subscription blocks access | Subscription status = SUSPENDED | 1. Attempt to access any org feature API | Returns 403 subscription suspended | Functional | P1 |
| ORG-SUB-007 | Active subscription allows access | Subscription status = ACTIVE | 1. Access org feature | Returns 200 with data | Functional | P1 |

---

### Organization Configuration

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-CONFIG-001 | Get org config — admin | Admin authenticated | 1. GET `/api/organizations/{orgId}/config` | Returns config with statuses, locations, categories | Functional | P1 |
| ORG-CONFIG-002 | Get config — unauthenticated | No session | 1. GET `/api/organizations/{orgId}/config` | Returns 401 Unauthorized | Security | P1 |
| ORG-CONFIG-003 | Create asset status — valid | Admin authenticated | 1. POST `/api/organizations/{orgId}/config/statuses` with `{label, color}` | Status created; returns 201 | Functional | P2 |
| ORG-CONFIG-004 | Create asset status — missing fields | Admin authenticated | 1. POST with `{}` | Returns 422 validation error | Functional | P2 |
| ORG-CONFIG-005 | Create asset status — unauthorized (staff) | Staff user | 1. POST `/api/organizations/{orgId}/config/statuses` | Returns 403 Forbidden | Security | P2 |
| ORG-CONFIG-006 | Update asset status — valid | Admin authenticated, status exists | 1. PUT `/api/organizations/{orgId}/config/statuses/{statusId}` | Status updated; returns 200 | Functional | P2 |
| ORG-CONFIG-007 | Update asset status — not found | Non-existent statusId | 1. PUT with non-existent ID | Returns 404 Not Found | Functional | P2 |
| ORG-CONFIG-008 | Delete asset status — valid | Admin authenticated, status exists | 1. DELETE `/api/organizations/{orgId}/config/statuses/{statusId}` | Status deleted; returns 200 | Functional | P2 |
| ORG-CONFIG-009 | Create location — valid | Admin authenticated | 1. POST `/api/organizations/{orgId}/config/locations` with `{name}` | Location created; returns 201 | Functional | P2 |
| ORG-CONFIG-010 | Update location — valid | Admin authenticated | 1. PUT `/api/organizations/{orgId}/config/locations/{locationId}` | Location updated; returns 200 | Functional | P2 |
| ORG-CONFIG-011 | Delete location — valid | Admin authenticated | 1. DELETE `/api/organizations/{orgId}/config/locations/{locationId}` | Location deleted; returns 200 | Functional | P2 |
| ORG-CONFIG-012 | Create category — valid | Admin authenticated | 1. POST `/api/organizations/{orgId}/config/categories` with `{name}` | Category created; returns 201 | Functional | P2 |
| ORG-CONFIG-013 | Update category — valid | Admin authenticated | 1. PUT `/api/organizations/{orgId}/config/categories/{categoryId}` | Category updated; returns 200 | Functional | P2 |
| ORG-CONFIG-014 | Delete category — valid | Admin authenticated | 1. DELETE `/api/organizations/{orgId}/config/categories/{categoryId}` | Category deleted; returns 200 | Functional | P2 |
| ORG-CONFIG-015 | Config audit log — update | Admin updates org config | 1. Update any config item | Audit log entry created for config change | Functional | P2 |

---

### Profile

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-PROFILE-001 | View profile page — authenticated | User authenticated | 1. Navigate to `/{orgSlug}/profile` | Profile page renders with current display name | UI | P2 |
| ORG-PROFILE-002 | Update display name — valid | User authenticated | 1. Update displayName on profile page | Display name updated; changes reflected in UI | Functional | P2 |
| ORG-PROFILE-003 | Profile page — unauthenticated | No session | 1. Navigate to `/{orgSlug}/profile` | Redirected to `/login` | Security | P2 |

---

### Cron Jobs (Org-Related)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| ORG-CRON-001 | Warranty alert cron — sends reminder | Warranty expiring within 30 days, reminder enabled | 1. GET `/api/cron/warranty-alerts` (Vercel cron trigger) | Reminder email sent to org admin | Functional | P2 |
| ORG-CRON-002 | Warranty alert cron — no email for expired | Warranty already expired | 1. GET `/api/cron/warranty-alerts` | No additional email sent for already-expired warranties | Edge Case | P3 |
| ORG-CRON-003 | Subscription status cron — marks expired | Subscription endDate passed | 1. GET `/api/cron/subscription-status` | Subscription status updated to EXPIRED | Functional | P2 |
| ORG-CRON-004 | Cron — unauthorized external call | External request without Vercel cron headers | 1. GET `/api/cron/subscription-status` without auth | Returns 401 or 403 | Security | P2 |

---

---

## Platform 2: Superadmin Platform

### Authentication (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-AUTH-001 | super_admin login and redirect | Super admin account exists | 1. Navigate to `/login` 2. Enter super admin credentials | Authenticated; redirected to `/superadmin` | Functional | P1 |
| SA-AUTH-002 | makhzoon_admin login and redirect | makhzoon_admin account exists | 1. Login with makhzoon_admin credentials | Authenticated; redirected to `/superadmin` | Functional | P1 |
| SA-AUTH-003 | makhzoon_support login and redirect | makhzoon_support account exists | 1. Login with makhzoon_support credentials | Authenticated; redirected to `/superadmin` | Functional | P1 |
| SA-AUTH-004 | Org user cannot access superadmin routes | Authenticated org admin | 1. Navigate to `/superadmin` | Redirected or 403; access denied | Security | P1 |
| SA-AUTH-005 | Unauthenticated access to superadmin | No session | 1. Navigate to `/superadmin` | Redirected to `/login` | Security | P1 |
| SA-AUTH-006 | Deactivated superadmin cannot login | Superadmin with `status: deactivated` | 1. Attempt login | Access denied with appropriate message | Security | P1 |
| SA-AUTH-007 | GET /api/auth/me for super_admin returns correct role | super_admin authenticated | 1. GET `/api/auth/me` | Returns `role: "super_admin"` and superadmin permissions | Functional | P1 |

---

### Superadmin Dashboard

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-DASH-001 | Superadmin dashboard loads | super_admin authenticated | 1. Navigate to `/superadmin/dashboard` | Dashboard renders with platform stats (total orgs, active subs, etc.) | Functional | P1 |
| SA-DASH-002 | Dashboard shows all org stats | Multiple orgs exist | 1. Navigate to `/superadmin/dashboard` | Stats aggregate all organizations | Functional | P1 |
| SA-DASH-003 | GET /api/admin/usage — authorized | super_admin authenticated | 1. GET `/api/admin/usage` | Returns platform-wide usage statistics | Functional | P1 |
| SA-DASH-004 | GET /api/admin/usage — unauthorized (makhzoon_support) | makhzoon_support authenticated | 1. GET `/api/admin/usage` | Returns 403 Forbidden | Security | P2 |
| SA-DASH-005 | Dashboard loading state | Slow network | 1. Navigate to `/superadmin/dashboard` | Loading skeleton shown | UI | P3 |

---

### Organizations Management (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-ORG-001 | List all organizations — super_admin | super_admin authenticated | 1. GET `/api/organizations` | Returns list of all organizations | Functional | P1 |
| SA-ORG-002 | List all organizations — makhzoon_admin | makhzoon_admin authenticated | 1. GET `/api/organizations` | Returns list of all organizations | Functional | P1 |
| SA-ORG-003 | List organizations — unauthenticated | No session | 1. GET `/api/organizations` | Returns 401 Unauthorized | Security | P1 |
| SA-ORG-004 | List organizations — org user (unauthorized) | Org admin authenticated | 1. GET `/api/organizations` | Returns 403 Forbidden | Security | P1 |
| SA-ORG-005 | List organizations — empty platform | No orgs exist | 1. GET `/api/organizations` | Returns empty array with 200 | Edge Case | P3 |
| SA-ORG-006 | Create organization — super_admin | super_admin authenticated | 1. POST `/api/organizations` with `{name, subdomain, contactEmail, category}` | Organization created; returns 201 | Functional | P1 |
| SA-ORG-007 | Create organization — makhzoon_admin | makhzoon_admin authenticated | 1. POST `/api/organizations` with required fields | Organization created; returns 201 | Functional | P1 |
| SA-ORG-008 | Create organization — makhzoon_support (unauthorized) | makhzoon_support authenticated | 1. POST `/api/organizations` | Returns 403 Forbidden | Security | P1 |
| SA-ORG-009 | Create organization — missing required fields | super_admin authenticated | 1. POST `/api/organizations` with `{}` | Returns 422 validation error | Functional | P1 |
| SA-ORG-010 | Create organization — duplicate subdomain | Org with same subdomain exists | 1. POST `/api/organizations` with existing subdomain | Returns 409 Conflict | Edge Case | P1 |
| SA-ORG-011 | Create organization — invalid category | super_admin authenticated | 1. POST `/api/organizations` with invalid category | Returns 422 validation error | Functional | P2 |
| SA-ORG-012 | Get organization details — super_admin | super_admin, org exists | 1. GET `/api/organizations/{orgId}` | Returns full org details | Functional | P1 |
| SA-ORG-013 | Get organization — not found | Non-existent orgId | 1. GET `/api/organizations/nonexistent` | Returns 404 Not Found | Functional | P2 |
| SA-ORG-014 | Edit organization — super_admin | super_admin authenticated | 1. PUT `/api/organizations/{orgId}` with updated fields | Org updated; returns 200 | Functional | P1 |
| SA-ORG-015 | Edit organization — makhzoon_admin | makhzoon_admin authenticated | 1. PUT `/api/organizations/{orgId}` | Org updated; returns 200 | Functional | P1 |
| SA-ORG-016 | Edit organization — makhzoon_support (unauthorized) | makhzoon_support authenticated | 1. PUT `/api/organizations/{orgId}` | Returns 403 Forbidden | Security | P1 |
| SA-ORG-017 | Edit organization — invalid subdomain format | super_admin authenticated | 1. PUT `/api/organizations/{orgId}` with invalid subdomain | Returns 422 validation error | Functional | P2 |
| SA-ORG-018 | Get org by subdomain — authorized | Admin/staff of the org | 1. GET `/api/organizations/by-subdomain/{subdomain}` | Returns org details | Functional | P2 |
| SA-ORG-019 | Get org usage — super_admin | super_admin authenticated | 1. GET `/api/organizations/{orgId}/usage` | Returns usage metrics (asset count, user count, etc.) | Functional | P1 |
| SA-ORG-020 | Organizations page UI — list view | super_admin authenticated | 1. Navigate to `/superadmin` | Orgs list renders with search and filter | UI | P1 |
| SA-ORG-021 | Organizations page UI — search | Multiple orgs, search term entered | 1. Navigate to `/superadmin` 2. Search for org name | Filtered list shows matching orgs | UI | P2 |
| SA-ORG-022 | Create org page UI | super_admin authenticated | 1. Navigate to `/superadmin/organizations/new` | Create org form renders | UI | P1 |
| SA-ORG-023 | Self-serve org registration — valid | Public endpoint | 1. POST `/api/organizations/self-serve` with required fields | Org created; welcome email sent | Functional | P2 |
| SA-ORG-024 | Self-serve registration — duplicate subdomain | Same subdomain exists | 1. POST `/api/organizations/self-serve` | Returns 409 Conflict | Edge Case | P2 |

---

### Subscription Management (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-SUB-001 | Get org subscription — super_admin | super_admin authenticated | 1. GET `/api/organizations/{orgId}/subscription` | Returns subscription details | Functional | P1 |
| SA-SUB-002 | Update subscription — super_admin | super_admin authenticated | 1. PUT `/api/organizations/{orgId}/subscription` with updated fields | Subscription updated; returns 200 | Functional | P1 |
| SA-SUB-003 | Update subscription — makhzoon_admin (unauthorized) | makhzoon_admin authenticated | 1. PUT `/api/organizations/{orgId}/subscription` | Returns 403 Forbidden | Security | P1 |
| SA-SUB-004 | Assign package to org — super_admin | Package exists, super_admin authenticated | 1. PUT `/api/organizations/{orgId}/subscription` with `{packageId}` | Subscription updated with package features | Functional | P1 |
| SA-SUB-005 | Set custom features — super_admin | super_admin authenticated | 1. PUT `/api/organizations/{orgId}/subscription` with custom `features` map | Custom features applied to subscription | Functional | P2 |
| SA-SUB-006 | Suspend subscription — super_admin | Active subscription exists | 1. PUT `/api/organizations/{orgId}/subscription` with `{status: "SUSPENDED"}` | Subscription suspended; org access blocked | Functional | P1 |
| SA-SUB-007 | Expire subscription — cron | Subscription endDate passed | 1. Cron job runs | Subscription status updated to EXPIRED automatically | Functional | P2 |
| SA-SUB-008 | Update subscription dates — valid | super_admin authenticated | 1. PUT subscription with new startDate and endDate | Dates updated; returns 200 | Functional | P2 |
| SA-SUB-009 | Update subscription — invalid dates | super_admin authenticated | 1. PUT with endDate before startDate | Returns 422 validation error | Edge Case | P2 |
| SA-SUB-010 | Subscription page UI | super_admin authenticated | 1. Navigate to `/superadmin/organizations/{orgId}/subscription` | Subscription management page renders with plan, dates, feature toggles | UI | P1 |

---

### Packages Management (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-PKG-001 | List packages — super_admin | super_admin authenticated | 1. GET `/api/packages` | Returns list of all packages | Functional | P1 |
| SA-PKG-002 | List packages — makhzoon_admin (unauthorized) | makhzoon_admin authenticated | 1. GET `/api/packages` | Returns 403 Forbidden | Security | P1 |
| SA-PKG-003 | Create package — valid | super_admin authenticated | 1. POST `/api/packages` with `{name, description, features, limits}` | Package created; returns 201 | Functional | P1 |
| SA-PKG-004 | Create package — missing required fields | super_admin authenticated | 1. POST `/api/packages` with `{}` | Returns 422 validation error | Functional | P2 |
| SA-PKG-005 | Create package — unauthorized (makhzoon_admin) | makhzoon_admin authenticated | 1. POST `/api/packages` | Returns 403 Forbidden | Security | P1 |
| SA-PKG-006 | Get package — valid | Package exists | 1. GET `/api/packages/{packageId}` | Returns package details | Functional | P1 |
| SA-PKG-007 | Get package — not found | Non-existent packageId | 1. GET `/api/packages/nonexistent` | Returns 404 Not Found | Functional | P2 |
| SA-PKG-008 | Update package — valid | super_admin, package exists | 1. PUT `/api/packages/{packageId}` with updated fields | Package updated; returns 200 | Functional | P1 |
| SA-PKG-009 | Update package — unauthorized | makhzoon_admin authenticated | 1. PUT `/api/packages/{packageId}` | Returns 403 Forbidden | Security | P1 |
| SA-PKG-010 | Package with limits — maxAssets enforced | Package assigned to org with maxAssets: 10 | 1. Try to create 11th asset | Returns 403 limit exceeded | Functional | P2 |
| SA-PKG-011 | Configuration page UI | super_admin authenticated | 1. Navigate to `/superadmin/configuration` | Configuration page renders with packages management | UI | P1 |

---

### Team Management (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-TEAM-001 | List superadmin team — super_admin | super_admin authenticated | 1. GET `/api/superadmin/team` | Returns list of all superadmin users | Functional | P1 |
| SA-TEAM-002 | List team — makhzoon_admin | makhzoon_admin with `team.view` | 1. GET `/api/superadmin/team` | Returns list of superadmin users | Functional | P2 |
| SA-TEAM-003 | List team — makhzoon_support (unauthorized) | makhzoon_support (team.view = false) | 1. GET `/api/superadmin/team` | Returns 403 Forbidden | Security | P1 |
| SA-TEAM-004 | List team — unauthenticated | No session | 1. GET `/api/superadmin/team` | Returns 401 Unauthorized | Security | P1 |
| SA-TEAM-005 | Create superadmin user — super_admin | super_admin authenticated | 1. POST `/api/superadmin/team` with `{email, displayName, role}` | Superadmin user created; returns 201 | Functional | P1 |
| SA-TEAM-006 | Create superadmin user — makhzoon_admin (unauthorized) | makhzoon_admin (team.manage = false) | 1. POST `/api/superadmin/team` | Returns 403 Forbidden | Security | P1 |
| SA-TEAM-007 | Create superadmin user — missing fields | super_admin authenticated | 1. POST `/api/superadmin/team` with `{}` | Returns 422 validation error | Functional | P2 |
| SA-TEAM-008 | Create superadmin user — duplicate email | Email already registered | 1. POST with existing email | Returns 409 Conflict | Edge Case | P2 |
| SA-TEAM-009 | Update superadmin user — super_admin | super_admin, user exists | 1. PUT `/api/superadmin/team/{memberId}` with updated role | User updated; returns 200 | Functional | P1 |
| SA-TEAM-010 | Update superadmin user — unauthorized | makhzoon_admin | 1. PUT `/api/superadmin/team/{memberId}` | Returns 403 Forbidden | Security | P1 |
| SA-TEAM-011 | Update superadmin user — not found | Non-existent memberId | 1. PUT `/api/superadmin/team/nonexistent` | Returns 404 Not Found | Functional | P2 |
| SA-TEAM-012 | Deactivate superadmin user — super_admin | super_admin, member exists | 1. DELETE `/api/superadmin/team/{memberId}` | User status → deactivated; returns 200 | Functional | P1 |
| SA-TEAM-013 | Deactivate superadmin user — cannot deactivate self | super_admin deactivating own account | 1. DELETE `/api/superadmin/team/{selfId}` | Returns 403 or appropriate error | Edge Case | P2 |
| SA-TEAM-014 | Deactivate superadmin user — unauthorized | makhzoon_admin | 1. DELETE `/api/superadmin/team/{memberId}` | Returns 403 Forbidden | Security | P1 |
| SA-TEAM-015 | Team page UI | super_admin authenticated | 1. Navigate to `/superadmin/team` | Team members list renders with roles and statuses | UI | P1 |

---

### Support Tickets (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-SUPPORT-001 | View all org support tickets — superadmin | super_admin authenticated | 1. GET `/api/support` with superadmin context | Returns all platform support tickets | Functional | P1 |
| SA-SUPPORT-002 | View ticket details — super_admin | Ticket exists | 1. GET `/api/support/{ticketId}` | Returns ticket details with messages | Functional | P1 |
| SA-SUPPORT-003 | Respond to ticket — makhzoon_support | makhzoon_support with `support.respond` | 1. POST `/api/support/{ticketId}/messages` with `{body}` | Message added; ticket status → IN_PROGRESS | Functional | P1 |
| SA-SUPPORT-004 | Close ticket — super_admin | super_admin, open ticket | 1. PUT `/api/support/{ticketId}` with `{status: "CLOSED"}` | Ticket closed; returns 200 | Functional | P1 |
| SA-SUPPORT-005 | Close ticket — makhzoon_admin | makhzoon_admin with `support.close` | 1. PUT `/api/support/{ticketId}` with `{status: "CLOSED"}` | Ticket closed; returns 200 | Functional | P1 |
| SA-SUPPORT-006 | Close ticket — makhzoon_support (unauthorized) | makhzoon_support (support.close = false) | 1. PUT `/api/support/{ticketId}` with `{status: "CLOSED"}` | Returns 403 Forbidden | Security | P1 |
| SA-SUPPORT-007 | Support page UI | super_admin authenticated | 1. Navigate to `/superadmin/support` | Tickets list renders with status, priority, org info | UI | P1 |
| SA-SUPPORT-008 | Support ticket detail UI | super_admin authenticated | 1. Navigate to `/superadmin/support/{ticketId}` | Ticket detail with message thread renders | UI | P1 |
| SA-SUPPORT-009 | Respond to ticket — unauthorized (org user) | Org admin authenticated | 1. POST `/api/support/{ticketId}/messages` as superadmin ticket handler | Cannot access superadmin support endpoints | Security | P1 |

---

### Audit Logs (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-AUDITLOG-001 | View platform-wide audit logs | super_admin authenticated | 1. Navigate to `/superadmin/audit-logs` | All orgs' audit logs displayed | Functional | P1 |
| SA-AUDITLOG-002 | View org-specific audit logs | super_admin authenticated | 1. Navigate to `/superadmin/organizations/{orgId}/audit-logs` | Only that org's audit logs shown | Functional | P1 |
| SA-AUDITLOG-003 | Get audit logs via API — super_admin | super_admin authenticated | 1. GET `/api/audit-logs` with superadmin context | Returns audit logs | Functional | P1 |
| SA-AUDITLOG-004 | Audit logs — makhzoon_support can view | makhzoon_support with `auditLogs.view` | 1. Navigate to `/superadmin/audit-logs` | Audit logs visible | Functional | P2 |
| SA-AUDITLOG-005 | Audit logs — org user cannot view platform logs | Org admin authenticated | 1. Attempt to access superadmin audit logs | Access denied | Security | P1 |
| SA-AUDITLOG-006 | Transfer mode logs flagged | super_admin acted in transfer mode | 1. View audit log for action taken in transfer mode | Audit entry shows `transferMode: true` | Functional | P2 |

---

### Transfer Mode (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-TRANS-001 | Enter transfer mode — super_admin | super_admin authenticated, org exists | 1. POST `/api/organizations/{orgId}/transfer` | Transfer mode activated; token/session updated; banner shown | Functional | P1 |
| SA-TRANS-002 | Enter transfer mode — unauthorized (makhzoon_admin) | makhzoon_admin authenticated | 1. POST `/api/organizations/{orgId}/transfer` | Returns 403 Forbidden | Security | P1 |
| SA-TRANS-003 | Act as org admin in transfer mode | super_admin in transfer mode for org X | 1. Access org X assets, users, etc. | Full org admin access granted; all data visible | Functional | P1 |
| SA-TRANS-004 | Actions in transfer mode logged with flag | super_admin in transfer mode creates asset | 1. POST `/api/assets` in transfer mode | Audit log entry has `transferMode: true` | Functional | P2 |
| SA-TRANS-005 | Transfer mode banner visible | super_admin in transfer mode | 1. Navigate to org platform in transfer mode | Banner shows "Transfer Mode Active" with org name | UI | P1 |
| SA-TRANS-006 | Exit transfer mode — valid | super_admin in active transfer mode | 1. POST `/api/organizations/transfer/exit` | Transfer mode deactivated; returns to normal superadmin context | Functional | P1 |
| SA-TRANS-007 | Exit transfer mode — not in transfer mode | super_admin NOT in transfer mode | 1. POST `/api/organizations/transfer/exit` | Returns 400 or appropriate error | Edge Case | P2 |
| SA-TRANS-008 | Cannot access other org in transfer mode | super_admin transferred into org X | 1. Attempt to access org Y data while in org X transfer mode | Access denied; cross-org isolation maintained | Security | P1 |

---

### Backend Logs (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-LOGS-001 | View backend logs — super_admin | super_admin authenticated | 1. GET `/api/superadmin/backend-logs` | Returns backend error logs | Functional | P2 |
| SA-LOGS-002 | View backend logs — makhzoon_admin | makhzoon_admin with `backendLogs.view` | 1. GET `/api/superadmin/backend-logs` | Returns backend error logs | Functional | P2 |
| SA-LOGS-003 | View backend logs — makhzoon_support | makhzoon_support with `backendLogs.view` | 1. GET `/api/superadmin/backend-logs` | Returns backend error logs | Functional | P2 |
| SA-LOGS-004 | View backend logs — unauthenticated | No session | 1. GET `/api/superadmin/backend-logs` | Returns 401 Unauthorized | Security | P2 |
| SA-LOGS-005 | View backend logs — org user (unauthorized) | Org admin authenticated | 1. GET `/api/superadmin/backend-logs` | Returns 403 Forbidden | Security | P2 |
| SA-LOGS-006 | Backend logs page UI | super_admin authenticated | 1. Navigate to `/superadmin/backend-logs` | Error logs page renders with timestamps, error messages | UI | P3 |

---

### Payment Logs (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-PAY-001 | Create payment log — super_admin | super_admin authenticated | 1. POST `/api/organizations/{orgId}/payments` with `{amount, currency, description, status}` | Payment log created; returns 201 | Functional | P2 |
| SA-PAY-002 | Create payment log — unauthorized (makhzoon_admin) | makhzoon_admin authenticated | 1. POST `/api/organizations/{orgId}/payments` | Returns 403 Forbidden | Security | P2 |
| SA-PAY-003 | List payment logs — super_admin | super_admin authenticated | 1. GET `/api/organizations/{orgId}/payments` | Returns list of payment logs | Functional | P2 |
| SA-PAY-004 | List payment logs — org admin | Admin of the org | 1. GET `/api/organizations/{orgId}/payments` | Returns payment logs (view only) | Functional | P2 |
| SA-PAY-005 | Get payment log — valid | Log exists | 1. GET `/api/organizations/{orgId}/payments/{logId}` | Returns payment log details | Functional | P2 |
| SA-PAY-006 | Get payment log — not found | Non-existent logId | 1. GET `/api/organizations/{orgId}/payments/nonexistent` | Returns 404 Not Found | Functional | P2 |
| SA-PAY-007 | Get payment log — cross-org | Log belongs to different org | 1. GET with mismatched orgId | Returns 404 (isolation) | Security | P2 |

---

### Organization Configuration (Superadmin)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-ORGCFG-001 | View org configuration — super_admin | super_admin authenticated | 1. Navigate to `/superadmin/organizations/{orgId}/configuration` | Org configuration page renders | Functional | P2 |
| SA-ORGCFG-002 | Manage org statuses — super_admin | super_admin in org config page | 1. Add/edit/delete a status in org config | Config updated; changes visible in org platform | Functional | P2 |
| SA-ORGCFG-003 | Manage org locations — super_admin | super_admin in org config page | 1. Add/edit/delete a location | Config updated | Functional | P2 |
| SA-ORGCFG-004 | Org config page — makhzoon_support (unauthorized) | makhzoon_support (configuration.edit = false) | 1. Attempt to edit org config | Returns 403 or read-only view | Security | P2 |

---

### Public Endpoints (Superadmin-Adjacent)

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| SA-PUBLIC-001 | Contact form submission — valid | Public endpoint | 1. POST `/api/contact` with `{name, email, message}` | Form processed; confirmation returned | Functional | P3 |
| SA-PUBLIC-002 | Contact form — missing required fields | Public endpoint | 1. POST `/api/contact` with `{}` | Returns 422 validation error | Functional | P3 |
| SA-PUBLIC-003 | Early access signup — valid | Public endpoint | 1. POST `/api/early-access` with `{email}` | Signup recorded; confirmation returned | Functional | P3 |
| SA-PUBLIC-004 | Health check ping | Any caller | 1. GET `/api/ping` | Returns 200 with pong response | Functional | P3 |

---

---

## Cross-Platform Test Cases

| TC ID | Test Case Name | Preconditions | Steps | Expected Result | Type | Priority |
|-------|---------------|---------------|-------|-----------------|------|----------|
| CROSS-001 | Org created by superadmin visible in org platform | super_admin creates new org | 1. super_admin creates org via `/api/organizations` 2. Org admin navigates to `/{newOrgSlug}/dashboard` | New org's dashboard accessible to org admin | Integration | P1 |
| CROSS-002 | Subscription change immediately reflected in org | super_admin disables a feature | 1. super_admin disables `inventory` feature 2. Org admin immediately attempts to access inventory | Inventory feature returns 403; disabled without org user action | Integration | P1 |
| CROSS-003 | Subscription suspension blocks org access | super_admin suspends subscription | 1. super_admin sets subscription status to SUSPENDED 2. Org admin tries to use any feature | Returns 403 subscription suspended on all feature calls | Integration | P1 |
| CROSS-004 | Permission change reflected immediately | Admin changes staff permissions | 1. Admin removes `assets.view` from staff 2. Staff attempts to list assets | Staff gets 403 Forbidden immediately (no re-login required) | Integration | P1 |
| CROSS-005 | Support ticket created in org visible to superadmin | Org user creates support ticket | 1. Org user creates ticket via `/api/support` 2. super_admin views `/superadmin/support` | Ticket appears in superadmin support list | Integration | P1 |
| CROSS-006 | Transfer mode audit log shows flag | super_admin enters transfer mode and creates asset | 1. super_admin enters transfer for org X 2. Creates asset in org X 3. Org admin views audit logs | Audit log shows `transferMode: true` for the asset creation | Functional | P2 |
| CROSS-007 | Org user cannot access another org's data (cross-tenant isolation) | Two orgs A and B exist, user belongs to A | 1. Org A admin authenticates 2. Attempts to GET assets using org B's orgId in requests | Returns 403 or 404; org B data not exposed | Security | P1 |
| CROSS-008 | Subdomain uniqueness enforced cross-platform | Org with subdomain "acme" exists | 1. super_admin tries to create another org with subdomain "acme" | Returns 409 Conflict | Edge Case | P1 |
| CROSS-009 | Deactivated org user cannot use org platform | Admin deactivates a user | 1. Admin deactivates staff user 2. Deactivated user attempts login | Login rejected or session invalidated | Security | P1 |
| CROSS-010 | Feature enabled by superadmin immediately accessible | super_admin enables `pos` feature | 1. super_admin enables POS feature for org 2. Org admin navigates to POS section | POS feature now accessible | Integration | P2 |
| CROSS-011 | Org audit logs visible to superadmin | Org user performs actions | 1. Org admin creates an asset 2. super_admin views org's audit logs at `/superadmin/organizations/{orgId}/audit-logs` | Org's audit events visible to superadmin | Integration | P2 |
| CROSS-012 | Warranty alert email sent by cron to org | Warranty expiring in 20 days with reminder=true | 1. Cron job runs at `/api/cron/warranty-alerts` | Email sent to org admin about expiring warranty | Functional | P2 |
| CROSS-013 | Package limits respected org-wide | Package assigned with maxUsers: 5, org has 4 users | 1. Org admin invites 6th user via `/api/users` | Returns 403 limit exceeded | Integration | P2 |
| CROSS-014 | Transfer mode exits cleanly | super_admin was in transfer mode | 1. super_admin exits transfer mode 2. super_admin attempts to access org data without transfer | Access denied; normal superadmin restrictions apply | Functional | P1 |
| CROSS-015 | Invite accepted creates user visible in org user list | Org admin sent invite, invitee accepted | 1. Invitee accepts invite at `/invites/{token}` 2. Org admin lists users via `/api/users` | New user appears in user list with correct role | Integration | P1 |
| CROSS-016 | i18n locale switch — Arabic RTL | User switches locale to Arabic | 1. User changes locale to Arabic 2. Navigates across both org and superadmin pages | All text renders in Arabic; layout is RTL | UI | P2 |
| CROSS-017 | Session cookie used consistently across API calls | Authenticated user | 1. Make API calls to org endpoints 2. Make API call to auth endpoint | Same session cookie authenticates all requests | Functional | P1 |
| CROSS-018 | Rate limit on invite acceptance applies cross-IP | 5 accept attempts from same IP in one hour | 1. POST `/api/invites/{token}/accept` 6 times from same IP | 6th request returns 429 Too Many Requests | Security | P2 |
| CROSS-019 | Superadmin cannot view org data without transfer mode | super_admin not in transfer mode | 1. super_admin attempts to GET `/api/assets` without org context | Returns 403 or appropriate error; no org context | Security | P1 |
| CROSS-020 | Org config changes reflected in org asset management | super_admin adds new location to org config | 1. super_admin adds location "Warehouse B" 2. Org admin creates new asset | "Warehouse B" appears as location option in asset form | Integration | P2 |
| CROSS-021 | CSRF protection prevents cross-origin requests | External origin attempts to POST | 1. POST to `/api/assets` from unauthorized origin | Request rejected with CSRF error | Security | P1 |
| CROSS-022 | Firestore security rules enforce org isolation | Database-level rule test | 1. Query assets collection without org claim match | Firestore returns empty (rules deny cross-org access) | Security | P1 |

---

---

## Coverage Summary

| Area | Total TCs | Functional | UI | Security | Integration | Edge Cases |
|------|-----------|------------|----|----------|-------------|------------|
| **ORG: Authentication** | 16 | 9 | 0 | 6 | 0 | 1 |
| **ORG: Dashboard** | 10 | 5 | 3 | 0 | 0 | 2 |
| **ORG: Assets** | 38 | 22 | 4 | 7 | 0 | 5 |
| **ORG: Asset Checkouts** | 13 | 7 | 0 | 3 | 0 | 3 |
| **ORG: Asset Maintenance** | 12 | 7 | 0 | 3 | 0 | 2 |
| **ORG: Asset Notes** | 10 | 6 | 0 | 2 | 0 | 2 |
| **ORG: Warranties** | 24 | 14 | 2 | 5 | 0 | 3 |
| **ORG: Requests** | 29 | 16 | 2 | 7 | 0 | 4 |
| **ORG: Inventory Items** | 26 | 14 | 1 | 6 | 0 | 5 |
| **ORG: Inventory Transactions** | 11 | 7 | 0 | 2 | 0 | 2 |
| **ORG: Inventory Audits** | 10 | 8 | 0 | 1 | 0 | 1 |
| **ORG: Users Management** | 24 | 12 | 0 | 8 | 0 | 4 |
| **ORG: Invites** | 15 | 7 | 1 | 4 | 0 | 3 |
| **ORG: Reports** | 8 | 4 | 1 | 2 | 0 | 1 |
| **ORG: Audit Logs** | 8 | 4 | 1 | 3 | 0 | 0 |
| **ORG: Support Tickets** | 15 | 9 | 2 | 2 | 0 | 2 |
| **ORG: Subscription** | 7 | 6 | 1 | 0 | 0 | 0 |
| **ORG: Organization Config** | 15 | 11 | 0 | 2 | 0 | 2 |
| **ORG: Profile** | 3 | 1 | 1 | 1 | 0 | 0 |
| **ORG: Cron Jobs** | 4 | 2 | 0 | 1 | 0 | 1 |
| **SA: Authentication** | 7 | 4 | 0 | 3 | 0 | 0 |
| **SA: Dashboard** | 5 | 3 | 1 | 1 | 0 | 0 |
| **SA: Organizations** | 24 | 14 | 2 | 5 | 0 | 3 |
| **SA: Subscriptions** | 10 | 7 | 1 | 1 | 0 | 1 |
| **SA: Packages** | 11 | 7 | 1 | 2 | 0 | 1 |
| **SA: Team Management** | 15 | 8 | 1 | 5 | 0 | 1 |
| **SA: Support Tickets** | 9 | 5 | 2 | 2 | 0 | 0 |
| **SA: Audit Logs** | 6 | 4 | 0 | 2 | 0 | 0 |
| **SA: Transfer Mode** | 8 | 4 | 1 | 3 | 0 | 0 |
| **SA: Backend Logs** | 6 | 3 | 1 | 2 | 0 | 0 |
| **SA: Payment Logs** | 7 | 4 | 0 | 2 | 0 | 1 |
| **SA: Org Configuration** | 4 | 2 | 1 | 1 | 0 | 0 |
| **SA: Public Endpoints** | 4 | 3 | 0 | 0 | 0 | 1 |
| **Cross-Platform** | 22 | 6 | 2 | 8 | 6 | 0 |
| **TOTAL** | **496** | **284** | **33** | **107** | **6** | **51** |

> **Breakdown by Priority:**
> - P1 (Critical — app broken without it): ~218 test cases
> - P2 (Important — significant impact if broken): ~223 test cases
> - P3 (Edge case or minor feature): ~55 test cases

> **Breakdown by Platform:**
> - Organization Platform: ~322 test cases
> - Superadmin Platform: ~152 test cases
> - Cross-Platform: ~22 test cases

---

## Notes on Coverage Gaps

| Area | Observation |
|------|-------------|
| **POS (Point of Sale)** | POS feature (open_session, close_session, process_sale, apply_discount, issue_refund, void_transaction) is listed in permission model but no dedicated API routes or frontend pages were found in the explored codebase. Test cases cannot be generated without confirmed endpoints. If POS endpoints exist, they need dedicated coverage. |
| **SSO (OIDC)** | The SSO flow (`/api/auth/sso/initiate`, `/api/auth/sso/check`, `/api/auth/sso/callback`) has basic coverage but end-to-end SSO testing depends on external OIDC provider configuration. Integration tests with a real IdP are recommended separately. |
| **Email Delivery** | Email sending (Resend integration) is called from multiple flows (invites, warranty alerts, password reset). These are unit-tested at service level; true delivery requires integration tests with a test email sandbox. |
| **Firestore Security Rules** | `firestore.rules` enforce row-level security. These rules should have their own test suite using Firebase Emulator. The cross-platform CROSS-022 test case points to this but a dedicated Firestore rules test file is recommended. |
| **i18n / Arabic RTL** | Only one UI test case (CROSS-016) covers locale switching. Comprehensive i18n coverage should include every translated string and RTL layout verification for all major pages. |
| **CSV Import Validation** | Asset CSV import (ORG-ASSET-032) covers malformed CSV but does not cover specific invalid column values, encoding issues, or very large files (stress/performance). |
| **Rate Limiting** | Only invite acceptance rate limiting is explicitly documented in code. Other endpoints may or may not have rate limits — coverage is limited to what was confirmed in source. |
