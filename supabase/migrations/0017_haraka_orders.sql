-- ════════════════════════════════════════════════════════════════════════
-- 0017_haraka_orders.sql
-- Haraka Orders System — for businesses that receive orders via phone,
-- WhatsApp, social media, etc. Supports delivery and pickup fulfillment,
-- sales/delivery agent assignment, and payment tracking.
-- ════════════════════════════════════════════════════════════════════════

-- ── External delivery agents ──────────────────────────────────────────────
-- People who do deliveries but may not be org members.
CREATE TABLE IF NOT EXISTS haraka_delivery_agents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              text NOT NULL,
  phone             text,
  notes             text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid
);

CREATE INDEX IF NOT EXISTS haraka_delivery_agents_org_idx
  ON haraka_delivery_agents(organization_id);

CREATE OR REPLACE TRIGGER haraka_delivery_agents_set_updated_at
  BEFORE UPDATE ON haraka_delivery_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Order number sequence ─────────────────────────────────────────────────
-- One row per (org, space). Atomically incremented on each new order.
CREATE TABLE IF NOT EXISTS haraka_order_counters (
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id          text NOT NULL DEFAULT '',
  last_order_number integer NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT haraka_order_counters_pk PRIMARY KEY (organization_id, space_id)
);

-- ── Orders ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS haraka_orders (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id                  text,
  order_number              text NOT NULL,

  -- Source channel (value from order_channel list — free list, org can extend)
  channel                   text NOT NULL DEFAULT 'phone',

  -- Lifecycle status (value from order_status list — system list, value locked)
  -- Delivery:  new → confirmed → assigned → in_transit → delivered
  -- Pickup:    new → confirmed → assigned → ready_for_pickup → picked_up
  -- Any state: * → cancelled
  status                    text NOT NULL DEFAULT 'new',

  -- Fulfillment
  fulfillment_type          text NOT NULL DEFAULT 'delivery'
                              CHECK (fulfillment_type IN ('delivery', 'pickup')),

  -- Customer (can link pos_customers or be ad-hoc name+phone)
  customer_id               uuid REFERENCES pos_customers(id) ON DELETE SET NULL,
  customer_name             text NOT NULL,
  customer_phone            text,

  -- Delivery address — populated when fulfillment_type = 'delivery'
  -- Shape: { street, area, city, notes }
  delivery_address          jsonb,

  -- Line items — same shape as pos_transactions.items
  items                     jsonb NOT NULL DEFAULT '[]',

  -- Totals
  subtotal                  numeric(14,4) NOT NULL DEFAULT 0,
  discount_amount           numeric(14,4) NOT NULL DEFAULT 0,
  tax_amount                numeric(14,4) NOT NULL DEFAULT 0,
  total                     numeric(14,4) NOT NULL DEFAULT 0,

  -- Payment tracking
  payment_status            text NOT NULL DEFAULT 'unpaid'
                              CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  amount_paid               numeric(14,4) NOT NULL DEFAULT 0,
  -- value from order_payment_method list (system list)
  payment_method            text,

  -- Sales agent — org member who registered the order
  sales_agent_id            uuid NOT NULL,
  sales_agent_name          text NOT NULL,

  -- Delivery agent — one of the two below is set when an agent is assigned.
  -- External agent:
  delivery_agent_id         uuid REFERENCES haraka_delivery_agents(id) ON DELETE SET NULL,
  -- Org member acting as delivery agent:
  delivery_agent_member_id  uuid,
  delivery_agent_name       text,

  notes                     text,
  scheduled_at              timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now(),
  created_by                uuid,
  updated_at                timestamptz NOT NULL DEFAULT now(),
  updated_by                uuid
);

CREATE INDEX IF NOT EXISTS haraka_orders_org_idx
  ON haraka_orders(organization_id);
CREATE INDEX IF NOT EXISTS haraka_orders_org_status_idx
  ON haraka_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS haraka_orders_org_created_idx
  ON haraka_orders(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS haraka_orders_org_channel_idx
  ON haraka_orders(organization_id, channel);

CREATE OR REPLACE TRIGGER haraka_orders_set_updated_at
  BEFORE UPDATE ON haraka_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Managed list seeds ────────────────────────────────────────────────────

-- order_status: SYSTEM list — org can relabel/recolor/reorder, cannot add/remove values
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('order_status', 'new',              'New',              'جديد',         '#3b82f6', 1, true),
  ('order_status', 'confirmed',        'Confirmed',        'مؤكد',         '#6366f1', 2, true),
  ('order_status', 'assigned',         'Assigned',         'تم التعيين',   '#a855f7', 3, true),
  ('order_status', 'in_transit',       'In Transit',       'في الطريق',    '#f97316', 4, true),
  ('order_status', 'ready_for_pickup', 'Ready for Pickup', 'جاهز للاستلام','#eab308', 5, true),
  ('order_status', 'delivered',        'Delivered',        'تم التوصيل',   '#22c55e', 6, true),
  ('order_status', 'picked_up',        'Picked Up',        'تم الاستلام',  '#16a34a', 7, true),
  ('order_status', 'cancelled',        'Cancelled',        'ملغي',         '#ef4444', 8, true)
ON CONFLICT (list_key, value) DO NOTHING;

-- order_channel: FREE list — org can add custom channels (TikTok, Walk-in, etc.)
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('order_channel', 'phone',     'Phone',     'هاتف',    null, 1, false),
  ('order_channel', 'whatsapp',  'WhatsApp',  'واتساب',  null, 2, false),
  ('order_channel', 'instagram', 'Instagram', 'انستغرام',null, 3, false),
  ('order_channel', 'facebook',  'Facebook',  'فيسبوك',  null, 4, false),
  ('order_channel', 'other',     'Other',     'أخرى',    null, 5, false)
ON CONFLICT (list_key, value) DO NOTHING;

-- order_payment_method: SYSTEM list — values are code-locked
INSERT INTO platform_list_items (list_key, value, label, label_ar, color, sort_order, is_system) VALUES
  ('order_payment_method', 'cash_on_delivery', 'Cash on Delivery', 'الدفع عند الاستلام', null, 1, true),
  ('order_payment_method', 'bank_transfer',    'Bank Transfer',    'تحويل بنكي',         null, 2, true),
  ('order_payment_method', 'card',             'Card',             'بطاقة',              null, 3, true),
  ('order_payment_method', 'other',            'Other',            'أخرى',               null, 4, true)
ON CONFLICT (list_key, value) DO NOTHING;
