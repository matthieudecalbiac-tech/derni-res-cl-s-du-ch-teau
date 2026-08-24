import { useState, useEffect, useMemo, useRef } from "react";
import CalendrierSaisie from "./CalendrierSaisie";
import { jourISO } from "../utils/dates";
import {
  calendrierEditionChambre,
  poserDisponibilites,
  retirerDisponibilites,
} from "../services/disponibilitesService";
import "../styles/panneau-disponibilites.css";

// ═══════════════════════════════════════════════════════════════════════════
// Le panneau de saisie des disponibilités — le CŒUR (étape 3.5a)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠ CE FICHIER EST UN DÉPLACEMENT, PAS UNE RÉÉCRITURE. Il vient de
// chatelain/OngletDisponibilites.jsx (3.4c), validé de bout en bout — PC et
// VRAI TÉLÉPHONE. Les corps de fonctions sont inchangés au caractère près.
// Un composant validé au doigt ne se réécrit pas « au passage » : ce qu'aucun
// test ne couvre, seule la main le prouve, et on ne redemande pas cette preuve
// pour du confort de lecture.
//
// POURQUOI L'EXTRACTION. L'écran admin (3.5b) doit saisir les mêmes dates, sur
// n'importe quel château, depuis /admin/chateaux/:id/disponibilites. Sur les
// 333 lignes de l'onglet, ~265 ignoraient déjà d'où venait le château : elles
// avaient besoin d'un objet, pas d'un châtelain. Dupliquer les aurait figées en
// deux exemplaires qui auraient divergé à la première correction.
//
// ⚠ CE QUE CE COMPOSANT NE FAIT PAS : il ne CHERCHE pas son château. Il le
// reçoit. C'est toute la frontière — l'hôte sait qui a le droit de voir quoi
// (getMesChateaux passe par la RLS, getChateauAdminById par is_admin), le cœur
// ne connaît que des dates.
//
// ⚠ TOUTE LA RÈGLE VIT AILLEURS. Ce composant orchestre : il lit
// (calendrierEditionChambre), il écrit (poser/retirer), il passe un état par
// jour à CalendrierSaisie. Il ne DÉCIDE rien — ni ce qu'est une nuit ouverte,
// ni ce que « Ouvrir » veut dire. Le contrat de découplage de
// disponibilitesService l'interdit, et c'est ce qui permet à la logique d'être
// testée sans DOM (utils/calendrierSaisie.js).
//
// LE FLUX
//   [chambre, mois]         calendrierEditionChambre(1er du mois, dernier)
//   onBloquer / onOuvrir    poser / retirer  PUIS RE-LIRE le mois
// ═══════════════════════════════════════════════════════════════════════════

/** Le 1er et le dernier jour du mois affiché, en "YYYY-MM-DD". */
function bornesDuMois(mois) {
  const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
  // Le jour 0 du mois SUIVANT est le dernier du mois courant — y compris en
  // février bissextile, sans avoir à le savoir.
  const dernier = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
  return { du: jourISO(premier), au: jourISO(dernier) };
}

/**
 * @param {Object} chateau - { id, nom, dispoGeree, dispoOuverteJusquA, chambres }
 *   déjà chargé par l'hôte. Les chambres sont supposées TRIÉES (mapChateau et
 *   getMesChateaux le font tous les deux) — le panneau ne retrie pas.
 * @param {((verrouille: boolean) => React.ReactNode)|null} [selecteurDomaine]
 *   ⚠ UNE FONCTION, PAS UN NŒUD, et ce n'est pas du zèle : le sélecteur de
 *   domaine du châtelain porte `disabled` pendant une écriture. Or c'est le
 *   panneau qui sait qu'une écriture est en vol — un nœud déjà construit par
 *   l'hôte perdrait ce verrou EN SILENCE, et on pourrait changer de château au
 *   milieu d'un poser_disponibilites. L'admin passe null : son château est fixé
 *   par l'URL et nommé par le titre de la page.
 * @param {React.ReactNode} motifHorsGestion - affiché quand dispoGeree est faux.
 * @param {React.ReactNode} motifHorizonManquant - affiché quand la gestion est
 *   active mais l'horizon absent. ⚠ Deux textes DIFFÉRENTS selon l'hôte : le
 *   châtelain ne peut pas poser l'horizon (on l'oriente vers LCC), l'admin le
 *   peut (on lui donne le lien vers la fiche).
 */
export default function PanneauDisponibilites({
  chateau,
  selecteurDomaine = null,
  motifHorsGestion,
  motifHorizonManquant,
}) {
  const chambres = chateau?.chambres ?? [];

  const [chambreChoisie, setChambreChoisie] = useState(null);

  const [moisAffiche, setMoisAffiche] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const [lignes, setLignes] = useState(null);        // null = pas encore chargé
  const [chargementMois, setChargementMois] = useState(false);
  const [selection, setSelection] = useState(null);
  const [traitement, setTraitement] = useState(false);
  const [avis, setAvis] = useState(null);

  // ⚠ LA CHAMBRE COURANTE EST DÉRIVÉE, PAS SYNCHRONISÉE PAR UN EFFET. Quand
  //   l'hôte change de château, la chambre retenue n'appartient plus à la
  //   liste. Un useEffect de remise à zéro laisserait passer UNE frame où le
  //   <select> porte une valeur absente de ses options — il s'afficherait vide.
  //   En 3.4c ce clignotement n'existait pas : le parent réinitialisait la
  //   chambre dans le même geste que le château. Dériver pendant le rendu est
  //   le seul moyen de garder ce comportement EXACTEMENT constant.
  const chambreId = chambres.some((c) => c.id === chambreChoisie)
    ? chambreChoisie
    : (chambres[0]?.id ?? null);

  // Toujours monté ? Même motif que ChatelainDashboard : on garde les setState
  // d'après-await sans annuler l'appel en vol.
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  // ── Le mois affiché, pour la chambre choisie ──────────────────────────────
  //
  // ⚠ LA FENÊTRE EST LE MOIS, PAS LA GRILLE. genererGrilleMois rend 42 cases,
  //   dont celles des mois voisins — que CalendrierSaisie NE PEINT PAS. Demander
  //   les bornes de la grille ferait lire deux mois de plus pour rien, et
  //   pourrait dépasser la fenêtre de 366 jours sur un aller-retour rapide.
  useEffect(() => {
    if (!chambreId) {
      setLignes(null);
      return undefined;
    }
    let cancelled = false;
    const { du, au } = bornesDuMois(moisAffiche);
    setChargementMois(true);
    calendrierEditionChambre(chambreId, du, au)
      .then((rows) => {
        if (!cancelled) setLignes(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setLignes([]);
          setAvis(e?.message || "Le calendrier n'a pas pu être chargé.");
        }
      })
      .finally(() => {
        if (!cancelled) setChargementMois(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chambreId, moisAffiche]);

  // Changer de chambre ou de mois annule la sélection en cours : elle portait
  // sur autre chose.
  useEffect(() => {
    setSelection(null);
  }, [chambreId, moisAffiche]);

  // ── L'état par jour, tel que CalendrierSaisie l'attend ────────────────────
  const parJour = useMemo(() => {
    const m = new Map();
    (lignes ?? []).forEach((l) => m.set(l.nuit, l.etat));
    return m;
  }, [lignes]);

  // ⚠ Le repli est `hors_gestion`, qui s'aplatit en `hors_horizon` : gris, non
  //   cliquable. Une nuit que la base n'a pas renvoyée est une nuit dont on ne
  //   sait rien — on ne l'ouvre pas.
  const etatDuJour = (jour) => parJour.get(jour) ?? "hors_gestion";

  // ── Écrire ────────────────────────────────────────────────────────────────
  async function ecrire(action, plage) {
    if (!chambreId || !plage || traitement) return;
    setTraitement(true);
    setAvis(null);
    try {
      if (action === "bloquer") {
        await poserDisponibilites(chambreId, plage.du, plage.au, false);
      } else {
        // ⚠ « Ouvrir » EFFACE le blocage, il n'écrit pas de ligne. Cf.
        //   actionPourSelection : poser une ligne `true` produirait des nuits
        //   IMMUNES à l'horizon.
        await retirerDisponibilites(chambreId, plage.du, plage.au);
      }
      // ⚠ RE-LIRE, JAMAIS DE MUTATION OPTIMISTE. Même discipline que
      //   confirmer() -> rafraichir() dans le dashboard : c'est la BASE qui
      //   dicte ce qui s'affiche.
      const { du, au } = bornesDuMois(moisAffiche);
      const rows = await calendrierEditionChambre(chambreId, du, au);
      if (monte.current) {
        setLignes(rows);
        setSelection(null);
      }
    } catch (e) {
      if (monte.current) {
        setAvis("La modification n'a pas pu être enregistrée. Réessayez dans un instant.");
        console.error("[PanneauDisponibilites] ecrire:", e);
      }
    } finally {
      if (monte.current) setTraitement(false);
    }
  }

  // ── Navigation de mois ────────────────────────────────────────────────────
  const maintenant = new Date();
  const moisCourant = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  // ⚠ On ne recule pas avant le mois courant. Ni calendrier_edition_chambre ni
  //   poser_disponibilites ne refusent le passé — on pourrait donc bloquer une
  //   nuit révolue. Sans effet, mais absurde : autant ne pas le proposer. Même
  //   garde que CalendrierPlage.
  const peutReculer = moisAffiche > moisCourant;

  const moisPrecedent = () => {
    if (!peutReculer) return;
    setMoisAffiche((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const moisSuivant = () =>
    setMoisAffiche((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // ── Les états d'écran ─────────────────────────────────────────────────────

  if (!chateau) return null;

  if (chambres.length === 0) {
    return <p className="pdi-note">Ce domaine n'a pas encore de chambre.</p>;
  }

  // ⚠ LE CAS QUI RESSEMBLE À UNE PANNE, ET QUI N'EN EST PAS. Gestion activée
  //   mais horizon absent : chaque nuit sans ligne vaut « non renseignée »,
  //   donc tout le mois est gris et rien n'est cliquable. C'est ce que la règle
  //   prescrit — mais le message doit dire QUI peut l'ouvrir, et cela dépend de
  //   l'hôte. D'où la prop plutôt qu'un texte en dur.
  const horizonManquant = chateau.dispoGeree && !chateau.dispoOuverteJusquA;

  // Le garde : hors gestion, on montre le calendrier en lecture seule plutôt
  // que de le cacher — voir n'est pas modifier, et on comprend mieux l'état
  // d'un domaine en le voyant. `traitement` verrouille aussi, le temps d'un
  // appel.
  const editable = chateau.dispoGeree && !horizonManquant && !traitement;

  const motifNonEditable = !chateau.dispoGeree
    ? motifHorsGestion
    : horizonManquant
      ? motifHorizonManquant
      : null;

  return (
    <div className="pdi-panneau">
      {/* ⚠ LES SÉLECTEURS SONT AU-DESSUS, LA BARRE D'ACTIONS EN DESSOUS, et ce
          n'est pas qu'une question de lecture : la grille porte
          `touch-action: none` en permanence (impossible de le poser au moment
          du geste, le navigateur décide au touchstart). On ne peut donc PAS
          faire défiler la page en posant le doigt dessus — ce sont ces zones
          qui donnent la surface pour l'attraper. La grille ne doit jamais
          occuper toute la hauteur de l'écran. */}
      <div className="pdi-tete">
        {selecteurDomaine ? selecteurDomaine(traitement) : null}

        <label className="pdi-champ">
          <span className="pdi-label">Chambre</span>
          <select
            className="pdi-select"
            value={chambreId ?? ""}
            onChange={(e) => setChambreChoisie(e.target.value)}
            disabled={traitement}
          >
            {chambres.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.nom}</option>
            ))}
          </select>
        </label>
      </div>

      {avis && <p className="pdi-avis">{avis}</p>}

      {chargementMois || lignes === null ? (
        // ⚠ UN BLOC DE MÊME HAUTEUR, pas une disparition. Les deux autres
        //   options étaient pires : garder l'ancienne grille peindrait les
        //   NOUVEAUX jours avec les ANCIENS états (faux), et tout griser
        //   ressemblerait à « tout fermé » (trompeur).
        <div className="pdi-attente" aria-busy="true">
          <p className="pdi-note">Chargement du mois…</p>
        </div>
      ) : (
        <CalendrierSaisie
          moisAffiche={moisAffiche}
          etatDuJour={etatDuJour}
          selection={selection}
          onSelection={setSelection}
          onBloquer={(plage) => ecrire("bloquer", plage)}
          onOuvrir={(plage) => ecrire("ouvrir", plage)}
          onMoisPrecedent={peutReculer ? moisPrecedent : () => {}}
          onMoisSuivant={moisSuivant}
          editable={editable}
          motifNonEditable={motifNonEditable}
        />
      )}

      {chateau.dispoGeree && chateau.dispoOuverteJusquA && (
        // ⚠ TEXTE DÉPLACÉ TEL QUEL — voix châtelain (« Vos dates »). Il ne
        //   convient pas à l'admin, qui n'est pas le propriétaire : 3.5b en
        //   fera une prop dont le DÉFAUT sera cette phrase, pour que le
        //   châtelain garde la sienne au mot près. Le neutraliser ici aurait
        //   fait de 3.5a autre chose qu'un déplacement.
        <p className="pdi-pied">
          Vos dates sont ouvertes jusqu'au{" "}
          <strong>{chateau.dispoOuverteJusquA}</strong>. Bloquez les périodes que vous ne
          louez pas — tout le reste reste réservable.
        </p>
      )}
    </div>
  );
}
