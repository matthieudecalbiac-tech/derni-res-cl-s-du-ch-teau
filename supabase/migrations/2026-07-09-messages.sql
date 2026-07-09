-- ============================================================
-- Messagerie du Club : un fil unique par membre, entre lui et l'equipe LCC.
-- Pas de table de conversation : le fil d'un membre est l'ensemble des
-- messages dont il est le proprietaire (user_id). Le destinataire se deduit
-- de l'expediteur, dans une conversation a deux.
-- Les chatelains n'y ont aucun acces.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Le membre a qui appartient le fil (pas forcement l'auteur du message).
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Qui a ecrit : le membre, ou l'equipe LCC.
  expediteur  text NOT NULL CHECK (expediteur IN ('membre', 'equipe')),
  contenu     text NOT NULL CHECK (length(trim(contenu)) > 0),
  -- Date de lecture par le DESTINATAIRE (null = non lu).
  lu_le       timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Le fil se lit toujours par membre, du plus ancien au plus recent.
CREATE INDEX IF NOT EXISTS messages_fil_idx
  ON public.messages (user_id, created_at);

-- Le compteur de non-lus interroge ce sous-ensemble.
CREATE INDEX IF NOT EXISTS messages_non_lus_idx
  ON public.messages (user_id, expediteur)
  WHERE lu_le IS NULL;

-- ── Acces ────────────────────────────────────────────────────
-- Les GRANT ouvrent la table au role ; les policies filtrent les lignes.
-- Sans GRANT, la RLS n'est meme pas evaluee (erreur 42501).
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Lecture : le membre voit son fil, l'admin voit tout.
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
  FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Ecriture : un membre ne peut ecrire que DANS SON FIL et SIGNE "membre".
-- Sans cette double garde, il pourrait se forger une reponse de l'equipe.
-- L'admin ecrit dans n'importe quel fil, signe "equipe".
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND expediteur = 'membre')
    OR (is_admin() AND expediteur = 'equipe')
  );

-- Marquage "lu" : chacun ne marque que ce qu'il RECOIT.
-- Le membre marque les messages de l'equipe dans son fil ; l'admin marque
-- ceux des membres. Un membre ne peut pas effacer la trace que l'equipe a
-- lu son message. Aucun champ autre que lu_le n'a de sens ici : la clause
-- WITH CHECK empeche de changer l'appartenance ou l'expediteur.
DROP POLICY IF EXISTS messages_update_lu ON public.messages;
CREATE POLICY messages_update_lu ON public.messages
  FOR UPDATE
  USING (
    (user_id = auth.uid() AND expediteur = 'equipe')
    OR (is_admin() AND expediteur = 'membre')
  )
  WITH CHECK (
    (user_id = auth.uid() AND expediteur = 'equipe')
    OR (is_admin() AND expediteur = 'membre')
  );

-- Suppression : personne. Un message envoye ne s'efface pas.
-- (Aucune policy DELETE, et pas de GRANT DELETE : double verrou.)

-- ── Durcissement des privileges ──────────────────────────────
-- Supabase accorde par defaut de larges privileges aux roles anon et
-- authenticated sur toute nouvelle table. Un visiteur n'a rien a faire dans
-- une correspondance privee : on lui retire tout acces, pour qu'il bute sur
-- le privilege avant meme d'atteindre la RLS (erreur 42501, verifiee).
REVOKE ALL ON public.messages FROM anon;

-- Un message envoye ne s'efface pas cote client.
REVOKE DELETE, TRUNCATE ON public.messages FROM authenticated;
