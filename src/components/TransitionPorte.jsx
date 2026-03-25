import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);    // portes s'ouvrent
    const t2 = setTimeout(() => setPhase(2), 1400);  // fondu noir complet
    const t3 = setTimeout(onTermine, 2100);           // on retire la transition
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className="tp-wrap">
      <div className="tp-fond" />
      <div className={"tp-battant tp-gauche " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-battant tp-droite " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-centre " + (phase >= 1 && phase < 2 ? "tp-centre--visible" : "")} >
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-label">Bienvenue</span>
        <svg className="tp-cle" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="orGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EDD880"/>
              <stop offset="100%" stopColor="#8B6014"/>
            </radialGradient>
          </defs>
          <circle cx="28" cy="40" r="22" fill="none" stroke="url(#orGrad)" strokeWidth="5"/>
          <circle cx="28" cy="40" r="12" fill="none" stroke="url(#orGrad)" strokeWidth="3"/>
          <circle cx="28" cy="40" r="4" fill="#C09840"/>
          <rect x="28" y="28" width="4" height="4" fill="#C09840" rx="1"/>
          <line x1="50" y1="40" x2="185" y2="40" stroke="url(#orGrad)" strokeWidth="5" strokeLinecap="round"/>
          <rect x="145" y="40" width="5" height="16" fill="#C09840" rx="2"/>
          <rect x="160" y="40" width="5" height="12" fill="#C09840" rx="2"/>
          <rect x="175" y="40" width="5" height="18" fill="#C09840" rx="2"/>
          <circle cx="97" cy="40" r="5" fill="none" stroke="#C09840" strokeWidth="2.5"/>
          <circle cx="120" cy="40" r="3.5" fill="none" stroke="#C09840" strokeWidth="2"/>
          <path d="M 20 40 A 8 8 0 0 1 28 32" fill="none" stroke="#EDD880" strokeWidth="1.5" opacity="0.6"/>
        </svg>
      </div>
      <div className={"tp-fondu " + (phase >= 2 ? "tp-fondu--actif" : "")} />
    </div>
  );
}
