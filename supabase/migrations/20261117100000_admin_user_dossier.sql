-- Administration : dossier par utilisateur (tableau paginé, fiche complète, messages, suppression).

-- =========================================================================
-- Colonnes, index
-- =========================================================================

-- Compte supprimé : données personnelles effacées, historique financier conservé (registre append-only).
alter table public.profiles add column deleted_at timestamptz;

-- Activité d'un utilisateur dans le journal (actions faites par lui).
create index audit_log_actor_created_idx on public.audit_log (actor, created_at desc);

-- =========================================================================
-- Messages de l'administration, affichés dans l'espace client
-- =========================================================================

create table public.user_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 2000),
  level text not null default 'info' check (level in ('info', 'warning')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index user_messages_user_idx on public.user_messages (user_id, created_at desc);
create index user_messages_unread_idx on public.user_messages (user_id) where read_at is null;

alter table public.user_messages enable row level security;
create policy user_messages_select_own on public.user_messages for select using (user_id = auth.uid());
create policy user_messages_admin_select on public.user_messages for select using ((select public.is_admin()));
grant select on public.user_messages to authenticated;
-- Aucune écriture directe : envoi par admin_send_user_message, lecture marquée par mark_user_message_read.

create or replace function public.mark_user_message_read(p_message_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_messages
     set read_at = now()
   where id = p_message_id and user_id = auth.uid() and read_at is null;
$$;

revoke execute on function public.mark_user_message_read(uuid) from public, anon;
grant execute on function public.mark_user_message_read(uuid) to authenticated;

create or replace function public.admin_send_user_message(p_user_id uuid, p_title text, p_body text, p_level text default 'info')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_title text := trim(coalesce(p_title, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_level text := coalesce(p_level, 'info');
  v_id uuid;
begin
  if length(v_title) not between 1 and 120 then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'title';
  end if;
  if length(v_body) not between 1 and 2000 then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'body';
  end if;
  if v_level not in ('info', 'warning') then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'level';
  end if;
  perform 1 from public.profiles where id = p_user_id and deleted_at is null;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.user_messages (user_id, title, body, level, created_by)
  values (p_user_id, v_title, v_body, v_level, v_admin)
  returning id into v_id;

  insert into public.audit_log (actor, action, target, payload)
  values ('admin:' || v_admin, 'user_message_sent', 'user:' || p_user_id,
          public.request_meta() || jsonb_build_object('message_id', v_id, 'title', v_title, 'level', v_level));

  return jsonb_build_object('message_id', v_id);
end;
$$;

revoke execute on function public.admin_send_user_message(uuid, text, text, text) from public, anon;
grant execute on function public.admin_send_user_message(uuid, text, text, text) to authenticated;

-- =========================================================================
-- Liste des utilisateurs : filtre, dernière connexion, compte supprimé
-- =========================================================================

drop function if exists public.admin_list_users(text, integer, integer);

create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_filter text default 'all'
)
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  is_blocked boolean,
  deleted_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  balance_xof integer,
  orders_total integer,
  recent_sample integer,
  recent_user_cancels integer,
  cancel_ratio numeric,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_pattern text;
  v_window integer := public.setting_int('cancel_ratio_window', 20);
  v_filter text := coalesce(p_filter, 'all');
begin
  perform public.require_admin();
  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  with filtered as (
    select p.*, u.email::text as user_email, u.last_sign_in_at as user_last_sign_in
    from public.profiles p
    join auth.users u on u.id = p.id
    where (v_search is null
           or u.email ilike v_pattern
           or p.full_name ilike v_pattern
           or p.phone ilike v_pattern
           or p.id::text = v_search)
      and case v_filter
            when 'active' then not p.is_blocked and p.deleted_at is null
            when 'blocked' then p.is_blocked and p.deleted_at is null
            when 'admins' then p.role = 'admin'
            when 'deleted' then p.deleted_at is not null
            else true
          end
  )
  select
    f.id, f.user_email, f.full_name, f.phone, f.role, f.is_blocked, f.deleted_at, f.created_at, f.user_last_sign_in,
    coalesce(b.balance, 0)::integer,
    coalesce(o.total, 0)::integer,
    coalesce(r.sample, 0)::integer,
    coalesce(r.canceled, 0)::integer,
    case when coalesce(r.sample, 0) > 0 then round(r.canceled::numeric / r.sample, 4) end,
    count(*) over ()
  from filtered f
  left join lateral (select sum(w.amount_xof) as balance from public.wallet_transactions w where w.user_id = f.id) b on true
  left join lateral (select count(*) as total from public.orders o2 where o2.user_id = f.id and o2.phone <> '') o on true
  left join lateral (
    select count(*) as sample, count(*) filter (where x.canceled_by = 'user') as canceled
    from (select o3.canceled_by from public.orders o3 where o3.user_id = f.id
          order by o3.created_at desc limit v_window) x
  ) r on true
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke execute on function public.admin_list_users(text, integer, integer, text) from public, anon;
grant execute on function public.admin_list_users(text, integer, integer, text) to authenticated;

-- =========================================================================
-- Dossier d'un utilisateur
-- =========================================================================

create or replace function public.admin_user_dossier(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fx numeric := public.setting_numeric('fx_usd_xof', 600);
  v_window integer := public.setting_int('cancel_ratio_window', 20);
  v_user jsonb;
  v_orders jsonb;
  v_money jsonb;
  v_topups jsonb;
  v_recent jsonb;
begin
  perform public.require_admin();

  select jsonb_build_object(
           'id', p.id, 'email', u.email, 'full_name', p.full_name, 'phone', p.phone, 'role', p.role,
           'is_blocked', p.is_blocked, 'deleted_at', p.deleted_at, 'created_at', p.created_at,
           'last_sign_in_at', u.last_sign_in_at, 'email_confirmed_at', u.email_confirmed_at,
           'balance_xof', public.get_balance(p.id),
           'unread_messages', (select count(*) from public.user_messages m where m.user_id = p.id and m.read_at is null))
    into v_user
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.id = p_user_id;
  if v_user is null then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
           'total', count(*) filter (where phone <> ''),
           'success', count(*) filter (where status in ('received', 'finished')),
           'pending', count(*) filter (where status = 'pending' and phone <> ''),
           'canceled', count(*) filter (where status = 'canceled'),
           'failed', count(*) filter (where status in ('timeout', 'banned', 'refunded')),
           'revenue_xof', coalesce(sum(price_xof) filter (where status in ('received', 'finished')), 0),
           'margin_xof', coalesce(sum(price_xof - round(cost_usd * coalesce(fx_usd_xof, v_fx))) filter (where status in ('received', 'finished')), 0),
           'last_order_at', max(created_at))
    into v_orders
    from public.orders where user_id = p_user_id;

  select jsonb_build_object(
           'topped_up_xof', coalesce(sum(amount_xof) filter (where type = 'topup'), 0),
           'spent_xof', coalesce(-sum(amount_xof) filter (where type = 'purchase'), 0),
           'refunded_xof', coalesce(sum(amount_xof) filter (where type = 'refund'), 0),
           'adjusted_xof', coalesce(sum(amount_xof) filter (where type in ('adjustment', 'bonus')), 0))
    into v_money
    from public.wallet_transactions where user_id = p_user_id;

  select jsonb_build_object(
           'total', count(*),
           'succeeded', count(*) filter (where status = 'succeeded'),
           'pending', count(*) filter (where status = 'pending'),
           'failed', count(*) filter (where status in ('failed', 'expired')))
    into v_topups
    from public.topups where user_id = p_user_id;

  select jsonb_build_object(
           'sample', count(*),
           'user_cancels', count(*) filter (where x.canceled_by = 'user'))
    into v_recent
    from (select canceled_by from public.orders where user_id = p_user_id order by created_at desc limit v_window) x;

  return jsonb_build_object('user', v_user, 'orders', v_orders, 'money', v_money, 'topups', v_topups,
                            'recent', v_recent || jsonb_build_object('window', v_window));
end;
$$;

revoke execute on function public.admin_user_dossier(uuid) from public, anon;
grant execute on function public.admin_user_dossier(uuid) to authenticated;

-- =========================================================================
-- Ventes et recharges d'un utilisateur (mêmes listes, filtrées)
-- =========================================================================

drop function if exists public.admin_list_orders(text, text, timestamptz, timestamptz, integer, integer);

create or replace function public.admin_list_orders(
  p_group text default 'all',
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_user_id uuid default null
)
returns table (
  id uuid,
  created_at timestamptz,
  status public.order_status,
  canceled_by text,
  user_id uuid,
  user_email text,
  user_name text,
  service_slug text,
  service_name text,
  country_code text,
  country_name text,
  country_flag text,
  phone text,
  price_xof integer,
  cost_xof integer,
  margin_xof integer,
  fivesim_order_id bigint,
  sms_count integer,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_pattern text;
  v_fx numeric := public.setting_numeric('fx_usd_xof', 600);
  v_statuses public.order_status[] := public.admin_order_statuses(p_group);
begin
  perform public.require_admin();
  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  select
    o.id, o.created_at, o.status, o.canceled_by,
    o.user_id, u.email::text, p.full_name,
    o.service_slug, s.name_fr, o.country_code, c.name_fr, c.flag_emoji,
    o.phone, o.price_xof,
    round(o.cost_usd * coalesce(o.fx_usd_xof, v_fx))::integer,
    case when o.status in ('received', 'finished')
         then o.price_xof - round(o.cost_usd * coalesce(o.fx_usd_xof, v_fx))::integer end,
    o.fivesim_order_id,
    (select count(*)::integer from public.order_sms m where m.order_id = o.id),
    count(*) over ()
  from public.orders o
  join public.profiles p on p.id = o.user_id
  join auth.users u on u.id = o.user_id
  left join public.services s on s.slug = o.service_slug
  left join public.countries c on c.code = o.country_code
  where o.status = any (v_statuses)
    and (p_user_id is null or o.user_id = p_user_id)
    and (p_from is null or o.created_at >= p_from)
    and (p_to is null or o.created_at < p_to)
    and (v_search is null
         or u.email ilike v_pattern
         or p.full_name ilike v_pattern
         or p.phone ilike v_pattern
         or o.phone ilike v_pattern
         or o.service_slug ilike v_pattern
         or s.name_fr ilike v_pattern
         or c.name_fr ilike v_pattern
         or o.id::text = v_search
         or o.fivesim_order_id::text = v_search)
  order by o.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

drop function if exists public.admin_list_topups(text, text, timestamptz, timestamptz, integer, integer);

create or replace function public.admin_list_topups(
  p_group text default 'all',
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 25,
  p_offset integer default 0,
  p_user_id uuid default null
)
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  status public.topup_status,
  amount_xof integer,
  channel text,
  payer_country text,
  payer_network text,
  payer_phone text,
  saspay_payment_id text,
  user_id uuid,
  user_email text,
  user_name text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_pattern text;
  v_statuses public.topup_status[] := public.admin_topup_statuses(p_group);
begin
  perform public.require_admin();
  if v_search is not null then
    v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  select
    t.id, t.created_at, t.updated_at, t.status, t.amount_xof, t.channel,
    t.payer_country, t.payer_network, t.payer_phone, t.saspay_payment_id,
    t.user_id, u.email::text, p.full_name,
    count(*) over ()
  from public.topups t
  join public.profiles p on p.id = t.user_id
  join auth.users u on u.id = t.user_id
  where t.status = any (v_statuses)
    and (p_user_id is null or t.user_id = p_user_id)
    and (p_from is null or t.created_at >= p_from)
    and (p_to is null or t.created_at < p_to)
    and (v_search is null
         or u.email ilike v_pattern
         or p.full_name ilike v_pattern
         or p.phone ilike v_pattern
         or t.payer_phone ilike v_pattern
         or t.payer_network ilike v_pattern
         or t.id::text = v_search
         or t.saspay_payment_id = v_search
         or t.saspay_session_id = v_search)
  order by t.created_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 100))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke execute on function public.admin_list_orders(text, text, timestamptz, timestamptz, integer, integer, uuid) from public, anon;
revoke execute on function public.admin_list_topups(text, text, timestamptz, timestamptz, integer, integer, uuid) from public, anon;
grant execute on function public.admin_list_orders(text, text, timestamptz, timestamptz, integer, integer, uuid) to authenticated;
grant execute on function public.admin_list_topups(text, text, timestamptz, timestamptz, integer, integer, uuid) to authenticated;

-- =========================================================================
-- Suppression d'un compte (partie base) : données personnelles effacées, compte bloqué,
-- historique financier conservé. L'Edge Function admin-user-delete désactive ensuite le
-- compte de connexion (Auth). Idempotent.
-- =========================================================================

create or replace function public.admin_delete_user(p_user_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_profile public.profiles%rowtype;
  v_balance integer;
begin
  if p_user_id = v_admin then
    raise exception 'NF_CANNOT_TARGET_SELF' using errcode = '22023';
  end if;
  if v_reason is null or length(v_reason) < 5 or length(v_reason) > 500 then
    raise exception 'NF_REASON_REQUIRED' using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_profile.deleted_at is not null then
    return jsonb_build_object('user_id', p_user_id, 'already_deleted', true);
  end if;
  if v_profile.role = 'admin' then
    raise exception 'NF_CANNOT_DELETE_ADMIN' using errcode = '22023';
  end if;

  v_balance := public.get_balance(p_user_id);
  if v_balance <> 0 then
    raise exception 'NF_BALANCE_NOT_ZERO' using errcode = '22023',
      detail = jsonb_build_object('balance_xof', v_balance)::text;
  end if;
  if exists (select 1 from public.orders where user_id = p_user_id and status in ('pending', 'received')) then
    raise exception 'NF_ACTIVE_ORDERS' using errcode = '22023';
  end if;
  if exists (select 1 from public.topups where user_id = p_user_id and status = 'pending') then
    raise exception 'NF_PENDING_TOPUPS' using errcode = '22023';
  end if;

  update public.profiles
     set full_name = null, phone = null, is_blocked = true, deleted_at = now()
   where id = p_user_id;
  update public.topups
     set payer_phone = null, payer_name = null, payer_email = null
   where user_id = p_user_id;
  delete from public.user_messages where user_id = p_user_id;

  insert into public.audit_log (actor, action, target, payload)
  values ('admin:' || v_admin, 'user_deleted', 'user:' || p_user_id,
          public.request_meta() || jsonb_build_object('reason', v_reason));

  return jsonb_build_object('user_id', p_user_id, 'already_deleted', false);
end;
$$;

revoke execute on function public.admin_delete_user(uuid, text) from public, anon;
grant execute on function public.admin_delete_user(uuid, text) to authenticated;

-- Un compte supprimé ne peut plus être débloqué.
create or replace function public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := public.require_admin();
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_before boolean;
  v_deleted timestamptz;
begin
  if p_user_id = v_admin then
    raise exception 'NF_CANNOT_TARGET_SELF' using errcode = '22023';
  end if;
  if p_blocked is null then
    raise exception 'NF_INVALID_INPUT' using errcode = '22023';
  end if;
  if p_blocked and (v_reason is null or length(v_reason) < 5) then
    raise exception 'NF_REASON_REQUIRED' using errcode = '22023';
  end if;

  select is_blocked, deleted_at into v_before, v_deleted from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_deleted is not null then
    raise exception 'NF_USER_DELETED' using errcode = '22023';
  end if;

  if v_before is distinct from p_blocked then
    update public.profiles set is_blocked = p_blocked where id = p_user_id;
    insert into public.audit_log (actor, action, target, payload)
    values ('admin:' || v_admin, case when p_blocked then 'user_blocked' else 'user_unblocked' end,
            'user:' || p_user_id, public.request_meta() || jsonb_build_object('reason', v_reason));
  end if;

  return jsonb_build_object('user_id', p_user_id, 'is_blocked', p_blocked);
end;
$$;
