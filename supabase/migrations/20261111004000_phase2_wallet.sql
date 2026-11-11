-- Phase 2 : wallet et recharge SasPay.

-- Lien avec la session de paiement SasPay. Le webhook ne transporte pas de metadata :
-- on retrouve la recharge via l'id de session stocké ici puis GET /checkout-sessions/{id}/status/.
alter table public.topups
  add column saspay_session_id text unique,
  add column saspay_checkout_url text,
  add column updated_at timestamptz not null default now();

create index topups_correlation_idx on public.topups (created_at desc)
  where status <> 'succeeded' and saspay_session_id is not null;

-- Garantie au niveau base : une recharge ne crédite le wallet qu'une seule fois,
-- quels que soient la concurrence, les rejeux de webhook ou un bug applicatif.
create unique index wallet_transactions_one_credit_per_topup
  on public.wallet_transactions (topup_id)
  where type = 'topup';

-- Le solde affiché se met à jour via Realtime (RLS appliquée) plutôt que par polling.
alter publication supabase_realtime add table public.wallet_transactions;

-- Paliers de recharge lisibles par le client sans ouvrir la table settings.
create or replace function public.topup_tiers()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value from public.settings where key = 'topup_tiers'), '[]'::jsonb);
$$;

revoke execute on function public.topup_tiers() from public;
grant execute on function public.topup_tiers() to anon, authenticated;

-- Crédit atomique d'une recharge dont le paiement a été vérifié auprès de SasPay.
-- Idempotent : un rejeu sur une recharge déjà créditée ne crée aucune ligne.
-- Accepte pending, failed et expired : un paiement vérifié SUCCESS ne doit jamais être perdu,
-- même s'il arrive après un échec intermédiaire sur la même session.
create or replace function public.credit_topup(
  p_topup_id uuid,
  p_saspay_payment_id text,
  p_actor text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topup public.topups%rowtype;
  v_wt_id uuid;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if p_saspay_payment_id is null or length(p_saspay_payment_id) = 0 then
    raise exception 'saspay_payment_id is required' using errcode = '22023';
  end if;

  select * into v_topup from public.topups where id = p_topup_id for update;
  if not found then
    raise exception 'topup % not found', p_topup_id using errcode = 'P0002';
  end if;

  if v_topup.status = 'succeeded' then
    insert into public.audit_log (actor, action, target, payload)
    values (
      p_actor,
      case when v_topup.saspay_payment_id = p_saspay_payment_id
           then 'topup_credit_replay' else 'topup_duplicate_payment' end,
      'topup:' || v_topup.id,
      v_payload || jsonb_build_object(
        'saspay_payment_id', p_saspay_payment_id,
        'linked_payment_id', v_topup.saspay_payment_id
      )
    );
    return jsonb_build_object('credited', false, 'reason', 'already_credited');
  end if;

  insert into public.wallet_transactions (user_id, type, amount_xof, topup_id, note)
  values (v_topup.user_id, 'topup', v_topup.amount_xof, v_topup.id, 'Recharge mobile money')
  returning id into v_wt_id;

  update public.topups
     set status = 'succeeded',
         saspay_payment_id = p_saspay_payment_id,
         updated_at = now()
   where id = v_topup.id;

  insert into public.audit_log (actor, action, target, payload)
  values (
    p_actor,
    'topup_credited',
    'topup:' || v_topup.id,
    v_payload || jsonb_build_object(
      'saspay_payment_id', p_saspay_payment_id,
      'wallet_transaction_id', v_wt_id,
      'amount_xof', v_topup.amount_xof,
      'user_id', v_topup.user_id,
      'previous_status', v_topup.status
    )
  );

  return jsonb_build_object(
    'credited', true,
    'wallet_transaction_id', v_wt_id,
    'amount_xof', v_topup.amount_xof
  );
end;
$$;

-- Passage en échec d'une recharge encore pending, après vérification SasPay.
-- On ne stocke pas l'id de paiement échoué : un succès ultérieur sur la même session reste créditable.
create or replace function public.fail_topup_if_pending(
  p_topup_id uuid,
  p_saspay_payment_id text,
  p_actor text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topup public.topups%rowtype;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb)
                     || jsonb_build_object('saspay_payment_id', p_saspay_payment_id);
begin
  select * into v_topup from public.topups where id = p_topup_id for update;
  if not found then
    raise exception 'topup % not found', p_topup_id using errcode = 'P0002';
  end if;

  if v_topup.status <> 'pending' then
    insert into public.audit_log (actor, action, target, payload)
    values (p_actor, 'topup_fail_ignored', 'topup:' || v_topup.id,
            v_payload || jsonb_build_object('current_status', v_topup.status));
    return jsonb_build_object('changed', false, 'topup_status', v_topup.status);
  end if;

  update public.topups set status = 'failed', updated_at = now() where id = v_topup.id;

  insert into public.audit_log (actor, action, target, payload)
  values (p_actor, 'topup_failed', 'topup:' || v_topup.id, v_payload);

  return jsonb_build_object('changed', true, 'topup_status', 'failed');
end;
$$;

revoke execute on function public.credit_topup(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_topup_if_pending(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.credit_topup(uuid, text, text, jsonb) to service_role;
grant execute on function public.fail_topup_if_pending(uuid, text, text, jsonb) to service_role;
