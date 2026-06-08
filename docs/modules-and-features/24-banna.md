# 24 — Banna (Workspace Builder)

**Module key**: `banna`  
**Nav label**: Banna (بنّا)  
**Route**: `/:locale/:orgSlug/:space/banna`

## Overview

Banna is the workspace customization module. It lets organizations extend core modules (Assets, Inventory, Requests) with additional data fields without code changes. The name "Banna" (بنّا) means "builder" in Arabic.

Currently Banna's only feature is **Custom Fields**. The module is designed to grow — the overview page description references workspace profiles and module settings as future additions.

## Features

### Custom Fields

Define extra fields that appear on asset, inventory item, and request forms. Fields are scoped per organization and ordered by `sortOrder`.

**Supported field types**

| Type | Description |
|------|-------------|
| `text` | Free-text input |
| `number` | Numeric input |
| `select` | Single-choice dropdown |
| `multi_select` | Multi-choice dropdown |
| `date` | Date picker |
| `boolean` | Yes/No toggle |
| `user` | User reference picker |

**Field properties**

| Property | Notes |
|----------|-------|
| `fieldKey` | Snake_case identifier, immutable after creation. Pattern: `/^[a-z_][a-z0-9_]*$/`, max 50 chars. |
| `module` | `assets` \| `inventory` \| `requests` — immutable after creation |
| `label` / `labelAr` | Display name in English and Arabic |
| `required` | Enforces presence on form submit |
| `options` | JSON array of `{value, label, labelAr?, color?}` — only for `select` / `multi_select` |
| `placeholder` / `placeholderAr` | Input hint text |
| `sortOrder` | Integer, ascending order in forms |
| `active` | Soft-disable without deleting; existing data is preserved |

## Permissions

Banna uses the platform permission system with four operations. All write operations implicitly require `view`.

| Permission | Default (Admin) | Default (Member) |
|------------|:--------------:|:----------------:|
| `banna.view` | ✓ | ✓ |
| `banna.create` | ✓ | — |
| `banna.update` | ✓ | — |
| `banna.delete` | ✓ | — |

## API Routes

All routes resolve tenant context from the session cookie and enforce RLS via `supabaseAdmin`.

```
GET    /api/banna/custom-fields              List fields (optional ?module= filter)
POST   /api/banna/custom-fields              Create field
GET    /api/banna/custom-fields/:fieldId     Get single field
PATCH  /api/banna/custom-fields/:fieldId     Update field
DELETE /api/banna/custom-fields/:fieldId     Delete field
```

Rate limit: 60 requests / 60 s per tenant on the list endpoint.

Input is validated with Zod schemas defined in [lib/modules/banna/validators/schemas.ts](../../lib/modules/banna/validators/schemas.ts).

## Data Layer

**Supabase table**: `custom_fields`

Key columns (snake_case in DB, camelCase in app):

```
id, organization_id, space_id, module, field_key,
type, label, label_ar, required, options (jsonb),
placeholder, placeholder_ar, sort_order, is_active,
created_at, updated_at
```

All queries are scoped by `organization_id` (tenant isolation). RLS is enabled on this table.

## File Map

```
app/[locale]/[orgSlug]/[space]/banna/
  page.tsx                          Overview page
  custom-fields/page.tsx            Custom fields management UI

app/api/banna/
  custom-fields/route.ts            GET (list), POST
  custom-fields/[fieldId]/route.ts  GET, PATCH, DELETE

lib/modules/banna/
  services/banna.service.ts         Business logic + audit logging
  repositories/banna.repository.ts  Supabase queries
  validators/schemas.ts             Zod schemas (create + update)
  types/index.ts                    Re-exports from @/types/banna.types

components/banna/
  CustomFieldForm.tsx               Shared create/edit form (dialog)

hooks/banna/index.ts                React Query hooks (useCustomFields,
                                    useCreateCustomField, useUpdateCustomField,
                                    useDeleteCustomField)

types/banna.types.ts                TypeScript interfaces
```

## Audit Logging

All mutations are recorded in the audit log via `auditLog.create`:

| Action | Trigger |
|--------|---------|
| `CUSTOM_FIELD_CREATED` | POST /custom-fields |
| `CUSTOM_FIELD_UPDATED` | PATCH /custom-fields/:id |
| `CUSTOM_FIELD_DELETED` | DELETE /custom-fields/:id |

## Behaviour Notes

- `fieldKey` and `module` are immutable after creation — the form disables these fields in edit mode.
- Deleting a field removes the schema definition but does **not** purge existing field values stored on records.
- `active: false` soft-disables a field; it stops appearing on forms but historical data is intact.
- Options for `select` / `multi_select` are entered as raw JSON in the form textarea.

## Vision & Roadmap

### Vision

Banna is not just a settings page — it is the intelligence layer between Makhzoon's raw modules and a business owner's fully configured platform. The goal: a new owner should be able to describe their business in plain language and have Banna configure the platform for them — right modules activated, right custom fields ready, right structure in place — without digging through menus.

Think of it as a contractor who walks into your space, asks a few questions about how you work, and builds the layout around you.

### Module Activation Model

- Owners can self-activate any module **already included in their subscription** (`subscription.features[key] === true`).
- Modules not in their subscription are shown as **"available to upgrade"** — visible but locked, with a clear upgrade path.
- This keeps Banna genuinely useful as a control panel without bypassing the subscription model.

### Phased Roadmap

**Phase 1 — Foundation** *(prerequisite: custom field values + WorkspaceProfile stub — backlog items 1 & 2)*
- Flesh out `WorkspaceProfile`: business type, industry, size, use cases — DB migration, service, API
- Banna overview becomes a real dashboard: active modules, profile completeness, quick actions
- Module visibility panel: owners see which modules are on/off within their subscription
- Self-service module activation within subscription limits; locked modules shown as upgrades
- Industry-based custom field templates (retail, logistics, school, clinic, etc.) — one-click apply

**Phase 2 — Guided Setup Wizard** *(no AI)*
- Step-by-step form wizard: business type → module selection → custom field template → done
- Onboarding trigger: shown automatically to new spaces before any configuration exists
- Re-runnable from the Banna overview page ("Reconfigure workspace")

**Phase 3 — AI Wizard** *(Claude API)*
- Conversational setup flow: owner describes their business in natural language
- Claude interprets the answer and maps it to module recommendations + custom field templates
- AI-generated custom field suggestions based on business type and existing usage patterns
- Ongoing recommendations surfaced on the Banna overview as the business grows
