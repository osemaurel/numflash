-- Phase 1 : pricing settings exposés via RPC, extensions cron/HTTP, seed FR Africa.

-- Extensions pour la planification cron et les appels HTTP sortants depuis Postgres.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Les nouveaux pays découverts par catalog-sync doivent passer en revue admin avant
-- d'apparaître dans le catalogue public : on bascule le défaut à false.
alter table public.countries alter column is_active set default false;

-- pricing_settings() : expose uniquement les 4 clés de pricing aux clients, sans ouvrir
-- l'intégralité de la table settings (qui reste service_role only).
create or replace function public.pricing_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'fx_usd_xof',      (select (value #>> '{}')::numeric from public.settings where key = 'fx_usd_xof'),
    'margin_rate',     (select (value #>> '{}')::numeric from public.settings where key = 'margin_rate'),
    'rounding_step',   (select (value #>> '{}')::integer from public.settings where key = 'rounding_step'),
    'price_floor_xof', (select (value #>> '{}')::integer from public.settings where key = 'price_floor_xof')
  );
$$;

revoke execute on function public.pricing_settings() from public;
grant execute on function public.pricing_settings() to anon, authenticated;

-- Seed services populaires (actifs).
-- Les services découverts par catalog-sync sont créés avec is_active = false pour validation admin.
insert into public.services (slug, name_fr, sort_order, is_active) values
  ('whatsapp',  'WhatsApp',     1,  true),
  ('telegram',  'Telegram',     2,  true),
  ('google',    'Google',       3,  true),
  ('facebook',  'Facebook',     4,  true),
  ('instagram', 'Instagram',    5,  true),
  ('tiktok',    'TikTok',       6,  true),
  ('discord',   'Discord',      7,  true),
  ('twitter',   'Twitter / X',  8,  true),
  ('amazon',    'Amazon',       9,  true),
  ('microsoft', 'Microsoft',    10, true),
  ('uber',      'Uber',         11, true),
  ('tinder',    'Tinder',       12, true)
on conflict (slug) do nothing;

-- Seed pays d'Afrique francophone (slugs vérifiés contre /guest/countries de 5sim).
-- is_active = true pour qu'ils soient immédiatement visibles dans le catalogue.
insert into public.countries (code, name_fr, flag_emoji, is_active) values
  ('algeria',     'Algérie',        '🇩🇿', true),
  ('benin',       'Bénin',          '🇧🇯', true),
  ('burkinafaso', 'Burkina Faso',   '🇧🇫', true),
  ('burundi',     'Burundi',        '🇧🇮', true),
  ('cameroon',    'Cameroun',       '🇨🇲', true),
  ('chad',        'Tchad',          '🇹🇩', true),
  ('comoros',     'Comores',        '🇰🇲', true),
  ('congo',       'Congo',          '🇨🇬', true),
  ('djibouti',    'Djibouti',       '🇩🇯', true),
  ('gabon',       'Gabon',          '🇬🇦', true),
  ('guinea',      'Guinée',         '🇬🇳', true),
  ('ivorycoast',  'Côte d''Ivoire', '🇨🇮', true),
  ('madagascar',  'Madagascar',     '🇲🇬', true),
  ('mauritania',  'Mauritanie',     '🇲🇷', true),
  ('morocco',     'Maroc',          '🇲🇦', true),
  ('rwanda',      'Rwanda',         '🇷🇼', true),
  ('senegal',     'Sénégal',        '🇸🇳', true),
  ('togo',        'Togo',           '🇹🇬', true),
  ('tunisia',     'Tunisie',        '🇹🇳', true)
on conflict (code) do nothing;
