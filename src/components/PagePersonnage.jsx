import { Navigate, useParams, Link } from "react-router-dom";
import { usePersonnage } from "../hooks/useChateaux";
import { libelleNature } from "../utils/personnages";

// Route /personnage/:slug — fiche d'un personnage/événement : son nom + les
// châteaux publiés où il a laissé une trace, avec la nature du lien et le texte.
//
// RENDU BRUT (brique 3c) : les 4 états du pattern VitrineChateauRoute + le rendu
// est volontairement sans CSS — le design est la brique 3d (avec Tanguy). On
// veut d'abord voir la donnée arriver à l'écran.
//
// key = id+nature : un même château peut être lié 2× à ce personnage avec des
// natures différentes (UNIQUE à 3 colonnes chateau/personnage/nature) → l'id
// seul collisionnerait.
export default function PagePersonnage() {
  const { slug } = useParams();
  const { personnage, loading, error } = usePersonnage(slug);

  if (loading) return <p>Chargement…</p>;
  // Erreur Supabase → home.
  if (error) return <Navigate to="/" replace />;
  // Slug inconnu → home.
  if (!personnage) return <Navigate to="/" replace />;
  // Décision 3c : un personnage sans château publié ne raconte rien → 404.
  if (personnage.chateaux.length === 0) return <Navigate to="/" replace />;

  return (
    <div>
      <h1>{personnage.nom}</h1>
      <ul>
        {personnage.chateaux.map((c) => (
          <li key={`${c.id}-${c.nature}`}>
            <Link to={`/chateau/${c.slug}`}>{c.nom}</Link>
            {" — "}
            <em>{libelleNature(c.nature)}</em>
            {c.texte && <p>{c.texte}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
