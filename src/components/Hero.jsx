import "../styles/hero.css";

export default function Hero({ onOuvrirAuth, onOuvrirClub }) {
  const scrollVersOffres = () => {
    document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      {/* Vidéo */}
      <div className="hero-video-wrapper">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.pexels.com/videos/29961219/pexels-photo-29961219.jpeg?auto=compress&cs=tinysrgb&w=1440"
        >
          <source
            src="https://videos.pexels.com/video-files/29961219/12857136_2560_1440_30fps.mp4"
            type="video/mp4"
          />
        </video>
        <div className="hero-video-overlay" />
      </div>

      {/* Motif lys */}
      <div className="lys-pattern">
        <svg>
          <rect width="100%" height="100%" fill="url(#lys-pattern)" />
        </svg>
      </div>

      {/* Halo */}
      <div className="hero-radial" />

      {/* Cadre */}
      <div className="hero-cadre">
        <div className="hero-cadre-coin-bd" />
        <div className="hero-cadre-coin-bg" />
      </div>

      {/* Contenu central */}
      <div className="hero-contenu">
        <span className="hero-sur-titre">
          Châteaux de France · Séjours d'exception
        </span>
        <span className="hero-titre-ligne1">La vie de château</span>
        <span className="hero-titre-ligne2">vous attend</span>
        <div className="hero-ornement">
          <div className="hero-ornement-ligne" />
          <span className="hero-ornement-lys">⚜</span>
          <div className="hero-ornement-ligne" />
        </div>
        <p className="hero-accroche">
          Les plus beaux domaines de France, à moins de 3h de Paris.
          <br />
          Accès libre ou Club privé — à vous de choisir.
        </p>
      </div>

      {/* Stats */}
      <div className="hero-stats">
        <span className="hero-stats-nombre">24</span>
        <span className="hero-stats-label">Châteaux partenaires</span>
      </div>

      {/* Régions */}
      <div className="hero-regions">
        <span className="hero-region-tag">Île-de-France</span>
        <span className="hero-region-tag">Normandie</span>
        <span className="hero-region-tag">Loire</span>
        <span className="hero-region-tag">Bourgogne</span>
        <span className="hero-region-tag">Picardie</span>
      </div>

      {/* Deux portes overlay bas */}
      <div className="hero-portes-overlay">
        <div
          className="hero-porte-overlay hero-porte-overlay--gauche"
          onClick={scrollVersOffres}
        >
          <div className="hero-porte-overlay-badge">Accès libre</div>
          <div className="hero-porte-overlay-titre">⏳ Dernières Clés</div>
          <div className="hero-porte-overlay-desc">
            Offres last-minute · J−7 à J−15 · Jusqu'à −40%
          </div>
          <div className="hero-porte-overlay-cta">Voir les offres →</div>
        </div>
        <div
          className="hero-porte-overlay hero-porte-overlay--droite"
          onClick={onOuvrirClub}
        >
          <div className="hero-porte-overlay-badge hero-porte-overlay-badge--or">
            Sur inscription
          </div>
          <div className="hero-porte-overlay-titre hero-porte-overlay-titre--or">
            ⚜ Club des Châtelains
          </div>
          <div className="hero-porte-overlay-desc hero-porte-overlay-desc--or">
            Vitrines permanentes · Packages exclusifs
          </div>
          <div className="hero-porte-overlay-cta hero-porte-overlay-cta--or">
            Rejoindre le Club →
          </div>
        </div>
      </div>

      <button
        className="hero-proprietaires-link"
        onClick={() => document.getElementById("partenaires")?.scrollIntoView({ behavior: "smooth" })}
      >
        Vous êtes propriétaire d'un domaine ?{" "}
        <span className="hero-proprietaires-link-fleche">→</span>
      </button>
    </section>
  );
}
