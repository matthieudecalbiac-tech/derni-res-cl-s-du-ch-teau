import { useEffect, useState } from "react";

// Overlay de bienvenue, joue une fois par session a l'entree dans le Club.
// Machine a etats simple (patron TransitionPorte) : apparition, tenue, fondu.
// Respecte prefers-reduced-motion : dans ce cas, l'overlay ne se monte pas
// (le parent ne l'appelle pas) -- voir PageClub.
// `nom` : le prenom quand on l'a, le nom complet a defaut (cf. PageClub). La
// prop ne s'appelle pas `prenom` parce qu'elle ne porte pas toujours un prenom.
export default function BienvenueClub({ nom, onTermine }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);    // apparition
    const t2 = setTimeout(() => setPhase(2), 2000);  // debut du fondu
    const t3 = setTimeout(() => onTermine?.(), 2800); // demontage
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className={"bvn bvn--phase" + phase} role="status" aria-live="polite">
      <div className="bvn-contenu">
        <img src="/FDL-transparent.png" alt="" className="bvn-logo" />
        <p className="bvn-texte">
          Le Club des Châtelains vous accueille,
          <span className="bvn-prenom">{nom}</span>
        </p>
        <span className="bvn-trait" />
      </div>
    </div>
  );
}
