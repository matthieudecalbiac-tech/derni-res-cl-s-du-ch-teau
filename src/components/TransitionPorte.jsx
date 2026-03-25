import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80);   // portes s'ouvrent
    const t2 = setTimeout(() => setPhase(2), 1200); // fondu noir
    const t3 = setTimeout(onTermine, 1900);          // modal apparaît
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className="tp-wrap">
      <div className="tp-fond" />
      <div className={"tp-battant tp-gauche tp-gauche--" + (phase >= 1 ? "ouvert" : "ferme")} />
      <div className={"tp-battant tp-droite tp-droite--" + (phase >= 1 ? "ouvert" : "ferme")} />
      <div className={"tp-fondu " + (phase >= 2 ? "tp-fondu--actif" : "")} />
      <div className={"tp-centre " + (phase >= 1 ? "tp-centre--visible" : "")}>
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-label">Bienvenue</span>
        <svg className="tp-cle" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
          <circle cx="35" cy="35" r="28" fill="none" stroke="#C09840" strokeWidth="5"/>
          <circle cx="35" cy="35" r="16" fill="none" stroke="#C09840" strokeWidth="3"/>
          <circle cx="35" cy="35" r="6" fill="#C09840"/>
          <line x1="35" y1="63" x2="35" y2="165" stroke="#C09840" strokeWidth="5" strokeLinecap="round"/>
          <line x1="35" y1="110" x2="55" y2="110" stroke="#C09840" strokeWidth="5" strokeLinecap="round"/>
          <line x1="35" y1="130" x2="50" y2="130" stroke="#C09840" strokeWidth="5" strokeLinecap="round"/>
          <line x1="35" y1="150" x2="55" y2="150" stroke="#C09840" strokeWidth="5" strokeLinecap="round"/>
          <line x1="35" y1="165" x2="50" y2="165" stroke="#C09840" strokeWidth="5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}
