import { useEffect, useState } from "react";
import "../styles/club-bienvenue.css";

export default function ClubBienvenue({ user, onTermine }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);   // texte apparait
    const t2 = setTimeout(() => setPhase(2), 1400);  // sous-titre
    const t3 = setTimeout(() => setPhase(3), 2800);  // fondu noir commence
    const t4 = setTimeout(onTermine, 3800);           // bascule APRES fondu complet
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className={"cb-wrap " + (phase >= 3 ? "cb-sortie" : "")}>
      <div className="cb-fond" />
      <div className={"cb-fondu " + (phase >= 3 ? "cb-fondu--actif" : "")} />
      <div className={"cb-centre " + (phase >= 1 ? "cb-visible" : "")}>
        <div className="cb-ornement">
          <span className="cb-trait" />
          <span className="cb-lys">&#x269C;</span>
          <span className="cb-trait" />
        </div>
        <p className="cb-bienvenue">Bienvenue</p>
        <h1 className="cb-nom">{user?.prenom || user?.nom || user?.email?.split("@")[0] || "cher membre"}</h1>
        <div className={"cb-sous " + (phase >= 2 ? "cb-sous--visible" : "")}>
          <div className="cb-ornement cb-ornement--petit">
            <span className="cb-trait" />
            <span className="cb-lys cb-lys--petit">&#x269C;</span>
            <span className="cb-trait" />
          </div>
          <p className="cb-club">dans le Club des Châtelains</p>
        </div>
      </div>
    </div>
  );
}
