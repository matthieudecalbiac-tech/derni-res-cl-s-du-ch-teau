// ═══════════════════════════════════════════════════════════════════════════
// chateauxService.js — Service de lecture châteaux Supabase-backed
// ═══════════════════════════════════════════════════════════════════════════
// Sprint S1-δ Phase 4.4 — Refactor depuis lecture src/data/chateaux.js
//
// ARCHITECTURE
//   - Cache global "all_chateaux" en Map mémoire (TTL 5 min)
//   - getChateaux({ excludeMocks }) charge tout, filtre côté client
//   - getChateauById/BySlug/Compteurs : lookups locaux après cache
//   - 1 seul round-trip Supabase pour servir N requêtes UI
//   - mapChateau() transforme rowSupabase → format React (Phase 4.3)
//
// API publique (drop-in replacement de l'ancien service)
//   - getChateaux({ excludeMocks })  → Promise<Chateau[]>
//   - getChateauById(id)             → Promise<Chateau | null>
//   - getChateauBySlug(slug)         → Promise<Chateau | null>
//   - getCompteurs({ excludeMocks }) → Promise<Compteurs>
//   - invalidateCache()              → void  (NEW pour S2 booking flow)
//
// SÉMANTIQUE excludeMocks
//   - false (défaut) : retourne TOUS les châteaux (8 en Sprint S1)
//   - true : exclut les châteaux de démonstration (isDemoMock)
//     (= Briottières + Blanc Buisson en S1, plus en S2+)
//
// DETTE TECHNIQUE NOTÉE
//   - chambresRestantes : null en Phase 4 (mapper Phase 4.3)
//   - Conséquence : compteurs.chambresRestantes = 0 (somme de nulls)
//   - Sera réparée S2 via RPC Supabase count_chambres_disponibles()
//
// ROBUSTESSE
//   - Erreurs Supabase loggées console.error + propagées au caller
//   - Cache miss après TTL → refresh transparent
//   - VITE_FAKE_LATENCY conservé pour DX (tests UI ralentis Phase 4.7)
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase.js";
import {
  mapChateau,
  mapAmenity,
  chateauToRow,
  chambreToRow,
  timelineToRow,
  alentourToRow,
  amenityToRow,
} from "./_mapping.js";


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS  = 5 * 60 * 1000;
const CACHE_KEY_ALL = "all_chateaux";

// SELECT avec auto-joins pour 1 round-trip
const SELECT_FULL = `
  *,
  chambres(*),
  chateau_timeline(*),
  chateau_alentours(*),
  chateau_amenities(*),
  offres(*)
`;


// ─────────────────────────────────────────────────────────────────────────────
// CACHE & HELPERS PRIVÉS
// ─────────────────────────────────────────────────────────────────────────────

// Cache module-level. 1 seule entrée 'all_chateaux' avec timestamp.
// Format : { data: Chateau[], cachedAt: number }
const _cache = new Map();

function _isCacheValid(entry) {
  return entry && (Date.now() - entry.cachedAt < CACHE_TTL_MS);
}

// VITE_FAKE_LATENCY (DX, conservé depuis l'ancien service Phase 2.3)
const FAKE_LATENCY_MS = (() => {
  const raw = import.meta.env.VITE_FAKE_LATENCY;
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
})();

async function _withFakeLatency() {
  if (FAKE_LATENCY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));
  }
}

/**
 * Helper : un château est "mock" s'il porte isDemoMock (stub de démonstration).
 * Centralisé ici pour éviter le hardcoding `id===1||id===2||...`
 * @param {Object} chateau - Château au format React (mappé)
 * @returns {boolean}
 */
function _isMock(chateau) {
  return chateau?.isDemoMock === true;
}

/**
 * Round-trip Supabase + mapping.
 *
 * Le filtre `statut = 'publie'` est explicite : la RLS l'accorderait aussi aux
 * brouillons d'un admin ou d'un châtelain, qui atterriraient alors dans le
 * cache global — non indexé sur la session — puis seraient resservis à un
 * visiteur anonyme pendant le reste du TTL. Le service dit ce qu'il veut ;
 * la RLS reste le filet.
 *
 * @returns {Promise<Object[]>} Tableau de châteaux mappés (format React).
 * @throws Si Supabase retourne une erreur.
 */
async function _fetchAllChateaux() {
  const { data, error } = await supabase
    .from("chateaux")
    .select(SELECT_FULL)
    .eq("statut", "publie")
    .order("est_la_une", { ascending: false })
    .order("nom", { ascending: true });

  if (error) {
    console.error("[chateauxService] Supabase error:", error);
    throw new Error(`Failed to fetch chateaux: ${error.message}`);
  }

  return (data ?? []).map(mapChateau).filter(Boolean);
}

/**
 * Récupère le tableau complet (cache si possible, sinon refresh).
 * Helper interne utilisé par toutes les fonctions publiques.
 * @returns {Promise<Object[]>}
 */
async function _getAllCached() {
  const cached = _cache.get(CACHE_KEY_ALL);
  if (_isCacheValid(cached)) {
    return cached.data;
  }
  const fresh = await _fetchAllChateaux();
  _cache.set(CACHE_KEY_ALL, {
    data: fresh,
    cachedAt: Date.now(),
  });
  return fresh;
}


// ─────────────────────────────────────────────────────────────────────────────
// API PUBLIQUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retourne tous les châteaux (avec jointures complètes).
 *
 * @param {Object} [options]
 * @param {boolean} [options.excludeMocks=false] - Si true, exclut les châteaux
 *   de démonstration (isDemoMock) — restent Briottières + Blanc Buisson en S1.
 * @returns {Promise<Object[]>}
 */
export async function getChateaux({ excludeMocks = false } = {}) {
  await _withFakeLatency();
  const all = await _getAllCached();
  return excludeMocks ? all.filter((c) => !_isMock(c)) : all;
}

/**
 * Retourne un château par UUID. Lookup local sur le cache.
 *
 * @param {string} id - UUID Supabase
 * @returns {Promise<Object | null>}
 */
export async function getChateauById(id) {
  if (!id) return null;
  await _withFakeLatency();
  const all = await _getAllCached();
  return all.find((c) => c.id === id) ?? null;
}

/**
 * Retourne un château par slug. Lookup local sur le cache.
 *
 * @param {string} slug - Slug humain (ex: "les-briottieres")
 * @returns {Promise<Object | null>}
 */
export async function getChateauBySlug(slug) {
  if (!slug) return null;
  await _withFakeLatency();
  const all = await _getAllCached();
  return all.find((c) => c.slug === slug) ?? null;
}

/**
 * Retourne les compteurs agrégés pour BandeauOffres.
 * Dérivé localement depuis le cache `getChateaux()` — pas de round-trip
 * Supabase supplémentaire.
 *
 * DETTE Phase 4.4 : `chambresRestantes` est 0 tant que le mapper retourne
 * null sur cette propriété. Sera réparée S2 via RPC
 * `count_chambres_disponibles()`.
 *
 * Phase 4.5 (option C) : retrait de `chambresUrgentes` — BandeauOffres
 * affiche maintenant un slogan fixe sans chiffre dynamique.
 *
 * @param {Object} [options]
 * @param {boolean} [options.excludeMocks=false]
 * @returns {Promise<{
 *   nbChateaux: number,
 *   nbVitrinesPremium: number,
 *   chambresRestantes: number,
 * }>}
 */
export async function getCompteurs({ excludeMocks = false } = {}) {
  const chateaux = await getChateaux({ excludeMocks });
  return {
    nbChateaux: chateaux.length,
    nbVitrinesPremium: chateaux.filter((c) => !_isMock(c)).length,
    // Dette Phase 4.4 — somme de nulls = 0 jusqu'à RPC S2
    chambresRestantes: chateaux.reduce(
      (sum, c) => sum + (c.chambresRestantes ?? 0),
      0
    ),
  };
}

/**
 * Invalide le cache. À appeler après une mutation Supabase
 * (réservation, update château) qui doit être visible immédiatement.
 *
 * Phase 4.4 expose cette fonction sans encore l'utiliser — pour S2
 * booking flow et S5 admin UI.
 *
 * @returns {void}
 */
export function invalidateCache() {
  _cache.clear();
}

/**
 * Lecture ADMIN — liste de TOUS les châteaux, tous statuts confondus
 * (brouillon, publie, archive), SANS cache.
 *
 * Volontairement distincte de getChateaux() :
 *   - getChateaux() filtre .eq("statut","publie") et met en cache global. Ce
 *     cache n'est PAS indexé sur la session ; y laisser entrer des brouillons
 *     les resservirait à un visiteur anonyme pendant le TTL. On ne passe donc
 *     jamais par lui ici.
 *   - Requête directe, colonnes de liste seulement (pas de jointures), jamais
 *     mise en cache. La RLS `is_admin()` autorise déjà un admin à voir tous les
 *     statuts ; un non-admin ne verrait que les publiés (défense en profondeur),
 *     l'écran étant de toute façon gardé par RequireRole admin.
 *
 * Retourne les lignes BRUTES Supabase (snake_case) — pas de mapChateau : une
 * liste n'a pas besoin de la forme React imbriquée.
 *
 * @returns {Promise<Array<{
 *   id: string, slug: string, nom: string, region: string,
 *   statut: string, is_demo_mock: boolean, est_la_une: boolean
 * }>>}
 * @throws Si Supabase retourne une erreur.
 */
export async function getChateauxAdmin() {
  const { data, error } = await supabase
    .from("chateaux")
    .select("id,slug,nom,region,statut,is_demo_mock,est_la_une")
    .order("nom", { ascending: true });

  if (error) {
    console.error("[chateauxService] getChateauxAdmin error:", error);
    throw new Error(`Failed to fetch chateaux (admin): ${error.message}`);
  }

  return data ?? [];
}

/**
 * ÉCRITURE ADMIN — met à jour un château (colonnes de la table `chateaux`).
 *
 * L'écriture part du client partagé `supabase` : en session admin, il porte le
 * JWT de l'admin, ce qui active la RLS `is_admin()` (policy UPDATE). Sans
 * session admin, la requête ne modifie aucune ligne (refus RLS silencieux).
 *
 * `champs` est transformé par chateauToRow en mode partiel : seules les clés
 * présentes deviennent des colonnes (pas d'écrasement des autres), et nom/slug
 * ne sont pas exigés (on modifie, on ne crée pas).
 *
 * @param {string} id - UUID du château à modifier.
 * @param {Object} champs - Champs à modifier, format React partiel.
 * @returns {Promise<Object>} La ligne `chateaux` modifiée (preuve de succès).
 * @throws Si id manquant, erreur Supabase, ou 0 ligne modifiée (refus RLS / id inconnu).
 */
export async function updateChateau(id, champs) {
  if (!id) throw new Error("updateChateau : id requis.");

  const row = chateauToRow(champs, { partial: true });

  const { data, error } = await supabase
    .from("chateaux")
    .update(row)
    .eq("id", id)
    .select();

  if (error) {
    console.error("[chateauxService] updateChateau error:", error);
    throw new Error(`Failed to update chateau ${id}: ${error.message}`);
  }

  // 0 ligne = pas d'erreur SQL mais rien de modifié : refus RLS silencieux
  // (session non-admin) ou id inexistant. On le dit clairement.
  if (!data || data.length === 0) {
    throw new Error(
      `updateChateau : 0 ligne modifiée pour ${id}. ` +
      `Refus RLS probable (session non-admin) ou id inexistant.`
    );
  }

  // Le cache public (getChateaux) doit oublier l'ancienne valeur.
  invalidateCache();

  return data[0];
}

/**
 * LECTURE ADMIN par id — un château complet, brouillon compris, pour l'édition.
 *
 * Distinct de getChateauById (qui passe par le cache public filtré `publie` et
 * ne verrait donc pas un brouillon). Ici : requête directe SELECT_FULL, sans
 * cache, sans filtre statut. La RLS `is_admin()` sert tous les statuts.
 *
 * mapChateau aplatit les amenities en 4 booléens ; pour l'édition on remplace
 * ces booléens par la LISTE pivot complète via mapAmenity (chambres / timeline /
 * alentours viennent déjà de mapChateau en forme éditable).
 *
 * @param {string} id - UUID du château.
 * @returns {Promise<Object>} Château format React + `amenities` (liste pivot).
 * @throws Si id manquant, erreur Supabase, ou château introuvable.
 */
export async function getChateauAdminById(id) {
  if (!id) throw new Error("getChateauAdminById : id requis.");

  const { data, error } = await supabase
    .from("chateaux")
    .select(SELECT_FULL)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[chateauxService] getChateauAdminById error:", error);
    throw new Error(`Failed to fetch chateau ${id} (admin): ${error.message}`);
  }
  if (!data) {
    throw new Error(`getChateauAdminById : chateau ${id} introuvable.`);
  }

  return {
    ...mapChateau(data),
    amenities: (data.chateau_amenities ?? [])
      .map(mapAmenity)
      .filter(Boolean)
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
  };
}

/**
 * ÉCRITURE ADMIN COMPLÈTE — un château + ses 4 filles en une transaction.
 *
 * Convertit chaque section (format React) en rows base via les mappers inverses,
 * puis appelle la RPC `admin_upsert_chateau` (atomique, gardée is_admin côté
 * base). Après succès, invalide le cache public.
 *
 * Contrat des sections filles (repris de la RPC) :
 *   - absente / null = section PRÉSERVÉE (la RPC ne la touche pas)
 *   - []             = section VIDÉE explicitement
 *   - [ ... ]        = section REMPLACÉE par ce jeu
 * Le formulaire envoie toujours l'état complet ; le contrat protège un oubli
 * côté service (un null n'efface jamais une fille par accident).
 *
 * `base` est requis (chateauToRow non-partiel : nom + slug obligatoires).
 *
 * @param {string} id - UUID du château à modifier.
 * @param {Object} sections - { base, chambres, timeline, alentours, amenities }.
 * @returns {Promise<string>} L'id du château modifié.
 * @throws Si id/base invalides, mapping fautif, ou erreur RPC (dont refus RLS 42501).
 */
export async function saveChateauComplet(id, sections = {}) {
  if (!id) throw new Error("saveChateauComplet : id requis.");

  const { base, chambres, timeline, alentours, amenities } = sections;

  const p_base = chateauToRow(base, { partial: false });
  // null = préserve (on n'envoie pas le tableau) ; [] = vide ; [...] = remplace.
  const p_chambres  = chambres  != null ? chambres.map((c, i) => chambreToRow(c, i))   : null;
  const p_timeline  = timeline  != null ? timeline.map((t, i) => timelineToRow(t, i))  : null;
  const p_alentours = alentours != null ? alentours.map((a, i) => alentourToRow(a, i)) : null;
  const p_amenities = amenities != null ? amenities.map((a, i) => amenityToRow(a, i))  : null;

  const { data, error } = await supabase.rpc("admin_upsert_chateau", {
    p_id: id,
    p_base,
    p_chambres,
    p_timeline,
    p_alentours,
    p_amenities,
  });

  if (error) {
    // Un non-admin déclenche le RAISE 42501 de la RPC → error non-null.
    console.error("[chateauxService] saveChateauComplet error:", error);
    throw new Error(`Failed to save chateau ${id}: ${error.message}`);
  }

  invalidateCache();
  return data ?? id;
}
