import { memo } from "react";
import "../styles/hero.css";

// memo : Hero est statique (0 state, 0 effect) mais App re-render
// toutes les 60s via useHorloge. memo court-circuite les re-renders
// de Hero tant que ses props (0 après cleanup) ne changent pas.
function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-texte">
          <div className="hero-orn">
            <span className="hero-orn-l" />
            <span className="hero-orn-lys">⚜</span>
            <span className="hero-orn-l" />
          </div>
          <h1 className="hero-titre">Votre route vers l’exception des châteaux de France</h1>
          <div className="hero-sep" />
        </div>
        <div className="hero-illus">
          <img src="/homedessin14-detouree.png" alt="Carte des châteaux depuis Paris" className="hero-illus-img" />
        </div>
      </div>
    </section>
  );
}

export default memo(Hero);
