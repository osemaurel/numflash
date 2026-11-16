-- Confidentialité des clients : SasPay reçoit l'adresse e-mail fixée par l'administrateur à la place
-- de celle du client (confirmations et notifications du prestataire). L'e-mail saisi par le client
-- reste chez Numflash, sur la recharge.

insert into public.settings (key, value) values ('saspay_customer_email', to_jsonb(''::text))
on conflict (key) do nothing;

alter table public.topups
  add column payer_name text check (payer_name is null or length(payer_name) <= 130),
  add column payer_email text check (payer_email is null or length(payer_email) <= 254);

-- Même validation qu'avant, avec la nouvelle clé (chaîne vide = non configuré).
create or replace function public.validate_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_tiers jsonb;
  v_text text;
begin
  case p_key
    when 'fx_usd_xof' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0.0001, 100000));
    when 'margin_rate' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0, 5));
    when 'rounding_step' then return to_jsonb(public.jsonb_int(p_key, p_value, 1, 10000));
    when 'price_floor_xof' then return to_jsonb(public.jsonb_int(p_key, p_value, 0, 1000000));
    when 'max_cancels_per_hour' then return to_jsonb(public.jsonb_int(p_key, p_value, 0, 1000));
    when 'min_seconds_before_cancel' then return to_jsonb(public.jsonb_int(p_key, p_value, 0, 3600));
    when 'max_active_orders' then return to_jsonb(public.jsonb_int(p_key, p_value, 1, 100));
    when 'fivesim_low_balance_threshold' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0, 1000000));
    when 'cancel_ratio_alert_threshold' then return to_jsonb(public.jsonb_decimal(p_key, p_value, 0, 1));
    when 'cancel_ratio_window' then return to_jsonb(public.jsonb_int(p_key, p_value, 5, 200));
    when 'topup_tiers' then
      if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) not between 1 and 12 then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      select jsonb_agg(t order by t) into v_tiers
      from (select distinct public.jsonb_int(p_key, e, 100, 1000000) as t from jsonb_array_elements(p_value) e) s;
      if jsonb_array_length(v_tiers) <> jsonb_array_length(p_value) then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      return v_tiers;
    when 'report_timezone' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      v_text := trim(p_value #>> '{}');
      if not exists (select 1 from pg_timezone_names where name = v_text) then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      return to_jsonb(v_text);
    when 'saspay_customer_email' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      v_text := lower(trim(p_value #>> '{}'));
      if v_text <> '' and (length(v_text) > 254 or v_text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$') then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      return to_jsonb(v_text);
    else
      raise exception 'NF_UNKNOWN_SETTING' using errcode = '22023', detail = p_key;
  end case;
end;
$$;

revoke execute on function public.validate_setting(text, jsonb) from public, anon, authenticated;

-- Détail d'une recharge pour l'administration : avec le nom et l'e-mail saisis par le client.
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
      'payer_name', v_topup.payer_name, 'payer_email', v_topup.payer_email,
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

revoke execute on function public.admin_topup_detail(uuid) from public, anon;
grant execute on function public.admin_topup_detail(uuid) to authenticated;
