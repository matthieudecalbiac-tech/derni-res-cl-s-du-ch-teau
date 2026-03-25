import { useState, useEffect } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import "../styles/espace-membre.css";

export default function VitrinePermanente({ onClose }) {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
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

      <div className="em-page-titre">
        <div className="em-page-titre-bg" />
        <div className="em-page-titre-contenu">
          <div className="em-orn">
            <div className="em-orn-ligne" />
            <span className="em-orn-lys">&#x269C;</span>
            <div className="em-orn-ligne" />
          </div>
          <span className="em-surtitre">Patrimoine · France · Histoire</span>
          <h1 className="em-grand-titre">Les Vitrines Permanentes</h1>
          <div className="em-intro-textes">
            <p className="em-intro-p">Chaque vitrine est une page éditoriale construite comme un article de fond — histoire du château, architecture, famille propriétaire, région et patrimoine environnant. Un univers, pas une fiche produit.</p>
            <p className="em-intro-p">Le château valide chaque ligne, chaque photographie, chaque description avant mise en ligne. C’est sa voix — nous la rédigeons, il l’approuve. Aucun contenu publié sans son accord explicite.</p>
            <p className="em-intro-p">Les vitrines sont accessibles à tous. Les offres et packages exclusifs associés sont réservés aux membres du Club des Châtelains.</p>
          </div>
          <div className="em-intro-stats">
            <div className="em-stat"><span className="em-stat-nombre">81</span><span className="em-stat-label">Domaines sélectionnés</span></div>
            <div className="em-stat-sep" />
            <div className="em-stat"><span className="em-stat-nombre">7</span><span className="em-stat-label">Régions couvertes</span></div>
            <div className="em-stat-sep" />
            <div className="em-stat"><span className="em-stat-nombre">&lt;3h</span><span className="em-stat-label">De Paris</span></div>
          </div>
        </div>
      </div>

      <div className="em-contenu">
        <div className="em-filtres">
          {regions.map(r => (
            <button key={r} className={"em-filtre-btn " + (filtre === r ? "actif" : "")} onClick={() => setFiltre(r)}>
              {r === "tous" ? "Toutes les régions" : r}
            </button>
          ))}
        </div>

        <div className="em-grille">
          {chateauxFiltres.map(c => (
            <div key={c.id} className="em-chateau-carte" onClick={() => setChateauSelectionne(c)}>
              <div className="em-carte-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                <div className="em-carte-overlay" />
                <span className="em-carte-region">{c.region}</span>
              </div>
              <div className="em-carte-corps">
                <h3 className="em-carte-nom">{c.nom}</h3>
                <p className="em-carte-accroche">{c.accroche}</p>
                {c.proprietaires?.[0]?.citation && (
                  <p className="em-carte-citation">« {c.proprietaires[0].citation.substring(0, 80)}… »</p>
                )}
                <div className="em-carte-pied">
                  <span className="em-carte-prix">
                    {c.chambres?.[0] ? `à partir de ${c.chambres[0].prix} € / nuit` : "Sur demande"}
                  </span>
                  <span className="em-carte-cta">Voir la vitrine →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {chateauSelectionne && (
        <ChateauModal chateau={chateauSelectionne} onClose={() => setChateauSelectionne(null)} />
      )}
    </div>
  );
}
