import { useState, useEffect } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import "../styles/espace-membre.css";
import "../styles/dernieres-cles.css";

export default function DernieresClés({ onClose }) {
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

  const urgences = ["tous", "J-7", "J-10", "J-15"];
  const chateauxFiltres = filtre === "tous" ? chateaux : chateaux.filter(c => c.urgence === filtre);

  return (
    <div className={"em-overlay " + (visible ? "em-overlay--visible" : "")}>

      <header className="em-header">
        <div className="em-header-gauche">
          <span className="em-header-lys">&#x269C;</span>
          <span className="em-header-titre">Les Clés du Château</span>
          <span className="em-header-sep">·</span>
          <span className="em-header-club">Les Dernières Clés</span>
        </div>
        <div className="em-header-droite">
          <button className="em-btn-retour" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="dk-hero">
        <div className="dk-hero-bg" />
        <div className="dk-hero-contenu">
          <div className="em-orn">
            <div className="em-orn-ligne" />
            <span className="em-orn-lys">&#x269C;</span>
            <div className="em-orn-ligne" />
          </div>
          <p className="dk-surtitre">Sélection · Dernière minute · J-7 à J-15</p>
          <h1 className="dk-titre">Les Dernières Clés du Château</h1>
          <p className="dk-accroche">
            Des créneaux rares, libérés par les châteaux partenaires sur leurs dates difficiles.
            Ni braderie, ni promotion de masse — des opportunités confidentielles,
            proposées en avant-première aux membres du Club avant ouverture au public.
          </p>
          <div className="dk-urgence-intro">
            <div className="dk-urgence-item dk-j7"><span className="dk-urgence-label">J-7</span><span className="dk-urgence-desc">Cette semaine</span></div>
            <div className="dk-urgence-item dk-j10"><span className="dk-urgence-label">J-10</span><span className="dk-urgence-desc">Dans 10 jours</span></div>
            <div className="dk-urgence-item dk-j15"><span className="dk-urgence-label">J-15</span><span className="dk-urgence-desc">Dans 15 jours</span></div>
          </div>
        </div>
      </div>

      <div className="dk-corps">
        <div className="dk-filtres">
          {urgences.map(u => (
            <button key={u} className={"dk-filtre " + (filtre === u ? "actif" : "")} onClick={() => setFiltre(u)}>
              {u === "tous" ? "Toutes les fenêtres" : u}
            </button>
          ))}
        </div>

        <div className="dk-grille">
          {chateauxFiltres.map(c => {
            const classBadge = { "J-7": "dk-badge-j7", "J-10": "dk-badge-j10", "J-15": "dk-badge-j15" }[c.urgence] || "dk-badge-j15";
            const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : c.chambres?.[0]?.prix;
            return (
              <div key={c.id} className="dk-carte" onClick={() => setChateauSelectionne(c)}>
                <div className="dk-carte-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                  <div className="dk-carte-img-overlay" />
                  {c.urgence && <span className={"dk-badge " + classBadge}>{c.urgence}</span>}
                  {c.reduction && <span className="dk-badge-reduction">-{c.reduction} %</span>}
                </div>
                <div className="dk-carte-corps">
                  <span className="dk-carte-region">{c.region}</span>
                  <h3 className="dk-carte-nom">{c.nom}</h3>
                  <p className="dk-carte-accroche">{c.accroche}</p>
                  <div className="dk-carte-pied">
                    <div className="dk-prix">
                      {c.prixBarre && <span className="dk-prix-barre">{c.prixBarre} €</span>}
                      {prixFinal && <span className="dk-prix-final">{prixFinal} € <span className="dk-prix-nuit">/ nuit</span></span>}
                    </div>
                    <span className="dk-carte-lien">Réserver →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {chateauSelectionne && (
        <ChateauModal chateau={chateauSelectionne} onClose={() => setChateauSelectionne(null)} />
      )}
    </div>
  );
}
