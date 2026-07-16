import { Navigate, useParams, Link } from "react-router-dom";
import { usePersonnage } from "../hooks/useChateaux";
import { libelleNature } from "../utils/personnages";
import "../styles/page-personnage.css";

// Route /personnage/:slug — fiche d'un personnage/événement.
//
// Registre CRÈME ILLUSTRÉ (l'univers), PAS le sombre cinématographique (la
// demeure) : une personne n'est pas une demeure. Le contraste sombre vient des
// PHOTOS de châteaux en bas de page — il se fait tout seul. La page est portée
// par le TEXTE (pas de photo du personnage : décision droits d'image) et par le
// VIDE : pas de grille, pas de cartes, beaucoup d'air, un axe vertical centré.
//
// Structure : nom (le seul élément qui crie) → biographie (colonne étroite) →
// séparateur fleur de lys → les demeures (photo + nature + texte, empilées).
//
// La NATURE descend sur CHAQUE demeure (pas sous le nom) : un personnage peut
// porter deux natures selon le château (UNIQUE chateau/personnage/nature). Même
// clé React = id+nature pour la même raison.
export default function PagePersonnage() {
  const { slug } = useParams();
  const { personnage, loading, error } = usePersonnage(slug);

  if (loading) return <div className="pp-chargement" />;
  // Erreur Supabase → home.
  if (error) return <Navigate to="/" replace />;
  // Slug inconnu → home.
  if (!personnage) return <Navigate to="/" replace />;
  // Un personnage sans château publié ne raconte rien → home.
  if (personnage.chateaux.length === 0) return <Navigate to="/" replace />;

  return (
    <div className="pp">
      <div className="pp-inner">
        <h1 className="pp-nom">{personnage.nom}</h1>

        {personnage.biographie && <p className="pp-bio">{personnage.biographie}</p>}

        <div className="pp-sep" aria-hidden="true">
          <span className="pp-sep-trait" />
          <img src="/FDL-transparent.png" alt="" className="pp-sep-lys" />
          <span className="pp-sep-trait" />
        </div>

        <section className="pp-demeures">
          <h2 className="pp-demeures-titre">Les demeures</h2>
          <ul className="pp-liste">
            {personnage.chateaux.map((c) => (
              <li key={`${c.id}-${c.nature}`} className="pp-demeure">
                <Link to={`/chateau/${c.slug}`} className="pp-demeure-lien">
                  <div
                    className="pp-demeure-photo"
                    style={c.images?.[0] ? { backgroundImage: `url('${c.images[0]}')` } : undefined}
                  />
                  <span className="pp-demeure-nature">{libelleNature(c.nature)}</span>
                  <h3 className="pp-demeure-nom">{c.nom}</h3>
                  {c.texte && <p className="pp-demeure-texte">{c.texte}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
