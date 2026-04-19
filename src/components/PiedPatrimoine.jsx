import "../styles/pied-patrimoine.css";

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
    </footer>
  );
}
