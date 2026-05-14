// ═══════════════════════════════════════════════════════════════════════════
// LCC — Route /auth/callback (Sprint S2-α.2 Phase 3)
// ═══════════════════════════════════════════════════════════════════════════
// Handler du retour magic link Supabase.
//
// FLOW
//   1. User clique sur le magic link dans son email
//   2. Supabase redirige vers /auth/callback#access_token=…
//   3. detectSessionInUrl: true (src/lib/supabase.js) parse automatiquement
//      le hash et déclenche onAuthStateChange dans AuthContext
//   4. AuthContext met à jour session/user → ce composant détecte user !== null
//   5. Restore l'URL d'origine depuis sessionStorage("auth_redirect_origin")
//      (posée par RequireAuth quand l'user a été redirigé vers /connexion)
//   6. navigate(origin || '/', { replace: true })
//
// SAFETY
//   - Timeout 10s : si pas de session après 10s, affiche erreur + lien retour
//     /connexion (lien expiré, supprimé du serveur, ou autre erreur Supabase)
//   - replace: true sur navigate → l'utilisateur ne peut pas revenir sur
//     /auth/callback via back button
//
// A11y :
//   - role="status" + aria-live="polite" sur le loader (annonce screen reader)
//   - role="alert" sur le wrapper d'erreur
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/connexion.css";

const TIMEOUT_MS = 10000;

export default function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  // Safety timeout — si Supabase ne parse pas le hash dans les 10s,
  // probable lien expiré ou invalide
  useEffect(() => {
    if (user || loading) return;
    const t = setTimeout(() => {
      setError("Lien expiré ou invalide. Veuillez réessayer.");
    }, TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [user, loading]);

  // Quand user est défini → restore l'URL d'origine + clear sessionStorage
  useEffect(() => {
    if (!user) return;
    const origin = sessionStorage.getItem("auth_redirect_origin") || "/";
    sessionStorage.removeItem("auth_redirect_origin");
    navigate(origin, { replace: true });
  }, [user, navigate]);

  if (error) {
    return (
      <div className="cnx-page">
        <div className="cnx-container" role="alert">
          <span className="cnx-lys">⚜</span>
          <h1 className="cnx-titre">Connexion impossible</h1>
          <p className="cnx-error">{error}</p>
          <button
            type="button"
            className="cnx-btn"
            onClick={() => navigate("/connexion", { replace: true })}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cnx-page">
      <div
        className="cnx-container cnx-loading-wrap"
        role="status"
        aria-live="polite"
      >
        <span className="cnx-lys cnx-lys-spin">⚜</span>
        <p className="cnx-titre-loading">Connexion en cours…</p>
      </div>
    </div>
  );
}
