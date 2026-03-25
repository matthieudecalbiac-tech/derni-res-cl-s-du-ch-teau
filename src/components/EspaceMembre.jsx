import { useState, useEffect } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import "../styles/espace-membre.css";

const NIVEAUX_COULEURS = {
  Blue: "#4a90d9", Silver: "#a8b8c8", Gold: "#c8973e", Platinum: "#e8d5b0",
};

const INTRO_TEXTE = [
  "La France compte quarante-cinq mille châteaux. Nous en avons sélectionné quelques dizaines — non par facilité, mais par exigence. Chacun a été visité, étudié, éditorialisé. Chacun porte une histoire que nous avons pris le temps de comprendre avant de la raconter.",
  "Ici, pas de fiche standardisée, pas de note sur cinq étoiles, pas de comparateur tarifaire. Chaque domaine est traité comme un univers singulier — avec sa lumière propre, sa famille, son siècle, son silence.",
  "C'est cela, le Club des Châtelains : non pas un accès à des offres, mais un accès à des lieux. Des lieux que personne d'autre ne vous montrera de cette façon.",
];

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
  const chateauxFiltres = filtre === "tous" ? chateaux : chateaux.filter(c => c.region === filtre);
  const couleurNiveau = NIVEAUX_COULEURS[user?.niveau] || "#c8973e";

  return (
    <div className={"em-overlay " + (visible ? "em-overlay--visible" : "")}>

      {/* ── HEADER ── */}
      <header className="em-header">
        <div className="em-header-gauche">
          <span className="em-header-lys">⚜</span>
          <span className="em-header-titre">Les Dernières Clés du Château</span>
          <span className="em-header-sep">·</span>
          <span className="em-header-club">Club des Châtelains</span>
        </div>
        <div className="em-header-droite">
          <span className="em-header-numero">{user?.numero}</span>
          <span className="em-header-niveau" style={{ color: couleurNiveau }}>⬤ {user?.niveau}</span>
          <button className="em-btn-retour" onClick={onClose}>Retour</button>
          <button className="em-btn-deconnexion" onClick={onDeconnexion}>Déconnexion</button>
        </div>
      </header>

      {/* ── PAGE TITRE ── */}
      <div className="em-page-titre">
        <div className="em-page-titre-bg" />
        <div className="em-page-titre-contenu">
          <div className="em-orn">
            <div className="em-orn-ligne" />
            <span className="em-orn-lys">⚜</span>
            <div className="em-orn-ligne" />
          </div>
          <p className="em-page-titre-sur">Club des Châtelains · Vitrines permanentes</p>
          <h1 className="em-page-titre-h1">
            Le Grand Livre<br /><em>des Demeures</em>
          </h1>
          <p className="em-page-titre-bienvenue">
            Bienvenue, <strong>{user?.prenom}</strong> — voici votre sélection privée
          </p>
          <div className="em-orn em-orn--bas">
            <div className="em-orn-ligne" />
            <span className="em-orn-lys">⚜</span>
            <div className="em-orn-ligne" />
          </div>
        </div>
        <div className="em-page-titre-bas">
          <span className="em-page-titre-scroll">Parcourir la sélection ↓</span>
        </div>
      </div>

      {/* ── MANIFESTE ── */}
      <div className="em-manifeste">
        <div className="em-manifeste-inner">
          <div className="em-manifeste-label">
            <div className="em-manifeste-label-ligne" />
            <span>⚜ Notre démarche éditoriale</span>
            <div className="em-manifeste-label-ligne" />
          </div>
          {INTRO_TEXTE.map((p, i) => (
            <p key={i} className={"em-manifeste-para " + (i === 0 ? "em-manifeste-para--accroche" : "")}>
              {p}
            </p>
          ))}
          <div className="em-manifeste-chiffres">
            <div className="em-manifeste-chiffre">
              <span className="em-manifeste-nombre">{chateaux.length}</span>
              <span className="em-manifeste-label-ch">Demeures sélectionnées</span>
            </div>
            <div className="em-manifeste-sep" />
            <div className="em-manifeste-chiffre">
              <span className="em-manifeste-nombre">7</span>
              <span className="em-manifeste-label-ch">Régions de France</span>
            </div>
            <div className="em-manifeste-sep" />
            <div className="em-manifeste-chiffre">
              <span className="em-manifeste-nombre">&lt;3h</span>
              <span className="em-manifeste-label-ch">De Paris</span>
            </div>
            <div className="em-manifeste-sep" />
            <div className="em-manifeste-chiffre">
              <span className="em-manifeste-nombre">∞</span>
              <span className="em-manifeste-label-ch">Histoire & patrimoine</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SÉPARATEUR ── */}
      <div className="em-separateur">
        <div className="em-sep-ligne" />
        <span className="em-sep-texte">La Sélection</span>
        <div className="em-sep-ligne" />
      </div>

      {/* ── FILTRES ── */}
      <div className="em-filtres">
        {regions.map(r => (
          <button key={r} className={"em-filtre " + (filtre === r ? "actif" : "")} onClick={() => setFiltre(r)}>
            {r === "tous" ? "Toutes les régions" : r}
          </button>
        ))}
      </div>

      {/* ── LISTE ÉDITORIALE ── */}
      <div className="em-liste">
        {chateauxFiltres.map((c, i) => (
          <article key={c.id} className="em-entree" style={{ animationDelay: `${i * 0.08}s` }}>

            {/* Numéro chapitre */}
            <div className="em-entree-numero">
              {String(i + 1).padStart(2, "0")}
            </div>

            {/* Ligne de séparation haute */}
            <div className="em-entree-ligne-haute" />

            {/* Corps */}
            <div className="em-entree-corps">

              {/* Colonne texte */}
              <div className="em-entree-texte">
                <div className="em-entree-meta">
                  <span className="em-entree-region">⚜ {c.region}</span>
                  <span className="em-entree-dept">{c.departement}</span>
                  <span className="em-entree-distance">{c.distanceParis}</span>
                </div>
                <h2 className="em-entree-nom">{c.nom}</h2>
                <p className="em-entree-style">{c.style} · {c.siecle}</p>
                <p className="em-entree-accroche">{c.accroche}</p>
                <p className="em-entree-description">{c.description}</p>

                {/* Propriétaires si dispo */}
                {c.proprietaires?.citation && (
                  <blockquote className="em-entree-citation">
                    <span className="em-entree-citation-g">"</span>
                    {c.proprietaires.citation}
                    <span className="em-entree-citation-d">"</span>
                    <cite className="em-entree-citation-auteur">— {c.proprietaires.nom}</cite>
                  </blockquote>
                )}

                <div className="em-entree-tags">
                  {c.tags.map(t => <span key={t} className="em-entree-tag">{t}</span>)}
                </div>

                <div className="em-entree-pied">
                  <div className="em-entree-prix">
                    <span className="em-entree-prix-barre">{c.prixBarre} €</span>
                    <span className="em-entree-prix-val">{c.prix} €</span>
                    <span className="em-entree-prix-nuit">/ nuit</span>
                  </div>
                  <button className="em-entree-cta" onClick={() => setChateauSelectionne(c)}>
                    Ouvrir la vitrine <span className="em-entree-cta-fleche">→</span>
                  </button>
                </div>
              </div>

              {/* Colonne photo */}
              <div className="em-entree-photo-col" onClick={() => setChateauSelectionne(c)}>
                <div className="em-entree-photo-wrapper">
                  <img src={c.image} alt={c.nom} className="em-entree-photo" loading="lazy" />
                  <div className="em-entree-photo-overlay" />
                  <div className="em-entree-photo-coins">
                    <div className="em-pc em-pc--tg" />
                    <div className="em-pc em-pc--td" />
                    <div className="em-pc em-pc--bg" />
                    <div className="em-pc em-pc--bd" />
                  </div>
                  <div className="em-entree-photo-label">
                    {c.chambresRestantes} chambre{c.chambresRestantes > 1 ? "s" : ""} disponible{c.chambresRestantes > 1 ? "s" : ""}
                  </div>
                </div>
                {/* Miniatures galerie */}
                {c.images?.length > 1 && (
                  <div className="em-entree-miniatures">
                    {c.images.slice(0, 3).map((img, j) => (
                      <div key={j} className="em-entree-mini">
                        <img src={img} alt="" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ligne de séparation basse */}
            <div className="em-entree-ligne-basse" />
          </article>
        ))}
      </div>

      {/* ── PIED ── */}
      <div className="em-pied">
        <div className="em-orn">
          <div className="em-orn-ligne" />
          <span className="em-orn-lys">⚜</span>
          <div className="em-orn-ligne" />
        </div>
        <p className="em-pied-texte">
          {chateauxFiltres.length} demeure{chateauxFiltres.length > 1 ? "s" : ""} · Club des Châtelains · Sélection {new Date().getFullYear()}
        </p>
        <p className="em-pied-sous">Aucun de ces lieux n'est référencé sur les plateformes grand public.</p>
      </div>

      {/* ── MODAL ── */}
      {chateauSelectionne && (
        <ChateauModal chateau={chateauSelectionne} onClose={() => setChateauSelectionne(null)} />
      )}
    </div>
  );
}
