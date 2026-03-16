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
  { label: "Avec équitation", valeur: "equitation" },
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
    <section className="offres-section" id="offres">
      <div className="offres-inner">
        {/* En-tête */}
        <div className="offres-entete">
          <div className="offres-entete-gauche">
            <span className="sur-titre">Disponibilités · Dernière minute</span>
            <h2>Les clés du moment</h2>
            <p>
              Des chambres d'exception à saisir avant qu'il ne soit trop tard
            </p>
          </div>
          <div className="offres-entete-droite">
            <button className="btn-contour">Voir tous les châteaux</button>
          </div>
        </div>

        {/* Filtres rapides */}
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

        {/* Grille */}
        <div className="offres-grille">
          {chateauxFiltres.map((chateau, i) => (
            <div
              key={chateau.id}
              className="animate-fadeInUp"
              style={{ animationDelay: `${i * 0.1}s` }}
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
  );
}
