import { memo } from "react";
import "../styles/hero.css";

// Slogan seul (colonne gauche de la grille accueil). La carte illustree et le
// reste (barre, pastilles, toggle) sont composes dans App.jsx (grille 2 colonnes).
// Fleur-de-lys au-dessus du titre retiree (conforme DA).
function Hero() {
  return (
    <div className="acc-slogan">
      <h1 className="hero-titre">Votre route vers l’exception des châteaux de France</h1>
      <div className="hero-sep" />
    </div>
  );
}

export default memo(Hero);
