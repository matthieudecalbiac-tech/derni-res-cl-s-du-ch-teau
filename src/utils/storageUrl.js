// storageUrl.js — helper pur pour distinguer les images du bucket Storage.
//
// Le nettoyage à la suppression d'un château ne doit viser QUE les fichiers du
// bucket chateaux-images. Les URLs externes (unsplash) et les chemins public/
// (/bri-1.avif) ne sont pas gérés par nous — on ne les touche pas.

const MARQUEUR_BUCKET = "/chateaux-images/";

/**
 * Extrait le chemin interne au bucket depuis une URL Storage publique.
 *
 * Une URL Storage ressemble à :
 *   https://<ref>.supabase.co/storage/v1/object/public/chateaux-images/<chemin>
 *
 * @param {string} url - URL ou chemin d'image.
 * @returns {string|null} Le <chemin> dans le bucket, ou null si l'URL ne pointe
 *   pas vers le bucket chateaux-images (unsplash, /public, chaîne vide, etc.).
 */
export function cheminStorageDepuisUrl(url) {
  if (typeof url !== "string") return null;
  const idx = url.indexOf(MARQUEUR_BUCKET);
  if (idx === -1) return null;
  const brut = url.slice(idx + MARQUEUR_BUCKET.length).split("?")[0];
  if (!brut) return null;
  try {
    return decodeURIComponent(brut);
  } catch {
    return brut;
  }
}
