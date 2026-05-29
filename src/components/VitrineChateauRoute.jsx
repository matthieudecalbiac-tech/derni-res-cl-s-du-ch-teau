import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useChateau } from "../hooks/useChateaux";
import VitrineChateau from "./VitrineChateau";

// Route /chateau/:slug — voie canonique SEO/démo Sprint S2-α.1.5.
// L'overlay legacy (modal depuis home/VitrinePermanente) reste disponible
// en parallèle (strangler fig). VitrineChateau distingue les deux via `mode`.
export default function VitrineChateauRoute() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { chateau, loading, error } = useChateau(slug);

  // Fetch en cours → ne rien rendre (évite une redirection prématurée)
  if (loading) return null;

  // Erreur Supabase → home
  if (error) return <Navigate to="/" replace />;

  // Slug inconnu → home
  if (!chateau) return <Navigate to="/" replace />;

  // Mocks id 1-6 : pas de vitrine premium pour α.1.5
  if (!chateau.estLaUne) return <Navigate to="/" replace />;

  return (
    <VitrineChateau
      chateau={chateau}
      mode="route"
      onClose={() => navigate("/")}
    />
  );
}
