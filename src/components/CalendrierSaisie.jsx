import { useMemo, useRef } from "react";
import { genererGrilleMois, jourISO } from "../utils/dates";
import {
  aplatirEtat,
  estModifiable,
  plageDepuis,
  plageLimitee,
  nombreDeNuits,
} from "../utils/calendrierSaisie";
import "../styles/calendrier-saisie.css";

/**
 * Calendrier de SAISIE des disponibilités — étapes 3.3b (rendu) et 3.3c (geste).
 *
 * ⚠ CE COMPOSANT NE SAIT RIEN DE SUPABASE, et ne doit jamais l'apprendre. Il
 * reçoit un état par jour (`etatDuJour`) et remonte des intentions
 * (`onSelection`, `onBloquer`, `onOuvrir`). Aucun appel réseau, aucune règle
 * métier : le contrat de découplage de `disponibilitesService` s'applique ici
 * comme ailleurs. C'est aussi ce qui le rend démontrable sans client.
 *
 * ⚠ IL EST PILOTÉ. Le mois affiché et la sélection sont des PROPS ; le seul état
 * interne est l'ANCRE du glissement en cours, qui est un détail d'interaction et
 * non une vérité — d'où un `useRef`, pas un `useState`.
 *
 * ── LES QUATRE APPARENCES ────────────────────────────────────────────────────
 *
 *   disponible    crème, cliquable        réservable
 *   bloque        gris hachuré, cliquable le châtelain a fermé
 *   vendu         or + cadenas, INERTE    ⚠ il ne peut pas dé-vendre une nuit
 *   hors_horizon  gris pâle, INERTE       le calendrier s'arrête là
 *
 * ⚠ `hors_horizon` N'EST PAS UN ÉTAT DE LA NUIT, c'est une limite de l'écran.
 * Elle s'ouvre en déplaçant l'horizon du château, pas en cliquant la case.
 *
 * ── LE GESTE (3.3c) ─────────────────────────────────────────────────────────
 *
 * UN SEUL CHEMIN pour la souris, le doigt et le stylet : les Pointer Events les
 * unifient. ⚠ Écrire d'abord une version souris puis « ajouter le tactile »
 * aurait produit deux implémentations — et surtout, le piège de la capture
 * (ci-dessous) reste INVISIBLE à la souris et ne casse qu'au doigt.
 *
 * @param {Date} moisAffiche - 1er jour du mois à rendre.
 * @param {(jour: string) => string} etatDuJour - "YYYY-MM-DD" -> un des six
 *   états de calendrier_edition_chambre. Aplati ici même par `aplatirEtat`.
 * @param {{du: string, au: string}|null} [selection]
 * @param {(plage: {du: string, au: string}|null) => void} onSelection
 * @param {(plage: {du: string, au: string}) => void} [onBloquer]
 * @param {(plage: {du: string, au: string}) => void} [onOuvrir]
 * @param {() => void} onMoisPrecedent
 * @param {() => void} onMoisSuivant
 * @param {boolean} [editable=true] - ⚠ le GARDE. À false, aucune case n'est
 *   cliquable, aucun geste ne démarre, et le motif s'affiche. L'hôte décide :
 *   aujourd'hui il passera `dispoGeree` ; le jour où un PMS pilotera un domaine,
 *   il passera false avec le motif d'alors. Le composant n'a pas à connaître la
 *   raison, seulement l'interdit.
 * @param {string|null} [motifNonEditable]
 */
const JOURS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

// Cadenas dessiné, pas un emoji : la charte éditoriale du projet les proscrit,
// et un glyphe système rendrait différemment d'une plateforme à l'autre.
function Cadenas() {
  return (
    <svg className="csa-cadenas" viewBox="0 0 12 14" aria-hidden="true" focusable="false">
      <path d="M3 6V4a3 3 0 1 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="6" width="9" height="7" rx="1.2" fill="currentColor" />
    </svg>
  );
}

const LIBELLE_ETAT = {
  disponible: "disponible",
  bloque: "bloquée",
  vendu: "vendue",
  hors_horizon: "hors de votre horizon d'ouverture",
};

/** Le jour porté par l'élément sous le pointeur, ou null. */
function jourDeLElement(cible) {
  const el = cible && cible.closest ? cible.closest("[data-jour]") : null;
  return el ? el.dataset.jour : null;
}

export default function CalendrierSaisie({
  moisAffiche,
  etatDuJour,
  selection = null,
  onSelection,
  onBloquer,
  onOuvrir,
  onMoisPrecedent,
  onMoisSuivant,
  editable = true,
  motifNonEditable = null,
}) {
  const labelMois = moisAffiche.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // L'ancre du glissement. Un ref, pas un state : la changer ne doit pas
  // provoquer de rendu — c'est la SÉLECTION qui se peint, pas l'ancre.
  const ancre = useRef(null);
  // ⚠ GARDE ANTI-DOUBLE-DÉCLENCHEMENT. Un pointeur émet pointerdown, pointerup,
  //   PUIS click. Sans cette borne, un glissement se terminerait par un `click`
  //   qui écraserait la plage par une nuit unique — la sélection s'effondrerait
  //   au relâchement. Le clavier, lui, n'émet QUE `click` : c'est ainsi qu'on
  //   distingue les deux sans sniffer le type d'entrée.
  const dernierPointeur = useRef(0);

  const cases = useMemo(() => genererGrilleMois(moisAffiche), [moisAffiche]);

  // Les jours du mois, ORDONNÉS — ce dont `plageLimitee` a besoin pour buter
  // contre un obstacle. Les jours des mois voisins en sont exclus : ils
  // relèvent d'une autre requête.
  const joursDuMois = useMemo(
    () => cases.filter((c) => !c.horsMois).map((c) => jourISO(c.date)),
    [cases],
  );

  const estJourModifiable = (jour) => editable && estModifiable(aplatirEtat(etatDuJour(jour)));

  // N'appelle le parent que si la plage a VRAIMENT changé : un pointermove émet
  // des dizaines d'événements par seconde, et chacun ferait un rendu de la
  // grille entière.
  const majSelection = (plage) => {
    if (!onSelection || !plage) return;
    if (selection && selection.du === plage.du && selection.au === plage.au) return;
    onSelection(plage);
  };

  function onPointerDown(e) {
    if (!editable) return;
    const jour = jourDeLElement(e.target);
    if (!jour || !estJourModifiable(jour)) return;

    ancre.current = jour;
    // ⚠ LA CAPTURE EST INDISPENSABLE : sans elle, le glissement se perd dès que
    //   le pointeur quitte la case où il a commencé. On capture sur la GRILLE,
    //   pas sur la case — c'est l'élément stable.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Navigateur sans capture : le glissement sera moins fiable, le tap reste.
    }
    majSelection(plageDepuis(jour, jour));
  }

  function onPointerMove(e) {
    if (!ancre.current) return;

    // ⚠⚠ LE PIÈGE DE CETTE ÉTAPE, ET IL EST INVISIBLE À LA SOURIS.
    //   Avec setPointerCapture, TOUS les pointermove sont livrés à l'élément
    //   capturant : `e.target` désigne encore la grille, jamais la case
    //   survolée. Il faut donc demander au document ce qu'il y a sous le
    //   pointeur — c'est à cela que sert `data-jour`, posé dès 3.3b.
    const jour = jourDeLElement(document.elementFromPoint(e.clientX, e.clientY));

    // Hors d'une case (gouttière, marge, doigt sorti de la grille) : on GARDE la
    // plage précédente. L'effacer sous les yeux du châtelain serait un défaut,
    // et le doigt qui déborde est fréquent.
    if (!jour) return;

    const plage = plageLimitee(joursDuMois, ancre.current, jour, estJourModifiable);
    if (plage) majSelection(plage);
  }

  function terminer(e) {
    if (!ancre.current) return;
    ancre.current = null;
    dernierPointeur.current = Date.now();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // La capture a pu être relâchée par le navigateur (pointercancel).
    }
  }

  // ⚠ pointercancel N'EST PAS OPTIONNEL. Sur mobile, le système peut interrompre
  //   un geste — appel entrant, geste système au bord de l'écran. Sans ce
  //   gestionnaire, l'ancre resterait posée et la capture jamais relâchée : le
  //   calendrier deviendrait inerte jusqu'au rechargement.
  //   La sélection en cours est CONSERVÉE plutôt qu'annulée : rien ne s'écrit
  //   sans un appui explicite sur « Bloquer » ou « Ouvrir », donc la garder ne
  //   coûte rien — et la perdre effacerait le travail du châtelain pour une
  //   interruption qui ne le concerne pas.

  const nbNuits = nombreDeNuits(selection);

  return (
    <div className={"csa-wrap" + (editable ? "" : " csa-wrap--verrouille")}>
      <div className="csa-nav">
        <button type="button" className="csa-nav-btn" onClick={onMoisPrecedent} aria-label="Mois précédent">
          ‹
        </button>
        <span className="csa-nav-label">{labelMois}</span>
        <button type="button" className="csa-nav-btn" onClick={onMoisSuivant} aria-label="Mois suivant">
          ›
        </button>
      </div>

      {!editable && motifNonEditable && (
        // ⚠ Un seul message, en tête — PAS un état par case. Un château hors
        //   gestion n'a pas 42 nuits « spéciales », il a un mode différent.
        <p className="csa-verrou">{motifNonEditable}</p>
      )}

      <div
        className="csa-grille"
        role="grid"
        aria-label={"Disponibilités — " + labelMois}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={terminer}
        onPointerCancel={terminer}
      >
        {JOURS.map((j) => (
          <span key={j} className="csa-entete" aria-hidden="true">{j}</span>
        ))}

        {cases.map((caseJour, i) => {
          const d = caseJour.date;

          // ⚠ Les jours des mois voisins ne sont PAS rendus : ils appartiennent
          //   à une autre requête. Les peindre d'un état qu'on n'a pas demandé
          //   serait mentir.
          if (caseJour.horsMois) {
            return <span key={i} className="csa-case csa-case--horsmois" aria-hidden="true" />;
          }

          // ⚠ LA CONVERSION Date -> "YYYY-MM-DD" SE FAIT ICI, UNE FOIS, AU BORD.
          //   Tout ce qui suit ne manipule que des chaînes ISO : le fuseau est
          //   hors du chemin.
          const jour = jourISO(d);
          const apparence = aplatirEtat(etatDuJour(jour));
          const cliquable = editable && estModifiable(apparence);
          const selectionnee = Boolean(selection && jour >= selection.du && jour <= selection.au);

          return (
            <button
              key={i}
              type="button"
              // ⚠ data-jour : le seul pont entre `elementFromPoint` et la nuit.
              data-jour={jour}
              className={
                "csa-case csa-case--" + apparence + (selectionnee ? " csa-case--selection" : "")
              }
              disabled={!cliquable}
              aria-label={`${d.getDate()} ${labelMois} — ${LIBELLE_ETAT[apparence]}`}
              onClick={() => {
                // ⚠ CHEMIN CLAVIER UNIQUEMENT. Un clic de souris ou un tap ont
                //   déjà été traités par le geste ; ce `click` les suit de
                //   quelques millisecondes et écraserait la plage. Le clavier
                //   n'émet pas de pointerdown : sa fenêtre est vide.
                if (Date.now() - dernierPointeur.current < 700) return;
                if (!cliquable) return;
                majSelection(plageDepuis(jour, jour));
              }}
            >
              <span className="csa-num">{d.getDate()}</span>
              {apparence === "vendu" && <Cadenas />}
            </button>
          );
        })}
      </div>

      {editable && selection && (
        <div className="csa-actions">
          <p className="csa-actions-libelle">
            {nbNuits === 1
              ? "1 nuit sélectionnée"
              : `${nbNuits} nuits sélectionnées`}
          </p>
          <div className="csa-actions-btns">
            <button type="button" className="csa-btn" onClick={() => onSelection && onSelection(null)}>
              Annuler
            </button>
            <button type="button" className="csa-btn" onClick={() => onOuvrir && onOuvrir(selection)}>
              Ouvrir
            </button>
            <button
              type="button"
              className="csa-btn csa-btn--primaire"
              onClick={() => onBloquer && onBloquer(selection)}
            >
              Bloquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
