import { Navigate, useParams } from "react-router-dom";
import { useChateau } from "../hooks/useChateaux";
import { useRetour } from "./BoutonRetour";
import VitrineChateau from "./VitrineChateau";

// Route /chateau/:slug — voie canonique SEO/démo Sprint S2-α.1.5.
// L'overlay legacy (modal depuis home/VitrinePermanente) reste disponible
// en parallèle (strangler fig). VitrineChateau distingue les deux via `mode`.
export default function VitrineChateauRoute() {
  const { slug } = useParams();
  // Le `.vc3-retour` de la vitrine garde son dessin, mais emprunte la regle
  // commune : on revient d'ou l'on vient (une recherche, un catalogue), et
  // seulement a l'accueil quand il n'y a pas d'ou revenir.
  const revenir = useRetour();
  const { chateau, loading, error } = useChateau(slug);

  // Fetch en cours → placeholder creme (evite que le body navy transparaisse
  // entre la fin de la TransitionPorte creme et le paint de la vitrine)
  if (loading) return <div className="vitrine-route-placeholder" />;

  // Erreur Supabase → home
  if (error) return <Navigate to="/" replace />;

  // Slug inconnu, ou château non publié (le service filtre sur statut, donc
  // getChateauBySlug renvoie null) → home. Toute demeure servie a sa vitrine,
  // mise en avant (estLaUne) ou non.
  if (!chateau) return <Navigate to="/" replace />;

  return (
    <VitrineChateau
      chateau={chateau}
      mode="route"
      onClose={revenir}
    />
  );
}
