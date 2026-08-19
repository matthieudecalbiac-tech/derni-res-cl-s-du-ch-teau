import { useNavigate } from "react-router-dom";
import "../styles/bouton-retour.css";

// Le retour du site — UNE seule source pour le comportement ET l'apparence.
//
// POURQUOI IL EXISTE. Chaque ecran ecrivait son propre retour, et tous
// menaient a l'accueil : on cherchait, on ouvrait un chateau, on revenait — et
// on atterrissait sur la home, la recherche perdue. Le navigateur savait
// pourtant revenir ; c'est le site qui l'ignorait en cablant `navigate("/")`.
//
// LA REGLE, MESUREE AVANT D'ETRE CODEE (18 aout 2026) :
//
//     window.history.state.idx  >  0   ->  navigate(-1)    on reste dans le site
//     window.history.state.idx === 0   ->  navigate("/")   arrivee directe
//
// react-router (7.15, BrowserRouter) numerote les entrees qu'il empile. Mesure :
// `idx` vaut 0 sur une arrivee directe (lien partage, SEO, onglet neuf) et 1
// apres une premiere navigation interne. Le repli n'est donc pas une precaution
// theorique : sans lui, `navigate(-1)` ferait SORTIR du site le visiteur arrive
// par un lien — le pire moment pour le perdre.
//
// ⚠ `window.history.state` peut valoir `null` (premier chargement avant que le
// routeur n'ait pose son etat, navigation manuelle, certains navigateurs). Le
// `?? 0` n'est pas cosmetique : sans lui, l'acces jetterait et le bouton
// deviendrait inerte. En cas de doute on retombe sur l'accueil, jamais dehors.
// La REGLE seule, sans le dessin. Pour les ecrans qui ont deja leur propre
// bouton de retour (la vitrine chateau et son `.vc3-retour`) : ils gardent leur
// apparence, mais empruntent le meme comportement. Sans ce hook, la regle
// existerait en deux exemplaires — et c'est toujours l'un des deux qui derive.
export function useRetour() {
  const navigate = useNavigate();
  return () => {
    const idx = window.history.state?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate("/");
  };
}

export default function BoutonRetour({ libelle = "Retour", className = "" }) {
  const revenir = useRetour();

  return (
    <button
      type="button"
      className={"btn-retour" + (className ? " " + className : "")}
      onClick={revenir}
      aria-label="Retour"
    >
      {/* La fleche est decorative : le libelle porte deja le sens, et
          `aria-label` couvre le cas ou il serait masque en mobile. */}
      <span className="btn-retour-fleche" aria-hidden="true">←</span>
      <span className="btn-retour-libelle">{libelle}</span>
    </button>
  );
}
