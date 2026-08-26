# Haraka Orders — Implementation Plan

> Feature doc lives in `docs/modules-and-features/19-haraka-orders.md`.

---

## Status: ✅ Fully implemented

---

## Backend

- [x] `supabase/migrations/0017_haraka_orders.sql`
  - Tables: `haraka_delivery_agents`, `haraka_order_counters`, `haraka_orders`
  - Managed list seeds: `order_status` (system), `order_channel` (free), `order_payment_method` (system)

- [x] `types/pos.types.ts`
  - `HarakaOrder`, `HarakaDeliveryAgent`, `OrderChannel`, `OrderStatus`, `OrderFulfillmentType`, `OrderPaymentStatus`, `OrderPaymentMethod`, `OrderDeliveryAddress`, `OrderLineItem`

- [x] `types/managed-lists.types.ts`
  - Added `order_status`, `order_channel`, `order_payment_method` to `ListKey` union and `LIST_REGISTRY`

- [x] `types/user-permissions.types.ts`
  - `PosPermissions`: added `view_orders`, `manage_orders`, `assign_delivery`, `manage_delivery_agents`
  - `DEFAULT_ADMIN_PERMISSIONS` updated (all 4 → true)
  - `DEFAULT_STAFF_PERMISSIONS` updated (all 4 → false)
  - `MODULE_PERMISSIONS_CONFIG` updated (4 new ops under `pos` group)

- [x] `lib/modules/haraka/delivery-agents/schemas.ts`
- [x] `lib/modules/haraka/delivery-agents/delivery-agents.repository.ts`
- [x] `lib/modules/haraka/delivery-agents/delivery-agents.service.ts`
- [x] `app/api/haraka/delivery-agents/route.ts` — GET list, POST create
- [x] `app/api/haraka/delivery-agents/[agentId]/route.ts` — GET, PATCH, DELETE

- [x] `lib/modules/haraka/orders/schemas.ts`
  - `createOrderSchema`, `updateOrderSchema`, `updateOrderStatusSchema`, `recordPaymentSchema`
  - `isValidTransition()` — status transition guard
- [x] `lib/modules/haraka/orders/orders.repository.ts`
  - `allocateOrderNumber()`, `list()`, `getById()`, `create()`, `update()`, `updateStatus()`, `recordPayment()`
- [x] `lib/modules/haraka/orders/orders.service.ts`
  - All methods permission-gated + audit-logged; transition guard enforced
- [x] `app/api/haraka/orders/route.ts` — GET list, POST create
- [x] `app/api/haraka/orders/[orderId]/route.ts` — GET, PATCH
- [x] `app/api/haraka/orders/[orderId]/status/route.ts` — POST `{ status }`
- [x] `app/api/haraka/orders/[orderId]/payment/route.ts` — POST `{ amountPaid, paymentMethod? }`

---

## Frontend

- [x] `hooks/haraka/useOrders.ts`
  - `useOrders`, `useOrder`, `useCreateOrder`, `useUpdateOrder`, `useUpdateOrderStatus`, `useRecordPayment`
- [x] `hooks/haraka/useDeliveryAgents.ts`
  - `useDeliveryAgents`, `useCreateDeliveryAgent`, `useUpdateDeliveryAgent`, `useDeleteDeliveryAgent`
- [x] `hooks/haraka/index.ts` — re-exports added

- [x] `components/haraka/OrderStatusBadge.tsx`
  - Reads label + color from `order_status` managed list; falls back to hardcoded colors
- [x] `components/haraka/DeliveryAgentPicker.tsx`
  - Combobox combining org members (staff) + external `haraka_delivery_agents`

- [x] `app/[locale]/[orgSlug]/[space]/haraka/orders/page.tsx` — list with status + channel filters
- [x] `app/[locale]/[orgSlug]/[space]/haraka/orders/new/page.tsx` — create order form
- [x] `app/[locale]/[orgSlug]/[space]/haraka/orders/[orderId]/page.tsx` — detail: stepper, agents, items, payment

- [x] `lib/nav/index.ts` — Orders nav item added to Haraka group (gated by `pos.view_orders`)
- [x] `locales/messages.ts` — all new keys added in EN and AR

---

## Notes for future developers

- `OrderChannel` is typed as `string` (not a closed union) because orgs can add custom channels via the free `order_channel` list. Same applies to `paymentMethod`.
- Status badge colors are resolved from `org_list_items` first (org override), then `platform_list_items` — `useList('order_status')` handles this automatically.
- Delivery address fields are optional even when `fulfillmentType = 'delivery'` — some businesses only note a neighborhood or call the customer.
- The `hasPermission` import in services comes from `@/lib/platform/permissions` (not `@/lib/permissions`) — match the pattern in `transactions.service.ts`.
- Status transition guard is in `lib/modules/haraka/orders/schemas.ts` → `isValidTransition()`. If new statuses are ever added, update both the migration seed and that function.
