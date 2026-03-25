import { useState, useEffect } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import TransitionPorte from "./TransitionPorte";
import "../styles/espace-membre.css";
import "../styles/vitrines.css";

export default function VitrinePermanente({ onClose }) {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [filtre, setFiltre] = useState("tous");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 60);
    const onKey = (e) => { if (e.key === "Escape" && !chateauSelectionne) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, chateauSelectionne]);

  const regions = ["tous", ...Array.from(new Set(chateaux.map(c => c.region)))];
  const chateauxFiltres = filtre === "tous" ? chateaux : chateaux.filter(c => c.region === filtre);

  return (
    <div className={"em-overlay " + (visible ? "em-overlay--visible" : "")}>

      <header className="em-header">
        <div className="em-header-gauche">
          <span className="em-header-lys">&#x269C;</span>
          <span className="em-header-titre">Les Clés du Château</span>
          <span className="em-header-sep">·</span>
          <span className="em-header-club">Vitrines permanentes</span>
        </div>
        <div className="em-header-droite">
          <button className="em-btn-retour" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="vit-hero">
        <div className="vit-hero-bg" />
        <div className="vit-hero-contenu">
          <div className="em-orn">
            <div className="em-orn-ligne" />
            <span className="em-orn-lys">&#x269C;</span>
            <div className="em-orn-ligne" />
          </div>
          <p className="vit-surtitre">Patrimoine · France · Histoire</p>
          <h1 className="vit-titre">Les Vitrines Permanentes</h1>
          <p className="vit-accroche">
            Chaque vitrine est une page éditoriale construite comme un article de fond —
            histoire du lieu, famille propriétaire, territoire. Un univers, pas une fiche produit.
            Le château valide chaque ligne avant mise en ligne. C’est sa voix.
          </p>
          <div className="vit-stats">
            <div className="vit-stat"><span className="vit-stat-nb">81</span><span className="vit-stat-lbl">Domaines sélectionnés</span></div>
            <div className="vit-stat-sep" />
            <div className="vit-stat"><span className="vit-stat-nb">7</span><span className="vit-stat-lbl">Régions</span></div>
            <div className="vit-stat-sep" />
            <div className="vit-stat"><span className="vit-stat-nb">&lt;3h</span><span className="vit-stat-lbl">De Paris</span></div>
          </div>
        </div>
      </div>

      <div className="vit-corps">
        <div className="vit-filtres">
          {regions.map(r => (
            <button key={r}
              className={"vit-filtre " + (filtre === r ? "actif" : "")}
              onClick={() => setFiltre(r)}>
              {r === "tous" ? "Toutes les régions" : r}
            </button>
          ))}
        </div>

        <div className="vit-grille">
          {chateauxFiltres.map(c => (
            <div key={c.id} className="vit-carte" onClick={() => setTransitionChateau(c)}>
              <div className="vit-carte-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                <div className="vit-carte-img-overlay" />
                <span className="vit-carte-region">{c.region}</span>
              </div>
              <div className="vit-carte-corps">
                <h3 className="vit-carte-nom">{c.nom}</h3>
                <p className="vit-carte-accroche">{c.accroche}</p>
                {c.proprietaires?.[0]?.citation && (
                  <p className="vit-carte-citation">
                    « {c.proprietaires[0].citation.substring(0, 90)}… »
                  </p>
                )}
                <div className="vit-carte-pied">
                  <span className="vit-carte-prix">
                    {c.chambres?.[0] ? `à partir de ${c.chambres[0].prix} € / nuit` : "Sur demande"}
                  </span>
                  <span className="vit-carte-lien">Voir la vitrine →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <ChateauModal chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </div>
  );
}
