import "../styles/hero.css";

export default function Hero() {
  const scrollVersOffres = () => {
    document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      {/* Image de fond */}
      <div className="hero-bg" />

      {/* Overlays */}
      <div className="hero-overlay-haut" />
      <div className="hero-overlay-bas" />

      {/* Contenu central */}
      <div className="hero-contenu">
        <span className="hero-sur-titre">
          Échappées aristocratiques · Dernière minute
        </span>

        <h1 className="hero-titre">
          La vie de château
          <em>vous attend ce week-end</em>
        </h1>

        <div className="hero-ornement">
          <div className="hero-ornement-ligne" />
          <span className="hero-ornement-losange">◆</span>
          <div className="hero-ornement-ligne" />
        </div>

        <p className="hero-accroche">
          Quittez Paris. Prenez la route. Arrivez dans un domaine chargé
          d'histoire. Des chambres d'exception à saisir dans les 15 jours, dans
          les plus beaux châteaux à moins de 3 heures de la capitale.
        </p>

        <div className="hero-actions">
          <button className="btn-or" onClick={scrollVersOffres}>
            <span>Découvrir les offres du moment</span>
          </button>
          <button className="btn-contour" onClick={scrollVersOffres}>
            <span>Comment ça marche</span>
          </button>
        </div>
      </div>

      {/* Indicateur scroll */}
      <div className="hero-scroll" onClick={scrollVersOffres}>
        <span className="hero-scroll-label">Découvrir</span>
        <div className="hero-scroll-ligne" />
      </div>

      {/* Stats coin droit */}
      <div className="hero-stats">
        <span className="hero-stats-nombre">24</span>
        <span className="hero-stats-label">Châteaux partenaires</span>
      </div>

      {/* Régions coin gauche */}
      <div className="hero-regions">
        <span className="hero-region-tag">Île-de-France</span>
        <span className="hero-region-tag">Normandie</span>
        <span className="hero-region-tag">Loire</span>
        <span className="hero-region-tag">Bourgogne</span>
        <span className="hero-region-tag">Picardie</span>
      </div>
    </section>
  );
}
