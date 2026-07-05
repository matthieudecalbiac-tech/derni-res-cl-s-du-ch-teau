import { supabase } from "../lib/supabase.js";

// ============================================================
// Service du Club des Chatelains.
// Lit, pour l'utilisateur CONNECTE, tout ce que l'espace membre affiche :
// profil, nb de sejours confirmes, palier derive, reservations, progression,
// grille des paliers. Le palier n'est jamais stocke : il vient des fonctions
// Postgres count_sejours_confirmes() / palier_du_membre() (infalsifiable).
//
// SECURITE : les RLS garantissent qu'un user ne lit que SES reservations.
// On passe toujours l'id de l'utilisateur connecte, jamais un id arbitraire.
// ============================================================

// Grille complete des paliers (referentiel public, ordonne par rang).
export async function getPaliers() {
  const { data, error } = await supabase
    .from("paliers")
    .select("*")
    .order("rang", { ascending: true });
  if (error) {
    console.error("[clubService] getPaliers:", error);
    throw error;
  }
  return data ?? [];
}

// Nombre de sejours confirmes d'un utilisateur (via RPC).
export async function getNbSejoursConfirmes(userId) {
  if (!userId) return 0;
  const { data, error } = await supabase.rpc("count_sejours_confirmes", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[clubService] getNbSejoursConfirmes:", error);
    throw error;
  }
  return typeof data === "number" ? data : 0;
}

// Palier courant derive (via RPC). Renvoie la ligne paliers ou null.
export async function getPalierCourant(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.rpc("palier_du_membre", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[clubService] getPalierCourant:", error);
    throw error;
  }
  // rpc sur une fonction RETURNS table_row renvoie soit un objet, soit un
  // tableau d'un element selon le cas : on normalise.
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

// Reservations de l'utilisateur (RLS : seulement les siennes), triees par
// date d'arrivee decroissante. Jointure vers chambre + chateau pour l'affichage.
export async function getMesReservations(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("reservations")
    .select(`
      id, date_arrivee, date_depart, prix_total_cents, status,
      chambre:chambre_id ( id, nom, chateau:chateau_id ( id, nom, slug, region ) )
    `)
    .eq("user_id", userId)
    .order("date_arrivee", { ascending: false });
  if (error) {
    console.error("[clubService] getMesReservations:", error);
    throw error;
  }
  return data ?? [];
}

// Calcule la progression vers le palier suivant a partir du nb de sejours
// et de la grille. Renvoie { palierActuel, palierSuivant, sejoursRestants, ... }.
export function calculerProgression(nbSejours, paliers, palierActuel) {
  if (!paliers || paliers.length === 0) {
    return { palierActuel, palierSuivant: null, sejoursRestants: 0, progressionPct: 100 };
  }
  const rangActuel = palierActuel?.rang ?? 0;
  const palierSuivant = paliers.find((p) => p.rang === rangActuel + 1) ?? null;
  if (!palierSuivant) {
    // palier max atteint
    return { palierActuel, palierSuivant: null, sejoursRestants: 0, progressionPct: 100 };
  }
  const seuilActuel = palierActuel?.seuil_sejours ?? 0;
  const seuilSuivant = palierSuivant.seuil_sejours;
  const sejoursRestants = Math.max(0, seuilSuivant - nbSejours);
  const plage = seuilSuivant - seuilActuel;
  const fait = nbSejours - seuilActuel;
  const progressionPct = plage > 0 ? Math.min(100, Math.round((fait / plage) * 100)) : 100;
  return { palierActuel, palierSuivant, sejoursRestants, progressionPct };
}

// Agrege TOUT ce dont l'espace Club a besoin en un seul appel.
export async function getEspaceClub(userId) {
  if (!userId) return null;
  const [paliers, nbSejours, palierActuel, reservations] = await Promise.all([
    getPaliers(),
    getNbSejoursConfirmes(userId),
    getPalierCourant(userId),
    getMesReservations(userId),
  ]);
  const progression = calculerProgression(nbSejours, paliers, palierActuel);
  return {
    paliers,
    nbSejours,
    palierActuel,
    reservations,
    progression,
  };
}
