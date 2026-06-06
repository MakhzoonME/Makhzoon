-- ── 0031: web push subscriptions ──────────────────────────────────────────────
-- Stores browser push subscription objects per user so the server can send
-- web push notifications via the VAPID protocol.
-- Each row corresponds to one browser/device the user has granted permission on.

create table if not exists public.web_push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  -- one subscription record per endpoint (a user can have multiple devices)
  unique (user_id, endpoint)
);

create index if not exists web_push_subscriptions_user_id_idx
  on public.web_push_subscriptions (user_id);

-- RLS: users can only manage their own subscriptions
alter table public.web_push_subscriptions enable row level security;

create policy "user own subscriptions" on public.web_push_subscriptions
  for all using (user_id = auth.uid());
