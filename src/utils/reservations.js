/**
 * Référentiel des STATUTS de réservation, traduits pour l'ESPACE CHÂTELAIN.
 * value = valeur de l'enum reservation_status en base (pending/confirmed/
 * cancelled/completed) ; label = libellé lisible affiché au châtelain — jamais
 * l'enum brut à l'écran.
 *
 * ⚠ Wording SPÉCIFIQUE au châtelain (différent du client) : ici "cancelled" se
 * lit "Refusée" (cadrage châtelain). Le même statut couvre aussi une annulation
 * côté client — le libellé l'aplatit volontairement pour cette vue.
 *
 * Modèle : utils/personnages.js (libelleNature). Source unique de traduction.
 * Cf. enum reservation_status (schema.sql).
 */
export const STATUTS_CHATELAIN = [
  { value: "pending", label: "En attente de votre réponse" },
  { value: "confirmed", label: "Confirmée" },
  { value: "cancelled", label: "Refusée" },
  { value: "completed", label: "Séjour passé" },
];

const LIBELLE_PAR_STATUT = new Map(STATUTS_CHATELAIN.map((s) => [s.value, s.label]));

/**
 * Libellé châtelain d'un statut de réservation. Fallback : le statut brut si
 * inconnu (jamais d'affichage vide). Ex : "pending" -> "En attente de votre réponse".
 *
 * @param {string} status
 * @returns {string}
 */
export function libelleStatutChatelain(status) {
  return LIBELLE_PAR_STATUT.get(status) ?? status ?? "";
}
