import { useState, useEffect } from "react";
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
    id: "club",
    icone: "⚜",
    titre: "Club des Châtelains",
    description: "Offres et packages exclusifs réservés aux membres — tarifs confidentiels, avant-premières.",
    action: "club",
    couleur: "or",
  },
  {
    id: "conciergerie",
    icone: "\u2726",
    titre: "Conciergerie",
    description: "Transfert en berline ou h\u00e9licopt\u00e8re, accueil champagne, spa priv\u00e9, photographie \u2014 nous sublimions chaque d\u00e9tail de votre s\u00e9jour.",
    action: "conciergerie",
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
    id: "proprietaires",
    icone: "⚜",
    titre: "Propriétaires",
    description: "Votre château sur LCC — modes de partenariat, commissions et processus d’intégration.",
    action: "proprietaires",
    couleur: "or",
  },
];

export default function Header({
  onOuvrirClub,
  onOuvrirAPropos,
  onOuvrirVitrines,
  onOuvrirDernieresClefs,
  onConnexion,
  onOuvrirProprietaires,
  onOuvrirEvenementiel,
  onOuvrirConciergerie,
}) {
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
    fermer();
    setTimeout(() => {
      if (action === "vitrines") onOuvrirVitrines?.();
      else if (action === "dernieres") onOuvrirDernieresClefs?.();
      else if (action === "club") onOuvrirClub?.();
      else if (action === "apropos") onOuvrirAPropos?.();
      else if (action === "conciergerie") onOuvrirConciergerie?.();
      else if (action === "evenementiel") onOuvrirEvenementiel?.();
      else if (action === "proprietaires") onOuvrirProprietaires?.();
    }, 300);
  };

  return (
    <>
      <header className={`header${solide ? " header--solide" : ""}\${menuOuvert ? " header--menu-ouvert" : ""}`}>
        <div className="header-inner">
          <button
            className="header-logo"
            onClick={() => { fermer(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            aria-label="Accueil"
          >
            <span className="header-lys">&#x269C;</span>
            <div className="logo-texte">
              <span className="logo-principal">Les Clés du Château</span>
              <span className="logo-secondaire">Patrimoine · Art de vivre français</span>
            </div>
          </button>

          <div className="header-actions">
            <button className="header-connexion" onClick={() => { fermer(); onConnexion?.(); }}>
              Connexion
            </button>
            <button className="header-cta" onClick={() => { fermer(); onOuvrirClub?.(); }}>
              Rejoindre le Club
            </button>
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
        inert={!menuOuvert ? "" : undefined}
      >
        <div className="hm-fond-deco" />

        <button className="hm-fermer" onClick={fermer} aria-label="Fermer le menu">
          <span />
          <span />
        </button>

        <div className="hm-contenu">
          <div className="hm-ornement">
            <span className="hm-trait" />
            <span className="hm-lys">⚜</span>
            <span className="hm-trait" />
          </div>

          <nav className="hm-nav" role="navigation">
            {MENU_ITEMS.map((item, i) => (
              <button
                key={item.id}
                className={`hm-item hm-item--${item.couleur}${itemSurvole === item.id ? " hm-item--actif" : ""}`}
                onClick={() => handleAction(item.action)}
                onMouseEnter={() => setItemSurvole(item.id)}
                onMouseLeave={() => setItemSurvole(null)}
                style={{ animationDelay: menuOuvert ? `${i * 80}ms` : "0ms" }}
              >
                <div className="hm-item-gauche">
                  <span className="hm-item-num">0{i + 1}</span>
                </div>
                <div className="hm-item-centre">
                  <div className="hm-item-header">
                    <span className="hm-item-icone">{item.icone}</span>
                    <span className="hm-item-titre">{item.titre}</span>
                  </div>
                  <p className="hm-item-desc">{item.description}</p>
                </div>
                <div className="hm-item-fleche">→</div>
              </button>
            ))}
          </nav>

          <div className="hm-bas">
            <div className="hm-ornement hm-ornement--bas">
              <span className="hm-trait" />
              <span className="hm-lys hm-lys--petit">⚜</span>
              <span className="hm-trait" />
            </div>
            <p className="hm-baseline">Les plus beaux châteaux de France · À moins de 3h de Paris</p>
          </div>
        </div>
      </div>
    </>
  );
}
