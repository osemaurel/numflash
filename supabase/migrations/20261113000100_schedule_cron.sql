-- Tâches planifiées.
-- catalog-sync toutes les 10 min (prévu en Phase 1) : la clé publishable n'est pas secrète,
-- elle figure déjà dans le bundle du front, et la fonction n'utilise que l'API publique de 5sim.
select cron.schedule(
  'catalog-sync-10min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://rcjpgibkkedcsfbigcjj.supabase.co/functions/v1/catalog-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_6wwz-xZabtgN-1icJKzH0w_2YStdfjg'),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- reconcile chaque nuit à 02:17 UTC (03:17 à Cotonou et Lagos). Le jeton est lu dans la base
-- au moment de l'appel : il n'apparaît dans aucun fichier.
select cron.schedule(
  'reconcile-nightly',
  '17 2 * * *',
  $$
  select net.http_post(
    url := 'https://rcjpgibkkedcsfbigcjj.supabase.co/functions/v1/reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select token from public.cron_tokens where name = 'reconcile')),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
