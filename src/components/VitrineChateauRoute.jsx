import { Navigate, useNavigate, useParams } from "react-router-dom";
import { chateaux } from "../data/chateaux";
import VitrineChateau from "./VitrineChateau";

// Route /chateau/:slug — voie canonique SEO/démo Sprint S2-α.1.5.
// L'overlay legacy (modal depuis home/VitrinePermanente) reste disponible
// en parallèle (strangler fig). VitrineChateau distingue les deux via `mode`.
//
// Import direct synchrone de chateaux : cohérent avec la décision business
// "pas de Supabase pour les châteaux avant 6-12 mois". Quand on basculera
// vers un fetch async, un hook useChateau() async + Suspense remplacera ce
// pattern.
export default function VitrineChateauRoute() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const chateau = chateaux.find((c) => c.slug === slug);

  // Slug inconnu → home
  if (!chateau) return <Navigate to="/" replace />;

  // Mocks id 1-6 : pas de vitrine premium pour α.1.5
  // TODO α.2 : ouvrir ChateauModal dédié pour les mocks via route routée
  if (!chateau.estLaUne) return <Navigate to="/" replace />;

  return (
    <VitrineChateau
      chateau={chateau}
      mode="route"
      onClose={() => navigate("/")}
    />
  );
}
