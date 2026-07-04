import { useState } from "react";
import { genererGrilleMois, estMemeJour, estEntre } from "../utils/dates";
import "../styles/calendrier-plage.css";

// Calendrier de plage 2 mois, reutilisable (barre de recherche + carte).
// Semi-controle : dateArrivee/dateDepart sont la source de verite du PARENT
// (criteres partages, envoyes a l'URL) ; l'etape de saisie et le mois affiche
// sont des details d'interaction INTERNES. Le parent applique la machine a
// etats via onSelectDate ; le calendrier ne fait que rendre + remonter le clic.
export default function CalendrierPlage({ dateArrivee, dateDepart, etape, onSelectDate, onReset }) {
  const [moisAffiche, setMoisAffiche] = useState(() => {
    const base = dateArrivee || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const moisCourant = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
  const peutReculer = moisAffiche > moisCourant;

  const estSelectionnable = (d) => {
    const jour = new Date(d);
    jour.setHours(0, 0, 0, 0);
    return jour >= aujourdhui;
  };

  const moisPrecedent = () => {
    if (peutReculer) setMoisAffiche((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const moisSuivant = () =>
    setMoisAffiche((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const isArrivee = (d) => estMemeJour(d, dateArrivee);
  const isDepart = (d) => estMemeJour(d, dateDepart);
  const isBetween = (d) => estEntre(d, dateArrivee, dateDepart);

  const rendreGrille = (premierDuMois) => {
    const label = premierDuMois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return (
      <div className="cp-mois">
        <div className="cp-mois-label">{label}</div>
        <div className="cp-grille">
          {["Lu","Ma","Me","Je","Ve","Sa","Di"].map((j) => (
            <span key={j} className="cp-entete">{j}</span>
          ))}
          {genererGrilleMois(premierDuMois).map((caseJour, i) => {
            const d = caseJour.date;
            if (caseJour.horsMois) {
              return <span key={i} className="cp-case cp-case--horsmois">{d.getDate()}</span>;
            }
            const selectionnable = estSelectionnable(d);
            const classes =
              "cp-case" +
              (selectionnable ? " cp-case--dispo" : " cp-case--off") +
              (isArrivee(d) ? " cp-arrivee" : "") +
              (isDepart(d) ? " cp-depart" : "") +
              (isBetween(d) ? " cp-between" : "");
            return (
              <button
                key={i}
                type="button"
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
  };

  const moisSuivantDate = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 1);

  return (
    <div className="cp-wrap">
      <div className="cp-etape">
        {etape === "arrivee" ? "Sélectionnez votre arrivée" : "Sélectionnez votre départ"}
      </div>
      <div className="cp-nav">
        <button type="button" className="cp-nav-btn" onClick={moisPrecedent} disabled={!peutReculer} aria-label="Mois précédent">‹</button>
        <button type="button" className="cp-nav-btn" onClick={moisSuivant} aria-label="Mois suivant">›</button>
      </div>
      <div className="cp-duo">
        {rendreGrille(moisAffiche)}
        {rendreGrille(moisSuivantDate)}
      </div>
      {dateArrivee && (
        <div className="cp-pied">
          <button type="button" className="cp-reset" onClick={onReset}>Effacer les dates</button>
        </div>
      )}
    </div>
  );
}
