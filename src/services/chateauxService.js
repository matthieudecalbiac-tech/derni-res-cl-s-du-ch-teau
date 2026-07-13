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
import { mapChateau } from "./_mapping.js";


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
