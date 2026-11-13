# CLAUDE.md — Numflash

Plateforme de revente de numéros virtuels pour réception de SMS, Afrique
francophone. Fournisseur : 5sim.net. Encaissement : SasPay en FCFA (mobile
money). Stack : React + TypeScript + Tailwind, Supabase (Postgres, Auth,
Edge Functions, Realtime).

---

## 1. Règles absolues

- **Aucune clé API** (5sim, SasPay, `service_role` Supabase) ne doit
  apparaître côté client. Tout appel vers une API externe passe par une
  **Edge Function** Supabase. Le client ne connaît que l'anon key.

- **Le solde d'un utilisateur n'est jamais une colonne modifiable** : il
  se calcule depuis la table append-only `wallet_transactions`. Aucun
  `UPDATE wallet SET balance = ...`. Toute variation = une nouvelle ligne
  (`credit` / `debit`) signée et horodatée.

- **Tout montant en FCFA est un entier** (Postgres `bigint` ou `integer`,
  jamais `numeric` ni `float`). **Tout coût fournisseur** (prix 5sim en
  roubles, taux de change, marge) est un `numeric(10,4)`. **Jamais de
  flottant** pour de l'argent, sous aucun prétexte, nulle part.

- **Toute route SasPay qui déplace de l'argent** (`/payments/softpay/`,
  `/payouts/initialize/`, `/wallet-transfers/`, `/payments/{id}/retry/`)
  porte un header `Idempotency-Key` unique **par tentative métier**
  (UUID v4). La même clé est réutilisée uniquement pour les retries
  réseau du *même* appel, jamais pour une nouvelle intention.

- **Un wallet n'est jamais crédité sur un retour navigateur**
  (`return_url`, redirect, polling client). Uniquement sur **webhook
  SasPay confirmé** par un appel explicite à
  `GET /payments/{id}/verify/` renvoyant `SUCCESS`. Signature HMAC-SHA256
  vérifiée en temps constant, timestamp ≤ 300 s.

- **Les erreurs de l'API 5sim sont des chaînes de texte brut**, pas du
  JSON (`"no free phones"`, `"not enough user balance"`,
  `"order has sms"`, etc.). Toutes passent par une **fonction unique de
  traduction** vers un message français destiné à l'utilisateur. Le code
  applicatif ne branche jamais directement sur le texte brut ailleurs
  que dans cette fonction.

---

## 2. Interface

- **Toute l'interface est en français.** Tutoiement exclu, **vouvoiement
  systématique** (« Vous disposez de 1 500 FCFA »).

- **Les prix s'affichent en FCFA, sans décimale**, format
  `1 500 FCFA` (espace fine insécable U+202F entre milliers et unités,
  espace normale avant « FCFA »). Un helper `formatFCFA(n: number)`
  centralisé ; aucun `.toLocaleString()` disséminé.

- **Mobile d'abord.** Breakpoints Tailwind par défaut, mais la vue
  mobile est celle qu'on conçoit en premier. Majorité des utilisateurs
  sur téléphone avec connexion lente :
  - pas de polling agressif (webhooks + Supabase Realtime à la place) ;
  - images optimisées, lazy loading ;
  - bundle JS minimal, pas de dépendances lourdes sans raison ;
  - états de chargement explicites ; pas de spinner infini.

---

## 3. Conventions

- **Chaque Edge Function valide ses entrées avec `zod`** en tout premier
  (avant tout accès DB ou appel externe). Un schéma échoué → `400` avec
  message français générique côté client, détail dans `audit_log` côté
  serveur.

- **Chaque opération qui touche à l'argent est atomique** (transaction
  Postgres ou RPC `plpgsql` avec `SELECT ... FOR UPDATE` sur la ligne
  concernée) et **logge dans `audit_log`** (qui, quoi, combien, quand,
  IP, user-agent, `request_id`). Le log est append-only.

- **Les migrations SQL sont versionnées** dans `supabase/migrations/`
  avec préfixe timestamp `YYYYMMDDHHMMSS_slug.sql`. Jamais d'édition
  d'une migration déjà poussée en production ; on en écrit une nouvelle.

- **Toute opération qui débite un wallet verrouille d'abord
  `profiles(id)` avec `FOR UPDATE`** : les débits d'un même utilisateur
  sont sérialisés et le solde ne peut pas passer sous zéro.

- **Les écritures d'administration passent uniquement par les RPC
  `admin_*`** : elles appellent `require_admin()`, valident les entrées
  et journalisent avec `request_meta()` (IP, user-agent, request_id).

- **L'anti-abus vit dans les déclencheurs de `orders`** (erreurs
  `NF_*`), jamais dans le front. Passer une commande en `canceled` exige
  `canceled_by` (`user`, `system` ou `admin`) ; seules les annulations
  `user` sont limitées. Le parcours d'achat insère la commande **avant**
  d'appeler 5sim, pour que le garde-fou s'applique avant toute dépense.

- **Prix client : arithmétique entière exacte** (`src/lib/pricing.ts`),
  jamais de multiplication en flottant.

- **PostgREST renvoie au plus 1 000 lignes** : toute lecture d'une
  table qui peut dépasser ce volume se fait par pages avec `.range()`.

---

## Références techniques

- SasPay : base `https://api.saspay.me/api/v1`, auth
  `Authorization: Bearer sk_live_...`. Spec OpenAPI :
  `https://docs.saspay.me/api-reference/openapi.json`.
  `POST /checkout-sessions/` ignore `Idempotency-Key` (un double appel crée
  deux sessions) : l'idempotence des recharges repose sur
  `topups.idempotency_key` unique. Le webhook ne porte pas de metadata : la
  recharge se retrouve via `topups.saspay_session_id` et
  `GET /checkout-sessions/{id}/status/`.
- 5sim : base `https://5sim.net/v1`, auth
  `Authorization: Bearer <JWT>` + `Accept: application/json`. Doc :
  `https://5sim.net/docs`.
- Supabase : Edge Functions en Deno/TypeScript ; secrets dans
  `supabase secrets set` ; `service_role` uniquement dans les functions,
  jamais exposée au client.
