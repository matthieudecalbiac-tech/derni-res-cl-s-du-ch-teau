// ═══════════════════════════════════════════════════════════════════════════
// LCC — SERVICE CHÂTELAIN (espace propriétaire)
// ═══════════════════════════════════════════════════════════════════════════
// Lecture des demandes de séjour d'un châtelain. Passe par la vue
// reservations_chatelain_view via le client supabase PARTAGÉ (session du
// châtelain) : la RLS reservations_select_owner filtre par château. On ne met
// donc PAS de .eq("user_id", ...) — ce n'est pas l'utilisateur qui filtre, c'est
// le lien chateau_owners (RLS). Modèle : clubService.getMesReservations.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase.js";
import { logErreurSupabase } from "../utils/logSupabase.js";

// Code porté par l'Error levée quand la RPC refuse une demande déjà traitée
// (garde `status = pending`). L'appelant teste CE code, jamais un message : le
// libellé affiché appartient à l'UI, pas au service.
export const ERR_DEJA_TRAITEE = "DEMANDE_DEJA_TRAITEE";

// Demandes de séjour des châteaux du châtelain courant, plus récente arrivée en
// tête. La vue n'expose ni user_id ni contact client (LCC intermédiaire).
export async function getDemandesChatelain() {
  const { data, error, status } = await supabase
    .from("reservations_chatelain_view")
    .select(
      "id, chambre_id, chambre_nom, chateau_nom, chateau_slug, date_arrivee, date_depart, voyageurs, message, prix_total_cents, commission_lcc_cents, status, created_at",
    )
    .order("date_arrivee", { ascending: false });
  if (error) {
    logErreurSupabase("[chatelainService] getDemandesChatelain:", error, status);
    throw error;
  }
  return data ?? [];
}

// Réponse du châtelain à une demande : decision = "accepter" | "refuser".
//
// Appel DIRECT de la RPC via le client PARTAGÉ — surtout pas une Edge Function :
// c'est le JWT du châtelain qui doit voyager, pour qu'auth.uid() reste LUI côté
// Postgres. repondre_demande est SECURITY DEFINER, mais sa garde interne
// is_chatelain_of(chateau) lit auth.uid() : passer par une Edge Function
// (service_role) ferait sauter cette garde ou obligerait à la réimplémenter.
//
// La RPC est RETURNS TABLE -> PostgREST renvoie un tableau de lignes. Même
// normalisation que clubService.getPalierCourant.
//
// L'email au voyageur n'est PAS envoyé ici : la RPC écrit une ligne email_log
// 'en_attente' (outbox) dans la même transaction que le statut. Cf. le
// commentaire du dashboard sur le drain.
export async function repondreDemande(reservationId, decision) {
  const { data, error, status } = await supabase.rpc("repondre_demande", {
    p_reservation_id: reservationId,
    p_decision: decision,
  });

  if (error) {
    logErreurSupabase("[chatelainService] repondreDemande:", error, status);
    // La RPC lève 4 exceptions, chacune avec son ERRCODE : P0002 introuvable,
    // 42501 pas le châtelain, 22023 décision invalide, et P0001 UNIQUEMENT pour
    // la garde "déjà traitée". On discrimine donc sur le code (stable), pas sur
    // le message (accentué côté SQL, et susceptible de bouger).
    if (error.code === "P0001") {
      const dejaTraitee = new Error("Demande déjà traitée.");
      dejaTraitee.code = ERR_DEJA_TRAITEE;
      throw dejaTraitee;
    }
    throw error;
  }

  const ligne = Array.isArray(data) ? data[0] : data;
  if (!ligne) throw new Error("repondreDemande : réponse vide de la RPC.");
  return {
    reservation_id: ligne.reservation_id,
    nouveau_statut: ligne.nouveau_statut,
  };
}
