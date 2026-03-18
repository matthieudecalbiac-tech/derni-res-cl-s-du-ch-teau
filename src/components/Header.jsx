import { useState, useEffect } from "react";
import "../styles/header.css";

const LogoChateau = () => (
  <svg
    width="38"
    height="38"
    viewBox="0 0 42 42"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <rect width="42" height="42" fill="#1a2d5a" />
    <rect
      x="1.5"
      y="1.5"
      width="39"
      height="39"
      fill="none"
      stroke="#b8965a"
      strokeWidth="1"
    />
    <g transform="translate(7, 6) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>
    <g transform="translate(22, 6) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>
    <g fill="#d4af72">
      <rect x="7" y="22" width="6" height="14" />
      <rect x="29" y="22" width="6" height="14" />
      <rect x="7" y="19" width="2" height="4" />
      <rect x="10" y="19" width="2" height="4" />
      <rect x="29" y="19" width="2" height="4" />
      <rect x="32" y="19" width="2" height="4" />
      <rect x="13" y="24" width="16" height="12" />
      <rect x="13" y="21" width="2" height="4" />
      <rect x="16" y="21" width="2" height="4" />
      <rect x="19" y="21" width="2" height="4" />
      <rect x="22" y="21" width="2" height="4" />
      <rect x="25" y="21" width="2" height="4" />
      <rect x="18" y="30" width="6" height="6" rx="3" fill="#1a2d5a" />
      <rect x="9" y="25" width="2" height="3" rx="1" fill="#1a2d5a" />
      <rect x="31" y="25" width="2" height="3" rx="1" fill="#1a2d5a" />
    </g>
    <g transform="translate(7, 28) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>
    <g transform="translate(22, 28) scale(0.28)" fill="#d4af72">
      <path d="M14,0 C14,0 11,6 11,10 C11,13 13,14 14,14 C15,14 17,13 17,10 C17,6 14,0 14,0 Z" />
      <path d="M14,10 C14,10 8,10 5,13 C3,15 4,18 6,18 C8,18 10,16 14,14 C18,16 20,18 22,18 C24,18 25,15 23,13 C20,10 14,10 14,10 Z" />
      <ellipse cx="14" cy="20" rx="3" ry="2" />
      <rect x="12.5" y="22" width="3" height="5" rx="1" />
    </g>
  </svg>
);

export default function Header({
  onOuvrirCarte,
  onOuvrirTous,
  onOuvrirAuth,
  onOuvrirCompte,
  userConnecte,
}) {
  const [solide, setSolide] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolide(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollVers = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOuvert(false);
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
          <LogoChateau />
          <div className="header-logo-texte">
            <span className="logo-principale">
              Les Dernières Clés du Château
            </span>
            <span className="logo-secondaire">
              Échappées de château · À moins de 3h de Paris
            </span>
          </div>
        </div>

        {/* Navigation desktop */}
        <nav className="header-nav">
          <span className="nav-lien" onClick={() => scrollVers("offres")}>
            Offres du moment
          </span>
          <span className="nav-lien" onClick={onOuvrirTous}>
            Nos Châteaux
          </span>
          <span className="nav-lien" onClick={() => scrollVers("services")}>
            Services
          </span>
          <span className="nav-lien" onClick={() => scrollVers("comment")}>
            Comment ça marche
          </span>
          <span className="nav-lien nav-lien--carte" onClick={onOuvrirCarte}>
            ◆ Carte
          </span>
        </nav>

        {/* Actions desktop */}
        <div className="header-actions">
          {userConnecte ? (
            <button
              className="header-connexion header-membre"
              onClick={onOuvrirCompte}
            >
              <span
                className={`header-niveau-dot niveau-${userConnecte.niveau.toLowerCase()}`}
              />
              {userConnecte.prenom}
            </button>
          ) : (
            <>
              <span
                className="header-connexion"
                onClick={() => onOuvrirAuth("connexion")}
              >
                Connexion
              </span>
              <button
                className="header-cta"
                onClick={() => onOuvrirAuth("inscription")}
              >
                Rejoindre le club
              </button>
            </>
          )}
        </div>

        {/* Burger mobile */}
        <div
          className="header-burger"
          onClick={() => setMenuOuvert(!menuOuvert)}
        >
          <span
            style={{
              transform: menuOuvert
                ? "rotate(45deg) translate(4px, 4px)"
                : "none",
            }}
          />
          <span style={{ opacity: menuOuvert ? 0 : 1 }} />
          <span
            style={{
              transform: menuOuvert
                ? "rotate(-45deg) translate(4px, -4px)"
                : "none",
            }}
          />
        </div>
      </div>

      {/* Menu mobile */}
      <div className={`header-menu-mobile ${menuOuvert ? "ouvert" : ""}`}>
        <span className="nav-lien-mobile" onClick={() => scrollVers("offres")}>
          Offres du moment
        </span>
        <span
          className="nav-lien-mobile"
          onClick={() => {
            onOuvrirTous();
            setMenuOuvert(false);
          }}
        >
          Nos Châteaux
        </span>
        <span
          className="nav-lien-mobile"
          onClick={() => scrollVers("services")}
        >
          Services & prestations
        </span>
        <span className="nav-lien-mobile" onClick={() => scrollVers("comment")}>
          Comment ça marche
        </span>
        <span
          className="nav-lien-mobile nav-lien--carte"
          onClick={() => {
            onOuvrirCarte();
            setMenuOuvert(false);
          }}
        >
          ◆ Explorer la carte
        </span>
        {userConnecte ? (
          <span
            className="nav-lien-mobile"
            onClick={() => {
              onOuvrirCompte();
              setMenuOuvert(false);
            }}
          >
            Mon compte · {userConnecte.prenom}
          </span>
        ) : (
          <>
            <span
              className="nav-lien-mobile"
              onClick={() => {
                onOuvrirAuth("connexion");
                setMenuOuvert(false);
              }}
            >
              Connexion
            </span>
            <span
              className="nav-lien-mobile"
              onClick={() => {
                onOuvrirAuth("inscription");
                setMenuOuvert(false);
              }}
            >
              Rejoindre le club →
            </span>
          </>
        )}
      </div>
    </header>
  );
}
