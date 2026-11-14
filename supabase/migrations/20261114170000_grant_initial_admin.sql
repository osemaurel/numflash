-- Premier administrateur, désigné par le propriétaire du projet.
-- Aucun compte n'a encore le rôle admin : les RPC admin_* (require_admin) ne peuvent donc pas
-- servir à l'attribuer. L'attribution initiale passe par cette migration et est journalisée.
-- Sans effet si le profil n'existe pas (autre environnement) ou s'il est déjà admin.
do $$
declare
  v_id constant uuid := '52f155ce-9c72-40fb-a661-ebd0cbd2a8f7';
begin
  update public.profiles
     set role = 'admin'
   where id = v_id
     and role <> 'admin';

  if found then
    insert into public.audit_log (actor, action, target, payload)
    values (
      'migration:grant_initial_admin',
      'admin_role_granted',
      'user:' || v_id,
      jsonb_build_object('role', 'admin', 'reason', 'Premier administrateur désigné par le propriétaire du projet')
    );
  end if;
end
$$;
