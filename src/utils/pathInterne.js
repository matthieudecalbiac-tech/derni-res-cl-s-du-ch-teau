/**
 * Whitelist anti open-redirect — SOURCE UNIQUE.
 *
 * Née dans AuthCallback.jsx (Sprint S2-α.2 Mini-Phase 6), extraite ici quand
 * /connexion a eu besoin de la MÊME garde : un prédicat de sécurité qui existe
 * en deux exemplaires finit par diverger, et c'est la copie oubliée qui devient
 * la faille. Règles inchangées à l'extraction.
 *
 * Un `next` doit être un chemin INTERNE de l'app. Sans cette garde, un attaquant
 * forge un lien vers /connexion?next=https://evil.fr ou /auth/callback?next=… et
 * nous fait rediriger nous-mêmes l'utilisateur — juste après son authentification,
 * au moment précis où il nous fait confiance.
 *
 * Les quatre refus, et ce qu'ils bloquent :
 *   - ne commence pas par "/"     → "https://evil.fr", "evil.fr"
 *   - commence par "//"           → "//evil.fr" (URL protocol-relative : le
 *                                   navigateur y recolle le schéma courant)
 *   - commence par "/\"           → "/\evil.fr" (certains parseurs traitent le
 *                                   backslash comme un slash)
 *   - schéma déguisé              → "/javascript:alert(1)", "javascript:…"
 *
 * @param {unknown} path
 * @returns {boolean} true si le chemin est sûr à passer à navigate()
 */
export function isPathInterneValide(path) {
  if (typeof path !== "string") return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;     // protocol-relative URL
  if (path.startsWith("/\\")) return false;    // backslash escape
  if (/^\/?[a-z]+:/i.test(path)) return false; // URL scheme déguisé
  return true;
}
