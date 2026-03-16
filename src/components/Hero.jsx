import "../styles/hero.css";

export default function Hero() {
  const scrollVersOffres = () => {
    document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      <div className="hero-motif" />

      {/* Cadre décoratif */}
      <div className="hero-cadre">
        <div className="hero-cadre-coin-bd" />
        <div className="hero-cadre-coin-bg" />
      </div>

      <div className="hero-contenu">
        <span className="hero-sur-titre">
          Club privé · Dernière minute · Châteaux de France
        </span>

        <span className="hero-titre-ligne1">La vie de château</span>
        <span className="hero-titre-ligne2">vous attend ce week-end</span>

        <div className="hero-ornement">
          <div className="hero-ornement-ligne" />
          <span className="hero-ornement-losange">◆</span>
          <div className="hero-ornement-ligne" />
        </div>

        <p className="hero-accroche">
          Des chambres d'exception à saisir dans les 15 jours, dans les plus
          beaux châteaux à moins de 3 heures de Paris.
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

      <div className="hero-scroll" onClick={scrollVersOffres}>
        <span className="hero-scroll-label">Découvrir</span>
        <div className="hero-scroll-ligne" />
      </div>

      <div className="hero-stats">
        <span className="hero-stats-nombre">24</span>
        <span className="hero-stats-label">Châteaux partenaires</span>
      </div>

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
