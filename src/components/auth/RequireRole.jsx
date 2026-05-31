// Sprint S2 chunk 2.A (back-office MVP) — garde de rôle réelle.
// Vérifie profile.role (exposé par AuthContext) contre la prop `role` attendue.
// Toujours imbriqué SOUS <RequireAuth> dans App.jsx : la session est donc déjà
// garantie quand on arrive ici ; RequireRole ne s'occupe que du rôle.
//
// Ordre des guards (loading EN PREMIER, même piège que VitrineChateauRoute) :
// le profil est récupéré dans un effet séparé QUI SUIT la résolution de session
// (cf. AuthContext §2). Tant qu'on a une session sans profil encore arrivé, on
// ne rend rien — sinon on redirigerait un châtelain/admin légitime pendant le
// fetch initial du profil. Un mismatch de rôle renvoie vers "/" (home opaque,
// ne révèle pas les permissions à l'utilisateur).
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function RequireRole({ children, role }) {
  const { user, profile, loading } = useAuth();

  // a) Bootstrap session OU profil encore en cours de chargement → rien rendre
  if (loading || (user && !profile)) return null;

  // b) Profil absent (défensif — RequireAuth garde déjà la session) → home
  if (!profile) return <Navigate to="/" replace />;

  // c) Rôle ne correspond pas → home (opaque, ne signale pas les permissions)
  if (profile.role !== role) return <Navigate to="/" replace />;

  // d) Rôle validé
  return children;
}
