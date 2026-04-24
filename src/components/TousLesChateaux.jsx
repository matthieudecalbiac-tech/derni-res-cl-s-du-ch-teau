import { useState, useEffect } from "react";
import { chateaux } from "../data/chateaux";
import "../styles/tous-chateaux.css";

const FILTRES = [
  { label: "Tous", valeur: "tous" },
  { label: "J-7 · Urgent", valeur: "J-7" },
  { label: "J-10", valeur: "J-10" },
  { label: "J-15", valeur: "J-15" },
  { label: "Île-de-France", valeur: "idf" },
  { label: "Avec spa", valeur: "spa" },
  { label: "Équitation", valeur: "equitation" },
];

export default function TousLesChateaux({ onClose, onSelectChateau }) {
  const [filtreActif, setFiltreActif] = useState("tous");
  const [hover, setHover] = useState(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const filtres = chateaux.filter((c) => {
    if (filtreActif === "tous") return true;
    if (filtreActif === "J-7") return c.urgence === "J-7";
    if (filtreActif === "J-10") return c.urgence === "J-10";
    if (filtreActif === "J-15") return c.urgence === "J-15";
    if (filtreActif === "idf") return c.region === "Île-de-France";
    if (filtreActif === "spa")
      return c.experiences.some((e) => e.toLowerCase().includes("spa"));
    if (filtreActif === "equitation") return c.tags.includes("Équitation");
    return true;
  });

  return (
    <div className="tcc-overlay">
      <header className="tcc-header">
        <div className="tcc-header-gauche">
          <button className="tcc-retour" onClick={onClose}>
            ← Retour
          </button>
          <span className="tcc-header-titre">Nos Châteaux</span>
        </div>
        <span className="tcc-header-count">
          {filtres.length} château{filtres.length > 1 ? "x" : ""} disponible
          {filtres.length > 1 ? "s" : ""}
        </span>
      </header>

      <div className="tcc-inner">
        <div className="tcc-entete">
          <span className="tcc-sur-titre">
            Collection · Châteaux partenaires
          </span>
          <h1 className="tcc-titre">Chaque château, un univers</h1>
          <p className="tcc-sous-titre">
            Des demeures d'exception soigneusement sélectionnées pour leur
            histoire, leur caractère et leur singularité
          </p>
        </div>

        <div className="tcc-filtres">
          {FILTRES.map((f) => (
            <button
              key={f.valeur}
              className={`tcc-filtre ${
                filtreActif === f.valeur ? "actif" : ""
              }`}
              onClick={() => setFiltreActif(f.valeur)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="tcc-grille">
          {filtres.map((c, i) => {
            const classBande =
              { "J-7": "j7", "J-10": "j10", "J-15": "j15" }[c.urgence] || "j15";
            const classBadge =
              { "J-7": "badge-j7", "J-10": "badge-j10", "J-15": "badge-j15" }[
                c.urgence
              ] || "badge-j15";
            const estPair = i % 2 === 0;

            return (
              <article
                key={c.id}
                className={`tcc-carte ${estPair ? "pair" : "impair"} ${
                  hover === c.id ? "hover" : ""
                }`}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  onSelectChateau(c);
                  onClose();
                }}
              >
                <div className="tcc-photo-wrapper">
                  <img
                    src={c.image || c.images?.[0]}
                    alt={c.nom}
                    className="tcc-photo"
                    loading="lazy"
                  />
                  <div className="tcc-photo-overlay" />
                  <div className="tcc-badges">
                    <span className={`badge-urgence ${classBadge}`}>
                      ◆ {c.urgence}
                    </span>
                    <span className="tcc-reduction">−{c.reduction}%</span>
                  </div>
                  <div className={`tcc-urgence-bande ${classBande}`} />
                  <span className="tcc-numero">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="tcc-contenu">
                  <div className="tcc-meta">
                    <span className="tcc-region">{c.region}</span>
                    <span className="tcc-distance">{c.distanceParis}</span>
                  </div>
                  <h2 className="tcc-nom">{c.nom}</h2>
                  <p className="tcc-style">
                    {c.style} · {c.siecle}
                  </p>
                  <div className="tcc-separateur" />
                  <p className="tcc-accroche">{c.accroche}</p>
                  <p className="tcc-description">{c.description}</p>
                  <div className="tcc-activites">
                    {c.activites.slice(0, 3).map((a, j) => (
                      <span key={j} className="tcc-activite">
                        ✦ {a.nom}
                      </span>
                    ))}
                  </div>
                  <div className="tcc-pied">
                    <div className="tcc-prix-bloc">
                      <span className="tcc-prix-barre">
                        {c.prixBarre} € / nuit
                      </span>
                      <div className="tcc-prix-ligne">
                        <span className="tcc-prix">{c.prix} €</span>
                        <span className="tcc-prix-nuit">
                          / nuit · taxes incluses
                        </span>
                      </div>
                      <span className="tcc-economie">
                        Économie de {c.prixBarre - c.prix} €
                      </span>
                    </div>
                    <button className="tcc-cta">Découvrir ce château →</button>
                  </div>
                  <div className="tcc-footer-meta">
                    <span>
                      ★ {c.noteSur5} ({c.nbAvis} avis)
                    </span>
                    <span>
                      {c.chambresRestantes} chambre
                      {c.chambresRestantes > 1 ? "s" : ""} disponible
                      {c.chambresRestantes > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
