import { memo } from "react";
import "../styles/hero.css";

// memo : Hero est statique (0 state, 0 effect) mais App re-render
// toutes les 60s via useHorloge. memo court-circuite les re-renders
// de Hero tant que ses props (0 après cleanup) ne changent pas.
function Hero() {
  return (
    <section className="hero">
      {/* Vidéo */}
      <div className="hero-video-wrapper">
        {/* preload="metadata" limite le chargement à la première frame +
            métadonnées, évitant les range requests en vol qui s'abort quand
            le user navigue ailleurs. Gain perceptible en dev (StrictMode
            double-mount) et en prod sur navigation rapide. */}
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="https://images.pexels.com/videos/29961219/pexels-photo-29961219.jpeg?auto=compress&cs=tinysrgb&w=1440"
        >
          <source
            src="https://videos.pexels.com/video-files/29961219/12857136_2560_1440_30fps.mp4"
            type="video/mp4"
          />
        </video>
        {/* Fallback statique pour prefers-reduced-motion (cf. hero.css) */}
        <img
          className="hero-poster"
          src="https://images.pexels.com/videos/29961219/pexels-photo-29961219.jpeg?auto=compress&cs=tinysrgb&w=1440"
          alt=""
          aria-hidden="true"
        />
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
          Séjours d'exception
        </span>
        <span className="hero-titre-ligne1">La vie de <em>château</em></span>
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
          Dormir et vivre l'expérience dans les demeures <em className="hero-signature-accent">qui ont fait la France.</em>
        </p>
        <div className="lcc-hero-fondation">
          <p className="lcc-hero-fondation-l1">
            Aidez-nous à préserver le patrimoine français
          </p>
          <p className="lcc-hero-fondation-l2">
            une partie de nos recettes est reversée à la Fondation du Patrimoine
          </p>
        </div>
      </div>

    </section>
  );
}

export default memo(Hero);