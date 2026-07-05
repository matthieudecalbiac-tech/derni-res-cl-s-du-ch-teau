import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/header.css";

const MENU_ITEMS = [
  {
    id: "vitrines",
    icone: "◆",
    titre: "Vitrines permanentes",
    description: "Découvrez nos châteaux partenaires — histoire, famille, territoire et chambres disponibles.",
    action: "vitrines",
    couleur: "default",
  },
  {
    id: "dernieres",
    icone: "◆",
    titre: "Les Dernières Clés",
    description: "Séjours à court terme dans les plus beaux domaines à moins de 3h de Paris.",
    action: "dernieres",
    couleur: "default",
  },
  {
    id: "evenementiel",
    icone: "\u2726",
    titre: "Les Cl\u00e9s de l\u2019\u00c9v\u00e9nementiel",
    description: "Mariages, s\u00e9minaires, galas \u2014 louez un ch\u00e2teau pour vos \u00e9v\u00e9nements d\u2019exception.",
    action: "evenementiel",
    couleur: "default",
  },
  {
    id: "apropos",
    icone: "·",
    titre: "À propos",
    description: "Notre vision, l’équipe fondatrice et l’histoire de la plateforme.",
    action: "apropos",
    couleur: "subtil",
  },
  {
    id: "club",
    icone: "⚜",
    titre: "Club Châtelains",
    description: "Offres confidentielles et séjours patrimoniaux pour les Châtelains.",
    action: "club",
    couleur: "or",
  },
  {
    id: "proprietaires",
    icone: "⚜",
    titre: "Propriétaires",
    description: "Votre château sur LCC — modes de partenariat, commissions et processus d’intégration.",
    action: "proprietaires",
    couleur: "or",
  },
];

export default function Header({
  onOuvrirAPropos,
  onOuvrirVitrines,
  onOuvrirDernieresClefs,
  onOuvrirProprietaires,
  onOuvrirEvenementiel,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [solide, setSolide] = useState(false);
  const [itemSurvole, setItemSurvole] = useState(null);

  useEffect(() => {
    const handleScroll = () => setSolide(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOuvert ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOuvert]);

  const fermer = () => setMenuOuvert(false);

  const handleAction = (action) => {
    // 1. Ouvrir la destination IMMEDIATEMENT (elle se monte par-dessus le menu, z-index superieur)
    if (action === "vitrines") onOuvrirVitrines?.();
    else if (action === "dernieres") onOuvrirDernieresClefs?.();
    else if (action === "apropos") onOuvrirAPropos?.();
    else if (action === "evenementiel") onOuvrirEvenementiel?.();
    else if (action === "proprietaires") onOuvrirProprietaires?.();
    else if (action === "club") navigate(user ? "/club" : "/inscription");
    // 2. Fermer le menu APRES le fondu d'entree de la destination (~550ms),
    //    pour qu'il serve de backdrop opaque pendant le cross-fade (jamais la home).
    setTimeout(() => setMenuOuvert(false), 550);
  };

  return (
    <>
      <header className={`header${solide ? " header--solide" : ""}${menuOuvert ? " header--menu-ouvert" : ""}`}>
        <div className="header-inner">
          <button
            className="header-logo"
            onClick={() => { fermer(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            aria-label="Accueil"
          >
            <img src="/L1.png" alt="" aria-hidden="true" className="header-logo-embleme" />
            <img src="/L2.png" alt="Les Clés du Château" className="header-logo-wordmark" />
          </button>

          <div className="header-actions">
            {user ? (
              <button className="header-cta" onClick={() => { fermer(); navigate("/club"); }}>
                Mon compte
              </button>
            ) : (
              <>
                <button className="header-connexion" onClick={() => { fermer(); navigate("/connexion"); }}>
                  Connexion
                </button>
                <button className="header-cta" onClick={() => { fermer(); navigate("/inscription"); }}>
                  Rejoindre le Club
                </button>
              </>
            )}
            <button
              className={`header-burger${menuOuvert ? " ouvert" : ""}`}
              onClick={() => setMenuOuvert(!menuOuvert)}
              aria-label={menuOuvert ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOuvert}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`hm-overlay${menuOuvert ? " hm-overlay--ouvert" : ""}`}
        inert={!menuOuvert}
      >
        <div className="hm-fond-deco" />

        <button className="hm-fermer" onClick={fermer} aria-label="Fermer le menu">
          <span />
          <span />
        </button>

        <div className="hm-contenu hm-contenu--sommaire">
          <div className="hm-col-gauche">
            <h2 className="hm-sommaire-titre">Sommaire</h2>
            <div className="hm-ornement">
              <span className="hm-trait" />
              <span className="hm-lys">⚜</span>
              <span className="hm-trait" />
            </div>
            <p className="hm-sommaire-intro">Explorez l'univers des châteaux à travers des expériences d'exception, des lieux rares et des privilèges réservés à nos membres.</p>
            <div className="hm-sommaire-bas">
              <span className="hm-lys hm-lys--petit">⚜</span>
              <p className="hm-baseline">Les plus beaux châteaux de France<br />à moins de 3h de Paris</p>
            </div>
          </div>

          <nav className="hm-nav" role="navigation">
            {MENU_ITEMS.map((item, i) => (
              <button
                key={item.id}
                className={`hm-item hm-item--${item.couleur}${itemSurvole === item.id ? " hm-item--actif" : ""}`}
                onClick={() => handleAction(item.action)}
                onMouseEnter={() => setItemSurvole(item.id)}
                onMouseLeave={() => setItemSurvole(null)}
                style={{ animationDelay: menuOuvert ? `${0.35 + i * 0.11}s` : "0s" }}
              >
                <span className="hm-item-num">0{i + 1}</span>
                <span className="hm-item-barre" />
                <div className="hm-item-centre">
                  <span className="hm-item-titre">{item.titre}</span>
                  <p className="hm-item-desc">{item.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
