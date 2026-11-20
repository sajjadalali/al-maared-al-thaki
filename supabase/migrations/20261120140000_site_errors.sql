-- Errors visitors hit (20 Nov): on Android the site came up without its styles,
-- and every car page opened on the error page, with nothing on the server to
-- say why. The browser (src/lib/errorReporter.ts) and the server
-- (onRequestError in src/instrumentation.ts) both write here.
create table public.site_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  side text not null check (side in ('browser', 'server')),
  kind text not null,
  message text,
  detail text,
  page text,
  user_agent text,
  extra jsonb
);
create index site_errors_at_idx on public.site_errors (at desc);
alter table public.site_errors enable row level security;
-- No policies: only the server's secret key reads or writes it.
revoke all on public.site_errors from anon, authenticated;
comment on table public.site_errors is 'Errors visitors hit, from the browser and from the server: kind, message, page and browser. No IP. Secret key only.';
