import { useState, useEffect } from "react";
import "../styles/header.css";

const LogoChateau = () => (
  <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg" style={{ width: 52, height: 52, flexShrink: 0 }}>
    <rect width="280" height="280" fill="#F5F0E8"/>
    <text x="140" y="52" textAnchor="middle" fontSize="38" fontFamily="Georgia,serif" fill="#8B6014">⚜</text>
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
    <line x1="80" y1="130" x2="200" y2="130" stroke="#8B6014" strokeWidth="0.8" opacity="0.3"/>
    <text x="140" y="250" textAnchor="middle" fontSize="11" fontFamily="Garamond,Georgia,serif" letterSpacing="4" fill="#8B6014">LCC</text>
  </svg>
);

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
    description: "Disponibilités last-minute J-7 à J-15 dans les plus beaux domaines à moins de 3h de Paris.",
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
      else if (action === "proprietaires") onOuvrirProprietaires?.();
    }, 300);
  };

  return (
    <>
      <header className={\`header\${solide ? " header--solide" : ""}\${menuOuvert ? " header--menu-ouvert" : ""}\`}>
        <div className="header-inner">
          <button
            className="header-logo"
            onClick={() => { fermer(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            aria-label="Accueil"
          >
            <LogoChateau />
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
              className={\`header-burger\${menuOuvert ? " ouvert" : ""}\`}
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
        className={\`hm-overlay\${menuOuvert ? " hm-overlay--ouvert" : ""}\`}
        aria-hidden={!menuOuvert}
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
                className={\`hm-item hm-item--\${item.couleur}\${itemSurvole === item.id ? " hm-item--actif" : ""}\`}
                onClick={() => handleAction(item.action)}
                onMouseEnter={() => setItemSurvole(item.id)}
                onMouseLeave={() => setItemSurvole(null)}
                style={{ animationDelay: menuOuvert ? \`\${i * 80}ms\` : "0ms" }}
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
