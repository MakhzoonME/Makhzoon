alter table public.haraka_appointments
  add column if not exists discount_amount numeric(12,4) not null default 0;
