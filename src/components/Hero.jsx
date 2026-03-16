import "../styles/hero.css";

/*
  VIDÉOS DISPONIBLES — choisis celle que tu préfères,
  colle son URL dans la variable VIDEO_URL ci-dessous.

  Option 1 — Château de Chambord, plan aérien été :
  https://www.pexels.com/video/chateau-de-chambord-castle-in-summer-daytime-28858942/

  Option 2 — Château approche :
  https://www.pexels.com/video/castle-20008131/

  Pour récupérer l'URL directe de la vidéo :
  1. Va sur la page Pexels
  2. Clique "Téléchargement gratuit"
  3. Choisis SD ou HD
  4. Clic droit sur le bouton → "Copier l'adresse du lien"
  5. Colle l'URL ici
*/

const VIDEO_URL =
  "https://videos.pexels.com/video-files/28858942/12609585_2560_1440_25fps.mp4";

export default function Hero() {
  const scrollVersOffres = () => {
    document.getElementById("offres")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      {/* ── VIDÉO DE FOND ── */}
      <div className="hero-video-wrapper">
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=1920&q=80"
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="hero-video-overlay" />
      </div>

      {/* Motif fleurs de lys par-dessus la vidéo */}
      <div className="lys-pattern">
        <svg>
          <rect width="100%" height="100%" fill="url(#lys-pattern)" />
        </svg>
      </div>

      {/* Halo central doré */}
      <div className="hero-radial" />

      {/* Cadre décoratif */}
      <div className="hero-cadre">
        <div className="hero-cadre-coin-bd" />
        <div className="hero-cadre-coin-bg" />
      </div>

      {/* Contenu */}
      <div className="hero-contenu">
        <span className="hero-sur-titre">
          Club privé · Dernière minute · Châteaux de France
        </span>

        <span className="hero-titre-ligne1">La vie de château</span>
        <span className="hero-titre-ligne2">vous attend ce week-end</span>

        <div className="hero-ornement">
          <div className="hero-ornement-ligne" />
          <span className="hero-ornement-lys">⚜</span>
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
