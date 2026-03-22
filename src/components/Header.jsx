import { useState, useEffect } from "react";
import "../styles/header.css";

const LogoChateau = () => (
  <svg
    width="52"
    height="52"
    viewBox="0 0 80 80"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <rect width="80" height="80" fill="#1a2d5a" />
    <rect
      x="2"
      y="2"
      width="76"
      height="76"
      fill="none"
      stroke="#c8973e"
      strokeWidth="1"
    />
    <rect
      x="5"
      y="5"
      width="70"
      height="70"
      fill="none"
      stroke="#c8973e"
      strokeWidth="0.3"
      opacity="0.4"
    />
    <line
      x1="2"
      y1="2"
      x2="9"
      y2="9"
      stroke="#c8973e"
      strokeWidth="0.5"
      opacity="0.5"
    />
    <line
      x1="78"
      y1="2"
      x2="71"
      y2="9"
      stroke="#c8973e"
      strokeWidth="0.5"
      opacity="0.5"
    />
    <line
      x1="2"
      y1="78"
      x2="9"
      y2="71"
      stroke="#c8973e"
      strokeWidth="0.5"
      opacity="0.5"
    />
    <line
      x1="78"
      y1="78"
      x2="71"
      y2="71"
      stroke="#c8973e"
      strokeWidth="0.5"
      opacity="0.5"
    />
    <text
      x="40"
      y="20"
      textAnchor="middle"
      fontSize="14"
      fill="#c8973e"
      fontFamily="serif"
    >
      ⚜
    </text>
    <text
      x="16"
      y="18"
      textAnchor="middle"
      fontSize="9"
      fill="#c8973e"
      fontFamily="serif"
      opacity="0.7"
    >
      ⚜
    </text>
    <text
      x="64"
      y="18"
      textAnchor="middle"
      fontSize="9"
      fill="#c8973e"
      fontFamily="serif"
      opacity="0.7"
    >
      ⚜
    </text>
    <line
      x1="8"
      y1="24"
      x2="72"
      y2="24"
      stroke="#c8973e"
      strokeWidth="0.5"
      opacity="0.5"
    />
    <g fill="#d4af72">
      <path d="M9,34 L14,26 L19,34Z" fill="#c8973e" opacity="0.9" />
      <rect x="10" y="33" width="8" height="18" />
      <rect x="10" y="31" width="2" height="4" />
      <rect x="13" y="31" width="2" height="4" />
      <rect x="16" y="31" width="2" height="4" />
      <path d="M13,39 L13,44 Q14.5,41.5 16,44 L16,39Z" fill="#1a2d5a" />
    </g>
    <g fill="#d4af72">
      <path d="M61,34 L66,26 L71,34Z" fill="#c8973e" opacity="0.9" />
      <rect x="62" y="33" width="8" height="18" />
      <rect x="62" y="31" width="2" height="4" />
      <rect x="65" y="31" width="2" height="4" />
      <rect x="68" y="31" width="2" height="4" />
      <path d="M65,39 L65,44 Q66.5,41.5 68,44 L68,39Z" fill="#1a2d5a" />
    </g>
    <g fill="#d4af72">
      <path d="M33,30 L40,20 L47,30Z" fill="#c8973e" opacity="0.95" />
      <rect x="34" y="29" width="12" height="22" />
      <rect x="34" y="27" width="2" height="4" />
      <rect x="37" y="27" width="2" height="4" />
      <rect x="40" y="27" width="2" height="4" />
      <rect x="43" y="27" width="2" height="4" />
      <path d="M37,35 L37,42 Q40,38 43,42 L43,35Z" fill="#1a2d5a" />
    </g>
    <g fill="#d4af72">
      <rect x="18" y="37" width="44" height="14" />
      <rect x="18" y="34" width="3" height="5" />
      <rect x="22" y="34" width="3" height="5" />
      <rect x="26" y="34" width="3" height="5" />
      <rect x="51" y="34" width="3" height="5" />
      <rect x="55" y="34" width="3" height="5" />
      <rect x="59" y="34" width="3" height="5" />
      <path d="M36,51 L36,44 Q40,39 44,44 L44,51Z" fill="#1a2d5a" />
      <path d="M21,40 L21,46 Q23,43.5 25,46 L25,40Z" fill="#1a2d5a" />
      <path d="M55,40 L55,46 Q57,43.5 59,46 L59,40Z" fill="#1a2d5a" />
    </g>
    <rect x="8" y="51" width="64" height="1.5" fill="#c8973e" opacity="0.5" />
    <text
      x="22"
      y="64"
      textAnchor="middle"
      fontSize="8"
      fill="#c8973e"
      fontFamily="serif"
      opacity="0.65"
    >
      ⚜
    </text>
    <text
      x="40"
      y="66"
      textAnchor="middle"
      fontSize="10"
      fill="#c8973e"
      fontFamily="serif"
      opacity="0.5"
    >
      ⚜
    </text>
    <text
      x="58"
      y="64"
      textAnchor="middle"
      fontSize="8"
      fill="#c8973e"
      fontFamily="serif"
      opacity="0.65"
    >
      ⚜
    </text>
    <line
      x1="8"
      y1="70"
      x2="72"
      y2="70"
      stroke="#c8973e"
      strokeWidth="0.5"
      opacity="0.4"
    />
    <path d="M40,73 L42,75 L40,77 L38,75Z" fill="#c8973e" opacity="0.4" />
  </svg>
);

export default function Header({
  onOuvrirCarte,
  onOuvrirTous,
  onOuvrirAuth,
  onOuvrirCompte,
  onOuvrirClub,
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
          <span className="nav-lien nav-lien--carte" onClick={onOuvrirCarte}>
            ◆ Carte
          </span>
          <span className="nav-lien nav-lien--club" onClick={onOuvrirClub}>
            ⚜ Club des Châtelains
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
          Services & prestations
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
