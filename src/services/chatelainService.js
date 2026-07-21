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

// Demandes de séjour des châteaux du châtelain courant, plus récente arrivée en
// tête. La vue n'expose ni user_id ni contact client (LCC intermédiaire).
export async function getDemandesChatelain() {
  const { data, error } = await supabase
    .from("reservations_chatelain_view")
    .select(
      "id, chambre_id, chambre_nom, chateau_nom, chateau_slug, date_arrivee, date_depart, voyageurs, message, prix_total_cents, commission_lcc_cents, status, created_at",
    )
    .order("date_arrivee", { ascending: false });
  if (error) {
    console.error("[chatelainService] getDemandesChatelain:", error);
    throw error;
  }
  return data ?? [];
}
