import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(onTermine, 1700);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className="tp-wrap">
      <div className="tp-fond" />
      <div className={"tp-battant tp-gauche tp-gauche--" + (phase >= 1 ? "ouvert" : "ferme")} />
      <div className={"tp-battant tp-droite tp-droite--" + (phase >= 1 ? "ouvert" : "ferme")} />
      <div className={"tp-fondu " + (phase >= 2 ? "tp-fondu--actif" : "")} />
      <div className={"tp-lys-wrap " + (phase >= 1 ? "tp-lys-wrap--visible" : "")}>
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-label">Bienvenue</span>
      </div>
    </div>
  );
}
