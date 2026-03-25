import { useState, useEffect } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import "../styles/espace-membre.css";

const NIVEAUX_COULEURS = {
  Blue: "#4a90d9",
  Silver: "#a8b8c8",
  Gold: "#c8973e",
  Platinum: "#e8d5b0",
};

export default function EspaceMembre({ user, onClose, onDeconnexion }) {
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

  const chateauxFiltres = filtre === "tous"
    ? chateaux
    : chateaux.filter(c => c.region === filtre);

  const couleurNiveau = NIVEAUX_COULEURS[user?.niveau] || "#c8973e";

  return (
    <div className={"em-overlay " + (visible ? "em-overlay--visible" : "")}>

      {/* ── HEADER ── */}
      <header className="em-header">
        <div className="em-header-gauche">
          <div className="em-header-logo">
            <span className="em-header-lys">⚜</span>
            <span className="em-header-titre">Club des Châtelains</span>
          </div>
          <div className="em-header-membre">
            <span className="em-header-numero">{user?.numero}</span>
            <span className="em-header-sep">·</span>
            <span className="em-header-niveau" style={{ color: couleurNiveau }}>
              Membre {user?.niveau}
            </span>
          </div>
        </div>
        <div className="em-header-droite">
          <button className="em-btn-retour" onClick={onClose}>← Retour</button>
          <button className="em-btn-deconnexion" onClick={onDeconnexion}>Déconnexion</button>
        </div>
      </header>

      {/* ── INTRO ── */}
      <div className="em-intro">
        <div className="em-intro-ornement">
          <div className="em-intro-ligne" />
          <span className="em-intro-lys">⚜</span>
          <div className="em-intro-ligne" />
        </div>
        <h1 className="em-intro-titre">
          Bienvenue, <em>{user?.prenom}</em>
        </h1>
        <p className="em-intro-accroche">
          Voici les vitrines permanentes de nos domaines partenaires —
          réservées aux membres du Club. Chaque lieu a été sélectionné,
          visité, éditorialisé. Aucun n'est sur Booking.com.
        </p>
        <div className="em-intro-ornement">
          <div className="em-intro-ligne" />
          <span className="em-intro-lys">⚜</span>
          <div className="em-intro-ligne" />
        </div>
      </div>

      {/* ── FILTRES RÉGION ── */}
      <div className="em-filtres">
        {regions.map(r => (
          <button
            key={r}
            className={"em-filtre " + (filtre === r ? "actif" : "")}
            onClick={() => setFiltre(r)}
          >
            {r === "tous" ? "Tous les domaines" : r}
          </button>
        ))}
      </div>

      {/* ── GRILLE ── */}
      <div className="em-grille">
        {chateauxFiltres.map((c, i) => (
          <article
            key={c.id}
            className="em-carte"
            onClick={() => setChateauSelectionne(c)}
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            {/* Photo */}
            <div className="em-carte-photo-wrapper">
              <img src={c.image} alt={c.nom} className="em-carte-photo" loading="lazy" />
              <div className="em-carte-overlay" />
              <div className="em-carte-coins">
                <div className="em-coin em-coin--tg" />
                <div className="em-coin em-coin--td" />
                <div className="em-coin em-coin--bg" />
                <div className="em-coin em-coin--bd" />
              </div>
              <div className="em-carte-badges">
                <span className="em-carte-region">⚜ {c.region}</span>
                <span className="em-carte-distance">{c.distanceParis}</span>
              </div>
              <div className="em-carte-numero">0{i + 1}</div>
            </div>

            {/* Contenu */}
            <div className="em-carte-contenu">
              <div className="em-carte-meta">
                <span className="em-carte-style">{c.style}</span>
                <span className="em-carte-sep">·</span>
                <span className="em-carte-siecle">{c.siecle}</span>
              </div>
              <h2 className="em-carte-nom">{c.nom}</h2>
              <p className="em-carte-accroche">{c.accroche}</p>
              <div className="em-carte-separateur" />
              <div className="em-carte-pied">
                <div className="em-carte-prix-bloc">
                  <span className="em-carte-prix-barre">{c.prixBarre} €</span>
                  <span className="em-carte-prix">{c.prix} €</span>
                  <span className="em-carte-prix-nuit">/ nuit</span>
                </div>
                <button className="em-carte-cta">
                  Découvrir <span>→</span>
                </button>
              </div>
              <div className="em-carte-tags">
                {c.tags.slice(0, 3).map(t => (
                  <span key={t} className="em-carte-tag">{t}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* ── PIED ── */}
      <div className="em-pied">
        <div className="em-intro-ornement">
          <div className="em-intro-ligne" />
          <span className="em-intro-lys">⚜</span>
          <div className="em-intro-ligne" />
        </div>
        <p className="em-pied-texte">
          {chateauxFiltres.length} domaine{chateauxFiltres.length > 1 ? "s" : ""} · Sélection Club des Châtelains · {new Date().getFullYear()}
        </p>
      </div>

      {/* ── MODAL CHÂTEAU ── */}
      {chateauSelectionne && (
        <ChateauModal
          chateau={chateauSelectionne}
          onClose={() => setChateauSelectionne(null)}
        />
      )}
    </div>
  );
}
