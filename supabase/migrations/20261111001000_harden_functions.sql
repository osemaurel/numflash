-- Durcir les fonctions internes :
-- 1. Figer search_path de wallet_transactions_append_only (défense contre schema shadowing).
-- 2. Révoquer EXECUTE sur handle_new_user : elle ne doit être appelée que par le trigger
--    on_auth_user_created, jamais via POST /rest/v1/rpc/handle_new_user.

alter function public.wallet_transactions_append_only() set search_path = '';

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
