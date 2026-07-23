// ═══════════════════════════════════════════════════════════════════════════
// LCC — JOURNALISATION DES ERREURS SUPABASE (règle unique du projet)
// ═══════════════════════════════════════════════════════════════════════════
// Tous les services passent par ici pour logger une erreur Supabase. UNE seule
// définition de la règle : le jour où elle change, il y a UN endroit à toucher.
//
// LA RÈGLE : une requête qui n'a jamais reçu de réponse HTTP n'est pas une
// panne applicative — c'est du transport. Le cas courant : le navigateur tue
// ses fetchs en vol quand la page navigue ou qu'un composant se démonte. Ça
// arrive normalement, ça n'a aucun effet visible pour l'utilisateur (les hooks
// data ont tous leur drapeau `cancelled` au démontage), et ça n'a donc rien à
// faire en console.error.
//
// COMMENT ON LE DÉTECTE : `status === 0`. C'est structurel. postgrest-js
// synthétise { message, details, hint, code: "", status: 0, statusText: "" }
// quand le fetch rejette ; toute réponse qui a réellement atteint PostgREST
// passe par processResponse et porte un status HTTP réel (400, 401, 409...).
// Vérifié dans @supabase/postgrest-js 2.105.4.
//
// CE QU'ON NE FAIT PAS : matcher le message. postgrest-js le construit comme
// `${fetchError.name}: ${fetchError.message}`, ce qui donne "TypeError: Load
// failed" sur WebKit, "TypeError: Failed to fetch" sur Chromium, encore autre
// chose sur Firefox. Coder contre trois libellés de moteurs est fragile ; le
// status ne dépend d'aucun wording.
//
// LIMITE ASSUMÉE : `status === 0` couvre l'annulation MAIS AUSSI une vraie
// coupure réseau, un DNS mort, un CORS bloqué — au niveau navigateur ces cas
// sont indiscernables (WebKit dit "Load failed" pour tous). On accepte de
// taire les quatre : aucun n'est une panne de NOTRE code, et l'appelant reçoit
// de toute façon le throw, donc l'UI affiche son état d'erreur.
//
// NIVEAU DE TRACE : console.debug, jamais console.warn. L'agent QA
// (scripts/agents/console-errors.cjs) capture 'error' ET 'warning' : rétrograder
// en warn déplacerait le bruit dans le budget avertissements au lieu de le
// supprimer. 'debug' est ignoré par l'agent, et masqué par défaut dans les
// DevTools (niveau Verbose) — la trace reste disponible pour qui la cherche.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Logge une erreur Supabase en respectant la règle ci-dessus.
 *
 * Ne touche PAS au contrôle de flux : l'appelant continue de `throw` comme
 * avant. On filtre le log, pas le comportement.
 *
 * @param {string} contexte - Préfixe d'origine, ex. "[clubService] getPaliers:".
 * @param {Object} error    - L'objet `error` renvoyé par Supabase.
 * @param {number} [status] - Le `status` de la même réponse. Absent pour les
 *   appels Storage (leur réponse n'en expose pas) : dans ce cas on logge
 *   normalement — en cas de doute, on parle fort.
 */
export function logErreurSupabase(contexte, error, status) {
  if (status === 0) {
    console.debug(contexte, "requête interrompue (transport, status 0) —", error?.message);
    return;
  }
  console.error(contexte, error);
}
