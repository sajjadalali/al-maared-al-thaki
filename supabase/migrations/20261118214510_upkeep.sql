-- When the site's own background jobs last ran (19 Nov): the weekly backup.
-- The server reads it every hour, which also keeps the free project active.
create table public.upkeep (
  job text primary key,
  last_ok_at timestamptz,
  last_try_at timestamptz,
  ok boolean,
  note text
);
alter table public.upkeep enable row level security;
-- No policies: only the server's secret key reads or writes it.
revoke all on public.upkeep from anon, authenticated;
comment on table public.upkeep is 'Background jobs of the site (weekly backup to Telegram): last run and result. Secret key only.';
