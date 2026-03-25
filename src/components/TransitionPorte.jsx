import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine }) {
  const [phase, setPhase] = useState("init");

  useEffect(() => {
    // init -> fermee (frame suivante pour déclencher la transition CSS)
    const t0 = setTimeout(() => setPhase("fermee"), 50);
    // fermee -> ouverture (porte s'ouvre)
    const t1 = setTimeout(() => setPhase("ouverture"), 200);
    // ouverture -> fondu (lumière envahit)
    const t2 = setTimeout(() => setPhase("fondu"), 1200);
    // fondu -> onTermine (la modal est déjà montée en dessous)
    const t3 = setTimeout(onTermine, 1800);
    return () => [t0,t1,t2,t3].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className={"tp-overlay tp-phase-" + phase}>
      <div className="tp-fond" />
      <div className="tp-porte-gauche">
        <div className="tp-porte-detail" />
        <div className="tp-porte-poignee tp-porte-poignee--g" />
      </div>
      <div className="tp-porte-droite">
        <div className="tp-porte-detail" />
        <div className="tp-porte-poignee tp-porte-poignee--d" />
      </div>
      <div className="tp-lumiere" />
      <div className="tp-centre">
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-texte">Bienvenue</span>
      </div>
    </div>
  );
}
