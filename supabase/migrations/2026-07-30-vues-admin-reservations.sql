-- ============================================================
-- Vues reservations_admin_view + reservations_stats_admin — LECTURE de l'écran
-- /admin/reservations (brique 1/2 : lecture + chiffres, aucune action).
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- ── CE QUE CETTE MIGRATION N'EST PAS ────────────────────────
-- Aucune RPC, aucune policy, aucun GRANT d'écriture. Le durcissement du
-- 23 juillet (2026-07-23-reservations-durcissement.sql) a retiré INSERT et
-- UPDATE à `authenticated` et assumé le DROP de reservations_update_admin :
-- « qui voudra un back-office d'ecriture sur les reservations devra poser
-- SCIEMMENT un chemin ». Cette migration ne le pose PAS. Elle ne fait que
-- LIRE, et rien de ce qu'elle ajoute ne peut écrire.
--
-- ── POURQUOI DES VUES, ET PAS DES EMBEDS PostgREST ──────────
-- Pour reservations_admin_view, l'embed marcherait : les FK existent et la RLS
-- autorise déjà l'admin partout (cf. ci-dessous). Le choix n'est donc PAS
-- sécuritaire, il est de rangement — la liste des colonnes que l'admin voit est
-- une décision, et elle mérite un endroit unique et commenté plutôt qu'une
-- chaîne .select() au fond d'un service JS. Les deux autres publics de cette
-- table (client, châtelain) passent déjà par une vue : un troisième public en
-- embed direct casserait la symétrie sans rien gagner.
--
-- Pour reservations_stats_admin, il n'y a pas de choix : PostgREST ne sait pas
-- faire de GROUP BY. count + sum PAR statut doit exister côté base.
--
-- ── POURQUOI PAS UNE RPC POUR LES CHIFFRES ──────────────────
-- Règle maison, posée dans 2026-07-24-vue-messages-fils.sql : les RPC du projet
-- sont réservées aux ÉCRITURES (repondre_demande, annuler_ma_reservation) ou
-- aux scalaires dérivés (count_sejours_confirmes, palier_du_membre). Un tableau
-- count/sum par statut est une LECTURE agrégée. Et une RPC serait SECURITY
-- DEFINER : y oublier un is_admin() exposerait le chiffre d'affaires de LCC.
-- Avec security_invoker = true il n'y a AUCUNE garde à écrire, donc aucune à
-- oublier — c'est la RLS de reservations qui filtre, avec les droits de
-- l'appelant.
--
-- ── LA VUE NE TRANCHE PAS CE QU'EST UN REVENU ───────────────
-- prix_total_cents est NOT NULL CHECK > 0 sur TOUTES les lignes, 'cancelled'
-- comprises. Un SUM global additionnerait donc des séjours annulés et des
-- demandes jamais confirmées avec du revenu réel — un total faux, et faux dans
-- le sens flatteur. La vue reste FACTUELLE : elle donne les sommes par statut,
-- crûment, sans décider lesquelles comptent. C'est l'écran qui fait le sens
-- (réalisé / potentiel / perdu). Le jour où « chiffre d'affaires potentiel »
-- devra être distingué du « réalisé », la donnée est déjà là.
--
-- ── LIRE LE STATUT, NE PRÉSUMER AUCUN PARCOURS ──────────────
-- Rien ici ne suppose qu'une réservation soit passée par 'pending'. Une
-- réservation instantanée future naîtra 'confirmed' directement : elle sera
-- comptée dans son groupe, sans traitement particulier. Aucune reconstitution
-- d'historique, aucun ordre de statuts codé en dur.
--
-- Idempotent : CREATE OR REPLACE VIEW + GRANT idempotent.
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 1. reservations_admin_view — la liste
-- ═══════════════════════════════════════════════════════════
-- security_invoker = true : trois RLS font le filtrage avec les droits de
-- l'appelant, et aucune n'a besoin d'être rappelée ici —
--   • reservations_select_owner  (user_id = auth.uid() OR châtelain OR is_admin())
--   • users_select_self          (auth.uid() = id OR is_admin())
--   • chateaux_select_public     (statut='publie' OR is_chatelain_of OR is_admin())
--
-- Les JOIN ne droppent aucune ligne légitime pour un admin : chambres est en
-- USING (true), et chateaux comme users incluent is_admin(). Une réservation
-- portant sur un château en BROUILLON reste donc visible — c'est voulu, l'admin
-- doit voir l'exploitation entière et pas seulement la vitrine publiée.
--
-- PAS de stripe_* ni payout_* : ces colonnes existent au schéma mais aucun code
-- ne les écrit (Stripe n'est pas branché). Les exposer aujourd'hui afficherait
-- des NULL dans un tableau et laisserait croire à une information manquante.
-- Elles s'ajouteront quand elles porteront quelque chose.

CREATE OR REPLACE VIEW public.reservations_admin_view
WITH (security_invoker = true) AS
SELECT
  r.id,
  r.chambre_id,
  ch.nom                 AS chambre_nom,
  ch.chateau_id,
  c.nom                  AS chateau_nom,
  c.slug                 AS chateau_slug,
  u.email                AS client_email,
  u.full_name            AS client_nom,
  r.date_arrivee,
  r.date_depart,
  r.voyageurs,
  r.message,
  r.prix_total_cents,
  r.commission_lcc_cents,
  r.status,
  r.created_at,
  r.cancelled_at,
  r.cancellation_reason
FROM public.reservations r
JOIN public.chambres ch ON ch.id = r.chambre_id
JOIN public.chateaux c  ON c.id  = ch.chateau_id
JOIN public.users    u  ON u.id  = r.user_id;

COMMENT ON VIEW public.reservations_admin_view IS
  'Liste des reservations pour l''ecran /admin/reservations, tous chateaux confondus. security_invoker=true : la RLS fait le filtrage (reservations_select_owner + users_select_self + chateaux_select_public), l''admin voit tout sans aucune garde applicative. Expose client_email et client_nom : donnee personnelle assumee, l''admin est l''intermediaire et doit savoir qui reserve — d''ou le suffixe _admin. N''expose PAS stripe_* ni payout_* : colonnes inertes tant que Stripe n''est pas branche, elles n''afficheraient que des NULL. Inclut les reservations portant sur un chateau en brouillon (chateaux_select_public inclut is_admin()) : l''admin voit l''exploitation, pas la vitrine. LIMITE : un NON-admin qui interrogerait cette vue y verrait ses propres reservations, jamais celles des autres — ce n''est pas une fuite (ce sont les siennes), c''est un comportement a connaitre ; le JOIN sur users, filtre par users_select_self, suffit a l''y borner.';

GRANT SELECT ON public.reservations_admin_view TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- 2. reservations_stats_admin — les chiffres
-- ═══════════════════════════════════════════════════════════
-- Groupé par (chateau_id, status) : cette granularité porte LES DEUX
-- ventilations en un seul aller-retour. L'écran ré-agrège par statut (bande de
-- chiffres) ou par château, sans requête supplémentaire. Deux vues séparées
-- coûteraient deux requêtes pour la même information.
--
-- PAS de JOIN sur users, contrairement à la vue précédente : les chiffres n'ont
-- pas besoin du contact client. Conséquence à connaître — un CHÂTELAIN qui
-- interrogerait cette vue y verrait les agrégats de SES châteaux, commission
-- comprise. Ce n'est pas une fuite : reservations_chatelain_view lui expose
-- déjà commission_lcc_cents ligne à ligne (décision Matthieu, non secrète pour
-- lui). Un client, lui, ne verrait que ses propres réservations agrégées.
--
-- sum() sur integer renvoie un bigint : aucun risque de débordement sur ces
-- montants. La conversion cents -> euros n'est PAS faite ici — elle appartient
-- a l'affichage (centsToEuros, cote JS), comme partout ailleurs dans le projet.
-- Aucun groupe ne peut être vide, donc aucune somme ne peut être NULL.

CREATE OR REPLACE VIEW public.reservations_stats_admin
WITH (security_invoker = true) AS
SELECT
  ch.chateau_id,
  c.nom                        AS chateau_nom,
  r.status,
  count(*)                     AS nb,
  sum(r.prix_total_cents)      AS somme_prix_cents,
  sum(r.commission_lcc_cents)  AS somme_commission_cents
FROM public.reservations r
JOIN public.chambres ch ON ch.id = r.chambre_id
JOIN public.chateaux c  ON c.id  = ch.chateau_id
GROUP BY ch.chateau_id, c.nom, r.status;

COMMENT ON VIEW public.reservations_stats_admin IS
  'Agregats des reservations par (chateau, statut) pour l''ecran /admin/reservations : nb, somme des prix, somme des commissions LCC. PostgREST ne sait pas faire de GROUP BY — d''ou la vue. security_invoker=true : la RLS reservations_select_owner filtre avec les droits de l''appelant, aucune garde applicative (une RPC SECURITY DEFINER exposerait le chiffre d''affaires de LCC si l''on y oubliait is_admin()). VOLONTAIREMENT FACTUELLE : elle ne decide PAS ce qui compte comme revenu. prix_total_cents est renseigne sur TOUTES les lignes, cancelled comprises ; un total global melangerait donc du revenu reel, du potentiel et du perdu. L''ecran separe realise (confirmed+completed) / attente (pending) / annule (cancelled). Granularite (chateau, statut) : porte les deux ventilations en une requete. Montants en CENTIMES, la conversion appartient a l''affichage. Un chatelain y verrait les agregats de ses chateaux (commission comprise, deja visible pour lui via reservations_chatelain_view) ; un client, les siens.';

GRANT SELECT ON public.reservations_stats_admin TO authenticated;


-- ============================================================
-- VÉRIFICATION (lecture seule)
-- ============================================================
-- ⚠ NE valide PAS le filtrage RLS en SQL Editor : postgres BYPASSE la RLS et
-- verrait TOUTES les lignes quel que soit le role. Le vrai test se fait
-- AUTHENTIFIÉ via l'app — en admin (voit tout), puis en membre ordinaire (ne
-- doit voir que ses propres reservations). Ici on ne controle que la forme.

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('reservations_admin_view', 'reservations_stats_admin')
ORDER BY table_name, ordinal_position;

-- Les deux vues doivent etre en security_invoker (reloptions le montre).
SELECT c.relname, c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('reservations_admin_view', 'reservations_stats_admin');

-- Coherence : la somme des nb par statut doit egaler le total des reservations
-- visibles par l'appelant.
SELECT status, sum(nb) AS nb_total
FROM public.reservations_stats_admin
GROUP BY status
ORDER BY status;
