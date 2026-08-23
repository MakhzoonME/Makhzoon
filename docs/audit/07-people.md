# 07 — People: User Management

**Status: Fully working**

The most complete of the workflow-style modules — no notable gaps found.

## What a user can see & do

- A member list with role, permission state, and active/deactivated status; a separate pending-invites view.
- Invite a new team member by email or by username (for staff without an email, like shop-floor workers) — an invite link with a 7-day expiry and QR code is generated.
- Deactivate a user (soft — data kept, login blocked) and, only after that, permanently delete them — a deliberate two-step process rather than one-click delete.
- Reset a user's password three ways: email a reset link, generate a copyable link, or set a temporary password directly.
- Edit an individual user's permissions away from their role's defaults, grouped by module, with smart dependencies (turning on an action auto-enables the view access it needs).

## Roles offered here

Owner, Admin, Staff. The Owner account is protected from being deactivated by anyone else. New members only see the modules the org's subscription package actually includes.
