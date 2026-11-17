-- Numéro WhatsApp du support, réglable dans l'administration. Les liens « Contacter le support »
-- de la landing, de la connexion et de l'espace client en dépendent (lien wa.me). Chaîne vide :
-- aucun lien affiché. Valeur de départ : le numéro déjà utilisé en dur dans l'interface.

insert into public.settings (key, value) values ('support_whatsapp', to_jsonb('+18258977760'::text))
on conflict (key) do nothing;

-- Même validation qu'avant, avec la nouvelle clé (format international, chiffres seulement).
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
    when 'support_whatsapp' then
      if jsonb_typeof(p_value) <> 'string' then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      -- « +229 97 12-34-56 », « 0022997123456 » → « +22997123456 » (format international).
      v_text := regexp_replace(trim(p_value #>> '{}'), '[[:space:]().-]', '', 'g');
      if v_text like '00%' then
        v_text := '+' || substr(v_text, 3);
      end if;
      if v_text <> '' and v_text !~ '^\+[1-9][0-9]{7,14}$' then
        raise exception 'NF_INVALID_VALUE' using errcode = '22023', detail = p_key;
      end if;
      return to_jsonb(v_text);
    else
      raise exception 'NF_UNKNOWN_SETTING' using errcode = '22023', detail = p_key;
  end case;
end;
$$;

revoke execute on function public.validate_setting(text, jsonb) from public, anon, authenticated;

-- Lecture publique (visiteurs compris) : uniquement le numéro du support, rien d'autre.
create or replace function public.support_contact()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('whatsapp', nullif(public.setting_text('support_whatsapp', ''), ''));
$$;

revoke execute on function public.support_contact() from public;
grant execute on function public.support_contact() to anon, authenticated;
