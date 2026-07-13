-- ============================================================
-- Storage — policies du bucket chateaux-images
--
-- Le bucket `chateaux-images` est cree MANUELLEMENT dans le Dashboard Supabase,
-- en PUBLIC (lecture publique activee). Cette migration ne cree pas le bucket ;
-- elle pose les regles d'acces sur storage.objects pour ce bucket.
--
-- Deux niveaux d'acces, calques sur le reste du projet :
--   - LECTURE publique : les images s'affichent sur le site public (vitrines),
--     donc n'importe qui peut les lire. Le SELECT n'est pas garde.
--   - ECRITURE reservee aux admins : televerser, remplacer ou supprimer une
--     image passe par public.is_admin() - la meme fonction qui garde le CRUD
--     des chateaux. Un non-admin ne peut rien ecrire dans le bucket.
--
-- Ces policies ne concernent QUE le bucket chateaux-images (filtre bucket_id
-- partout) : les autres buckets eventuels ne sont pas touches.
--
-- storage.objects a deja la RLS activee par Supabase (gestion native du
-- Storage) - on ne fait qu'ajouter des policies. Les policies Storage ne
-- supportent pas CREATE OR REPLACE : on DROP IF EXISTS avant chaque CREATE
-- pour l'idempotence.
-- ============================================================

-- Lecture publique des images du bucket (affichage sur le site public).
DROP POLICY IF EXISTS "chateaux_images_lecture_publique" ON storage.objects;
CREATE POLICY "chateaux_images_lecture_publique"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'chateaux-images' );

-- Televersement reserve aux admins.
DROP POLICY IF EXISTS "chateaux_images_insert_admin" ON storage.objects;
CREATE POLICY "chateaux_images_insert_admin"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'chateaux-images' AND public.is_admin() );

-- Mise a jour (remplacement) reservee aux admins.
DROP POLICY IF EXISTS "chateaux_images_update_admin" ON storage.objects;
CREATE POLICY "chateaux_images_update_admin"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'chateaux-images' AND public.is_admin() );

-- Suppression reservee aux admins.
DROP POLICY IF EXISTS "chateaux_images_delete_admin" ON storage.objects;
CREATE POLICY "chateaux_images_delete_admin"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'chateaux-images' AND public.is_admin() );
