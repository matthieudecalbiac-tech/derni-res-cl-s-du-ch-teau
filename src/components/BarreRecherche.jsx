import { useState, useRef, useEffect } from "react";
import { useChateaux } from "../hooks/useChateaux";
import { getRegionsAvecChateaux } from "../utils/regions";
import "../styles/barre-recherche.css";

export default function BarreRecherche() {
  const { chateaux } = useChateaux();
  const [destOuvert, setDestOuvert] = useState(false);
  const [selection, setSelection] = useState(null); // { type: "region"|"chateau", region, chateau? }
  const destRef = useRef(null);

  const regions = getRegionsAvecChateaux(chateaux);

  // Fermeture au clic-dehors
  useEffect(() => {
    if (!destOuvert) return;
    const onClick = (e) => {
      if (destRef.current && !destRef.current.contains(e.target)) setDestOuvert(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [destOuvert]);

  const labelDestination = selection
    ? selection.type === "chateau"
      ? selection.chateau.nom
      : selection.region
    : "Où rêvez-vous d’aller ?";

  const choisirRegion = (region) => {
    setSelection({ type: "region", region });
    setDestOuvert(false);
  };
  const choisirChateau = (region, chateau) => {
    setSelection({ type: "chateau", region, chateau });
    setDestOuvert(false);
  };

  return (
    <div className="barre-recherche">
      <div className="br-inner">
        <div className="br-carte">

          {/* DESTINATION (deroulant) */}
          <div className="br-champ br-champ--dest" ref={destRef}>
            <button
              type="button"
              className="br-champ-btn"
              onClick={() => setDestOuvert((o) => !o)}
              aria-expanded={destOuvert}
            >
              <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 16s5-4.4 5-8.5a5 5 0 0 0-10 0C4 11.6 9 16 9 16Z" stroke="#C09840" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="9" cy="7.5" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
              </svg>
              <span className="br-champ-txt">
                <span className="br-label">Destination</span>
                <span className="br-valeur">{labelDestination}</span>
              </span>
              <svg className={"br-chevron" + (destOuvert ? " br-chevron--ouvert" : "")} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {destOuvert && (
              <div className="br-dest-panneau">
                {regions.length === 0 && (
                  <p className="br-dest-vide">Chargement des destinations…</p>
                )}
                {regions.map((r) => (
                  <div className="br-dest-region" key={r.region}>
                    <button
                      type="button"
                      className="br-dest-region-titre"
                      onClick={() => choisirRegion(r.region)}
                    >
                      {r.region}
                    </button>
                    <ul className="br-dest-chateaux">
                      {r.chateaux.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="br-dest-chateau"
                            onClick={() => choisirChateau(r.region, c)}
                          >
                            {c.nom}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="br-sep" />

          {/* DATES (statique pour l'instant) */}
          <div className="br-champ">
            <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="4.5" width="12" height="10.5" rx="1.5" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 7.5h12M6 3v3M12 3v3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="br-champ-txt">
              <span className="br-label">Dates</span>
              <span className="br-valeur">Arrivée — Départ</span>
            </div>
            <svg className="br-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className="br-sep" />

          {/* INVITES (statique pour l'instant) */}
          <div className="br-champ">
            <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="6.8" cy="6.5" r="2.3" stroke="#C09840" strokeWidth="1.5"/>
              <circle cx="12.2" cy="7" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 15c0-2.1 1.7-3.4 3.8-3.4S10.6 12.9 10.6 15" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11.2 11.7c1.9 0 3.3 1.2 3.3 3.3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="br-champ-txt">
              <span className="br-label">Invités</span>
              <span className="br-valeur">2 invités</span>
            </div>
            <svg className="br-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <button className="br-cta">Trouver votre château <span className="br-cta-fl">→</span></button>
        </div>
      </div>
    </div>
  );
}
