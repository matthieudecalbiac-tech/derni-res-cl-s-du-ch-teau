// ═══════════════════════════════════════════════════════════════════════════
// LCC — SERVICE RÉSERVATIONS ADMIN (écran /admin/reservations)
// ═══════════════════════════════════════════════════════════════════════════
// Lecture seule. Deux vues, deux fonctions, aucune écriture — le durcissement
// du 23 juillet a retiré INSERT et UPDATE à `authenticated` sur reservations,
// et cette brique ne rouvre AUCUN chemin d'écriture.
//
// Passe par le client supabase PARTAGÉ (session de l'admin) : ce sont les vues
// en security_invoker qui filtrent, via la RLS, avec les droits de l'appelant.
// On ne met donc AUCUN .eq() de sécurité ici — il ne protégerait rien qui ne le
// soit déjà, et laisserait croire que la garde est côté JS.
// Modèle : chatelainService.getDemandesChatelain.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase.js";
import { logErreurSupabase } from "../utils/logSupabase.js";

// Colonnes de reservations_admin_view. Listées explicitement plutôt que "*" :
// une colonne ajoutée à la vue demain n'arrivera pas en douce dans le bundle.
const COLONNES_LISTE =
  "id, chambre_id, chambre_nom, chateau_id, chateau_nom, chateau_slug, " +
  "client_email, client_nom, date_arrivee, date_depart, voyageurs, message, " +
  "prix_total_cents, commission_lcc_cents, status, created_at, " +
  "cancelled_at, cancellation_reason";

// Toutes les réservations, tous châteaux, arrivée la plus récente en tête.
// Le tri est celui de getDemandesChatelain : la date d'arrivée est ce que
// l'exploitation regarde, pas la date de création de la demande.
export async function getReservationsAdmin() {
  const { data, error, status } = await supabase
    .from("reservations_admin_view")
    .select(COLONNES_LISTE)
    .order("date_arrivee", { ascending: false });

  if (error) {
    logErreurSupabase("[reservationsAdminService] getReservationsAdmin:", error, status);
    throw error;
  }
  return data ?? [];
}

// Agrégats par (château, statut). L'écran ré-agrège lui-même : la vue reste
// factuelle, c'est l'affichage qui décide ce qui compte comme revenu.
//
// Les sommes sont en CENTIMES et arrivent d'un sum() Postgres (bigint). On ne
// convertit pas ici — la conversion en euros appartient au rendu.
export async function getStatsAdmin() {
  const { data, error, status } = await supabase
    .from("reservations_stats_admin")
    .select("chateau_id, chateau_nom, status, nb, somme_prix_cents, somme_commission_cents");

  if (error) {
    logErreurSupabase("[reservationsAdminService] getStatsAdmin:", error, status);
    throw error;
  }
  return data ?? [];
}
