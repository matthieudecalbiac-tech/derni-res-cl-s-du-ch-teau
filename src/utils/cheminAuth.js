import { isPathInterneValide } from "./pathInterne";

// Construire un chemin d'authentification qui SAIT OU REVENIR — une seule source.
//
// POURQUOI CE FICHIER EXISTE. Le mecanisme de retour post-connexion etait
// complet et sur : `Connexion.jsx` lit `?next=`, le depose dans
// `lcc_auth_next`, et la redirection post-login le consomme. Il manquait une
// seule chose — QUELQU'UN POUR L'ALIMENTER.
//
// Sur onze points d'entree vers `/connexion` ou `/inscription`, DEUX seulement
// posaient l'origine : `RequireAuth` et `VitrineChateau`. Les neuf autres y
// allaient a vide, et le `|| "/"` de la redirection faisait le reste : on se
// connectait pour entrer au Club, et l'on atterrissait sur l'accueil.
//
// Neuf corrections separees auraient garanti qu'une dixieme manque un jour. La
// regle vit donc ici, comme celle du retour vit dans `BoutonRetour`.

/**
 * Chemin vers un ecran d'authentification, portant la destination d'apres.
 *
 * @param {string} base  "/connexion" ou "/inscription"
 * @param {string|null} next  chemin interne ou revenir une fois authentifie
 * @returns {string}
 *
 * ⚠ `next` est filtre par `isPathInterneValide` : un `?next=https://evil.fr`
 * forge dans un lien ne doit pas pouvoir se faire relayer par nous juste apres
 * l'authentification, au moment ou l'utilisateur nous fait confiance. Un `next`
 * invalide n'est pas corrige — il est IGNORE, et l'on retombe sur le
 * comportement d'avant, a l'octet pres.
 */
export function cheminAuth(base, next) {
  if (!isPathInterneValide(next)) return base;
  return `${base}?next=${encodeURIComponent(next)}`;
}

/**
 * Le `next` porte par une URL d'ecran d'authentification, s'il est valide.
 *
 * Sert a le PROPAGER d'un ecran d'auth a l'autre. C'est le piege central de ce
 * mecanisme : on arrive sur `/connexion?next=/club`, on se ravise et l'on va
 * s'inscrire — si le lien inter-auth repart a vide, la destination est perdue
 * au moment precis ou le visiteur change d'avis.
 *
 * @param {string} search  `location.search`
 * @returns {string|null}
 */
export function nextCourant(search) {
  const n = new URLSearchParams(search || "").get("next");
  return isPathInterneValide(n) ? n : null;
}

/** Destination par defaut des entrees « Club » : on revient au Club. */
export const NEXT_CLUB = "/club";
