import { useState, useEffect } from "react";
import "../styles/header.css";

const LogoChateau = () => (
  <svg
    width="42"
    height="42"
    viewBox="0 0 42 42"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Fond bleu royal */}
    <rect width="42" height="42" fill="#1a2d5a" />

    {/* Bordure or */}
    <rect
      x="1.5"
      y="1.5"
      width="39"
      height="39"
      fill="none"
      stroke="#b8965a"
      strokeWidth="1"
    />

    {/* Fleur de lys haut gauche */}
    <g transform="translate(7, 6) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>

    {/* Fleur de lys haut droite */}
    <g transform="translate(22, 6) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>

    {/* Château central */}
    <g fill="#d4af72">
      {/* Tours latérales */}
      <rect x="7" y="22" width="6" height="14" />
      <rect x="29" y="22" width="6" height="14" />
      {/* Créneaux tour gauche */}
      <rect x="7" y="19" width="2" height="4" />
      <rect x="10" y="19" width="2" height="4" />
      {/* Créneaux tour droite */}
      <rect x="29" y="19" width="2" height="4" />
      <rect x="32" y="19" width="2" height="4" />
      {/* Corps central */}
      <rect x="13" y="24" width="16" height="12" />
      {/* Créneaux corps central */}
      <rect x="13" y="21" width="2" height="4" />
      <rect x="16" y="21" width="2" height="4" />
      <rect x="19" y="21" width="2" height="4" />
      <rect x="22" y="21" width="2" height="4" />
      <rect x="25" y="21" width="2" height="4" />
      {/* Porte */}
      <rect x="18" y="30" width="6" height="6" rx="3" fill="#1a2d5a" />
      {/* Fenêtres tours */}
      <rect x="9" y="25" width="2" height="3" rx="1" fill="#1a2d5a" />
      <rect x="31" y="25" width="2" height="3" rx="1" fill="#1a2d5a" />
    </g>

    {/* Fleur de lys bas gauche */}
    <g transform="translate(7, 28) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>

    {/* Fleur de lys bas droite */}
    <g transform="translate(22, 28) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>
  </svg>
);

export default function Header() {
  const [solide, setSolide] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolide(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollVers = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`header ${solide ? "header--solide" : "header--transparent"}`}
    >
      <div className="header-inner">
        {/* Logo */}
        <div
          className="header-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <LogoChateau />
            <div>
              <span className="logo-principale">
                Les Dernières Clés du Château
              </span>
              <span className="logo-secondaire">
                Échappées de château · À moins de 3h de Paris
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="header-nav">
          <span className="nav-lien" onClick={() => scrollVers("offres")}>
            Offres du moment
          </span>
          <span className="nav-lien" onClick={() => scrollVers("chateaux")}>
            Les châteaux
          </span>
          <span className="nav-lien" onClick={() => scrollVers("comment")}>
            Comment ça marche
          </span>
          <span className="nav-lien" onClick={() => scrollVers("newsletter")}>
            Le club
          </span>
        </nav>

        {/* Actions */}
        <div className="header-actions">
          <span className="header-connexion">Connexion</span>
          <button className="header-cta" onClick={() => scrollVers("offres")}>
            Voir les offres
          </button>
        </div>

        {/* Burger mobile */}
        <div className="header-burger">
          <span />
          <span />
          <span />
        </div>
      </div>
    </header>
  );
}
