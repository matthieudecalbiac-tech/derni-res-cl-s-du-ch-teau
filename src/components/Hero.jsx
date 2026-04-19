import "../styles/hero.css";

export default function Hero({ onOuvrirAuth, onOuvrirClub, onOuvrirDernieresClefs, onOuvrirVitrines }) {
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
      <div className="lys-pattern" style={{opacity:0}}>
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
        <p className="hero-signature">
          Demeures et châteaux de France
        </p>
        <p className="hero-accroche">
          Dormir dans les demeures <em className="hero-signature-accent">qui ont fait la France.</em>
        </p>
        <div className="hero-fondation">
          <span className="hero-fondation-ico">⚜</span>
          <span className="hero-fondation-texte">
            Aidez-nous à préserver le patrimoine —{" "}
            <strong>une partie de nos recettes est reversée à la Fondation du Patrimoine</strong>
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hero-stats">
        <span className="hero-stats-nombre">81</span>
        <span className="hero-stats-label">Domaines sélectionnés</span>
      </div>

    </section>
  );
}