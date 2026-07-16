import { Link } from "react-router-dom";
import { useCataloguePersonnages } from "../hooks/useChateaux";
import { libelleNature } from "../utils/personnages";

// Route /histoire — le catalogue "Histoire des lieux" : tous les personnages et
// événements, groupés par nature, alphabétique dans chaque groupe. On clique un
// nom → sa fiche /personnage/:slug.
//
// RENDU BRUT (brique 3) : sans CSS travaillé — voir la donnée avant de la
// dessiner (brique 4, avec Tanguy). Un personnage à deux natures apparaît dans
// les deux groupes (décision) ; key = p.id, unique dans chaque <ul> (dédup
// intra-groupe côté mapper).
export default function PageHistoire() {
  const { groupes, loading, error } = useCataloguePersonnages();

  if (loading) return <p>Chargement…</p>;
  if (error) return <p>Le catalogue n'a pas pu être chargé.</p>;
  // Catalogue vide : aucun personnage rattaché à un château publié.
  if (groupes.length === 0) return <p>Aucun personnage à présenter pour l'instant.</p>;

  return (
    <div>
      <h1>Histoire des lieux</h1>
      {groupes.map((g) => (
        <section key={g.nature}>
          <h2>{libelleNature(g.nature)}</h2>
          <ul>
            {g.personnages.map((p) => (
              <li key={p.id}>
                <Link to={`/personnage/${p.slug}`}>{p.nom}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
