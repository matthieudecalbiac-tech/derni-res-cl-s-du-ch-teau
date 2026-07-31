import { Link } from "react-router-dom";
import "../styles/pied-patrimoine.css";

// Le pied de page dit d'abord la Fondation, et seulement ensuite l'accès
// professionnel — un raccourci de travail n'a pas à concurrencer le propos
// éditorial du site. D'où le filet de séparation et la taille réduite.

export default function PiedPatrimoine() {
  return (
    <footer className="pied-patrimoine">
      <span className="pied-patrimoine-lys" aria-hidden="true">⚜</span>
      <p className="pied-patrimoine-texte">
        Les Clés du Château reverse une partie de ses recettes à la{" "}
        <a
          className="pied-patrimoine-lien"
          href="https://www.fondation-patrimoine.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Fondation du Patrimoine
        </a>
        , pour préserver les demeures françaises.
      </p>

      {/* Raccourci de travail — le mot « admin » n'y figure pas : depuis la
          home, la porte est la même pour un châtelain et pour nous, et c'est la
          page suivante qui distingue. Une simple destination, aucun droit. */}
      <p className="pied-patrimoine-pro">
        <Link className="pied-patrimoine-pro-lien" to="/professionnel">
          Espace professionnel
        </Link>
      </p>
    </footer>
  );
}
