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
  mapPersonnageFiche,
  chateauToRow,
  chambreToRow,
  timelineToRow,
  alentourToRow,
  amenityToRow,
  personnageToRow,
} from "./_mapping.js";
import { cheminStorageDepuisUrl } from "../utils/storageUrl.js";
import { slugify } from "../utils/slug.js";


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
  chateau_amenities(*, amenity_equipements(equipement_slug, equipements(slug, libelle, ordre))),
  offres(*),
  chateau_personnages(nature, texte, ordre, personnages(id, nom, slug))
`;

// SELECT pour la fiche publique /personnage/:slug — sens INVERSE (les châteaux
// d'un personnage). chateaux!inner : une liaison vers un château non-publié est
// JETÉE à la source (la RLS filtre statut='publie', !inner évite la ligne
// fantôme chateaux:null). Colonnes minimales d'une carte (pas de prix : la fiche
// dit "où", pas "combien" → pas d'embed chambres/offres).
const SELECT_PERSONNAGE_FICHE = `
  id, nom, slug, biographie,
  chateau_personnages(nature, texte, ordre,
    chateaux!inner(id, slug, nom, region, accroche, images, is_demo_mock))
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
 * LECTURE PUBLIQUE — un personnage par slug + les châteaux (publiés) rattachés,
 * pour la fiche /personnage/:slug. Sens INVERSE de getChateauBySlug (les
 * châteaux d'un personnage, pas les personnages d'un château).
 *
 * Requête DIRECTE (pas de cache — il n'existe pas de cache personnages) via
 * `.maybeSingle()`. Slug inconnu → `null` (contrat de getChateauBySlug, PAS le
 * throw de getChateauAdminById). L'embed `chateaux!inner` + la RLS publique
 * filtrent les non-publiés ; mapPersonnageFiche exclut ensuite les mocks.
 *
 * @param {string} slug - Slug du personnage (ex: "george-sand").
 * @returns {Promise<Object|null>} { id, nom, slug, chateaux: [...] } ou null.
 * @throws Si erreur Supabase (un "non trouvé" donne null, pas une erreur).
 */
export async function getPersonnageBySlug(slug) {
  if (!slug) return null;
  await _withFakeLatency();

  const { data, error } = await supabase
    .from("personnages")
    .select(SELECT_PERSONNAGE_FICHE)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[chateauxService] getPersonnageBySlug error:", error);
    throw new Error(`Failed to fetch personnage ${slug}: ${error.message}`);
  }
  return mapPersonnageFiche(data);
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
    // statut n'est pas mappé par mapChateau — on le surface pour le bouton Publier.
    statut: data.statut,
  };
}

/**
 * LECTURE du référentiel d'équipements filtrables (slug, libelle, ordre).
 * Trié par `ordre` (groupé par catégorie côté seed). Sert aux cases du
 * formulaire admin ET aux filtres (home + carte).
 *
 * @returns {Promise<Array<{slug: string, libelle: string, ordre: number}>>}
 * @throws Si erreur Supabase.
 */
export async function getEquipements() {
  const { data, error } = await supabase
    .from("equipements")
    .select("slug, libelle, ordre")
    .order("ordre", { ascending: true });

  if (error) {
    console.error("[chateauxService] getEquipements error:", error);
    throw new Error(`Failed to fetch equipements: ${error.message}`);
  }
  return data ?? [];
}

/**
 * LECTURE du référentiel des personnages (id, nom, slug), trié par nom.
 * Alimente le sélecteur avec recherche du sous-formulaire "Histoire des lieux"
 * (ChampPersonnage) : l'admin choisit un personnage existant plutôt que de
 * retaper son nom — c'est le garde-fou contre les doublons de catalogue (le slug
 * étant recalculé depuis le nom, une frappe libre avec typo créerait un autre
 * personnage). SELECT public (RLS anon/authenticated).
 *
 * @returns {Promise<Array<{id: string, nom: string, slug: string}>>}
 * @throws Si erreur Supabase.
 */
export async function getPersonnages() {
  const { data, error } = await supabase
    .from("personnages")
    .select("id, nom, slug, biographie")
    .order("nom", { ascending: true });

  if (error) {
    console.error("[chateauxService] getPersonnages error:", error);
    throw new Error(`Failed to fetch personnages: ${error.message}`);
  }
  return data ?? [];
}

// Mappe une row admin personnage (avec embed count) → forme écran.
// PostgREST rend le count agrégé sous chateau_personnages: [{ count: N }].
// nbChateaux = nombre de liaisons (TOUS statuts confondus : le FK RESTRICT
// bloque la suppression dès qu'une liaison existe, publiée ou non).
function _mapPersonnageAdmin(row) {
  return {
    id: row.id,
    nom: row.nom,
    slug: row.slug,
    biographie: row.biographie ?? null,
    nbChateaux: row.chateau_personnages?.[0]?.count ?? 0,
  };
}

/**
 * LECTURE ADMIN — liste des personnages + nombre de châteaux rattachés (une
 * requête, via l'embed count PostgREST). Ce compte pilote l'activation du bouton
 * Supprimer (FK RESTRICT : un personnage rattaché ne se supprime pas).
 *
 * @returns {Promise<Array<{id, nom, slug, biographie, nbChateaux}>>}
 * @throws Si erreur Supabase.
 */
export async function getPersonnagesAdmin() {
  const { data, error } = await supabase
    .from("personnages")
    .select("id, nom, slug, biographie, chateau_personnages(count)")
    .order("nom", { ascending: true });

  if (error) {
    console.error("[chateauxService] getPersonnagesAdmin error:", error);
    throw new Error(`Failed to fetch personnages (admin): ${error.message}`);
  }
  return (data ?? []).map(_mapPersonnageAdmin);
}

/**
 * LECTURE ADMIN par id — un personnage + son nombre de liaisons, pour l'écran
 * d'édition. Throw si introuvable (patron getChateauAdminById).
 *
 * @param {string} id - UUID du personnage.
 * @returns {Promise<{id, nom, slug, biographie, nbChateaux}>}
 * @throws Si id manquant, erreur Supabase, ou personnage introuvable.
 */
export async function getPersonnageAdminById(id) {
  if (!id) throw new Error("getPersonnageAdminById : id requis.");

  const { data, error } = await supabase
    .from("personnages")
    .select("id, nom, slug, biographie, chateau_personnages(count)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[chateauxService] getPersonnageAdminById error:", error);
    throw new Error(`Failed to fetch personnage ${id} (admin): ${error.message}`);
  }
  if (!data) throw new Error(`getPersonnageAdminById : personnage ${id} introuvable.`);
  return _mapPersonnageAdmin(data);
}

/**
 * ÉCRITURE ADMIN — met à jour un personnage (nom + biographie). UPDATE direct
 * (pas la RPC : la RPC fait ON CONFLICT DO NOTHING pour ne pas renommer un
 * personnage partagé depuis une fiche château — cet écran référentiel dédié EST
 * le bon endroit pour renommer, via un UPDATE gardé is_admin()).
 *
 * Le slug est RECALCULÉ depuis le nom via slugify (source unique) — jamais lu ni
 * saisi ailleurs. Changer le nom change donc l'URL publique /personnage/:slug.
 * Si le nouveau slug collisionne (UNIQUE), la base lève 23505 → message clair
 * (jamais une erreur Postgres brute à l'écran).
 *
 * @param {string} id - UUID du personnage.
 * @param {{nom: string, biographie?: string}} champs
 * @returns {Promise<Object>} La ligne modifiée.
 * @throws Si id/nom invalides, slug vide, collision slug (23505), refus RLS (0 ligne).
 */
export async function updatePersonnage(id, { nom, biographie } = {}) {
  if (!id) throw new Error("updatePersonnage : id requis.");
  if (typeof nom !== "string" || nom.trim() === "") {
    throw new Error("Le nom est requis.");
  }
  const slug = slugify(nom);
  if (slug === "") {
    throw new Error("Ce nom ne produit aucun slug (aucun caractère alphanumérique).");
  }
  // biographie : vide/espaces → null (colonne nullable, cohérent avec la lecture).
  const bio = typeof biographie === "string" && biographie.trim() !== "" ? biographie : null;

  const { data, error } = await supabase
    .from("personnages")
    .update({ nom: nom.trim(), slug, biographie: bio })
    .eq("id", id)
    .select();

  if (error) {
    console.error("[chateauxService] updatePersonnage error:", error);
    if (error.code === "23505") {
      throw new Error(
        `Le nom « ${nom.trim()} » produit un slug (${slug}) déjà utilisé par un autre personnage. Choisis un nom distinct.`
      );
    }
    throw new Error(`Failed to update personnage ${id}: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      `updatePersonnage : 0 ligne modifiée pour ${id}. ` +
      `Refus RLS probable (session non-admin) ou id inexistant.`
    );
  }

  // Le nom du personnage apparaît dans le cache public (embed château → personnages).
  invalidateCache();
  return data[0];
}

/**
 * SUPPRESSION ADMIN — supprime un personnage du référentiel.
 *
 * FK RESTRICT (chateau_personnages.personnage_id) : un personnage encore rattaché
 * à un château lève 23503. L'écran désactive le bouton en amont (via nbChateaux),
 * mais on catche 23503 comme filet (course possible) → message clair.
 *
 * @param {string} id - UUID du personnage.
 * @returns {Promise<true>}
 * @throws Si id manquant, personnage rattaché (23503), refus RLS (0 ligne), ou erreur.
 */
export async function deletePersonnage(id) {
  if (!id) throw new Error("deletePersonnage : id requis.");

  const { data, error } = await supabase
    .from("personnages")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("[chateauxService] deletePersonnage error:", error);
    if (error.code === "23503") {
      throw new Error(
        "Ce personnage est rattaché à un ou plusieurs châteaux et ne peut pas être supprimé. " +
        "Retire-le d'abord de leurs fiches (section « Histoire des lieux »)."
      );
    }
    throw new Error(`Failed to delete personnage ${id}: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      `deletePersonnage : 0 ligne supprimée pour ${id}. ` +
      `Refus RLS probable (session non-admin) ou id inexistant.`
    );
  }

  invalidateCache();
  return true;
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
 * @param {Object} sections - { base, chambres, timeline, alentours, amenities, personnages }.
 * @returns {Promise<string>} L'id du château modifié.
 * @throws Si id/base invalides, mapping fautif, ou erreur RPC (dont refus RLS 42501).
 */
export async function saveChateauComplet(id, sections = {}) {
  if (!id) throw new Error("saveChateauComplet : id requis.");

  const { base, chambres, timeline, alentours, amenities, personnages } = sections;

  const p_base = chateauToRow(base, { partial: false });
  // null = préserve (on n'envoie pas le tableau) ; [] = vide ; [...] = remplace.
  const p_chambres    = chambres    != null ? chambres.map((c, i) => chambreToRow(c, i))     : null;
  const p_timeline    = timeline    != null ? timeline.map((t, i) => timelineToRow(t, i))    : null;
  const p_alentours   = alentours   != null ? alentours.map((a, i) => alentourToRow(a, i))   : null;
  const p_amenities   = amenities   != null ? amenities.map((a, i) => amenityToRow(a, i))    : null;
  const p_personnages = personnages != null ? personnages.map((p, i) => personnageToRow(p, i)) : null;

  const { data, error } = await supabase.rpc("admin_upsert_chateau", {
    p_id: id,
    p_base,
    p_chambres,
    p_timeline,
    p_alentours,
    p_amenities,
    p_personnages,
  });

  if (error) {
    // Un non-admin déclenche le RAISE 42501 de la RPC → error non-null.
    console.error("[chateauxService] saveChateauComplet error:", error);

    // 23503 = violation de FK : on tente de supprimer une chambre encore
    // référencée par une réservation (FK RESTRICT). Message clair plutôt que
    // l'erreur SQL brute.
    const detail = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
    if (error.code === "23503" && (detail.includes("reservation") || detail.includes("chambre_id"))) {
      throw new Error(
        "Impossible de supprimer une chambre : elle a des réservations. " +
        "Retire d'abord la réservation, ou garde la chambre."
      );
    }

    throw new Error(`Failed to save chateau ${id}: ${error.message}`);
  }

  invalidateCache();
  return data ?? id;
}

/**
 * CRÉATION ADMIN — insère une coquille de château (nom + slug, les 2 NOT NULL).
 *
 * INSERT mono-table (pas de RPC) : l'id est généré, statut prend son défaut
 * 'brouillon', et toutes les autres colonnes leurs défauts. Le formulaire
 * d'édition (getChateauAdminById + saveChateauComplet) prend ensuite le relais
 * pour remplir le reste (base + filles).
 *
 * @param {string} nom - Nom du château (NOT NULL).
 * @param {string} slug - Slug URL unique (NOT NULL UNIQUE).
 * @returns {Promise<Object>} La ligne créée (id, statut='brouillon', défauts).
 * @throws Si nom/slug manquants, slug déjà pris (23505), ou autre erreur.
 */
export async function createChateau(nom, slug) {
  if (typeof nom !== "string" || nom.trim() === "") {
    throw new Error("createChateau : le nom est requis.");
  }
  if (typeof slug !== "string" || slug.trim() === "") {
    throw new Error("createChateau : le slug est requis.");
  }

  const { data, error } = await supabase
    .from("chateaux")
    .insert({ nom: nom.trim(), slug: slug.trim() })
    .select()
    .single();

  if (error) {
    console.error("[chateauxService] createChateau error:", error);
    if (error.code === "23505") {
      // Violation d'unicité — le slug existe déjà.
      throw new Error("Ce slug est déjà utilisé, choisis-en un autre.");
    }
    throw new Error(`Failed to create chateau: ${error.message}`);
  }

  invalidateCache();
  return data; // { id, statut: 'brouillon', ... défauts }
}

// Formats d'image acceptés → extension de fichier. Tout autre type est refusé.
const EXT_PAR_MIME = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const POIDS_MAX_IMAGE = 5 * 1024 * 1024; // 5 Mo

// Slugifie le nom de fichier (via la slugify partagee) + fallback "image" si vide.
// La ligne apostrophe->espace de slugify est redondante ici ([^a-z0-9]+ la captait
// deja) -> resultat identique a l'ancienne copie locale (verifie sur noms accentues).
function _slugFichier(nom) {
  return slugify(nom) || "image";
}

/**
 * TÉLÉVERSEMENT ADMIN — envoie une image dans le bucket Storage chateaux-images
 * et retourne son URL publique.
 *
 * Garde-fous : formats avif/jpg/png/webp seulement, 5 Mo max. Le chemin est
 * unique (timestamp + nom slugifié) pour éviter les collisions. L'écriture
 * dans le bucket est gardée par la policy Storage `is_admin()` (session admin).
 *
 * @param {File} file - Fichier image choisi dans un <input type="file">.
 * @returns {Promise<string>} URL publique de l'image téléversée.
 * @throws Si format non supporté, poids excédé, ou erreur Storage.
 */
export async function uploadImage(file) {
  if (!file) throw new Error("uploadImage : aucun fichier fourni.");
  if (!EXT_PAR_MIME[file.type]) {
    throw new Error("Format non supporté : utilise avif, jpg, png ou webp.");
  }
  if (file.size > POIDS_MAX_IMAGE) {
    throw new Error("Image trop lourde : 5 Mo maximum.");
  }

  const base = (file.name || "image").replace(/\.[^.]+$/, "");
  const chemin = `chateaux/${Date.now()}-${_slugFichier(base)}.${EXT_PAR_MIME[file.type]}`;

  const { error } = await supabase.storage
    .from("chateaux-images")
    .upload(chemin, file, { contentType: file.type });

  if (error) {
    console.error("[chateauxService] uploadImage error:", error);
    throw new Error(`Échec du téléversement : ${error.message}`);
  }

  const { data } = supabase.storage.from("chateaux-images").getPublicUrl(chemin);
  return data.publicUrl;
}

const STATUTS_VALIDES = ["brouillon", "publie", "archive"];

/**
 * ÉCRITURE ADMIN — change le statut de publication d'un château.
 *
 * Chemin distinct de saveChateauComplet : la RPC exclut volontairement `statut`
 * de son SET (publier est une action séparée de l'édition du contenu). UPDATE
 * mono-colonne, garde par la RLS `is_admin()` via la session admin.
 *
 * @param {string} id - UUID du château.
 * @param {'brouillon'|'publie'|'archive'} statut - Nouveau statut.
 * @returns {Promise<Object>} La ligne modifiée.
 * @throws Si id/statut invalides, erreur Supabase, ou 0 ligne (refus RLS).
 */
export async function updateStatut(id, statut) {
  if (!id) throw new Error("updateStatut : id requis.");
  if (!STATUTS_VALIDES.includes(statut)) {
    throw new Error(
      `updateStatut : statut invalide "${statut}" (attendu : ${STATUTS_VALIDES.join(", ")}).`
    );
  }

  const { data, error } = await supabase
    .from("chateaux")
    .update({ statut })
    .eq("id", id)
    .select();

  if (error) {
    console.error("[chateauxService] updateStatut error:", error);
    throw new Error(`Failed to update statut ${id}: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      `updateStatut : 0 ligne modifiée pour ${id}. ` +
      `Refus RLS probable (session non-admin) ou id inexistant.`
    );
  }

  invalidateCache();
  return data[0];
}

/**
 * SUPPRESSION ADMIN — supprime un château et nettoie ses images Storage.
 *
 * Ordre : d'abord les images du bucket (best-effort — des orphelins ne sont pas
 * critiques, on ne bloque jamais la suppression pour ça), PUIS la ligne château
 * (l'essentiel). Les tables filles partent en cascade FK (ON DELETE CASCADE).
 *
 * Seules les images du bucket chateaux-images sont retirées ; les chemins
 * public/ et les URLs externes (unsplash) sont ignorés (cf. cheminStorageDepuisUrl).
 *
 * @param {string} id - UUID du château.
 * @returns {Promise<true>}
 * @throws Si id manquant, erreur DELETE, ou 0 ligne (refus RLS / id inexistant).
 */
export async function deleteChateau(id) {
  if (!id) throw new Error("deleteChateau : id requis.");

  // 1. Collecter les chemins Storage des images du château (best-effort).
  let chemins = [];
  try {
    const chateau = await getChateauAdminById(id);
    const urls = [
      ...(chateau.images ?? []),
      ...(chateau.chambres ?? []).map((c) => c.image),
      chateau.proprietaires?.portrait,
    ];
    chemins = urls.map(cheminStorageDepuisUrl).filter(Boolean);
  } catch (e) {
    // Lecture échouée : on ne bloque pas la suppression du château pour autant.
    console.error("[chateauxService] deleteChateau: lecture des images échouée:", e);
  }

  // 2. Retirer ces fichiers du bucket (best-effort — jamais bloquant).
  if (chemins.length > 0) {
    const { error: errStorage } = await supabase.storage
      .from("chateaux-images")
      .remove(chemins);
    if (errStorage) {
      console.error("[chateauxService] deleteChateau: nettoyage Storage échoué:", errStorage);
      // On continue : le château doit partir même si des images subsistent.
    }
  }

  // 3. Supprimer la ligne château — les filles partent en cascade FK.
  const { data, error } = await supabase
    .from("chateaux")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("[chateauxService] deleteChateau error:", error);
    throw new Error(`Failed to delete chateau ${id}: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(
      `deleteChateau : 0 ligne supprimée pour ${id}. ` +
      `Refus RLS probable (session non-admin) ou id inexistant.`
    );
  }

  invalidateCache();
  return true;
}
