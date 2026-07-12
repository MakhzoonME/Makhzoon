-- ════════════════════════════════════════════════════════════════════════
-- 0039_reception_ticket_car_plate.sql
-- Reception tickets: car plate number as a third customer identifier.
-- At least one of customer_name / customer_phone / car_plate is required
-- (enforced in the app layer; customer_name keeps a display fallback).
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE haraka_reception_tickets
  ADD COLUMN IF NOT EXISTS car_plate text;
