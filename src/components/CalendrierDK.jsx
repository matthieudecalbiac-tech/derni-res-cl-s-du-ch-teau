import { genererGrilleMois, estMemeJour, estEntre } from "../utils/dates";

/**
 * Calendrier mensuel de Dernieres Cles.
 *
 * Extrait de `DernieresCles.jsx` (lignes 189-224) a l'etape 2 de la refonte
 * Prop 3. DEPLACEMENT STRICT : le DOM rendu est identique au caractere pres,
 * classes et ordre compris. Le redesign vient aux etapes 4 et 5 ; melanger les
 * deux aurait rendu l'invariant desktop inverifiable.
 *
 * ⚠ CE COMPOSANT NE SAIT RIEN DE LA DISPONIBILITE, et ne doit jamais
 * l'apprendre. Il recoit `estSelectionnable` en prop et l'applique. La regle
 * elle-meme vit dans `src/services/disponibilitesService.js`, seul endroit
 * autorise a repondre « disponible ou non » (cf. son contrat de decouplage).
 * A l'etape 3, c'est le CORPS de cette prop qui changera de source — pas ce
 * fichier.
 *
 * Pourquoi PAS de prop `etape` : la bascule arrivee/depart ne change rien au
 * rendu du calendrier. Elle vit dans le parent, qui la consulte au moment du
 * clic (`handleSelectDate`). Passer `etape` ici serait une prop inerte, et une
 * fausse piste pour le prochain lecteur.
 *
 * @param {Date}   moisAffiche         1er jour du mois affiche
 * @param {Date|null} dateArrivee
 * @param {Date|null} dateDepart
 * @param {(d: Date) => boolean} estSelectionnable
 * @param {(d: Date) => void}    onSelectDate
 * @param {() => void} onMoisPrecedent
 * @param {() => void} onMoisSuivant
 */
const JOURS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

export default function CalendrierDK({
  moisAffiche,
  dateArrivee,
  dateDepart,
  estSelectionnable,
  onSelectDate,
  onMoisPrecedent,
  onMoisSuivant,
}) {
  const labelMois = moisAffiche.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Etape 5 : la plage se rend comme une bande continue, et non plus comme des
  // pastilles disjointes. Les deux extremites ne portent leur demi-bande que si
  // la plage est COMPLETE — sinon une arrivee seule afficherait un trait qui ne
  // mene nulle part, le temps que l'utilisateur choisisse son depart.
  //
  // Derive des props existantes plutot que recue : le composant sait deja les
  // deux dates, une prop de plus serait une verite dupliquee.
  const plageComplete = Boolean(dateArrivee && dateDepart);

  return (
    <div className="dk-cal-mois">
      <div className="dk-cal-nav">
        <button className="dk-cal-nav-btn" onClick={onMoisPrecedent} aria-label="Mois précédent">‹</button>
        <span className="dk-cal-nav-label">{labelMois}</span>
        <button className="dk-cal-nav-btn" onClick={onMoisSuivant} aria-label="Mois suivant">›</button>
      </div>
      <div className={"dk-cal-grille" + (plageComplete ? " dk-cal-grille--plage" : "")}>
        {JOURS.map((j) => (
          <span key={j} className="dk-cal-jour-entete">{j}</span>
        ))}
        {genererGrilleMois(moisAffiche).map((caseJour, i) => {
          const d = caseJour.date;
          if (caseJour.horsMois) {
            return <span key={i} className="dk-cal-case dk-cal-case-horsmois">{d.getDate()}</span>;
          }
          const selectionnable = estSelectionnable(d);
          const classes =
            "dk-cal-case" +
            (selectionnable ? " dk-cal-case-dispo" : " dk-cal-case-off") +
            (estMemeJour(d, dateArrivee) ? " dk-cal-arrivee" : "") +
            (estMemeJour(d, dateDepart) ? " dk-cal-depart" : "") +
            (estEntre(d, dateArrivee, dateDepart) ? " dk-cal-between" : "");
          return (
            <button
              key={i}
              className={classes}
              disabled={!selectionnable}
              onClick={() => selectionnable && onSelectDate(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
