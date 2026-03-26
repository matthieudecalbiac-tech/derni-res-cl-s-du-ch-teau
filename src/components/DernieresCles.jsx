import { useState, useEffect } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import TransitionPorte from "./TransitionPorte";
import "../styles/espace-membre.css";
import "../styles/dernieres-cles.css";


// Coordonnées des châteaux pour la carte
const CHATEAU_COORDS = {
  1: { lat: 48.5681, lng: 2.7157 },  // Vaux-le-Vicomte
  2: { lat: 49.3442, lng: 2.9797 },  // Pierrefonds
  3: { lat: 49.1936, lng: 2.4847 },  // Chantilly
  4: { lat: 48.4025, lng: 2.7017 },  // Fontainebleau
  5: { lat: 47.7197, lng: 1.9558 },  // La Ferté-Saint-Aubin
  6: { lat: 46.3764, lng: 4.6897 },  // Pierreclos
  7: { lat: 47.6833, lng: -0.5333 }, // Briottières
  8: { lat: 48.9167, lng: 0.7333 },  // Blanc Buisson
};

function projFrance(lng, lat, w, h) {
  const x = (lng + 5.1) / 14.6 * w;
  const y = (51.1 - lat) / 9.8 * h;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function getDatesPossibles() {
  const today = new Date();
  const dates = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function joursAvant(d) {
  const today = new Date();
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function chateauxDisponibles(chateaux, dateArrivee, dateDepart) {
  if (!dateArrivee) return chateaux;
  const jours = joursAvant(dateArrivee);
  return chateaux.filter(c => {
    const seuil = { "J-7": 7, "J-10": 10, "J-15": 15 }[c.urgence] || 15;
    return jours <= seuil;
  });
}

export default function DernieresCles({ onClose }) {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dateArrivee, setDateArrivee] = useState(null);
  const [dateDepart, setDateDepart] = useState(null);
  const [etape, setEtape] = useState("arrivee"); // "arrivee" | "depart"

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 60);
    const onKey = (e) => { if (e.key === "Escape" && !chateauSelectionne) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, chateauSelectionne]);

  const dates = getDatesPossibles();
  const chateauxFiltres = chateauxDisponibles(chateaux, dateArrivee, dateDepart);

  const handleSelectDate = (d) => {
    if (etape === "arrivee") {
      setDateArrivee(d);
      setDateDepart(null);
      setEtape("depart");
    } else {
      if (d > dateArrivee) {
        setDateDepart(d);
        setEtape("done");
      } else {
        setDateArrivee(d);
        setDateDepart(null);
        setEtape("depart");
      }
    }
  };

  const reset = () => {
    setDateArrivee(null);
    setDateDepart(null);
    setEtape("arrivee");
  };

  const isArrivee = (d) => dateArrivee && d.toDateString() === dateArrivee.toDateString();
  const isDepart = (d) => dateDepart && d.toDateString() === dateDepart.toDateString();
  const isBetween = (d) => dateArrivee && dateDepart && d > dateArrivee && d < dateDepart;

  return (
    <div className={"em-overlay " + (visible ? "em-overlay--visible" : "")}>

      <header className="em-header">
        <div className="em-header-gauche">
          <span className="em-header-lys">&#x269C;</span>
          <span className="em-header-titre">Les Clés du Château</span>
          <span className="em-header-sep">·</span>
          <span className="em-header-club">Les Dernières Clés</span>
        </div>
        <div className="em-header-droite">
          <button className="em-btn-retour" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="dk-hero">
        <div className="dk-hero-bg" />
        <div className="dk-hero-contenu">
          <div className="em-orn">
            <div className="em-orn-ligne" />
            <span className="em-orn-lys">&#x269C;</span>
            <div className="em-orn-ligne" />
          </div>
          <p className="dk-surtitre">Sélection · Dernière minute · J-7 à J-15</p>
          <h1 className="dk-titre">Les Dernières Clés du Château</h1>
          <p className="dk-accroche">
            Des créneaux rares, libérés par les châteaux partenaires sur leurs dates difficiles.
            Choisissez vos dates — nous vous montrons ce qui est disponible.
          </p>
        </div>
      </div>

      {/* Sélecteur de dates */}
      <div className="dk-dates-section">
        <div className="dk-dates-header">
          <div className="dk-dates-etapes">
            <div className={"dk-dates-etape " + (etape === "arrivee" ? "actif" : dateArrivee ? "done" : "")}>
              <span className="dk-dates-etape-num">1</span>
              <div>
                <span className="dk-dates-etape-label">Arrivée</span>
                <span className="dk-dates-etape-val">
                  {dateArrivee ? formatDate(dateArrivee) : "Choisissez une date"}
                </span>
              </div>
            </div>
            <div className="dk-dates-sep">→</div>
            <div className={"dk-dates-etape " + (etape === "depart" ? "actif" : dateDepart ? "done" : "")}>
              <span className="dk-dates-etape-num">2</span>
              <div>
                <span className="dk-dates-etape-label">Départ</span>
                <span className="dk-dates-etape-val">
                  {dateDepart ? formatDate(dateDepart) : "Choisissez une date"}
                </span>
              </div>
            </div>
          </div>
          {dateArrivee && (
            <button className="dk-dates-reset" onClick={reset}>
              Effacer les dates
            </button>
          )}
        </div>

        <div className="dk-calendrier">
          {dates.map((d, i) => {
            const j = joursAvant(d);
            const urgenceClass = j <= 7 ? "j7" : j <= 10 ? "j10" : "j15";
            return (
              <button
                key={i}
                className={
                  "dk-cal-jour " +
                  (isArrivee(d) ? "dk-cal-arrivee " : "") +
                  (isDepart(d) ? "dk-cal-depart " : "") +
                  (isBetween(d) ? "dk-cal-between " : "") +
                  "dk-cal-" + urgenceClass
                }
                onClick={() => handleSelectDate(d)}
              >
                <span className="dk-cal-jour-nom">
                  {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                </span>
                <span className="dk-cal-jour-num">
                  {d.toLocaleDateString("fr-FR", { day: "numeric" })}
                </span>
                <span className="dk-cal-jour-mois">
                  {d.toLocaleDateString("fr-FR", { month: "short" })}
                </span>
                {j <= 15 && (
                  <span className={"dk-cal-urgence dk-cal-urgence-" + urgenceClass}>
                    J-{j}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {dateArrivee && (
          <div className="dk-dates-resultat">
            {dateDepart ? (
              <p>
                <span className="dk-dates-res-nb">{chateauxFiltres.length}</span>
                {" "}château{chateauxFiltres.length > 1 ? "x" : ""} disponible{chateauxFiltres.length > 1 ? "s" : ""}
                {" "}du{" "}<strong>{formatDate(dateArrivee)}</strong>
                {" "}au{" "}<strong>{formatDate(dateDepart)}</strong>
              </p>
            ) : (
              <p>Sélectionnez votre date de départ</p>
            )}
          </div>
        )}
      </div>

      <div className="dk-corps-wrap">

        {/* Carte France latérale */}
        <div className="dk-carte-france-col">
          <div className="dk-carte-france-titre">
            <span className="dk-carte-france-lys">&#x269C;</span>
            <span>Localisation des domaines</span>
          </div>
          <svg viewBox="0 0 500 550" className="dk-france-svg" xmlns="http://www.w3.org/2000/svg">
            <path className="dk-france-path" d="M 262.7,18.3 L 258.4,19.4 L 251.6,21.6 L 244.8,23.8 L 238.0,25.9 L 231.2,28.1 L 224.4,30.3 L 217.6,32.5 L 210.8,34.6 L 204.0,36.8 L 197.2,39.0 L 190.4,41.2 L 186.4,37.1 L 181.0,35.4 L 175.7,33.7 L 170.3,32.0 L 165.0,30.3 L 162.0,34.1 L 156.5,33.0 L 152.1,35.2 L 147.7,37.4 L 143.3,39.6 L 138.9,41.8 L 134.5,44.0 L 130.0,41.9 L 124.4,42.6 L 118.8,43.3 L 113.2,44.0 L 107.6,44.7 L 102.0,45.4 L 96.4,46.1 L 90.8,46.8 L 88.0,52.4 L 82.7,54.9 L 77.4,57.4 L 72.1,59.9 L 66.8,62.4 L 61.5,64.9 L 60.7,71.3 L 56.3,75.3 L 51.9,79.3 L 47.5,83.3 L 43.1,87.3 L 38.7,91.3 L 38.0,98.3 L 34.0,103.1 L 30.0,107.9 L 26.0,112.7 L 22.0,117.5 L 21.4,124.9 L 21.0,132.5 L 20.6,140.1 L 20.2,147.7 L 23.4,154.4 L 24.6,162.2 L 25.8,170.0 L 27.0,177.8 L 28.2,185.6 L 34.6,190.2 L 38.6,196.8 L 42.6,203.4 L 46.6,210.0 L 50.6,216.6 L 53.4,223.9 L 58.4,229.7 L 63.4,235.5 L 68.4,241.3 L 73.4,247.1 L 81.2,250.0 L 87.2,255.0 L 93.2,260.0 L 99.2,265.0 L 105.2,270.0 L 108.8,276.8 L 115.4,280.4 L 122.0,284.0 L 128.6,287.6 L 135.2,291.2 L 142.4,293.0 L 149.8,293.6 L 157.2,294.2 L 164.6,294.8 L 172.0,295.4 L 179.2,293.4 L 186.2,290.6 L 193.2,287.8 L 200.2,285.0 L 207.2,282.2 L 213.4,278.0 L 219.0,273.2 L 224.6,268.4 L 230.2,263.6 L 235.8,258.8 L 240.2,253.0 L 243.8,246.8 L 247.4,240.6 L 251.0,234.4 L 254.6,228.2 L 254.8,220.8 L 255.0,213.2 L 257.8,206.0 L 258.8,198.4 L 259.8,190.8 L 260.8,183.2 L 261.8,175.6 L 265.2,169.0 L 266.6,161.6 L 268.0,154.2 L 269.4,146.8 L 270.8,139.4 L 272.8,132.2 L 272.2,124.6 L 271.6,117.0 L 279.2,112.0 L 284.2,106.2 L 289.2,100.4 L 294.2,94.6 L 299.2,88.8 L 299.2,81.0 L 302.0,74.2 L 304.8,67.4 L 307.6,60.6 L 310.4,53.8 L 307.8,47.0 L 307.0,39.8 L 306.2,32.6 L 305.4,25.4 L 304.6,18.2 L 298.0,14.8 L 291.0,12.2 L 284.0,9.6 L 277.0,7.0 L 270.0,9.4 L 263.4,12.2 Z" />
            {chateauxFiltres.map(c => {
              const coords = CHATEAU_COORDS[c.id];
              if (!coords) return null;
              const { x, y } = projFrance(coords.lng, coords.lat, 500, 550);
              const classBadge = { "J-7": "#C0392B", "J-10": "#D35400", "J-15": "#C09840" }[c.urgence] || "#C09840";
              return (
                <g key={c.id} onClick={() => setTransitionChateau(c)} style={{cursor:"pointer"}}>
                  <circle cx={x} cy={y} r="10" fill={classBadge} opacity="0.15" />
                  <circle cx={x} cy={y} r="5" fill={classBadge} />
                  <circle cx={x} cy={y} r="9" fill="none" stroke={classBadge} strokeWidth="1" opacity="0.5" className="dk-map-pulse" />
                  <title>{c.nom}</title>
                </g>
              );
            })}
          </svg>
          <div className="dk-carte-legende">
            <span className="dk-leg-j7">&#x25cf; J-7</span>
            <span className="dk-leg-j10">&#x25cf; J-10</span>
            <span className="dk-leg-j15">&#x25cf; J-15</span>
          </div>
        </div>

        <div className="dk-corps">
        <div className="dk-grille">
          {chateauxFiltres.map(c => {
            const classBadge = { "J-7": "dk-badge-j7", "J-10": "dk-badge-j10", "J-15": "dk-badge-j15" }[c.urgence] || "dk-badge-j15";
            const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : c.chambres?.[0]?.prix;
            return (
              <div key={c.id} className="dk-carte" onClick={() => setTransitionChateau(c)}>
                <div className="dk-carte-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                  <div className="dk-carte-img-overlay" />
                  {c.urgence && <span className={"dk-badge " + classBadge}>{c.urgence}</span>}
                  {c.reduction && <span className="dk-badge-reduction">-{c.reduction} %</span>}
                </div>
                <div className="dk-carte-corps">
                  <span className="dk-carte-region">{c.region}</span>
                  <h3 className="dk-carte-nom">{c.nom}</h3>
                  <p className="dk-carte-accroche">{c.accroche}</p>
                  <div className="dk-carte-pied">
                    <div className="dk-prix">
                      {c.prixBarre && <span className="dk-prix-barre">{c.prixBarre} €</span>}
                      {prixFinal && <span className="dk-prix-final">{prixFinal} € <span className="dk-prix-nuit">/ nuit</span></span>}
                    </div>
                    <span className="dk-carte-lien">Réserver →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <ChateauModal chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </div>
  );
}
