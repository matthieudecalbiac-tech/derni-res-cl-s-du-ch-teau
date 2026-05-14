// ═══════════════════════════════════════════════════════════════════════════
// LCC — Page /connexion (Sprint S2-α.2 Phase 3)
// ═══════════════════════════════════════════════════════════════════════════
// Page d'entrée auth — formulaire email magic link.
//
// FLOW
//   1. User saisit email → submit
//   2. signInWithMagicLink(email) → Supabase envoie email via SMTP
//   3. Success → message "Email envoyé, vérifiez votre boîte" + cooldown 60s
//      pour Renvoyer le lien
//   4. Error → message + retry possible
//
// Si l'utilisateur est déjà connecté (back button après auth), redirect home.
//
// A11y :
//   - autoFocus sur input au mount
//   - aria-live="polite" sur le wrapper message success/error
//   - aria-busy sur le bouton submit pendant loading
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/connexion.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_SECONDS = 60;

export default function Connexion() {
  const { user, loading, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown (1s tick)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Déjà connecté → redirect home (cas back button après auth)
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const envoyerMagicLink = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setStatus("error");
      setErrorMessage("Format d'email invalide.");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    try {
      await signInWithMagicLink(email);
      setStatus("success");
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err?.message || "Erreur lors de l'envoi du lien.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    envoyerMagicLink();
  };

  return (
    <div className="cnx-page">
      <div className="cnx-container">
        <span className="cnx-lys">⚜</span>
        <h1 className="cnx-titre">Entrer dans votre espace</h1>
        <p className="cnx-sous-titre">
          Recevez un lien magique par email pour accéder à vos séjours et offres exclusives.
        </p>

        <div aria-live="polite" className="cnx-message-wrap">
          {status === "success" ? (
            <div className="cnx-success">
              <p className="cnx-success-msg">
                Un email vient d'être envoyé à <strong>{email}</strong>.<br />
                Cliquez sur le lien pour vous connecter (vérifiez vos spams).
              </p>
              <button
                type="button"
                className="cnx-btn-secondary"
                disabled={cooldown > 0}
                onClick={envoyerMagicLink}
              >
                {cooldown > 0
                  ? `Renvoyer le lien (${cooldown}s)`
                  : "Renvoyer le lien"}
              </button>
            </div>
          ) : (
            <form className="cnx-form" onSubmit={handleSubmit}>
              <label htmlFor="cnx-email" className="cnx-label">
                Votre adresse email
              </label>
              <input
                id="cnx-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                className="cnx-input"
                placeholder="vous@exemple.fr"
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={status === "loading" || !email}
                aria-busy={status === "loading"}
                className="cnx-btn"
              >
                {status === "loading"
                  ? "Envoi en cours…"
                  : "Recevoir le lien magique →"}
              </button>
              {status === "error" && (
                <p className="cnx-error">{errorMessage}</p>
              )}
            </form>
          )}
        </div>

        <p className="cnx-footer">
          ⚜ Une partie de chaque réservation est reversée à la Fondation du Patrimoine.
        </p>
      </div>
    </div>
  );
}
