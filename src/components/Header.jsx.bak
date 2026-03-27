import { useState, useEffect } from "react";
import "../styles/header.css";

export default function Header({ onOuvrirClub, onOuvrirAPropos, onOuvrirVitrines, onOuvrirDernieresClefs, onConnexion, onOuvrirProprietaires }) {
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
          <span className="logo-lys">&#x269C;</span>
          <div className="logo-texte">
            <span className="logo-principal">Les Clés du Château</span>
            <span className="logo-secondaire">Patrimoine · Art de vivre français</span>
          </div>
        </button>

        <nav className="header-nav" role="navigation">
          <span className="nav-lien nav-lien--vitrines" onClick={onOuvrirVitrines} role="button" tabIndex={0}>
            ◆ Vitrines permanentes
          </span>
          <span className="nav-lien nav-lien--dernieres" onClick={onOuvrirDernieresClefs} role="button" tabIndex={0}>
            ◆ Dernières Clés
          </span>
          <span className="nav-lien nav-lien--club" onClick={onOuvrirClub} role="button" tabIndex={0}>
            ⚜ Club des Châtelains
          </span>
          <span className="nav-lien nav-lien--apropos" onClick={onOuvrirAPropos} role="button" tabIndex={0}>
            À propos
          </span>
          <span className="nav-lien nav-lien--partenaires" onClick={onOuvrirProprietaires} role="button" tabIndex={0}>
            ⚜ Propriétaires
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

      <div className={`header-menu-mobile${menuOuvert ? " ouvert" : ""}`}>
        <nav>
          <span className="nav-lien-mobile" onClick={() => { onOuvrirVitrines?.(); setMenuOuvert(false); }}>
            ◆ Vitrines permanentes
          </span>
          <span className="nav-lien-mobile" onClick={() => { onOuvrirDernieresClefs?.(); setMenuOuvert(false); }}>
            ◆ Dernières Clés du Château
          </span>
          <span className="nav-lien-mobile nav-lien-mobile--club" onClick={() => { onOuvrirClub(); setMenuOuvert(false); }}>
            ⚜ Club des Châtelains
          </span>
          <span className="nav-lien-mobile" onClick={() => { onOuvrirAPropos(); setMenuOuvert(false); }}>
            À propos
          </span>
          <span className="nav-lien-mobile nav-lien--partenaires" onClick={() => scrollVers("partenaires")}>
            ⚜ Votre domaine sur LCC
          </span>
          <button className="nav-mobile-cta" onClick={() => { onOuvrirClub(); setMenuOuvert(false); }}>
            Rejoindre le Club
          </button>
        </nav>
      </div>
    </header>
  );
}
