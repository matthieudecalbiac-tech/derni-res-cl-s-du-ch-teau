import { useState, useEffect } from "react";
import "../styles/header.css";

const LogoChateau = () => (
  <svg width="52" height="52" viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="hgOr" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#F5E070"/>
        <stop offset="40%" stopColor="#D4AA45"/>
        <stop offset="100%" stopColor="#B8880A"/>
      </linearGradient>
      <linearGradient id="hgOrH" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F5E070"/>
        <stop offset="50%" stopColor="#D4AA45"/>
        <stop offset="100%" stopColor="#F5E070"/>
      </linearGradient>
      <radialGradient id="hgHalo" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor="#D4AA45" stopOpacity="0.18"/>
        <stop offset="100%" stopColor="#D4AA45" stopOpacity="0"/>
      </radialGradient>
      <filter id="hglow">
        <feGaussianBlur stdDeviation="1.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <circle cx="140" cy="140" r="130" fill="url(#hgHalo)"/>

    {/* Cadre */}
    <rect x="10" y="10" width="260" height="260" fill="none" stroke="url(#hgOrH)" strokeWidth="0.7" opacity="0.9"/>
    <rect x="16" y="16" width="248" height="248" fill="none" stroke="url(#hgOrH)" strokeWidth="0.35" opacity="0.3"/>
    <path d="M10,10 L40,10 M10,10 L10,40" stroke="#D4AA45" strokeWidth="2.2" fill="none"/>
    <path d="M270,10 L240,10 M270,10 L270,40" stroke="#C09840" strokeWidth="2.2" fill="none"/>
    <path d="M10,270 L40,270 M10,270 L10,240" stroke="#C09840" strokeWidth="2.2" fill="none"/>
    <path d="M270,270 L240,270 M270,270 L270,240" stroke="#C09840" strokeWidth="2.2" fill="none"/>
    <rect x="10" y="10" width="6" height="6" fill="#D4AA45" opacity="1"/>
    <rect x="264" y="10" width="6" height="6" fill="#C09840" opacity="0.8"/>
    <rect x="10" y="264" width="6" height="6" fill="#C09840" opacity="0.8"/>
    <rect x="264" y="264" width="6" height="6" fill="#C09840" opacity="0.8"/>

    {/* Château */}
    <g opacity="0.35" fill="#D4AA45">
      <rect x="30" y="214" width="220" height="3"/>
      <rect x="82" y="170" width="116" height="44"/>
      <rect x="110" y="160" width="60" height="54"/>
      <rect x="44" y="178" width="42" height="36"/>
      <rect x="194" y="178" width="42" height="36"/>
      <ellipse cx="58" cy="167" rx="20" ry="20"/>
      <rect x="38" y="167" width="40" height="47"/>
      <ellipse cx="222" cy="167" rx="20" ry="20"/>
      <rect x="202" y="167" width="40" height="47"/>
      <path d="M38,167 L58,120 L78,167 Z"/>
      <path d="M202,167 L222,120 L242,167 Z"/>
      <path d="M82,170 L140,134 L198,170 Z"/>
      <path d="M110,160 L140,126 L170,160 Z"/>
      <rect x="130" y="138" width="20" height="12"/><path d="M130,138 L140,130 L150,138 Z"/>
      <rect x="92" y="177" width="12" height="16"/>
      <rect x="116" y="177" width="12" height="16"/>
      <rect x="152" y="177" width="12" height="16"/>
      <rect x="176" y="177" width="12" height="16"/>
      <rect x="110" y="160" width="60" height="5"/>
    </g>

    {/* Portail */}
    <rect x="120" y="182" width="7" height="32" fill="url(#hgOr)" opacity="0.95"/>
    <rect x="153" y="182" width="7" height="32" fill="url(#hgOr)" opacity="0.95"/>
    <path d="M120,197 Q120,176 140,176 Q160,176 160,197" fill="none" stroke="url(#hgOr)" strokeWidth="2.6" opacity="0.98"/>
    <path d="M135,176 L140,170 L145,176 Z" fill="url(#hgOr)" opacity="0.98"/>
    <circle cx="140" cy="176" r="2.8" fill="#C09840" opacity="0.7"/>
    <rect x="122" y="197" width="15" height="17" fill="none" stroke="url(#hgOr)" strokeWidth="1" opacity="0.58"/>
    <line x1="129" y1="197" x2="129" y2="214" stroke="#C09840" strokeWidth="0.9" opacity="0.45"/>
    <line x1="122" y1="205" x2="137" y2="205" stroke="#C09840" strokeWidth="0.9" opacity="0.45"/>
    <rect x="143" y="197" width="15" height="17" fill="none" stroke="url(#hgOr)" strokeWidth="1" opacity="0.58"/>
    <line x1="150" y1="197" x2="150" y2="214" stroke="#C09840" strokeWidth="0.9" opacity="0.45"/>
    <line x1="143" y1="205" x2="158" y2="205" stroke="#C09840" strokeWidth="0.9" opacity="0.45"/>
    <rect x="118" y="180" width="44" height="4" fill="url(#hgOr)" opacity="0.9"/>
    <line x1="30" y1="214" x2="250" y2="214" stroke="url(#hgOrH)" strokeWidth="0.7" opacity="0.25"/>

    {/* Fleur de lys */}
    <text x="140" y="50" textAnchor="middle"
          fontFamily="Palatino Linotype, Palatino, Times New Roman, serif"
          fontSize="42" fill="url(#hgOr)" opacity="1"
          filter="url(#hglow)">⚜</text>

    {/* Ligne sous fleur */}
    <line x1="78" y1="61" x2="118" y2="61" stroke="url(#hgOrH)" strokeWidth="0.7" opacity="0.8"/>
    <line x1="162" y1="61" x2="202" y2="61" stroke="url(#hgOrH)" strokeWidth="0.7" opacity="0.8"/>
    <circle cx="140" cy="61" r="1.8" fill="#D4AA45" opacity="1"/>

    {/* Clé A — derrière */}
    <g transform="rotate(-38, 140, 115)" opacity="1">
      <rect x="137.5" y="79" width="5" height="62" fill="url(#hgOr)" rx="1"/>
      <rect x="135.5" y="90" width="9" height="2.5" fill="url(#hgOr)" rx="0.5" opacity="0.75"/>
      <rect x="135.5" y="100" width="9" height="2.5" fill="url(#hgOr)" rx="0.5" opacity="0.75"/>
      <circle cx="140" cy="73" r="11" fill="none" stroke="url(#hgOr)" strokeWidth="2.4"/>
      <circle cx="140" cy="73" r="6.5" fill="none" stroke="#C09840" strokeWidth="1.1" opacity="0.55"/>
      <line x1="140" y1="66" x2="140" y2="80" stroke="url(#hgOr)" strokeWidth="1.3" opacity="0.7"/>
      <line x1="133" y1="73" x2="147" y2="73" stroke="url(#hgOr)" strokeWidth="1.3" opacity="0.7"/>
      <circle cx="140" cy="66" r="1.8" fill="url(#hgOr)"/>
      <circle cx="140" cy="80" r="1.8" fill="url(#hgOr)"/>
      <circle cx="133" cy="73" r="1.8" fill="url(#hgOr)"/>
      <circle cx="147" cy="73" r="1.8" fill="url(#hgOr)"/>
      <circle cx="140" cy="73" r="3" fill="url(#hgOr)"/>
      <rect x="142.5" y="118" width="11" height="3" fill="url(#hgOr)" rx="0.5"/>
      <rect x="142.5" y="124" width="8" height="3" fill="url(#hgOr)" rx="0.5"/>
      <rect x="142.5" y="130" width="10" height="3" fill="url(#hgOr)" rx="0.5"/>
      <rect x="133" y="114" width="9" height="3" fill="url(#hgOr)" rx="0.5" opacity="0.8"/>
    </g>

    {/* Masque croisement */}
    <rect x="133" y="109" width="14" height="12" fill="#07101E"/>

    {/* Clé B — devant */}
    <g transform="rotate(38, 140, 115)" opacity="1">
      <rect x="137.5" y="79" width="5" height="62" fill="url(#hgOr)" rx="1"/>
      <rect x="135.5" y="90" width="9" height="2.5" fill="url(#hgOr)" rx="0.5" opacity="0.75"/>
      <rect x="135.5" y="100" width="9" height="2.5" fill="url(#hgOr)" rx="0.5" opacity="0.75"/>
      <circle cx="140" cy="73" r="11" fill="none" stroke="url(#hgOr)" strokeWidth="2.4"/>
      <circle cx="140" cy="73" r="6.5" fill="none" stroke="#C09840" strokeWidth="1.1" opacity="0.55"/>
      <line x1="140" y1="66" x2="140" y2="80" stroke="url(#hgOr)" strokeWidth="1.3" opacity="0.7"/>
      <line x1="133" y1="73" x2="147" y2="73" stroke="url(#hgOr)" strokeWidth="1.3" opacity="0.7"/>
      <circle cx="140" cy="66" r="1.8" fill="url(#hgOr)"/>
      <circle cx="140" cy="80" r="1.8" fill="url(#hgOr)"/>
      <circle cx="133" cy="73" r="1.8" fill="url(#hgOr)"/>
      <circle cx="147" cy="73" r="1.8" fill="url(#hgOr)"/>
      <circle cx="140" cy="73" r="3" fill="url(#hgOr)"/>
      <rect x="126.5" y="118" width="11" height="3" fill="url(#hgOr)" rx="0.5"/>
      <rect x="129.5" y="124" width="8" height="3" fill="url(#hgOr)" rx="0.5"/>
      <rect x="127.5" y="130" width="10" height="3" fill="url(#hgOr)" rx="0.5"/>
      <rect x="138" y="114" width="9" height="3" fill="url(#hgOr)" rx="0.5" opacity="0.8"/>
    </g>

    {/* Tige A — partie haute redessine par dessus */}
    <g transform="rotate(-38, 140, 115)" opacity="1">
      <rect x="137.5" y="79" width="5" height="32" fill="url(#hgOr)" rx="1"/>
      <rect x="135.5" y="90" width="9" height="2.5" fill="url(#hgOr)" rx="0.5" opacity="0.75"/>
      <rect x="135.5" y="100" width="9" height="2.5" fill="url(#hgOr)" rx="0.5" opacity="0.75"/>
    </g>

    {/* Nœud central */}
    <circle cx="140" cy="115" r="3.5" fill="url(#hgOr)" opacity="1"/>
    <circle cx="140" cy="115" r="1.5" fill="#07101E" opacity="0.8"/>

    {/* Ornement bas */}
    <line x1="26" y1="228" x2="108" y2="228" stroke="url(#hgOrH)" strokeWidth="0.6" opacity="0.7"/>
    <line x1="172" y1="228" x2="254" y2="228" stroke="url(#hgOrH)" strokeWidth="0.6" opacity="0.7"/>
    <circle cx="140" cy="228" r="2" fill="#D4AA45" opacity="0.9"/>

    {/* LDCC */}
    <text x="140" y="246" textAnchor="middle"
          fontFamily="Palatino Linotype, Palatino, Book Antiqua, Georgia, serif"
          fontSize="9" fontWeight="400" letterSpacing="8"
          fill="url(#hgOrH)" opacity="1">LDCC</text>
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
