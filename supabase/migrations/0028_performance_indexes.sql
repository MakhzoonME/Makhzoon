-- ════════════════════════════════════════════════════════════════════════
-- 0028_performance_indexes.sql
-- Performance audit: adds missing database indexes identified by query
-- analysis. Two categories:
--   1. organization_id indexes on tables queried by org but missing the index
--   2. Foreign key indexes on columns referencing other tables
--
-- Convention: idx_{table}_{column}
-- All statements use CREATE INDEX IF NOT EXISTS for safe re-runs.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. organization_id indexes ─────────────────────────────────────────────
-- These tables are frequently filtered by organization_id for multi-tenant
-- queries but lacked a dedicated index on the column.

CREATE INDEX IF NOT EXISTS idx_organization_configs_organization_id
  ON organization_configs(organization_id);

CREATE INDEX IF NOT EXISTS idx_organizations_private_organization_id
  ON organizations_private(organization_id);

CREATE INDEX IF NOT EXISTS idx_pos_receipt_counters_organization_id
  ON pos_receipt_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_fawtara_counters_organization_id
  ON fawtara_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_delivery_agents_organization_id
  ON haraka_delivery_agents(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_order_counters_organization_id
  ON haraka_order_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_orders_organization_id
  ON haraka_orders(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_invoice_counters_organization_id
  ON haraka_invoice_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_order_payments_organization_id
  ON haraka_order_payments(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_cash_drawer_config_organization_id
  ON haraka_cash_drawer_config(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_warranty_counters_organization_id
  ON haraka_warranty_counters(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_warranty_configs_organization_id
  ON haraka_warranty_configs(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_warranty_certs_organization_id
  ON haraka_warranty_certs(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_card_terminal_config_organization_id
  ON haraka_card_terminal_config(organization_id);

CREATE INDEX IF NOT EXISTS idx_haraka_card_charges_organization_id
  ON haraka_card_charges(organization_id);

CREATE INDEX IF NOT EXISTS idx_notifications_organization_id
  ON notifications(organization_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_organization_id
  ON notification_preferences(organization_id);

CREATE INDEX IF NOT EXISTS idx_notification_org_defaults_organization_id
  ON notification_org_defaults(organization_id);

-- ── 2. Foreign key indexes ─────────────────────────────────────────────────
-- Columns that reference other tables but had no index, causing nested-loop
-- scans on JOINs and slow cascading lookups.

-- subscriptions.package_id → packages.id
CREATE INDEX IF NOT EXISTS idx_subscriptions_package_id
  ON subscriptions(package_id);

-- haraka_orders.customer_id → pos_customers.id
CREATE INDEX IF NOT EXISTS idx_haraka_orders_customer_id
  ON haraka_orders(customer_id);

-- haraka_orders.delivery_agent_id → haraka_delivery_agents.id
CREATE INDEX IF NOT EXISTS idx_haraka_orders_delivery_agent_id
  ON haraka_orders(delivery_agent_id);

-- ════════════════════════════════════════════════════════════════════════
-- DOWN: Reverse the migration by dropping the created indexes.
-- ════════════════════════════════════════════════════════════════════════
/*
DROP INDEX IF EXISTS idx_organization_configs_organization_id;
DROP INDEX IF EXISTS idx_organizations_private_organization_id;
DROP INDEX IF EXISTS idx_pos_receipt_counters_organization_id;
DROP INDEX IF EXISTS idx_fawtara_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_delivery_agents_organization_id;
DROP INDEX IF EXISTS idx_haraka_order_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_orders_organization_id;
DROP INDEX IF EXISTS idx_haraka_invoice_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_order_payments_organization_id;
DROP INDEX IF EXISTS idx_haraka_cash_drawer_config_organization_id;
DROP INDEX IF EXISTS idx_haraka_warranty_counters_organization_id;
DROP INDEX IF EXISTS idx_haraka_warranty_configs_organization_id;
DROP INDEX IF EXISTS idx_haraka_warranty_certs_organization_id;
DROP INDEX IF EXISTS idx_haraka_card_terminal_config_organization_id;
DROP INDEX IF EXISTS idx_haraka_card_charges_organization_id;
DROP INDEX IF EXISTS idx_notifications_organization_id;
DROP INDEX IF EXISTS idx_notification_preferences_organization_id;
DROP INDEX IF EXISTS idx_notification_org_defaults_organization_id;
DROP INDEX IF EXISTS idx_subscriptions_package_id;
DROP INDEX IF EXISTS idx_haraka_orders_customer_id;
DROP INDEX IF EXISTS idx_haraka_orders_delivery_agent_id;
*/
