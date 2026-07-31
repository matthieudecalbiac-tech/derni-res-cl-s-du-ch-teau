// ═══════════════════════════════════════════════════════════════════════════
// LCC — SERVICE COMMISSIONS ADMIN (écran /admin/commissions)
// ═══════════════════════════════════════════════════════════════════════════
// Le premier accès du front à `chateau_modules` : jusqu'ici, un grep sur src/
// n'en trouvait aucun. Le taux se posait en SQL manuel, et deux châteaux
// publiés ont encaissé 0 % sans que rien ne le signale.
//
// LECTURE : trois SELECT via le client PARTAGÉ (session de l'admin), donc la
// RLS s'applique avec SES droits. La policy chateau_modules_select_chatelain_admin
// autorise `is_admin()` sur la table complète, commission comprise — c'est
// exactement ce qu'on veut voir ici, et personne d'autre ne le verra. On ne pose
// AUCUN .eq() de sécurité : il ne protégerait rien qui ne le soit déjà et
// laisserait croire que la garde est côté JS.
//
// ÉCRITURE : admin_set_commission, appelée en DIRECT via le client partagé et
// surtout pas par service_role — la garde interne de la RPC lit auth.uid(), il
// faut donc que le JWT de l'admin voyage. Même raisonnement que
// reservationsAdminService.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase.js";
import { logErreurSupabase } from "../utils/logSupabase.js";

/**
 * Le référentiel des modules (A, B, C, D), trié par code.
 *
 * `est_actif` est celui du RÉFÉRENTIEL, à ne pas confondre avec le est_actif de
 * chateau_modules : ici il dit « ce module est ouvert à la commercialisation »
 * (D ne l'est pas, il est reporté en Phase 7), là il dit « ce château vend ce
 * module ». L'écran grise les modules du premier cas.
 */
export async function getModules() {
  const { data, error, status } = await supabase
    .from("modules")
    .select("id, code, nom, commission_min_pct, commission_max_pct, est_actif")
    .order("code", { ascending: true });

  if (error) {
    logErreurSupabase("[commissionService] getModules:", error, status);
    throw error;
  }
  return data ?? [];
}

/**
 * Tous les châteaux, brouillons COMPRIS — publiés d'abord, puis par nom.
 *
 * Le relevé ne se limite pas aux publiés : un taux se règle AVANT la mise en
 * ligne, sans quoi on reproduit exactement la panne qu'on cherche à empêcher.
 * Le statut voyage pour que l'écran distingue l'urgent du préparatoire.
 */
export async function getChateauxPourCommissions() {
  const { data, error, status } = await supabase
    .from("chateaux")
    .select("id, nom, slug, statut")
    .order("nom", { ascending: true });

  if (error) {
    logErreurSupabase("[commissionService] getChateauxPourCommissions:", error, status);
    throw error;
  }
  return data ?? [];
}

/**
 * Les liaisons existantes. UNIQUEMENT celles qui existent — une combinaison
 * (château × module) absente ne renvoie pas de ligne, et c'est une information :
 * « ligne absente » et « ligne à taux NULL » sont deux états différents, avec
 * deux conséquences différentes côté réservation. L'écran ne les confond pas.
 */
export async function getLiaisonsModules() {
  const { data, error, status } = await supabase
    .from("chateau_modules")
    .select("id, chateau_id, module_id, est_actif, commission_pct_negociee");

  if (error) {
    logErreurSupabase("[commissionService] getLiaisonsModules:", error, status);
    throw error;
  }
  return data ?? [];
}

/**
 * Pose le taux et l'activation d'un couple (château × module).
 *
 * INSERT-ou-UPDATE atomique côté base : la ligne est créée si elle manque. Le
 * taux est libre (0-100, seul le CHECK s'applique — pas de contrôle contre la
 * fourchette du module, qui n'est qu'indicative) et `null` est permis : c'est la
 * désassignation, la seule façon de corriger une ligne posée par erreur.
 *
 * @param {string} chateauId
 * @param {string} moduleId
 * @param {number|null} pct - Taux en pourcentage, ou null pour désassigner.
 * @param {boolean} estActif
 * @returns {Promise<{chateau_id, module_id, commission_pct_negociee, est_actif}>}
 */
export async function setCommission(chateauId, moduleId, pct, estActif) {
  const { data, error, status } = await supabase.rpc("admin_set_commission", {
    p_chateau_id: chateauId,
    p_module_id: moduleId,
    p_pct: pct,
    p_est_actif: estActif,
  });

  if (error) {
    logErreurSupabase("[commissionService] setCommission:", error, status);
    // 23514 = violation du CHECK chateau_modules_commission_valide. La RPC ne
    // pré-valide PAS le taux (décision : liberté totale sur ce qui a été
    // négocié), donc c'est ici que l'erreur Postgres devient une phrase.
    if (error.code === "23514") {
      throw new Error("Le taux doit être un nombre entre 0 et 100.");
    }
    throw error;
  }
  // RETURNS TABLE → PostgREST renvoie un tableau ; on normalise sur la première.
  return Array.isArray(data) ? data[0] : data;
}
