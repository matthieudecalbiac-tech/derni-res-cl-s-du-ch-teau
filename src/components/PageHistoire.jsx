import { Link } from "react-router-dom";
import { useCataloguePersonnages } from "../hooks/useChateaux";
import { libelleNature } from "../utils/personnages";
import EnteteEditoriale from "./EnteteEditoriale";
import "../styles/page-histoire.css";

// Route /histoire — le catalogue "Histoire des lieux" : tous les personnages et
// événements, groupés par nature, alphabétique dans chaque groupe. On clique un
// nom → sa fiche /personnage/:slug.
//
// Registre CRÈME ILLUSTRÉ, comme PagePersonnage : c'est la MÊME page à deux
// échelles (le catalogue, puis l'individu). Le sombre appartient aux demeures,
// pas à l'univers → pas de navy ici. Le vide et le texte font la page ; les noms
// se lisent comme un générique de film (une colonne centrée, aérée).
//
// Chaque groupe est une CARTE encadrée (façon page de catalogue ancien) : liseré
// or, coins ornés, noms recentrés dans le cadre. Grille 2 colonnes (4 natures =
// deux lignes de deux), cartes de même hauteur. En-tête inchangé (titre Playfair,
// phrase, ornement fleur de lys). Le cadre remplace les filets entre groupes.
export default function PageHistoire() {
  const { groupes, loading, error } = useCataloguePersonnages();

  if (loading) return <div className="ph-chargement" />;
  if (error) {
    return <div className="ph"><p className="ph-etat">Le catalogue n'a pas pu être chargé.</p></div>;
  }
  // Catalogue vide : aucun personnage rattaché à un château publié.
  if (groupes.length === 0) {
    return <div className="ph"><p className="ph-etat">Aucun personnage à présenter pour l'instant.</p></div>;
  }

  return (
    <div className="ph">
      <EnteteEditoriale titreSection="Histoire des lieux" />
      <div className="ph-inner">
        {/* Hero aligné à gauche, 2 colonnes (titre | chapô), comme les Vitrines. */}
        <div className="ph-hero">
          <div className="ph-hero-titre">
            <nav className="ee-fil" aria-label="Fil d'Ariane">
              <Link to="/">Accueil</Link>
              <span className="ee-fil-sep" aria-hidden="true">›</span>
              <span className="ee-fil-actuel">Histoire des lieux</span>
            </nav>
            <h1 className="ph-titre">Histoire des lieux</h1>
          </div>
          <div className="ph-hero-chapo">
            <p className="ph-phrase">Ceux qui ont fait, habité ou traversé nos demeures.</p>
          </div>
        </div>

        <div className="ph-orn" aria-hidden="true">
          <span className="ph-orn-trait" />
          <img src="/FDL-transparent.png" alt="" className="ph-orn-lys" />
          <span className="ph-orn-trait" />
        </div>

        <div className="ph-grille">
          {groupes.map((g, i) => (
            <article className="ph-carte" key={g.nature}>
              <span className="ph-carte-coins" aria-hidden="true" />
              <h2 className="ph-carte-titre">
                <span className="ph-carte-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                {libelleNature(g.nature)}
              </h2>
              <span className="ph-carte-filet" aria-hidden="true" />
              <ul className="ph-liste">
                {g.personnages.map((p) => (
                  <li key={p.id}>
                    <Link to={`/personnage/${p.slug}`} className="ph-nom">{p.nom}</Link>
                  </li>
                ))}
              </ul>
              <span className="ph-carte-filet" aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
