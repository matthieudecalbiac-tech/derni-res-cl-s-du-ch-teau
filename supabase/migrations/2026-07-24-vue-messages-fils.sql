-- ============================================================
-- Vue messages_fils_admin — LISTE DES FILS pour l'écran /admin/messages.
-- À jouer dans Supabase Dashboard → SQL Editor.
--
-- POURQUOI UNE VUE. PostgREST ne sait pas faire de GROUP BY : « un fil par
-- user_id, avec son dernier message et son compte de non-lus » ne s'exprime pas
-- en .from("messages").select(...). L'agrégation doit exister côté base.
--
-- POURQUOI PAS UNE RPC. Une RPC serait SECURITY DEFINER et contournerait la RLS :
-- y omettre un is_admin() exposerait la correspondance privée de TOUS les
-- membres. Ici, security_invoker = true fait que la RLS s'applique avec les
-- droits de l'appelant — messages_select (user_id = auth.uid() OR is_admin()) et
-- users_select_self (auth.uid() = id OR is_admin()). Il n'y a donc AUCUNE garde
-- à écrire, donc aucune garde à oublier. C'est aussi le précédent maison :
-- reservations_client_view et reservations_chatelain_view sont toutes deux en
-- security_invoker = true, et les RPC du projet sont réservées aux ÉCRITURES
-- (repondre_demande, annuler_ma_reservation) ou aux scalaires dérivés
-- (count_sejours_confirmes, palier_du_membre). Une liste de fils est une lecture.
--
-- LE DERNIER MESSAGE EN UNE PASSE : (array_agg(... ORDER BY created_at DESC))[1]
-- récupère la dernière valeur dans le MÊME parcours que les compteurs — pas de
-- LATERAL, pas de second scan, ça reste un GROUP BY plat.
--
-- dernier_contenu est renvoyé ENTIER : tronquer en SQL figerait une décision de
-- présentation dans la base. L'écran tronque en CSS.
--
-- a_non_lus (booléen) existe pour le TRI. Trier par non_lus DESC ne donnerait pas
-- la règle voulue : un fil à 3 non-lus d'il y a une semaine passerait devant un
-- fil à 1 non-lu de ce matin. Avec le booléen, l'écran fait
-- ORDER BY a_non_lus DESC, dernier_at DESC — « non-lus d'abord, PUIS par date ».
--
-- Idempotent : CREATE OR REPLACE VIEW + GRANT idempotent.
-- ============================================================

CREATE OR REPLACE VIEW public.messages_fils_admin
WITH (security_invoker = true) AS
SELECT
  m.user_id,
  u.email,
  u.full_name,
  count(*) FILTER (WHERE m.expediteur = 'membre' AND m.lu_le IS NULL)      AS non_lus,
  count(*) FILTER (WHERE m.expediteur = 'membre' AND m.lu_le IS NULL) > 0  AS a_non_lus,
  max(m.created_at)                                        AS dernier_at,
  (array_agg(m.contenu    ORDER BY m.created_at DESC))[1]  AS dernier_contenu,
  (array_agg(m.expediteur ORDER BY m.created_at DESC))[1]  AS dernier_expediteur
FROM public.messages m
JOIN public.users u ON u.id = m.user_id
GROUP BY m.user_id, u.email, u.full_name;

COMMENT ON VIEW public.messages_fils_admin IS
  'Liste des fils de la messagerie du Club, un par membre, pour l''ecran /admin/messages. security_invoker=true : la RLS fait le filtrage (messages_select + users_select_self) — l''admin voit tous les fils, sans aucune garde applicative. Expose email et full_name : donnee personnelle assumee, l''admin doit savoir a qui il parle ; d''ou le suffixe _admin. dernier_expediteur dit si la balle est dans le camp de LCC. dernier_contenu est ENTIER (la troncature est une decision d''affichage, faite en CSS). a_non_lus sert le tri « non-lus d''abord PUIS par date », que non_lus DESC ne donnerait pas. LIMITE 1 : l''agregat parcourt messages a chaque appel, sans index dedie — sans objet a l''echelle actuelle (quelques membres), a revoir si le volume croit ; les index existants (messages_fil_idx, messages_non_lus_idx) servent le fil ouvert, pas cette agregation. LIMITE 2 : un membre NON-admin qui interrogerait cette vue y verrait sa propre ligne — ce n''est pas une fuite (c''est son fil), c''est un comportement a connaitre.';

GRANT SELECT ON public.messages_fils_admin TO authenticated;

-- ── Vérification (lecture seule) ──
-- ⚠ NE valide PAS le filtrage RLS en SQL Editor : postgres BYPASSE la RLS et
-- verrait tous les fils. Le vrai test se fait AUTHENTIFIÉ (via l'app), en admin
-- puis en membre ordinaire. Ici on contrôle la forme de la vue :
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'messages_fils_admin'
ORDER BY ordinal_position;
