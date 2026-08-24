import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cheminAuth, NEXT_CLUB } from "../utils/cheminAuth";
import { useAuth } from "../contexts/AuthContext";
import "../styles/header.css";

const MENU_ITEMS = [
  {
    id: "vitrines",
    icone: "◆",
    titre: "Vitrines",
    description: "Découvrez nos châteaux partenaires — histoire, famille, territoire et chambres disponibles.",
    action: "vitrines",
    couleur: "default",
  },
  // ⚠ L'ENTREE « Les Dernieres Cles » EST RETIREE — EN VEILLE, PAS SUPPRIMEE.
  //   Les Dernieres Cles ne sont plus un module public autonome : elles
  //   deviennent une offre RESERVEE AUX CONNECTES, a l'interieur du Club.
  //   Le composant, sa feuille et son service restent en place, prets a etre
  //   rebranches. Pour reactiver : restaurer ce bloc ET la ligne
  //   `action === "dernieres"` dans handleAction.
  //
  //   { id: "dernieres", icone: "◆", titre: "Les Dernières Clés",
  //     description: "Séjours à court terme dans les plus beaux domaines à moins de 3h de Paris.",
  //     action: "dernieres", couleur: "default" },
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

// ⚠ LE HEADER N'A PLUS AUCUNE PROP DE NAVIGATION, et c'est le coeur du
// correctif — pas une simplification cosmetique.
//
// Il en avait quatre, et deux ecrans les cablaient DIFFEREMMENT : `App` ouvrait
// des calques, `PageResultats` retombait sur un `versHome` de secours faute de
// pouvoir en ouvrir depuis une route. Le meme bouton menait donc a deux
// endroits selon la page — le visiteur perdait sa recherche SANS obtenir
// l'ecran demande.
//
// Sans prop, le Header ne PEUT PLUS se comporter differemment selon qui le
// monte. Le defaut disparait par construction, pas par vigilance.
export default function Header() {
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
    // QUATRE ENTREES, QUATRE DESTINATIONS. Plus de callback : chacune a une URL.
    // ⚠ « dernieres » est retiree avec son entree de menu (cf. plus haut). La
    //   route /dernieres-cles n'existe plus non plus : la reactiver demande de
    //   restaurer les deux, dans App.jsx et ici.
    if (action === "vitrines") navigate("/vitrines");
    else if (action === "apropos") navigate("/a-propos");
    else if (action === "proprietaires") navigate("/proprietaires");
    // Un visiteur qui vient au Club A DEJA UN COMPTE le plus souvent : on le
    // mene a la CONNEXION, et non a l'inscription ou il devait trouver
    // lui-meme « Deja membre ? ». Et l'on dit ou revenir ensuite.
    else if (action === "club") navigate(user ? "/club" : cheminAuth("/connexion", NEXT_CLUB));
    // ⚠ LA MINUTERIE DE 550 ms EST RETIREE, parce qu'elle ne servait plus rien.
    // Elle gardait le menu ouvert pour qu'il serve de fond opaque pendant le
    // fondu d'entree de la destination. Depuis que les entrees NAVIGUENT, le
    // Header se demonte aussitot : la minuterie s'executait sur un composant
    // demonte, donc dans le vide.
    //
    // Et le fond, lui, est deja bon : mesure du 20 aout, `.route-catalogue` est
    // present des la PREMIERE image, en creme — le meme creme que le menu. Le
    // fondu de l'ecran joue donc par-dessus la bonne couleur. C'est le correctif
    // du flash navy (pilote) qui a regle celui-ci par la meme occasion.
    setMenuOuvert(false);
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
                <button className="header-connexion" onClick={() => { fermer(); navigate(cheminAuth("/connexion", NEXT_CLUB)); }}>
                  Connexion
                </button>
                <button className="header-cta" onClick={() => { fermer(); navigate(cheminAuth("/inscription", NEXT_CLUB)); }}>
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
                data-id={item.id}
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

          {/* BARRE D'ACCES — MOBILE UNIQUEMENT (header.css la masque au-dessus
              du seuil ; en `display:none` elle sort de la grille, donc le
              Sommaire desktop reste a deux colonnes exactement comme avant).
              POURQUOI ELLE EXISTE : en desktop, `.header` (z-index 5000) reste
              AU-DESSUS du Sommaire (4900) et garde ses acces Connexion /
              Rejoindre le Club — le CSS a meme des regles dediees a cet etat
              (`.header--menu-ouvert .header-connexion`). Sous 768, ces deux
              boutons sont en `display:none` : le mobile perdait donc le seul
              chemin vers la connexion. On reproduit ici la MEME paire, avec la
              MEME bascule sur `user`, plutot que d'inventer des destinations
              (un « Journal » et un « Contact » n'existent nulle part). */}
          <div className="hm-acces">
            {user ? (
              <button
                className="hm-acces-btn hm-acces-btn--cta"
                onClick={() => { fermer(); navigate("/club"); }}
              >
                Mon compte
              </button>
            ) : (
              <>
                <button
                  className="hm-acces-btn"
                  onClick={() => { fermer(); navigate(cheminAuth("/connexion", NEXT_CLUB)); }}
                >
                  Connexion
                </button>
                <button
                  className="hm-acces-btn hm-acces-btn--cta"
                  onClick={() => { fermer(); navigate(cheminAuth("/inscription", NEXT_CLUB)); }}
                >
                  Rejoindre le Club
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
