import { Link } from "react-router-dom";
import { useCataloguePersonnages } from "../hooks/useChateaux";
import { libelleNature } from "../utils/personnages";
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
// Intime, pas monumental : un index qu'on feuillette. Noms alignés à gauche
// (colonne étroite centrée), Crimson Pro discret, un seul ornement fleur de lys
// sous le titre (comme la fiche), filet fin entre les groupes.
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
      <div className="ph-inner">
        <header className="ph-tete">
          <h1 className="ph-titre">Histoire des lieux</h1>
          <p className="ph-phrase">Ceux qui ont fait, habité ou traversé nos demeures.</p>
        </header>

        <div className="ph-orn" aria-hidden="true">
          <span className="ph-orn-trait" />
          <img src="/FDL-transparent.png" alt="" className="ph-orn-lys" />
          <span className="ph-orn-trait" />
        </div>

        {groupes.map((g, i) => (
          <section className="ph-groupe" key={g.nature}>
            {i > 0 && <div className="ph-filet" aria-hidden="true" />}
            <h2 className="ph-groupe-titre">{libelleNature(g.nature)}</h2>
            <ul className="ph-liste">
              {g.personnages.map((p) => (
                <li key={p.id}>
                  <Link to={`/personnage/${p.slug}`} className="ph-nom">{p.nom}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
