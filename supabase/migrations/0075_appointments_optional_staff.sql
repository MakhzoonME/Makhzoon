-- Appointments no longer require a staff provider. Workers (deliveryAgents
-- add-on) now strictly gates the staff directory (requireStaffAccess), with
-- no Appointments-module fallback — so an org with Appointments but not
-- Workers can no longer create staff records to assign as providers.
-- staff_id becomes optional; appointments booked without one skip the
-- working-hours/double-booking guard (there's no staff calendar to check).

alter table public.haraka_appointments
  alter column staff_id drop not null;
