-- pg_net avait été créé dans public par la migration Phase 1. Rien ne l'utilise encore
-- (le cron catalog-sync n'est pas planifié) : on le recrée dans le schéma extensions.
drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;
