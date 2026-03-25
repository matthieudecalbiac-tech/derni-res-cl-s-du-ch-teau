import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine, chateau }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(onTermine, 2400);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className="tp-wrap">
      <div className="tp-fond" />
      <div className={"tp-battant tp-gauche " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-battant tp-droite " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-centre " + (phase === 1 ? "tp-centre--visible" : "")}>
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-label">Ouverture du Château</span>
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
      <div className={"tp-fondu " + (phase >= 2 ? "tp-fondu--actif" : "")} />
    </div>
  );
}
