import { memo } from "react";
import "../styles/hero.css";

// Slogan seul (colonne gauche de la grille accueil). La carte illustree et le
// reste (barre, pastilles, toggle) sont composes dans App.jsx (grille 2 colonnes).
// Fleur-de-lys au-dessus du titre retiree (conforme DA) — voir ci-dessous.
//
// L'eyebrow et l'ornement sont rendus EN PERMANENCE mais masques par defaut
// (hero.css : `.hero-eyebrow, .hero-orn { display: none }`). Ils n'apparaissent
// que sous le seuil mobile. Deux noeuds inertes de plus dans le DOM desktop,
// zero pixel change — c'est le prix a payer pour garder la copie editoriale
// dans le JSX plutot que de l'enfouir dans un `content:` de feuille de style.
// Le lys revient donc en mobile SEULEMENT : le desktop reste conforme a la DA.
function Hero() {
  return (
    <div className="acc-slogan">
      <p className="hero-eyebrow">L’exception à chaque séjour</p>
      <div className="hero-orn" aria-hidden="true">
        <span className="hero-orn-l" />
        <span className="hero-orn-lys">⚜</span>
      </div>
      <h1 className="hero-titre">Votre route vers l’exception des châteaux de France</h1>
      <div className="hero-sep" />
    </div>
  );
}

export default memo(Hero);
