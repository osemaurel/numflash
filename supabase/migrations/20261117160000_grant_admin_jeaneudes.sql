-- Nouvel administrateur, désigné par le propriétaire du projet.
-- Aucune RPC admin_* n'attribue de rôle : l'attribution passe par une migration, journalisée.
-- Sans effet si le profil n'existe pas (autre environnement), s'il est déjà admin ou supprimé.
do $$
declare
  v_id constant uuid := 'b8bdcc15-1cd4-4e89-b111-900c34c3bf90';
begin
  update public.profiles
     set role = 'admin'
   where id = v_id
     and role <> 'admin'
     and deleted_at is null;

  if found then
    insert into public.audit_log (actor, action, target, payload)
    values (
      'migration:grant_admin_jeaneudes',
      'admin_role_granted',
      'user:' || v_id,
      jsonb_build_object('role', 'admin', 'reason', 'Administrateur désigné par le propriétaire du projet')
    );
  end if;
end
$$;
