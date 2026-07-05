-- ============================================================
-- Donnees de TEST du Club des Chatelains (appliquees via Dashboard).
-- 3 reservations confirmees sur le compte de demonstration
-- (matthieudecalbiac, f5407c48...) -> compteur 3 -> palier "Habitue".
-- A NETTOYER quand les vraies reservations clients arriveront.
-- payout_status = 'pending' (Stripe non branche, pas de payout reel).
-- ============================================================
INSERT INTO public.reservations (
  id, user_id, chambre_id, module_id,
  date_arrivee, date_depart,
  prix_total_cents, commission_lcc_cents,
  status, cancellation_policy, payout_status,
  created_at, updated_at
)
VALUES
  (gen_random_uuid(), 'f5407c48-a0d4-4a2c-95e8-3b7fb809c994',
   'af5f5068-123d-541b-899c-ab3c1ca46c3e', '6c150030-e9c1-574f-8124-5e08eb2981d1',
   '2024-06-14', '2024-06-17', 96000, 13440,
   'confirmed', 'flexible', 'pending', '2024-05-01 10:00:00+00', now()),
  (gen_random_uuid(), 'f5407c48-a0d4-4a2c-95e8-3b7fb809c994',
   '8ec43bf5-4b9c-53e6-8361-d9624bff7f46', '6c150030-e9c1-574f-8124-5e08eb2981d1',
   '2024-11-08', '2024-11-10', 56000, 7840,
   'confirmed', 'flexible', 'pending', '2024-10-01 10:00:00+00', now()),
  (gen_random_uuid(), 'f5407c48-a0d4-4a2c-95e8-3b7fb809c994',
   'fd55a143-cdd3-5f9d-8dd4-56888b0b8ce4', '6c150030-e9c1-574f-8124-5e08eb2981d1',
   '2025-03-20', '2025-03-24', 116000, 16240,
   'confirmed', 'flexible', 'pending', '2025-02-15 10:00:00+00', now());
