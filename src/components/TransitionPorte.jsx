import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine, chateau }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);
    const t2 = setTimeout(() => setPhase(2), 1300);
    const t3 = setTimeout(() => setPhase(3), 2800);
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

        {chateau && chateau.coordonnees && (
          <div className={"tp-carte-france " + (phase >= 2 ? "tp-carte-france--visible" : "")}>
            <div className="tp-carte-wrap">
              <svg viewBox="0 0 500 550" className="tp-france-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="france-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(192,152,64,0.15)"/>
                    <stop offset="100%" stopColor="rgba(192,152,64,0.04)"/>
                  </radialGradient>
                </defs>
                <path d="M 262,18 L 249,22 L 231,35 L 181,106 L 124,92 L 111,146 L 30,159 L 21,186 L 87,206 L 106,239 L 140,277 L 138,298 L 143,337 L 122,425 L 130,432 L 190,461 L 235,471 L 276,479 L 282,475 L 337,427 L 354,435 L 406,424 L 422,405 L 425,403 L 430,385 L 408,355 L 396,333 L 406,295 L 408,272 L 383,265 L 379,236 L 426,202 L 432,149 L 434,127 L 420,118 L 381,102 L 369,70 L 337,65 L 310,53 L 279,31 L 262,18 Z" fill="rgba(192,152,64,0.08)" stroke="rgba(192,152,64,0.65)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
              <div
                className="tp-carte-point"
                style={{
                  left: ((chateau.coordonnees.lng + 5.1) / 14.6 * 100) + "%",
                  top: ((51.1 - chateau.coordonnees.lat) / 9.8 * 100) + "%",
                }}
              >
                <div className="tp-point-dot" />
                <div className="tp-point-ring" />
              </div>
            </div>
            <div className="tp-carte-label">
              <span className="tp-carte-dept">Localisation : {chateau.departement}</span>
            </div>
          </div>
        )}
      </div>

      <div className={"tp-fondu " + (phase >= 3 ? "tp-fondu--actif" : "")} />
    </div>
  );
}
