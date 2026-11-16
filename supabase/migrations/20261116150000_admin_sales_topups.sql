-- Administration : écrans « Ventes » et « Recharges ».
-- Lecture seule, réservée aux administrateurs (require_admin), paginée côté base.

-- =========================================================================
-- Ventes
-- =========================================================================

-- Groupes de statuts affichés en onglets.
create or replace function public.admin_order_statuses(p_group text)
returns public.order_status[]
language sql
immutable
set search_path = public
as $$
  select case coalesce(p_group, 'all')
    when 'pending' then array['pending']::public.order_status[]
    when 'success' then array['received', 'finished']::public.order_status[]
    when 'canceled' then array['canceled']::public.order_status[]
    when 'failed' then array['timeout', 'banned', 'refunded']::public.order_status[]
    else enum_range(null::public.order_status)
  end;
$$;

create or replace function public.admin_list_orders(
  p_group text default 'all',
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 25,
  p_offset integer default 0
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

-- Totaux de la période : chiffre d'affaires et marge sur les ventes conservées (SMS reçu).
create or replace function public.admin_orders_summary(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fx numeric := public.setting_numeric('fx_usd_xof', 600);
  v_result jsonb;
begin
  perform public.require_admin();
  select jsonb_build_object(
    'total', count(*),
    'pending', count(*) filter (where status = 'pending'),
    'success', count(*) filter (where status in ('received', 'finished')),
    'canceled', count(*) filter (where status = 'canceled'),
    'failed', count(*) filter (where status in ('timeout', 'banned', 'refunded')),
    'revenue_xof', coalesce(sum(price_xof) filter (where status in ('received', 'finished')), 0),
    'cost_xof', coalesce(sum(round(cost_usd * coalesce(fx_usd_xof, v_fx))) filter (where status in ('received', 'finished')), 0),
    'refunded_xof', coalesce((
      select sum(w.amount_xof) from public.wallet_transactions w
       where w.type = 'refund'
         and (p_from is null or w.created_at >= p_from)
         and (p_to is null or w.created_at < p_to)), 0)
  )
  into v_result
  from public.orders
  where (p_from is null or created_at >= p_from)
    and (p_to is null or created_at < p_to);
  return v_result || jsonb_build_object('margin_xof', (v_result ->> 'revenue_xof')::bigint - (v_result ->> 'cost_xof')::bigint);
end;
$$;

create or replace function public.admin_order_detail(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fx numeric := public.setting_numeric('fx_usd_xof', 600);
  v_order jsonb;
  v_user_id uuid;
begin
  perform public.require_admin();

  select jsonb_build_object(
           'id', o.id, 'created_at', o.created_at, 'updated_at', o.updated_at, 'status', o.status,
           'canceled_by', o.canceled_by, 'canceled_at', o.canceled_at, 'expires_at', o.expires_at,
           'service_slug', o.service_slug, 'service_name', s.name_fr,
           'country_code', o.country_code, 'country_name', c.name_fr, 'country_flag', c.flag_emoji,
           'phone', o.phone, 'operator', o.operator, 'price_xof', o.price_xof,
           'cost_usd', o.cost_usd::text, 'fx_usd_xof', coalesce(o.fx_usd_xof, v_fx)::text,
           'cost_xof', round(o.cost_usd * coalesce(o.fx_usd_xof, v_fx))::integer,
           'margin_xof', o.price_xof - round(o.cost_usd * coalesce(o.fx_usd_xof, v_fx))::integer,
           'fivesim_order_id', o.fivesim_order_id, 'provider_status', o.provider_status,
           'idempotency_key', o.idempotency_key),
         o.user_id
    into v_order, v_user_id
    from public.orders o
    left join public.services s on s.slug = o.service_slug
    left join public.countries c on c.code = o.country_code
   where o.id = p_order_id;

  if v_order is null then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'order', v_order,
    'user', (select jsonb_build_object('id', p.id, 'email', u.email, 'full_name', p.full_name, 'phone', p.phone,
                                       'is_blocked', p.is_blocked, 'balance_xof', public.get_balance(p.id))
               from public.profiles p join auth.users u on u.id = p.id where p.id = v_user_id),
    'sms', coalesce((select jsonb_agg(jsonb_build_object('sender', m.sender, 'text', m.text, 'code', m.code, 'received_at', m.received_at)
                                      order by m.received_at)
                       from public.order_sms m where m.order_id = p_order_id), '[]'::jsonb),
    'wallet', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'type', w.type, 'amount_xof', w.amount_xof, 'note', w.note, 'created_at', w.created_at)
                                         order by w.created_at)
                          from public.wallet_transactions w where w.order_id = p_order_id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(e order by e.created_at)
                          from (select a.created_at, a.actor, a.action, a.payload
                                  from public.audit_log a
                                 where a.target = 'order:' || p_order_id
                                 order by a.created_at
                                 limit 100) e), '[]'::jsonb)
  );
end;
$$;

-- =========================================================================
-- Recharges
-- =========================================================================

create or replace function public.admin_topup_statuses(p_group text)
returns public.topup_status[]
language sql
immutable
set search_path = public
as $$
  select case coalesce(p_group, 'all')
    when 'succeeded' then array['succeeded']::public.topup_status[]
    when 'pending' then array['pending']::public.topup_status[]
    when 'failed' then array['failed', 'expired']::public.topup_status[]
    else enum_range(null::public.topup_status)
  end;
$$;

create or replace function public.admin_list_topups(
  p_group text default 'all',
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 25,
  p_offset integer default 0
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

create or replace function public.admin_topups_summary(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.require_admin();
  select jsonb_build_object(
    'total', count(*),
    'succeeded', count(*) filter (where status = 'succeeded'),
    'succeeded_xof', coalesce(sum(amount_xof) filter (where status = 'succeeded'), 0),
    'pending', count(*) filter (where status = 'pending'),
    'pending_xof', coalesce(sum(amount_xof) filter (where status = 'pending'), 0),
    'failed', count(*) filter (where status in ('failed', 'expired')),
    'payers', count(distinct user_id) filter (where status = 'succeeded')
  )
  into v_result
  from public.topups
  where (p_from is null or created_at >= p_from)
    and (p_to is null or created_at < p_to);
  return v_result;
end;
$$;

create or replace function public.admin_topup_detail(p_topup_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_topup public.topups%rowtype;
begin
  perform public.require_admin();
  select * into v_topup from public.topups where id = p_topup_id;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'topup', jsonb_build_object(
      'id', v_topup.id, 'created_at', v_topup.created_at, 'updated_at', v_topup.updated_at,
      'status', v_topup.status, 'amount_xof', v_topup.amount_xof, 'channel', v_topup.channel,
      'payer_country', v_topup.payer_country, 'payer_network', v_topup.payer_network, 'payer_phone', v_topup.payer_phone,
      'saspay_payment_id', v_topup.saspay_payment_id, 'saspay_session_id', v_topup.saspay_session_id,
      'idempotency_key', v_topup.idempotency_key),
    'user', (select jsonb_build_object('id', p.id, 'email', u.email, 'full_name', p.full_name, 'phone', p.phone,
                                       'is_blocked', p.is_blocked, 'balance_xof', public.get_balance(p.id))
               from public.profiles p join auth.users u on u.id = p.id where p.id = v_topup.user_id),
    'wallet', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'type', w.type, 'amount_xof', w.amount_xof, 'note', w.note, 'created_at', w.created_at)
                                         order by w.created_at)
                          from public.wallet_transactions w where w.topup_id = p_topup_id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(e order by e.created_at)
                          from (select a.created_at, a.actor, a.action, a.payload
                                  from public.audit_log a
                                 where a.target = 'topup:' || p_topup_id
                                    or (v_topup.saspay_payment_id is not null and a.target = 'saspay_payment:' || v_topup.saspay_payment_id)
                                 order by a.created_at
                                 limit 100) e), '[]'::jsonb)
  );
end;
$$;

-- =========================================================================
-- Droits
-- =========================================================================

revoke execute on function public.admin_order_statuses(text) from public, anon, authenticated;
revoke execute on function public.admin_topup_statuses(text) from public, anon, authenticated;
revoke execute on function public.admin_list_orders(text, text, timestamptz, timestamptz, integer, integer) from public, anon;
revoke execute on function public.admin_orders_summary(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_order_detail(uuid) from public, anon;
revoke execute on function public.admin_list_topups(text, text, timestamptz, timestamptz, integer, integer) from public, anon;
revoke execute on function public.admin_topups_summary(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_topup_detail(uuid) from public, anon;
grant execute on function public.admin_list_orders(text, text, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.admin_orders_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_order_detail(uuid) to authenticated;
grant execute on function public.admin_list_topups(text, text, timestamptz, timestamptz, integer, integer) to authenticated;
grant execute on function public.admin_topups_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_topup_detail(uuid) to authenticated;
