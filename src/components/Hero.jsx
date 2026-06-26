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
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videoherofinale-poster.jpg"
        >
          <source
            src="/videoherofinale.mp4"
            type="video/mp4"
          />
        </video>
        {/* Fallback statique pour prefers-reduced-motion (cf. hero.css) */}
        <img
          className="hero-poster"
          src="/videoherofinale-poster.jpg"
          alt=""
          aria-hidden="true"
        />
      </div>

    </section>
  );
}

export default memo(Hero);