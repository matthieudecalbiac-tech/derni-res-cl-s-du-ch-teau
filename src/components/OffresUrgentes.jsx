import { useState } from "react";
import { chateaux } from "../data/chateaux";
import ChateauCard from "./ChateauCard";
import "../styles/offres.css";

const FILTRES = [
  { label: "Tous", valeur: "tous" },
  { label: "J-7 · Urgent", valeur: "J-7" },
  { label: "J-10", valeur: "J-10" },
  { label: "J-15", valeur: "J-15" },
  { label: "< 1h de Paris", valeur: "proche" },
  { label: "Avec spa", valeur: "spa" },
  { label: "Équitation", valeur: "equitation" },
];

const TICKER_ITEMS = [
  "Château de Vaux-le-Vicomte · J-7 · 380 €",
  "Château de Chantilly · J-15 · 450 €",
  "Château de Fontainebleau · J-7 · 520 €",
  "Château de Pierrefonds · J-10 · 290 €",
  "Château de Pierreclos · J-15 · 195 €",
  "Château de La Ferté-Saint-Aubin · J-10 · 220 €",
];

export default function OffresUrgentes({ onSelectChateau }) {
  const [filtreActif, setFiltreActif] = useState("tous");

  const chateauxFiltres = chateaux.filter((c) => {
    if (filtreActif === "tous") return true;
    if (filtreActif === "J-7") return c.urgence === "J-7";
    if (filtreActif === "J-10") return c.urgence === "J-10";
    if (filtreActif === "J-15") return c.urgence === "J-15";
    if (filtreActif === "proche") return parseInt(c.distanceParis) < 100;
    if (filtreActif === "spa")
      return c.experiences.some((e) => e.toLowerCase().includes("spa"));
    if (filtreActif === "equitation") return c.tags.includes("Équitation");
    return true;
  });

  return (
    <>
      {/* Ticker doré */}
      <div className="ticker-section">
        <div className="ticker-inner">
          <span className="ticker-label">◆ Disponible maintenant</span>
          <div className="ticker-track">
            <div className="ticker-items">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="ticker-item">
                  <span className="ticker-dot" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section offres */}
      <section className="offres-section" id="offres">
        <div className="offres-inner">
          <div className="offres-entete">
            <div className="offres-entete-gauche">
              <span className="sur-titre">
                Disponibilités · Dernière minute
              </span>
              <h2>Les clés du moment</h2>
              <p>
                Des chambres d'exception à saisir avant qu'il ne soit trop tard
              </p>
            </div>
            <button className="btn-contour">Voir tous les châteaux</button>
          </div>

          <div className="filtres-rapides">
            {FILTRES.map((f) => (
              <button
                key={f.valeur}
                className={`filtre-pill ${
                  filtreActif === f.valeur ? "actif" : ""
                }`}
                onClick={() => setFiltreActif(f.valeur)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="offres-grille">
            {chateauxFiltres.map((chateau, i) => (
              <div
                key={chateau.id}
                className="animate-fadeInUp"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <ChateauCard
                  chateau={chateau}
                  onClick={() => onSelectChateau(chateau)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bande stats or */}
      <div className="stats-bande">
        <div className="stat-item">
          <span className="stat-nombre">24</span>
          <span className="stat-label">Châteaux partenaires</span>
        </div>
        <div className="stat-item">
          <span className="stat-nombre">4,8★</span>
          <span className="stat-label">Note moyenne clients</span>
        </div>
        <div className="stat-item">
          <span className="stat-nombre">−36%</span>
          <span className="stat-label">Économie moyenne</span>
        </div>
        <div className="stat-item">
          <span className="stat-nombre">&lt; 3h</span>
          <span className="stat-label">De Paris en voiture</span>
        </div>
      </div>
    </>
  );
}
