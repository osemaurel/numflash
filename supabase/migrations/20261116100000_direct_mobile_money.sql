-- Recharge par paiement direct Mobile Money (POST /payments/softpay/) depuis la page Numflash,
-- sans redirection vers la page SasPay. Le crédit reste exclusivement fait par le webhook vérifié.

-- Canal de la recharge et coordonnées de paiement (pour l'assistance et le suivi à l'écran).
alter table public.topups
  add column channel text not null default 'checkout' check (channel in ('checkout', 'direct')),
  add column payer_country text check (payer_country is null or payer_country ~ '^[A-Z]{2}$'),
  add column payer_network text check (payer_network is null or payer_network ~ '^[a-z0-9_-]{2,40}$'),
  add column payer_phone text check (payer_phone is null or payer_phone ~ '^\+[1-9][0-9]{7,14}$');

-- L'écran de suivi se met à jour en direct quand le webhook confirme ou refuse (RLS appliquée).
alter publication supabase_realtime add table public.topups;

-- Cache des réponses de référence du prestataire (réseaux et frais SasPay) : la limite de
-- 300 requêtes/minute vaut pour tout le compte, la page de paiement ne doit pas la consommer.
create table public.provider_cache (
  key text primary key,
  value jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.provider_cache enable row level security;
revoke all on public.provider_cache from anon, authenticated;
