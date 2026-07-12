import { supabase } from "../lib/supabase.js";
import { mapOffre, MODULE_B_ID, MODULE_C_ID } from "./_mapping.js";

// ============================================================
// Service des offres. Lit la table public.offres (plus de mock).
// Le filtrage par role est assure par la RLS (offres_select_visible) :
// une offre a requires_role non-null n'est renvoyee qu'a un utilisateur
// connecte. On ne refiltre pas cote front.
// ============================================================

const TTL_MS = 5 * 60 * 1000;
const _cache = new Map();

function _cleValide(entree) {
  return entree && Date.now() - entree.t < TTL_MS;
}

const MODULES = {
  dernieresCles: MODULE_B_ID,
  club: MODULE_C_ID,
};

// Jointure vers chateaux pour resoudre le slug (la table offres ne l'a pas).
const SELECT_OFFRES = `
  *,
  chateaux!inner ( slug )
`;

// Toutes les offres du Club, tous chateaux confondus (module C).
// La RLS (offres_select_visible) ne les renvoie qu'a un utilisateur connecte
// puisqu'elles portent un requires_role non-null : le filtrage n'est pas ici.
const SELECT_OFFRES_CLUB = `
  *,
  chateaux!inner ( slug, nom, region )
`;

export async function getOffresPourChateau(chateauSlug, module, filtre = null) {
  const moduleId = MODULES[module];
  if (!chateauSlug || !moduleId) return [];

  // Le filtre entre dans la cle de cache mais n'est pas encore applique
  // (PLUG-READY DISPO : sera branche sur les vraies disponibilites).
  const cle = [chateauSlug, module, filtre?.dateArrivee, filtre?.dateDepart, filtre?.voyageurs]
    .filter(Boolean).join("|");
  const hit = _cache.get(cle);
  if (_cleValide(hit)) return hit.v;

  const { data, error } = await supabase
    .from("offres")
    .select(SELECT_OFFRES)
    .eq("chateaux.slug", chateauSlug)
    .eq("module_id", moduleId)
    .eq("visible", true)
    .order("ordre", { ascending: true });

  if (error) {
    console.error("[offresService] getOffresPourChateau:", error);
    throw error;
  }

  const offres = (data ?? []).map((r) => mapOffre(r, module, chateauSlug)).filter(Boolean);
  _cache.set(cle, { t: Date.now(), v: offres });
  return offres;
}

export async function getOffresClub() {
  const cle = "club|toutes";
  const hit = _cache.get(cle);
  if (_cleValide(hit)) return hit.v;

  const { data, error } = await supabase
    .from("offres")
    .select(SELECT_OFFRES_CLUB)
    .eq("module_id", MODULE_C_ID)
    .eq("visible", true)
    .order("ordre", { ascending: true });

  if (error) {
    console.error("[offresService] getOffresClub:", error);
    throw error;
  }

  const offres = (data ?? []).map((r) => {
    const offre = mapOffre(r, "club");
    if (!offre) return null;
    // Le chateau d'origine, pour situer l'offre dans la liste agregee.
    offre.chateau = {
      slug: r.chateaux?.slug ?? null,
      nom: r.chateaux?.nom ?? null,
      region: r.chateaux?.region ?? null,
    };
    return offre;
  }).filter(Boolean);

  _cache.set(cle, { t: Date.now(), v: offres });
  return offres;
}

// Les slugs des chateaux ayant au moins une offre Dernieres Cles visible.
// Sert l'overlay marketing, qui listait ces chateaux via un champ modules invente.
export async function getSlugsAvecOffreDernieresCles() {
  const { data, error } = await supabase
    .from("offres")
    .select("chateaux!inner(slug)")
    .eq("module_id", MODULE_B_ID)
    .eq("visible", true);

  if (error) {
    console.error("[offresService] getSlugsAvecOffreDernieresCles:", error);
    throw error;
  }
  return new Set((data ?? []).map((r) => r.chateaux?.slug).filter(Boolean));
}

export async function getOffreParId(offreId) {
  if (!offreId) return null;
  const { data, error } = await supabase
    .from("offres")
    .select(SELECT_OFFRES)
    .eq("id", offreId)
    .eq("visible", true)
    .maybeSingle();

  if (error) {
    console.error("[offresService] getOffreParId:", error);
    throw error;
  }
  if (!data) return null;

  // Retrouve le nom du module depuis son uuid.
  const moduleNom = Object.keys(MODULES).find((k) => MODULES[k] === data.module_id) ?? null;
  return mapOffre(data, moduleNom);
}

export async function compterOffresPourChateau(chateauSlug, module, filtre = null) {
  const offres = await getOffresPourChateau(chateauSlug, module, filtre);
  return offres.length;
}

export function invalidateCacheOffres() {
  _cache.clear();
}
