-- Phase 3 : moteur d'achat.
--
-- Parcours d'un achat (Edge Function order-create) :
--   1. order_reserve : verrou sur profiles(id), prix recalculé en base, solde vérifié, commande
--      insérée AVANT tout appel 5sim (les garde-fous de orders s'appliquent), débit du prix,
--      journalisation. Tout est dans une seule transaction.
--   2. Achat chez 5sim (hors transaction), puis order_assign_number.
--   3. En cas d'échec avant attribution d'un numéro : order_fail_unassigned rembourse.
-- Réception des SMS (Edge Function orders-sync, lancée par pg_cron) : order_apply_provider_state
-- applique l'état renvoyé par 5sim, enregistre les SMS et rembourse si aucun SMS n'a été reçu.
-- Le client est prévenu par Supabase Realtime (aucun polling côté navigateur).

-- =========================================================================
-- Colonnes et index
-- =========================================================================

-- Une clé par intention d'achat : un retry réseau de la même demande ne crée pas une deuxième commande.
alter table public.orders
  add column idempotency_key uuid unique,
  add column provider_status text;

-- Les SMS sont relus à chaque synchronisation : la clé fournisseur évite les doublons.
alter table public.order_sms add column provider_key text;
update public.order_sms set provider_key = md5(id::text) where provider_key is null;
alter table public.order_sms alter column provider_key set not null;
create unique index order_sms_provider_key_uniq on public.order_sms (order_id, provider_key);

-- Garantie au niveau base : une commande n'est débitée qu'une fois et remboursée au plus une fois.
create unique index wallet_transactions_one_purchase_per_order
  on public.wallet_transactions (order_id) where type = 'purchase';
create unique index wallet_transactions_one_refund_per_order
  on public.wallet_transactions (order_id) where type = 'refund';

-- Les numéros et leurs codes s'affichent en direct (RLS appliquée par Realtime).
alter publication supabase_realtime add table public.orders, public.order_sms;

-- =========================================================================
-- Prix : même formule que src/lib/pricing.ts, en numeric exact (jamais de flottant).
-- ceil(cost × fx × (1 + marge) / pas) × pas, avec plancher.
-- =========================================================================

create or replace function public.price_xof_for_cost(
  p_cost numeric,
  p_margin_override numeric,
  p_fx numeric,
  p_margin_rate numeric,
  p_step integer,
  p_floor integer
)
returns integer
language sql
immutable
set search_path = public
as $$
  select greatest(
    (ceil(p_cost * p_fx * (1 + coalesce(p_margin_override, p_margin_rate)) / p_step) * p_step)::integer,
    p_floor
  );
$$;

-- Règles d'annulation affichées au client (les garde-fous eux-mêmes restent dans les déclencheurs).
create or replace function public.order_rules()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'min_seconds_before_cancel', public.setting_int('min_seconds_before_cancel', 120),
    'max_cancels_per_hour', public.setting_int('max_cancels_per_hour', 5),
    'max_active_orders', public.setting_int('max_active_orders', 5)
  );
$$;

-- Horodatage fourni par le fournisseur : null plutôt qu'une erreur si le format est inattendu.
create or replace function public.safe_timestamptz(p_value text)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
begin
  if p_value is null or length(trim(p_value)) = 0 then
    return null;
  end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

-- =========================================================================
-- 1. Réservation : commande + débit, atomiques.
-- =========================================================================

create or replace function public.order_reserve(
  p_user_id uuid,
  p_service text,
  p_country text,
  p_expected_price_xof integer,
  p_idempotency_key uuid,
  p_meta jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(p_meta, '{}'::jsonb);
  v_existing public.orders%rowtype;
  v_service public.services%rowtype;
  v_country public.countries%rowtype;
  v_fx numeric := public.setting_numeric('fx_usd_xof', 600);
  v_rate numeric := public.setting_numeric('margin_rate', 0.30);
  v_step integer := public.setting_int('rounding_step', 100);
  v_floor integer := public.setting_int('price_floor_xof', 150);
  v_blocked boolean;
  v_price integer;
  v_cost numeric;
  v_candidates jsonb;
  v_balance integer;
  v_order_id uuid;
  v_tx_id uuid;
begin
  if p_user_id is null or p_idempotency_key is null or p_service is null or p_country is null then
    raise exception 'NF_INVALID_INPUT' using errcode = '22023';
  end if;

  -- Verrou sur le profil en premier : sérialise les achats (et les retries) d'un même utilisateur.
  select is_blocked into v_blocked from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'NF_PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Retry réseau de la même demande : on renvoie la commande déjà créée, sans nouveau débit.
  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.user_id <> p_user_id
       or v_existing.service_slug <> p_service
       or v_existing.country_code <> p_country then
      raise exception 'NF_IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'replayed', true,
      'order_id', v_existing.id,
      'status', v_existing.status,
      'price_xof', v_existing.price_xof,
      'fivesim_order_id', v_existing.fivesim_order_id
    );
  end if;

  if v_blocked then
    raise exception 'NF_ACCOUNT_BLOCKED' using errcode = 'P0001';
  end if;

  select * into v_service from public.services where slug = p_service;
  if not found or not v_service.is_active then
    raise exception 'NF_SERVICE_UNAVAILABLE' using errcode = 'P0001';
  end if;
  select * into v_country from public.countries where code = p_country;
  if not found or not v_country.is_active then
    raise exception 'NF_COUNTRY_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- Prix facturé = prix de l'offre la moins chère en stock (celui affiché au client).
  -- Opérateurs candidats : ceux dont le prix client reste identique, du moins cher au plus cher.
  with offers as (
    select operator, cost_usd,
           public.price_xof_for_cost(cost_usd, v_service.margin_override, v_fx, v_rate, v_step, v_floor) as price
      from public.price_cache
     where service_slug = p_service and country_code = p_country and stock > 0
  ),
  best as (
    select min(price) as price, min(cost_usd) as cost from offers
  )
  select b.price, b.cost,
         (select coalesce(jsonb_agg(jsonb_build_object('operator', c.operator, 'cost_usd', c.cost_usd)
                                    order by c.cost_usd, c.operator), '[]'::jsonb)
            from (select o.operator, o.cost_usd from offers o
                   where o.price <= b.price
                   order by o.cost_usd, o.operator
                   limit 3) c)
    into v_price, v_cost, v_candidates
    from best b;

  if v_price is null then
    raise exception 'NF_NO_STOCK' using errcode = 'P0001';
  end if;
  if p_expected_price_xof is not null and p_expected_price_xof <> v_price then
    raise exception 'NF_PRICE_CHANGED' using errcode = 'P0001',
      detail = jsonb_build_object('price_xof', v_price)::text;
  end if;

  v_balance := public.get_balance(p_user_id);
  if v_balance < v_price then
    raise exception 'NF_INSUFFICIENT_BALANCE' using errcode = 'P0001',
      detail = jsonb_build_object('balance_xof', v_balance, 'price_xof', v_price)::text;
  end if;

  -- Le déclencheur orders_guard_insert vérifie le blocage et le plafond de commandes en attente.
  insert into public.orders (
    user_id, phone, service_slug, country_code, price_xof, cost_usd, fx_usd_xof, status, idempotency_key
  ) values (
    p_user_id, '', p_service, p_country, v_price, v_cost, v_fx, 'pending', p_idempotency_key
  )
  returning id into v_order_id;

  insert into public.wallet_transactions (user_id, type, amount_xof, order_id, note)
  values (p_user_id, 'purchase', -v_price, v_order_id, 'Achat ' || v_service.name_fr || ' · ' || v_country.name_fr)
  returning id into v_tx_id;

  insert into public.audit_log (actor, action, target, payload)
  values ('user:' || p_user_id, 'order_reserved', 'order:' || v_order_id,
          v_meta || jsonb_build_object(
            'service', p_service,
            'country', p_country,
            'price_xof', v_price,
            'cost_usd', v_cost,
            'fx_usd_xof', v_fx,
            'balance_before', v_balance,
            'balance_after', v_balance - v_price,
            'wallet_transaction_id', v_tx_id,
            'candidates', v_candidates));

  return jsonb_build_object(
    'replayed', false,
    'order_id', v_order_id,
    'price_xof', v_price,
    'balance_after', v_balance - v_price,
    'candidates', v_candidates
  );
end;
$$;

-- =========================================================================
-- 2. Numéro attribué par 5sim.
-- =========================================================================

create or replace function public.order_assign_number(
  p_order_id uuid,
  p_fivesim_order_id bigint,
  p_phone text,
  p_operator text,
  p_cost_usd numeric,
  p_expires_at timestamptz,
  p_provider_status text,
  p_actor text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_phone text := trim(coalesce(p_phone, ''));
begin
  if p_fivesim_order_id is null or p_fivesim_order_id <= 0 or length(v_phone) not between 3 and 32
     or p_cost_usd is null or p_cost_usd < 0 then
    raise exception 'NF_INVALID_INPUT' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.fivesim_order_id is not null then
    if v_order.fivesim_order_id = p_fivesim_order_id then
      return jsonb_build_object('changed', false, 'status', v_order.status);
    end if;
    raise exception 'NF_ALREADY_ASSIGNED' using errcode = 'P0001';
  end if;
  -- Réservation déjà remboursée entre-temps : l'appelant doit annuler la commande 5sim.
  if v_order.status <> 'pending' then
    raise exception 'NF_ORDER_CLOSED' using errcode = 'P0001';
  end if;

  update public.orders
     set fivesim_order_id = p_fivesim_order_id,
         phone = v_phone,
         operator = nullif(trim(coalesce(p_operator, '')), ''),
         cost_usd = round(p_cost_usd, 4),
         expires_at = p_expires_at,
         provider_status = upper(trim(coalesce(p_provider_status, '')))
   where id = p_order_id;

  insert into public.audit_log (actor, action, target, payload)
  values (p_actor, 'order_number_assigned', 'order:' || p_order_id,
          coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
            'fivesim_order_id', p_fivesim_order_id,
            'operator', p_operator,
            'cost_usd', round(p_cost_usd, 4),
            'estimated_cost_usd', v_order.cost_usd,
            'cost_above_estimate', round(p_cost_usd, 4) > v_order.cost_usd,
            'expires_at', p_expires_at));

  return jsonb_build_object('changed', true, 'status', 'pending');
end;
$$;

-- =========================================================================
-- 3. Échec avant attribution d'un numéro : remboursement.
-- =========================================================================

create or replace function public.order_fail_unassigned(
  p_order_id uuid,
  p_reason text,
  p_actor text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_tx_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.fivesim_order_id is not null then
    raise exception 'NF_ALREADY_ASSIGNED' using errcode = 'P0001';
  end if;
  if v_order.status <> 'pending' then
    return jsonb_build_object('changed', false, 'status', v_order.status);
  end if;

  insert into public.wallet_transactions (user_id, type, amount_xof, order_id, note)
  values (v_order.user_id, 'refund', v_order.price_xof, v_order.id, 'Remboursement — aucun numéro attribué')
  returning id into v_tx_id;

  update public.orders
     set status = 'refunded', canceled_by = 'system', canceled_at = now()
   where id = v_order.id;

  insert into public.audit_log (actor, action, target, payload)
  values (p_actor, 'order_refunded_unassigned', 'order:' || v_order.id,
          coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
            'reason', p_reason,
            'amount_xof', v_order.price_xof,
            'user_id', v_order.user_id,
            'wallet_transaction_id', v_tx_id));

  return jsonb_build_object('changed', true, 'status', 'refunded', 'wallet_transaction_id', v_tx_id);
end;
$$;

-- =========================================================================
-- 4. État renvoyé par 5sim : SMS, statut, remboursement.
-- Statuts 5sim : PENDING (préparation), RECEIVED (numéro attribué, en attente du SMS),
-- FINISHED, CANCELED, TIMEOUT, BANNED. Un SMS reçu se voit dans la liste sms, pas dans le statut.
-- Remboursement si et seulement si la commande se termine sans aucun SMS reçu.
-- =========================================================================

create or replace function public.order_apply_provider_state(
  p_order_id uuid,
  p_provider_status text,
  p_sms jsonb,
  p_canceled_by text,
  p_actor text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := upper(trim(coalesce(p_provider_status, '')));
  v_order public.orders%rowtype;
  v_inserted integer := 0;
  v_has_sms boolean;
  v_new public.order_status;
  v_refund boolean;
  v_tx_id uuid;
  v_canceled_by text := coalesce(p_canceled_by, 'system');
  v_race boolean := false;
begin
  if v_status not in ('PENDING', 'RECEIVED', 'CANCELED', 'TIMEOUT', 'FINISHED', 'BANNED') then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'provider_status';
  end if;
  if v_canceled_by not in ('user', 'system', 'admin') then
    raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = 'canceled_by';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.fivesim_order_id is null then
    raise exception 'NF_NOT_ASSIGNED' using errcode = 'P0001';
  end if;

  if p_sms is not null and jsonb_typeof(p_sms) = 'array' then
    with incoming as (
      select left(nullif(trim(e ->> 'sender'), ''), 120) as sender,
             left(nullif(trim(e ->> 'text'), ''), 2000) as body,
             left(nullif(trim(e ->> 'code'), ''), 64) as code,
             coalesce(public.safe_timestamptz(e ->> 'created_at'), public.safe_timestamptz(e ->> 'date'), now()) as at,
             md5(coalesce(e ->> 'created_at', e ->> 'date', '') || '|' || coalesce(e ->> 'sender', '') || '|'
                 || coalesce(e ->> 'text', '') || '|' || coalesce(e ->> 'code', '')) as key
        from jsonb_array_elements(p_sms) e
       where jsonb_typeof(e) = 'object'
    ),
    ins as (
      insert into public.order_sms (order_id, sender, text, code, received_at, provider_key)
      select v_order.id, i.sender, i.body, i.code, i.at, i.key
        from incoming i
       where i.body is not null or i.code is not null
      on conflict (order_id, provider_key) do nothing
      returning 1
    )
    select count(*) into v_inserted from ins;
  end if;

  v_has_sms := exists (select 1 from public.order_sms where order_id = v_order.id);

  -- Déjà clôturée localement : on garde seulement la trace des SMS tardifs.
  if v_order.status not in ('pending', 'received') then
    if v_inserted > 0 then
      insert into public.audit_log (actor, action, target, payload)
      values (p_actor, 'order_sms_after_close', 'order:' || v_order.id,
              coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
                'status', v_order.status, 'provider_status', v_status, 'sms_inserted', v_inserted));
    end if;
    return jsonb_build_object('changed', v_inserted > 0, 'status', v_order.status, 'sms_inserted', v_inserted, 'refunded', false);
  end if;

  v_new := case
    when v_status in ('PENDING', 'RECEIVED') then (case when v_has_sms then 'received' else 'pending' end)::public.order_status
    when v_status = 'FINISHED' or v_has_sms then 'finished'::public.order_status
    when v_status = 'CANCELED' then 'canceled'::public.order_status
    when v_status = 'TIMEOUT' then 'timeout'::public.order_status
    else 'banned'::public.order_status
  end;
  v_refund := v_status in ('CANCELED', 'TIMEOUT', 'BANNED') and not v_has_sms;

  if v_new = v_order.status and v_inserted = 0 and v_order.provider_status is not distinct from v_status then
    return jsonb_build_object('changed', false, 'status', v_order.status, 'sms_inserted', 0, 'refunded', false);
  end if;

  if v_refund then
    insert into public.wallet_transactions (user_id, type, amount_xof, order_id, note)
    values (v_order.user_id, 'refund', v_order.price_xof, v_order.id,
            case v_status
              when 'CANCELED' then 'Remboursement — commande annulée'
              when 'TIMEOUT' then 'Remboursement — aucun SMS reçu'
              else 'Remboursement — numéro refusé'
            end)
    returning id into v_tx_id;
  end if;

  if v_new = 'canceled' then
    begin
      update public.orders set status = 'canceled', canceled_by = v_canceled_by, provider_status = v_status
       where id = v_order.id;
    exception when sqlstate 'P0001' then
      -- 5sim a déjà annulé (et nous a remboursés) : si une annulation concurrente a atteint
      -- le plafond entre-temps, on clôt en « système » plutôt que de laisser l'état diverger.
      if v_canceled_by <> 'user' then
        raise;
      end if;
      update public.orders set status = 'canceled', canceled_by = 'system', provider_status = v_status
       where id = v_order.id;
      v_race := true;
    end;
  else
    update public.orders set status = v_new, provider_status = v_status where id = v_order.id;
  end if;

  insert into public.audit_log (actor, action, target, payload)
  values (p_actor,
          case when v_refund then 'order_refunded'
               when v_new <> v_order.status then 'order_status_changed'
               when v_inserted > 0 then 'order_sms_received'
               else 'order_provider_status' end,
          'order:' || v_order.id,
          coalesce(p_payload, '{}'::jsonb) || jsonb_build_object(
            'from', v_order.status,
            'to', v_new,
            'provider_status', v_status,
            'sms_inserted', v_inserted,
            'refund_amount_xof', case when v_refund then v_order.price_xof end,
            'wallet_transaction_id', v_tx_id,
            'canceled_by', case when v_new = 'canceled' then (case when v_race then 'system' else v_canceled_by end) end,
            'cancel_guard_race', v_race,
            'finished_without_sms', v_new = 'finished' and not v_has_sms,
            'user_id', v_order.user_id));

  return jsonb_build_object(
    'changed', true,
    'status', v_new,
    'previous_status', v_order.status,
    'sms_inserted', v_inserted,
    'refunded', v_refund
  );
end;
$$;

-- =========================================================================
-- 5. Annulation par l'utilisateur : vérification préalable des garde-fous.
-- Les déclencheurs de orders sont exécutés « à blanc » (sous-transaction annulée) : la règle
-- reste écrite à un seul endroit et elle est vérifiée AVANT d'annuler chez 5sim.
-- =========================================================================

create or replace function public.order_cancel_precheck(p_order_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_msg text;
  v_detail text;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found or v_order.user_id <> p_user_id then
    raise exception 'NF_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'NF_CANCEL_NOT_PENDING' using errcode = 'P0001';
  end if;
  if v_order.fivesim_order_id is null then
    raise exception 'NF_NOT_ASSIGNED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.order_sms where order_id = v_order.id) then
    raise exception 'NF_HAS_SMS' using errcode = 'P0001';
  end if;

  begin
    update public.orders set status = 'canceled', canceled_by = 'user' where id = v_order.id;
    raise exception 'NF_DRY_RUN_OK' using errcode = 'P0001';
  exception when others then
    get stacked diagnostics v_msg = message_text, v_detail = pg_exception_detail;
    if v_msg = 'NF_DRY_RUN_OK' then
      return jsonb_build_object('ok', true, 'fivesim_order_id', v_order.fivesim_order_id);
    end if;
    raise exception '%', v_msg using errcode = 'P0001', detail = coalesce(v_detail, '');
  end;
end;
$$;

-- =========================================================================
-- Bail exclusif pour la synchronisation (une seule boucle orders-sync à la fois).
-- =========================================================================

create table public.job_leases (
  name text primary key,
  holder uuid not null,
  expires_at timestamptz not null
);
alter table public.job_leases enable row level security;
revoke all on public.job_leases from anon, authenticated;

create or replace function public.lease_acquire(p_name text, p_holder uuid, p_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  insert into public.job_leases (name, holder, expires_at)
  values (p_name, p_holder, now() + make_interval(secs => greatest(1, least(p_seconds, 600))))
  on conflict (name) do update
     set holder = excluded.holder, expires_at = excluded.expires_at
   where public.job_leases.expires_at < now() or public.job_leases.holder = excluded.holder
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

create or replace function public.lease_release(p_name text, p_holder uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.job_leases where name = p_name and holder = p_holder;
$$;

-- =========================================================================
-- Droits : uniquement service_role (Edge Functions), sauf les règles publiques.
-- =========================================================================

revoke execute on function public.price_xof_for_cost(numeric, numeric, numeric, numeric, integer, integer) from public, anon, authenticated;
revoke execute on function public.safe_timestamptz(text) from public, anon, authenticated;
revoke execute on function public.order_reserve(uuid, text, text, integer, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.order_assign_number(uuid, bigint, text, text, numeric, timestamptz, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.order_fail_unassigned(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.order_apply_provider_state(uuid, text, jsonb, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.order_cancel_precheck(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.lease_acquire(text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.lease_release(text, uuid) from public, anon, authenticated;

grant execute on function public.order_reserve(uuid, text, text, integer, uuid, jsonb) to service_role;
grant execute on function public.order_assign_number(uuid, bigint, text, text, numeric, timestamptz, text, text, jsonb) to service_role;
grant execute on function public.order_fail_unassigned(uuid, text, text, jsonb) to service_role;
grant execute on function public.order_apply_provider_state(uuid, text, jsonb, text, text, jsonb) to service_role;
grant execute on function public.order_cancel_precheck(uuid, uuid) to service_role;
grant execute on function public.lease_acquire(text, uuid, integer) to service_role;
grant execute on function public.lease_release(text, uuid) to service_role;

revoke execute on function public.order_rules() from public;
grant execute on function public.order_rules() to anon, authenticated;

-- =========================================================================
-- Synchronisation planifiée : chaque minute, seulement s'il existe une commande en cours.
-- La fonction boucle ~50 s (vérification toutes les 5 s) puis rend la main.
-- =========================================================================

insert into public.cron_tokens (name, token)
values ('orders-sync', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

select cron.schedule(
  'orders-sync-1min',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://rcjpgibkkedcsfbigcjj.supabase.co/functions/v1/orders-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select token from public.cron_tokens where name = 'orders-sync')),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (select 1 from public.orders where status in ('pending', 'received'));
  $$
);
