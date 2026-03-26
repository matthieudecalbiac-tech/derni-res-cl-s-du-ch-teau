import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine, chateau }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);    // portes s'ouvrent
    const t2 = setTimeout(() => setPhase(2), 1300);  // carte apparaît
    const t3 = setTimeout(() => setPhase(3), 2800);  // fondu noir
    const t4 = setTimeout(onTermine, 3500);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className="tp-wrap">
      <div className="tp-fond" />
      <div className={"tp-battant tp-gauche " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-battant tp-droite " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-centre " + (phase >= 1 && phase < 3 ? "tp-centre--visible" : "")}>
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-label">Ouverture du Château</span>
        {chateau && <span className="tp-nom">{chateau.nom}</span>}
        {chateau?.coordonnees && (
          <div className={"tp-carte-france " + (phase >= 2 ? "tp-carte-france--visible" : "")}>
            <div className="tp-carte-wrap">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/France_location_map-Regions_and_departements-2016.svg/400px-France_location_map-Regions_and_departements-2016.svg.png"
                className="tp-carte-img"
                alt="France"
              />
              {chateau.coordonnees && (
                <div
                  className="tp-carte-point"
                  style={{
                    left: `${((chateau.coordonnees.lng + 5.1) / 13.2) * 100}%`,
                    top: `${((51.1 - chateau.coordonnees.lat) / 9.8) * 100}%`,
                  }}
                >
                  <div className="tp-point-dot" />
                  <div className="tp-point-ring" />
                </div>
              )}
            </div>
            <div className="tp-carte-label">
              <span className="tp-carte-dept">Localisation : {chateau.departement}</span>
            </div>
          </div>
        )}t { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine, chateau }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);    // portes s'ouvrent
    const t2 = setTimeout(() => setPhase(2), 1300);  // carte apparaît
    const t3 = setTimeout(() => setPhase(3), 2800);  // fondu noir
    const t4 = setTimeout(onTermine, 3500);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className="tp-wrap">
      <div className="tp-fond" />
      <div className={"tp-battant tp-gauche " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-battant tp-droite " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-centre " + (phase >= 1 && phase < 3 ? "tp-centre--visible" : "")}>
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-label">Ouverture du Château</span>
        {chateau && <span className="tp-nom">{chateau.nom}</span>}
        {chateau?.coordonnees && (
          <div className={"tp-carte-france " + (phase >= 2 ? "tp-carte-france--visible" : "")}>
            <svg viewBox="0 0 300 320" className="tp-france-svg" xmlns="http://www.w3.org/2000/svg">
              <path className="tp-france-path" d="M 154,12 L 162,8 L 172,9 L 180,14 L 190,12 L 200,18 L 208,16 L 218,22 L 224,30 L 228,40 L 235,48 L 238,58 L 242,68 L 244,80 L 240,90 L 245,100 L 248,112 L 244,122 L 248,134 L 245,145 L 248,156 L 244,166 L 236,174 L 228,180 L 222,190 L 215,198 L 206,204 L 196,210 L 186,215 L 174,218 L 162,222 L 150,224 L 138,222 L 126,218 L 114,212 L 104,205 L 94,197 L 86,188 L 78,178 L 72,168 L 66,156 L 62,144 L 58,132 L 54,120 L 50,108 L 48,96 L 46,84 L 48,72 L 52,62 L 58,53 L 66,45 L 74,38 L 82,32 L 90,27 L 98,22 L 106,18 L 114,14 L 124,11 L 134,9 L 144,10 Z"/>
              {chateau.coordonnees && (
                <circle
                  cx={100 + (chateau.coordonnees.lng + 5) * 18}
                  cy={280 - (chateau.coordonnees.lat - 42) * 22}
                  r="6"
                  className="tp-france-point"
                />
              )}
              {chateau.coordonnees && (
                <circle
                  cx={100 + (chateau.coordonnees.lng + 5) * 18}
                  cy={280 - (chateau.coordonnees.lat - 42) * 22}
                  r="12"
                  className="tp-france-point-pulse"
                />
              )}
            </svg>
            <div className="tp-carte-label">
              <span className="tp-carte-region">{chateau.region}</span>
              <span className="tp-carte-distance">{chateau.distanceParis}</span>
            </div>
          </div>
        )}
        <svg className="tp-cle" viewBox="0 0 280 90" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#EDD880"/>
              <stop offset="40%" stopColor="#C09840"/>
              <stop offset="100%" stopColor="#8B6014"/>
            </linearGradient>
            <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EDD880"/>
              <stop offset="50%" stopColor="#C09840"/>
              <stop offset="100%" stopColor="#8B6014"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Anneau principal */}
          <circle cx="45" cy="45" r="34" fill="none" stroke="url(#g1)" strokeWidth="7" filter="url(#glow)"/>
          {/* Anneau intérieur décoratif */}
          <circle cx="45" cy="45" r="22" fill="none" stroke="url(#g1)" strokeWidth="3" opacity="0.7"/>
          {/* Trèfle papal — 3 cercles */}
          <circle cx="45" cy="20" r="9" fill="url(#g1)" filter="url(#glow)"/>
          <circle cx="32" cy="30" r="9" fill="url(#g1)" filter="url(#glow)"/>
          <circle cx="58" cy="30" r="9" fill="url(#g1)" filter="url(#glow)"/>
          {/* Centre trèfle */}
          <circle cx="45" cy="26" r="5" fill="#EDD880"/>
          {/* Tige principale */}
          <rect x="78" y="41" width="190" height="8" rx="4" fill="url(#g2)" filter="url(#glow)"/>
          {/* Détail tige milieu */}
          <circle cx="140" cy="45" r="5" fill="none" stroke="#EDD880" strokeWidth="2.5"/>
          <circle cx="175" cy="45" r="3.5" fill="none" stroke="#EDD880" strokeWidth="2"/>
          {/* Panneton — dents de la clé */}
          <rect x="225" y="49" width="8" height="22" rx="2" fill="url(#g1)"/>
          <rect x="242" y="49" width="8" height="16" rx="2" fill="url(#g1)"/>
          <rect x="258" y="49" width="8" height="20" rx="2" fill="url(#g1)"/>
          {/* Reflets */}
          <line x1="80" y1="43" x2="220" y2="43" stroke="#EDD880" strokeWidth="1.5" opacity="0.4"/>
        </svg>
      </div>
      <div className={"tp-fondu " + (phase >= 3 ? "tp-fondu--actif" : "")} />
    </div>
  );
}
