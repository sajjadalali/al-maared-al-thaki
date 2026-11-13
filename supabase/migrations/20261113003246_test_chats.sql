-- Test chats apart from real buyers' chats.
--
-- Tests talk to the live Sadeem with a session id that starts "5ade7e57-"
-- (scripts/sadeem-check.mjs, and the site's test mode: open any page with
-- ?test). The server marks those sessions is_test; customer_chats lists the rest.

alter table public.chat_sessions
  add column if not exists is_test boolean not null default false;

-- Sessions from before the column: the automatic check (5ade7e57) and the
-- checks of 11-12 Nov 2026 (d1a1ec70 wording, a0d17000 audit, 1eadc4ec leads).
update public.chat_sessions
set is_test = true
where left(id::text, 9) in ('5ade7e57-', 'd1a1ec70-', 'a0d17000-', '1eadc4ec-');

-- One row per real conversation, newest first when sorted by last_message_at.
create or replace view public.customer_chats
with (security_invoker = true)
as
select
  s.id as session_id,
  s.created_at as started_at,
  max(m.created_at) as last_message_at,
  count(m.id) as messages,
  (array_agg(m.content order by m.created_at) filter (where m.role = 'user'))[1] as first_message
from public.chat_sessions s
join public.chat_messages m on m.session_id = s.id
where not s.is_test
group by s.id, s.created_at;

-- Chat logs are for the server and the dashboard only, like the tables under it.
revoke all on public.customer_chats from anon, authenticated;
