import { Navigate, useParams, Link } from "react-router-dom";
import { usePersonnage } from "../hooks/useChateaux";
import { libelleNature } from "../utils/personnages";
import EnteteEditoriale from "./EnteteEditoriale";
import "../styles/page-personnage.css";

// Route /personnage/:slug — fiche personnage. Registre CRÈME ILLUSTRÉ.
//
// DEUX COLONNES séparées par un filet vertical or : à GAUCHE l'individu (nom +
// bio, alignés à gauche), à DROITE les demeures (photos + nature + nom + texte).
// Pas de photo du personnage (droits d'image) : la page est portée par le texte.
//
// Sans bio (12/13 aujourd'hui) : le nom reste EN HAUT, aligné à gauche — un
// manuscrit qui attend sa suite. Pas de centrage vertical : un nom centré dans
// le vide prétendrait que le vide est un choix. C'est temporaire (bios à écrire).
//
// La NATURE descend sur CHAQUE demeure (pas seulement l'en-tête « Les demeures »)
// : « a habité » n'est pas « a fait l'histoire », et un même château peut être
// lié 2× au personnage avec deux natures → sans elle, indistinguable. D'où aussi
// key = id+nature.
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

  const titreDemeures = personnage.chateaux.length > 1 ? "Les demeures" : "La demeure";

  return (
    <div className="pp">
      <EnteteEditoriale titreSection={personnage.nom} />
      <div className="pp-inner">
        <nav className="ee-fil pp-fil" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link>
          <span className="ee-fil-sep" aria-hidden="true">›</span>
          <Link to="/histoire">Histoire des lieux</Link>
          <span className="ee-fil-sep" aria-hidden="true">›</span>
          <span className="ee-fil-actuel">{personnage.nom}</span>
        </nav>
        <div className="pp-grille">
          {/* Colonne gauche — l'individu (nom + bio, en haut, à gauche). */}
          <div className="pp-individu">
            <h1 className="pp-nom">{personnage.nom}</h1>
            {personnage.biographie && <p className="pp-bio">{personnage.biographie}</p>}
          </div>

          {/* Filet vertical or, pleine hauteur du bloc. */}
          <div className="pp-filet" aria-hidden="true" />

          {/* Colonne droite — les demeures. */}
          <div className="pp-demeures">
            <h2 className="pp-demeures-titre">{titreDemeures}</h2>
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
          </div>
        </div>

        {/* Bas de page — ornement fleur de lys centré + deux traits or. */}
        <div className="pp-orn" aria-hidden="true">
          <span className="pp-orn-trait" />
          <img src="/FDL-transparent.png" alt="" className="pp-orn-lys" />
          <span className="pp-orn-trait" />
        </div>
      </div>
    </div>
  );
}
