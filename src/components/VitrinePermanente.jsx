import { useState, useEffect } from "react";
import { useChateaux } from "../hooks/useChateaux";
import ChateauModal from "./ChateauModal";
import VitrineChateau from "./VitrineChateau";
import TransitionPorte from "./TransitionPorte";
import CarteChateaux from "./CarteChateaux";
import "../styles/espace-membre.css";
import "../styles/vitrines.css";

export default function VitrinePermanente({ onClose }) {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [filtre, setFiltre] = useState("tous");
  const [survol, setSurvol] = useState(null);
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

  const { chateaux, loading, error } = useChateaux();
  const regions = ["tous", ...Array.from(new Set(chateaux.map(c => c.region)))];
  const chateauxFiltres = filtre === "tous" ? chateaux : chateaux.filter(c => c.region === filtre);

  return (
    <div className={"em-overlay vit-page " + (visible ? "em-overlay--visible" : "")}>

      <header className="vit-topbar">
        <button className="vit-topbar-logo" onClick={onClose} aria-label="Accueil">
          <img src="/L1.png" alt="" aria-hidden="true" className="vit-topbar-embleme" />
          <img src="/L2.png" alt="Les Clés du Château" className="vit-topbar-wordmark" />
        </button>
        <span className="vit-topbar-titre">Vitrines permanentes</span>
      </header>

      <div className="vit-hero">
        <div className="vit-hero-bg" />
        <div className="vit-hero-grille">
          <div className="vit-hero-titrecol">
            <p className="vit-fil">Accueil <span>&rsaquo;</span> Les Vitrines Permanentes</p>
            <h1 className="vit-titre">Les Vitrines<br />Permanentes</h1>
          </div>
          <div className="vit-hero-introcol">
            <p className="vit-surtitre">Patrimoine &middot; France &middot; Histoire</p>
            <p className="vit-accroche">
              <span className="vit-lettrine">C</span>haque vitrine est une page éditoriale
              construite comme un article de fond &mdash; histoire du lieu, famille propriétaire,
              territoire. <strong>Un univers, pas une fiche produit.</strong>
            </p>
            <p className="vit-citation">
              Le château valide chaque ligne avant mise en ligne. C&rsquo;est sa voix.
            </p>
          </div>
          <div className="vit-hero-gravure" />
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

        <div className="vit-corps-bas">
          <aside className="vit-carte-france">
            <h3 className="vit-carte-titre">Où trouver nos châteaux</h3>
            <CarteChateaux
              chateaux={chateauxFiltres}
              survolId={survol}
              onSurvol={setSurvol}
              onOuvrir={(id) => {
                const c = chateaux.find((ch) => ch.id === id);
                if (c) setTransitionChateau(c);
              }}
            />
          </aside>

          <div className="vit-grille">
            {chateauxFiltres.map(c => (
              <div key={c.id}
                className={"vit-carte" + (survol === c.id ? " actif" : "")}
                onClick={() => setTransitionChateau(c)}
                onMouseEnter={() => setSurvol(c.id)}
                onMouseLeave={() => setSurvol(null)}>
                <div className="vit-carte-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                  <div className="vit-carte-img-overlay" />
                  <span className="vit-carte-region">{c.region}</span>
                </div>
                <div className="vit-carte-corps">
                  <h3 className="vit-carte-nom">{c.nom}</h3>
                  <p className="vit-carte-accroche">{c.accroche}</p>
                  <div className="vit-carte-pied">
                    <span className="vit-carte-prix">
                      {c.chambres?.[0] ? `à partir de ${c.chambres[0].prix} € / nuit` : "Sur demande"}
                    </span>
                    <span className="vit-carte-lien">Lire l’article →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        (transitionChateau || chateauSelectionne).estLaUne === true
          ? <VitrineChateau chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
          : <ChateauModal chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </div>
  );
}