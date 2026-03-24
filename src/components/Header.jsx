import { useState, useEffect } from "react";
import "../styles/header.css";

const LogoChateau = () => (
  <svg
    width="52"
    height="52"
    viewBox="0 0 60 60"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <rect width="60" height="60" fill="#1a2d5a" />
    <rect
      x="2"
      y="2"
      width="56"
      height="56"
      fill="none"
      stroke="#c8973e"
      strokeWidth="1"
    />
    <path
      d="M12,52 L12,28 Q12,14 30,14 Q48,14 48,28 L48,52Z"
      fill="none"
      stroke="#c8973e"
      strokeWidth="1.5"
    />
    <rect x="8" y="27" width="5" height="27" fill="#c8973e" />
    <rect x="47" y="27" width="5" height="27" fill="#c8973e" />
    <rect x="6" y="52" width="48" height="3" fill="#c8973e" opacity="0.6" />
    <rect x="6" y="21" width="4" height="7" fill="#c8973e" />
    <rect x="12" y="21" width="4" height="7" fill="#c8973e" />
    <rect x="44" y="21" width="4" height="7" fill="#c8973e" />
    <rect x="50" y="21" width="4" height="7" fill="#c8973e" />
    <g transform="translate(30,33)">
      <path d="M0,-11 C-4,-7 -4,-2 0,0 C4,-2 4,-7 0,-11Z" fill="#c8973e" />
      <path d="M-9,-3 C-6,-7 -2,-3 0,0 C-2,-3 -4,-7 -9,-3Z" fill="#c8973e" />
      <path d="M9,-3 C6,-7 2,-3 0,0 C2,-3 4,-7 9,-3Z" fill="#c8973e" />
      <rect x="-2" y="0" width="4" height="5" fill="#c8973e" />
      <path d="M-4,5 L4,5 L3,8 L-3,8Z" fill="#c8973e" />
    </g>
    <g transform="translate(30,46)">
      <g transform="rotate(-25)">
        <circle
          cx="0"
          cy="-8"
          r="4"
          fill="none"
          stroke="#c8973e"
          strokeWidth="1.2"
        />
        <circle cx="0" cy="-8" r="1.5" fill="#c8973e" />
        <rect x="-1" y="-4" width="2" height="12" fill="#c8973e" />
        <rect x="-2.5" y="5" width="4" height="1.5" fill="#c8973e" />
        <rect x="-2.5" y="7.5" width="3" height="1.5" fill="#c8973e" />
      </g>
      <g transform="rotate(25)">
        <circle
          cx="0"
          cy="-8"
          r="4"
          fill="none"
          stroke="#c8973e"
          strokeWidth="1.2"
        />
        <circle cx="0" cy="-8" r="1.5" fill="#c8973e" />
        <rect x="-1" y="-4" width="2" height="12" fill="#c8973e" />
        <rect x="-1.5" y="5" width="4" height="1.5" fill="#c8973e" />
        <rect x="-0.5" y="7.5" width="3" height="1.5" fill="#c8973e" />
      </g>
    </g>
  </svg>
);

export default function Header({
  onOuvrirCarte,
  onOuvrirTous,
  onOuvrirAuth,
  onOuvrirCompte,
  onOuvrirClub,
  onOuvrirEvenementiel,
  onOuvrirAPropos,
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
            Offres
          </span>
          <span className="nav-lien" onClick={onOuvrirTous}>
            Châteaux
          </span>
          <span className="nav-lien" onClick={() => scrollVers("services")}>
            Services
          </span>
          <span className="nav-lien nav-lien--club" onClick={onOuvrirClub}>
            ⚜ Club
          </span>
          <span
            className="nav-lien nav-lien--apropos"
            onClick={onOuvrirAPropos}
          >
            À propos
          </span>
          <span
            className="nav-lien nav-lien--partenaires"
            onClick={() => scrollVers("partenaires")}
          >
            ⚜ Propriétaires
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
              <button className="header-cta" onClick={onOuvrirClub}>
                Club des Châtelains
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
          Services
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
        <span
          className="nav-lien-mobile nav-lien--club"
          onClick={() => {
            onOuvrirClub();
            setMenuOuvert(false);
          }}
        >
          ⚜ Club des Châtelains
        </span>
        <span
          className="nav-lien-mobile nav-lien--event"
          onClick={() => {
            onOuvrirEvenementiel();
            setMenuOuvert(false);
          }}
        >
          ◆ Événementiel
        </span>
        <span
          className="nav-lien-mobile nav-lien--apropos"
          onClick={() => {
            onOuvrirAPropos();
            setMenuOuvert(false);
          }}
        >
          À propos
        </span>
        <span
          className="nav-lien-mobile nav-lien--partenaires"
          onClick={() => scrollVers("partenaires")}
        >
          ⚜ Votre domaine sur LDCC
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
              className="nav-lien-mobile nav-lien--club"
              onClick={() => {
                onOuvrirClub();
                setMenuOuvert(false);
              }}
            >
              ⚜ Club des Châtelains →
            </span>
          </>
        )}
      </div>
    </header>
  );
}
