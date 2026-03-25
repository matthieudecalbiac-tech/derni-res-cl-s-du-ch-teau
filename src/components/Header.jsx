import { useState, useEffect } from "react";
import "../styles/header.css";

const LogoChateau = () => (
  <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style={{ width: 52, height: 52, flexShrink: 0 }}>
    <rect width="280" height="280" fill="#F5F0E8"/>
    <text x="140" y="52" textAnchor="middle" fontSize="38" fontFamily="Georgia,serif" fill="#8B6014">&#9884;</text>
    <path d="M60 90 L60 210 L220 210 L220 90" fill="none" stroke="#8B6014" strokeWidth="3"/>
    <path d="M60 90 L80 70 L80 90" fill="#B8862A" stroke="#8B6014" strokeWidth="2"/>
    <path d="M220 90 L200 70 L200 90" fill="#B8862A" stroke="#8B6014" strokeWidth="2"/>
    <path d="M115 90 L115 70 L140 55 L165 70 L165 90" fill="#B8862A" stroke="#8B6014" strokeWidth="2"/>
    <path d="M60 130 L220 130" stroke="#8B6014" strokeWidth="1.5" opacity="0.5"/>
    <path d="M95 210 L95 155 Q140 140 185 155 L185 210" fill="#C8973E" opacity="0.3" stroke="#8B6014" strokeWidth="2"/>
    <path d="M118 210 L118 165 L162 165 L162 210" fill="none" stroke="#8B6014" strokeWidth="2"/>
    <path d="M118 165 Q140 158 162 165" fill="none" stroke="#8B6014" strokeWidth="2"/>
    <line x1="140" y1="210" x2="140" y2="165" stroke="#8B6014" strokeWidth="1.5"/>
    <path d="M85 110 C90 105 95 108 90 115 C88 120 80 118 80 110 C80 100 92 95 100 105" fill="none" stroke="#B8862A" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M195 110 C190 105 185 108 190 115 C192 120 200 118 200 110 C200 100 188 95 180 105" fill="none" stroke="#B8862A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="80" y1="115" x2="95" y2="130" stroke="#B8862A" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="200" y1="115" x2="185" y2="130" stroke="#B8862A" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="87" cy="118" r="4" fill="#B8862A"/>
    <circle cx="193" cy="118" r="4" fill="#B8862A"/>
    <line x1="80" y1="115" x2="200" y2="115" stroke="#B8862A" strokeWidth="1" strokeDasharray="3,4" opacity="0.4"/>
    <text x="140" y="250" textAnchor="middle" fontSize="11" fontFamily="Garamond,Georgia,serif" letterSpacing="4" fill="#8B6014">LCC</text>
  </svg>
);

export default function Header({ onOuvrirClub, onOuvrirAPropos, onOuvrirVitrines, onOuvrirDernieresClefs, onConnexion }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [solide, setSolide] = useState(false);

  useEffect(() => {
    const handleScroll = () => setSolide(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollVers = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOuvert(false);
  };

  return (
    <header className={`header${solide ? " header--solide" : ""}`}>
      <div className="header-inner">
        <button className="header-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Accueil">
          <LogoChateau />
          <div className="logo-texte">
            <span className="logo-principal">Les Cl\u00e9s du Ch\u00e2teau</span>
            <span className="logo-secondaire">Patrimoine \u00b7 Art de vivre fran\u00e7ais</span>
          </div>
        </button>

        <nav className="header-nav" role="navigation" aria-label="Navigation principale">
          <span className="nav-lien nav-lien--vitrines" onClick={onOuvrirVitrines} role="button" tabIndex={0}>
            \u25c6 Vitrines permanentes
          </span>
          <span className="nav-lien nav-lien--dernieres" onClick={onOuvrirDernieresClefs} role="button" tabIndex={0}>
            \u25c6 Derni\u00e8res Cl\u00e9s
          </span>
          <span className="nav-lien nav-lien--club" onClick={onOuvrirClub} role="button" tabIndex={0}>
            \u269c Club des Ch\u00e2telains
          </span>
          <span className="nav-lien nav-lien--apropos" onClick={onOuvrirAPropos} role="button" tabIndex={0}>
            \u00c0 propos
          </span>
          <span className="nav-lien nav-lien--partenaires" onClick={() => scrollVers("partenaires")} role="button" tabIndex={0}>
            \u269c Propri\u00e9taires
          </span>
        </nav>

        <div className="header-actions">
          <button className="header-connexion" onClick={onConnexion}>Connexion</button>
          <button className="header-cta" onClick={onOuvrirClub}>Rejoindre le Club</button>
          <button className={`header-burger${menuOuvert ? " ouvert" : ""}`} onClick={() => setMenuOuvert(!menuOuvert)} aria-label="Menu" aria-expanded={menuOuvert}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      <div className={`header-menu-mobile${menuOuvert ? " ouvert" : ""}`} role="dialog" aria-label="Menu mobile">
        <nav>
          <span className="nav-lien-mobile nav-lien-mobile--vitrines" onClick={() => { onOuvrirVitrines?.(); setMenuOuvert(false); }}>
            \u25c6 Vitrines permanentes
          </span>
          <span className="nav-lien-mobile nav-lien-mobile--dernieres" onClick={() => { onOuvrirDernieresClefs?.(); setMenuOuvert(false); }}>
            \u25c6 Derni\u00e8res Cl\u00e9s du Ch\u00e2teau
          </span>
          <span className="nav-lien-mobile nav-lien-mobile--club" onClick={() => { onOuvrirClub(); setMenuOuvert(false); }}>
            \u269c Club des Ch\u00e2telains
          </span>
          <span className="nav-lien-mobile" onClick={() => { onOuvrirAPropos(); setMenuOuvert(false); }}>
            \u00c0 propos
          </span>
          <span className="nav-lien-mobile nav-lien--partenaires" onClick={() => scrollVers("partenaires")}>
            \u269c Votre domaine sur LCC
          </span>
          <button className="nav-mobile-cta" onClick={() => { onOuvrirClub(); setMenuOuvert(false); }}>
            Rejoindre le Club
          </button>
        </nav>
      </div>
    </header>
  );
}
