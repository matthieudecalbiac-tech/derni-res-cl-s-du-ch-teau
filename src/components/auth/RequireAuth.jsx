// Sprint S2-α.2 — RequireAuth branché sur AuthContext.
// Redirige vers /connexion si pas de session, en sauvegardant l'URL d'origine
// pour redirect post-auth (consommé par /auth/callback Phase 3).
//
// Loading state : pendant que getSession() initial est en cours, on retourne
// null pour éviter un redirect prématuré (l'utilisateur peut être déjà
// connecté via session persistée localStorage).

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    // Sprint S2-α.2 Mini-Phase 6.1 : localStorage cross-tab same-origin
    // (sessionStorage ne survit pas au nouveau tab Gmail au magic link).
    localStorage.setItem(
      "lcc_auth_next",
      location.pathname + location.search,
    );
    return <Navigate to="/connexion" replace />;
  }

  return children;
}
