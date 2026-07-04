import { useEffect, useState } from "react";
import "../styles/transition-porte.css";
import { FRANCE_MAIN, FRANCE_CORSE, projeter } from "../utils/franceSvg";

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
        <span className="tp-label">Bienvenue</span>
        {chateau && <span className="tp-nom">{chateau.nom}</span>}

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
          <circle cx="45" cy="45" r="34" fill="none" stroke="url(#g1)" strokeWidth="7" filter="url(#glow)"/>
          <circle cx="45" cy="45" r="22" fill="none" stroke="url(#g1)" strokeWidth="3" opacity="0.7"/>
          <circle cx="45" cy="20" r="9" fill="url(#g1)" filter="url(#glow)"/>
          <circle cx="32" cy="30" r="9" fill="url(#g1)" filter="url(#glow)"/>
          <circle cx="58" cy="30" r="9" fill="url(#g1)" filter="url(#glow)"/>
          <circle cx="45" cy="26" r="5" fill="#EDD880"/>
          <rect x="78" y="41" width="190" height="8" rx="4" fill="url(#g2)" filter="url(#glow)"/>
          <circle cx="140" cy="45" r="5" fill="none" stroke="#EDD880" strokeWidth="2.5"/>
          <circle cx="175" cy="45" r="3.5" fill="none" stroke="#EDD880" strokeWidth="2"/>
          <rect x="225" y="49" width="8" height="22" rx="2" fill="url(#g1)"/>
          <rect x="242" y="49" width="8" height="16" rx="2" fill="url(#g1)"/>
          <rect x="258" y="49" width="8" height="20" rx="2" fill="url(#g1)"/>
          <line x1="80" y1="43" x2="220" y2="43" stroke="#EDD880" strokeWidth="1.5" opacity="0.4"/>
        </svg>

        <div className="tp-carte">
          <svg viewBox="0 0 520 520" className="tp-france-svg" role="img" aria-label="Carte de France">
            <defs>
              <filter id="tpInk" x="-12%" y="-12%" width="124%" height="124%">
                <feGaussianBlur stdDeviation="1.6" />
              </filter>
              <filter id="tpCote" x="-15%" y="-15%" width="130%" height="130%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            <path d={FRANCE_MAIN} className="tp-cf-cote" filter="url(#tpCote)" />
            <path d={FRANCE_MAIN} className="tp-cf-halo" filter="url(#tpInk)" />
            <path d={FRANCE_MAIN} className="tp-cf-terre" />
            <path d={FRANCE_CORSE} className="tp-cf-cote" filter="url(#tpCote)" />
            <path d={FRANCE_CORSE} className="tp-cf-halo" filter="url(#tpInk)" />
            <path d={FRANCE_CORSE} className="tp-cf-terre" />
            {chateau?.coordonnees && (() => {
              const p = projeter(chateau.coordonnees.lat, chateau.coordonnees.lng);
              return (
                <g>
                  <circle cx={p.x} cy={p.y} r="9" className="tp-cf-halo-pt" />
                  <circle cx={p.x} cy={p.y} r="4.5" className="tp-cf-dot" />
                </g>
              );
            })()}
          </svg>
          {chateau?.departement && (
            <div className="tp-carte-dept">Localisation · {chateau.departement}</div>
          )}
        </div>
      </div>

      <div className={"tp-fondu " + (phase >= 3 ? "tp-fondu--actif" : "")} />
    </div>
  );
}
