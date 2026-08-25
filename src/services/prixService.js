import { supabase } from "../lib/supabase.js";
import { logErreurSupabase } from "../utils/logSupabase.js";
import { jourISO } from "../utils/dates.js";

// ═══════════════════════════════════════════════════════════════════════════
// Service · Prix d'un sejour (P2 du chantier prix nuit par nuit)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠⚠ CE MODULE NE CALCULE RIEN, ET C'EST TOUT SON INTERET.
//
// La regle — COALESCE(prix_special_cents, prix_cents) somme sur les nuits
// [arrivee, depart), plus le menage une seule fois — vit UNIQUEMENT dans la
// fonction SQL `prix_sejour`. Le front l'appelle pour AFFICHER, l'Edge
// Function l'appelle pour FACTURER : litteralement la meme fonction.
//
// C'est ce qui rend « afficher = facturer » vrai PAR CONSTRUCTION et non par
// vigilance. ⚠ Deux codes qui « calculent pareil » ne garantissent rien ; un
// seul code, si. Reimplementer ici la somme des nuits — meme « juste pour
// afficher », meme « juste pour un apercu » — DETRUIRAIT cette garantie, et la
// divergence porterait sur de l'argent.
//
// ⚠ NE PAS AJOUTER DE CACHE ICI SANS Y REFLECHIR. Un total mis en cache
// survivrait a un changement de tarif fait par le chatelain, et l'on afficherait
// un prix perime a cote d'un montant facture different. Les autres services de
// ce depot cachent des catalogues ; un MONTANT n'est pas un catalogue.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠⚠ CE MODULE N'EST PAS LE POINT DE BASCULE ENTRE MODES DE PRIX
// ═══════════════════════════════════════════════════════════════════════════
// Le modele de disponibilite est HYBRIDE a terme : la plupart des chateaux en
// mode INTERNE (table LCC), certains SYNCHRONISES avec leur PMS. La tentation,
// le jour venu, sera d'ajouter ICI un `if (mode === "pms") …` — c'est le
// fichier ou c'est le plus facile.
//
// ⚠ CE SERAIT UN DEFAUT GRAVE, ET SILENCIEUX. `prixService` est la facade du
// FRONT, pas la seule porte : `demande-reservation` appelle la RPC EN DIRECT
// (Deno, deploye separement, sans acces a `src/`) et ne peut pas passer par ce
// module. Une branche posee ici ne serait donc vue que par l'AFFICHAGE :
//
//     FRONT  prixService -> voit le mode -> AFFICHE le prix PMS
//     EDGE   RPC directe -> ignore le mode -> FACTURE le prix interne
//
// On reintroduirait exactement la divergence afficher != facturer que tout ce
// chantier existe pour fermer, et au pire endroit possible.
//
// ⚠ TOUTE NOUVELLE SOURCE DE PRIX SE BRANCHE EN SQL — la ou les DEUX
// consommateurs passent. Et la forme la plus propre n'est meme pas une branche :
// un PMS ECRIT ses tarifs dans `disponibilites.prix_special_cents`, et
// `prix_sejour` en reste l'unique lecteur. Le PMS devient un ECRIVAIN, pas un
// second chemin de lecture — zero changement ici, zero chez les appelants.
// ═══════════════════════════════════════════════════════════════════════════

/** Code SQLSTATE que `prix_sejour` leve sur une plage invalide. */
export const ERREUR_PLAGE = "22023";

/**
 * Total d'un sejour, EN CENTS.
 *
 * ⚠ ON N'ENVOIE JAMAIS UN OBJET `Date` A UNE RPC. PostgREST le serialiserait en
 * ISO **UTC**, et le cast `::date` cote Postgres pourrait rendre LE JOUR
 * PRECEDENT selon l'heure et le fuseau du visiteur. Ce depot a deja paye ce bug
 * dans `disponibilitesService` — ici il decalerait une NUIT DE FACTURATION.
 * `jourISO` construit le jour sur les composantes LOCALES.
 *
 * ⚠ POURQUOI `jourISO` ET NON UN TROISIEME HELPER. `utils/dates.jourISO` et le
 * `cleJour` prive de `disponibilitesService` font deja la meme chose, et cette
 * duplication est TRACEE dans CLAUDE.md. En ajouter une troisieme aggraverait
 * une dette connue ; on reutilise le helper public.
 *
 * ⚠ LES ERREURS NE SONT PAS AVALEES. `prix_sejour` LEVE sur plage invalide,
 * chambre inconnue ou total <= 0 — et ce service propage. Un montant qu'on ne
 * sait pas calculer ne doit jamais se transformer en `0`, en `null` silencieux
 * ou en « a partir de ». C'est l'inverse du contrat de `disponibilitesService`,
 * dont les fonctions rendent `false` : la, l'appelant est un ECRAN ; ici c'est
 * un MONTANT.
 *
 * @param {string} chambreId - UUID de la chambre.
 * @param {Date|string} arrivee - "YYYY-MM-DD" ou Date locale.
 * @param {Date|string} depart  - ⚠ EXCLU : [arrivee, depart).
 * @returns {Promise<number>} Total en CENTS (entier).
 * @throws {Error} Si la RPC echoue. `estPlageInvalide(err)` distingue le cas
 *   « saisie de l'utilisateur » du cas « panne ».
 */
export async function prixSejourCents(chambreId, arrivee, depart) {
  const { data, error, status } = await supabase.rpc("prix_sejour", {
    p_chambre_id: chambreId,
    p_arrivee: jourISO2(arrivee),
    p_depart: jourISO2(depart),
  });

  if (error) {
    logErreurSupabase("[prixService] prixSejourCents:", error, status);
    throw error;
  }

  // ⚠ PostgREST rend un `integer` SQL en nombre JSON, mais on ne s'en remet pas
  //   a ce detail de serialisation : un total qui arriverait en chaine
  //   ("25000") passerait les comparaisons `>` et casserait les additions.
  //   Le dépôt a déjà vu ce genre de variation (cf. la normalisation jumelle de
  //   clubService.getPalierCourant).
  const total = typeof data === "string" ? Number(data) : data;
  if (!Number.isInteger(total) || total <= 0) {
    throw new Error(`prixSejourCents : total inattendu (${JSON.stringify(data)})`);
  }
  return total;
}

/**
 * Vrai si l'erreur vient d'une plage invalide (depart <= arrivee, date passee,
 * sejour > 366 nuits, chambre inconnue) plutot que d'une panne.
 *
 * ⚠ Sert a distinguer ce qu'on MONTRE a l'utilisateur : une saisie a corriger,
 * ou un incident. Les deux ne se disent pas de la meme facon.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function estPlageInvalide(err) {
  return Boolean(err) && err.code === ERREUR_PLAGE;
}

/**
 * Conversion locale — accepte une chaine deja au bon format (le cas d'un
 * `<input type="date">`) ou une `Date`. Tout le reste passe tel quel a la RPC,
 * qui levera : ⚠ on ne « repare » pas une entree douteuse cote client, on la
 * laisse casser bruyamment.
 */
function jourISO2(d) {
  if (d instanceof Date && !Number.isNaN(d.getTime())) return jourISO(d);
  return d;
}
