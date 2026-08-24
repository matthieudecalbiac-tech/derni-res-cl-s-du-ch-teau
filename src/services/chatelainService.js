// ═══════════════════════════════════════════════════════════════════════════
// LCC — SERVICE CHÂTELAIN (espace propriétaire)
// ═══════════════════════════════════════════════════════════════════════════
// Deux lectures et une écriture, toutes via le client supabase PARTAGÉ (session
// du châtelain) : c'est la RLS qui filtre, jamais un .eq() applicatif.
//
//   getDemandesChatelain()  les demandes de séjour  (vue, RLS par château)
//   getMesChateaux()        ses châteaux + chambres (RLS par chateau_owners)
//   repondreDemande()       accepter / refuser      (RPC SECURITY DEFINER)
//
// On ne met PAS de .eq("user_id", ...) — ce n'est pas l'utilisateur qui filtre,
// c'est le lien chateau_owners (RLS). Modèle : clubService.getMesReservations.
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from "../lib/supabase.js";
import { logErreurSupabase } from "../utils/logSupabase.js";

// Code porté par l'Error levée quand la RPC refuse une demande déjà traitée
// (garde `status = pending`). L'appelant teste CE code, jamais un message : le
// libellé affiché appartient à l'UI, pas au service.
export const ERR_DEJA_TRAITEE = "DEMANDE_DEJA_TRAITEE";

// Code porté par l'Error levée quand la contrainte anti-survente refuse la
// confirmation : une AUTRE demande a été confirmée entre-temps sur les mêmes
// dates (RPC -> P0003, traduction du 23P01 de
// `reservations_pas_de_chevauchement`).
//
// ⚠ DISTINCT DE `ERR_DEJA_TRAITEE`, et ce n'est pas un détail : « vous avez déjà
// répondu » et « quelqu'un d'autre a pris ces dates » envoient le châtelain
// chercher à deux endroits différents.
export const ERR_DATES_PRISES = "DATES_DEJA_CONFIRMEES";

// Demandes de séjour des châteaux du châtelain courant, plus récente arrivée en
// tête. La vue n'expose ni user_id ni contact client (LCC intermédiaire).
export async function getDemandesChatelain() {
  const { data, error, status } = await supabase
    .from("reservations_chatelain_view")
    .select(
      "id, chambre_id, chambre_nom, chateau_nom, chateau_slug, date_arrivee, date_depart, voyageurs, message, prix_total_cents, commission_lcc_cents, status, created_at",
    )
    .order("date_arrivee", { ascending: false });
  if (error) {
    logErreurSupabase("[chatelainService] getDemandesChatelain:", error, status);
    throw error;
  }
  return data ?? [];
}

// Réponse du châtelain à une demande : decision = "accepter" | "refuser".
//
// Appel DIRECT de la RPC via le client PARTAGÉ — surtout pas une Edge Function :
// c'est le JWT du châtelain qui doit voyager, pour qu'auth.uid() reste LUI côté
// Postgres. repondre_demande est SECURITY DEFINER, mais sa garde interne
// is_chatelain_of(chateau) lit auth.uid() : passer par une Edge Function
// (service_role) ferait sauter cette garde ou obligerait à la réimplémenter.
//
// La RPC est RETURNS TABLE -> PostgREST renvoie un tableau de lignes. Même
// normalisation que clubService.getPalierCourant.
//
// L'email au voyageur n'est PAS envoyé ici : la RPC écrit une ligne email_log
// 'en_attente' (outbox) dans la même transaction que le statut. Cf. le
// commentaire du dashboard sur le drain.
export async function repondreDemande(reservationId, decision) {
  const { data, error, status } = await supabase.rpc("repondre_demande", {
    p_reservation_id: reservationId,
    p_decision: decision,
  });

  if (error) {
    logErreurSupabase("[chatelainService] repondreDemande:", error, status);
    // La RPC lève 5 exceptions, chacune avec son ERRCODE : P0002 introuvable,
    // 42501 pas le châtelain, 22023 décision invalide, P0001 pour la garde
    // "déjà traitée", et P0003 pour la contrainte anti-survente. On discrimine
    // donc sur le code (stable), pas sur le message (accentué côté SQL, et
    // susceptible de bouger).
    if (error.code === "P0001") {
      const dejaTraitee = new Error("Demande déjà traitée.");
      dejaTraitee.code = ERR_DEJA_TRAITEE;
      throw dejaTraitee;
    }
    if (error.code === "P0003") {
      const datesPrises = new Error(
        "Ces dates viennent d'être confirmées pour une autre demande.",
      );
      datesPrises.code = ERR_DATES_PRISES;
      throw datesPrises;
    }
    throw error;
  }

  const ligne = Array.isArray(data) ? data[0] : data;
  if (!ligne) throw new Error("repondreDemande : réponse vide de la RPC.");
  return {
    reservation_id: ligne.reservation_id,
    nouveau_statut: ligne.nouveau_statut,
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// LES CHÂTEAUX DU CHÂTELAIN — la brique qui manquait (étape 3.2)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠ AVANT ELLE, L'ESPACE CHÂTELAIN NE SAVAIT PAS LISTER SES CHAMBRES. Il ne
// lisait que `reservations_chatelain_view`, qui ne montre que les chambres
// AYANT REÇU UNE DEMANDE. Un châtelain sans demande voyait une liste vide — et
// n'avait aucun moyen d'atteindre son calendrier. C'est exactement le cas du
// démarrage : on remplit les disponibilités AVANT la première demande.
//
// ⚠ UNE LECTURE PLATE, PAS UNE RPC — et c'est mesuré, pas supposé. La policy
// `chateaux_select_public` fait :
//
//     statut = 'publie'  OR  is_chatelain_of(id)  OR  is_admin()
//
// Le deuxième terme suffit : un châtelain voit ses châteaux MÊME EN BROUILLON à
// travers l'embed. Il n'y a donc aucune règle à porter côté serveur, et le
// patron maison réserve les RPC à ce qui porte une règle ou une garde. Les
// écritures de l'étape 3.1, elles, en avaient besoin (atomicité de la plage) ;
// une lecture n'en a pas.
//
// ⚠ `chateaux!inner` N'EST PAS DÉCORATIF. Sans lui, un lien vers un château que
// la RLS masque produirait une ligne fantôme `chateaux: null` au lieu de
// disparaître. Le dépôt connaît ce piège — cf. SELECT_PERSONNAGE_FICHE dans
// chateauxService, qui le commente.
//
// LES DEUX COLONNES D'HORIZON sont demandées ICI, alors que rien ne les affiche
// encore : l'écran de saisie (3.3) doit pouvoir dire « ce château n'est pas en
// gestion » ou « ouvert jusqu'au … ». Les omettre coûterait un second
// aller-retour, sur un écran qui en fera déjà un par mois affiché.
// ═══════════════════════════════════════════════════════════════════════════

// Colonnes lues. `ordre` est SÉLECTIONNÉ mais ne trie rien : l'ordre d'un embed
// PostgREST n'est pas garanti — cf. le tri en JS plus bas.
const SELECT_MES_CHATEAUX = `
  chateau_id,
  chateaux!inner (
    id, nom, slug, statut, dispo_geree, dispo_ouverte_jusqu_a,
    chambres ( id, nom, ordre )
  )
`;

/**
 * Compare deux chambres : `ordre` d'abord, `nom` ensuite.
 *
 * ⚠ `ordre` PEUT ÊTRE NULL (la colonne est nullable). Sans le repli sur
 * Infinity, une chambre non ordonnée remonterait EN TÊTE — devant celles que le
 * châtelain a explicitement classées. Le `nom` départage à `ordre` égal, pour
 * que deux rendus successifs donnent la même liste.
 */
function parOrdrePuisNom(a, b) {
  const oa = a?.ordre ?? Infinity;
  const ob = b?.ordre ?? Infinity;
  if (oa !== ob) return oa - ob;
  return String(a?.nom ?? "").localeCompare(String(b?.nom ?? ""), "fr");
}

/**
 * Les châteaux dont l'utilisateur courant est propriétaire, avec leurs chambres.
 *
 * ⚠ LE TRI EST FAIT EN JS, DÉLIBÉRÉMENT. PostgREST sait ordonner un embed, mais
 * la syntaxe dépend de la version sur un embed à DEUX niveaux
 * (chateau_owners -> chateaux -> chambres) — et surtout, un tri délégué au
 * serveur serait INVISIBLE du test unitaire : on ne pourrait que le croire. Ici
 * le mock rend les chambres en désordre et le test vérifie qu'elles ressortent
 * triées.
 *
 * ⚠ LES CHÂTEAUX SONT TRIÉS PAR NOM, faute de mieux : `chateau_owners` ne porte
 * NI ordre NI notion de domaine principal, alors qu'elle autorise plusieurs
 * domaines par châtelain. Sans effet aujourd'hui — un seul lien de propriété
 * existe en base — mais à savoir avant d'en ajouter (cf. CLAUDE.md).
 *
 * @returns {Promise<Array<{id: string, nom: string, slug: string, statut: string,
 *   dispoGeree: boolean, dispoOuverteJusquA: string|null,
 *   chambres: Array<{id: string, nom: string, ordre: number|null}>}>>}
 *   Liste vide si l'utilisateur n'est propriétaire de rien. ⚠ Un client obtient
 *   donc [] et PAS une erreur : la RLS ne refuse pas, elle ne rend rien. Un
 *   écran qui lirait « pas d'erreur » comme « accès accordé » afficherait une
 *   page vide plutôt qu'un refus — à traiter en 3.4.
 */
export async function getMesChateaux() {
  const { data, error, status } = await supabase
    .from("chateau_owners")
    .select(SELECT_MES_CHATEAUX);

  if (error) {
    logErreurSupabase("[chatelainService] getMesChateaux:", error, status);
    throw error;
  }

  return (data ?? [])
    .map((lien) => lien?.chateaux)
    // Ceinture : `!inner` doit déjà avoir écarté les liens sans château visible.
    .filter(Boolean)
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      slug: c.slug,
      statut: c.statut,
      dispoGeree: c.dispo_geree === true,
      dispoOuverteJusquA: c.dispo_ouverte_jusqu_a ?? null,
      chambres: (c.chambres ?? []).slice().sort(parOrdrePuisNom),
    }))
    .sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr"));
}
