// ═══════════════════════════════════════════════════════════════
// LCC — Page /mot-de-passe-oublie (Sprint alpha.2.5 Phase B4.1)
// ═══════════════════════════════════════════════════════════════
// Formulaire 1 champ email → resetPasswordForEmail (AuthContext B1).
// Supabase envoie un email avec lien vers /reinitialiser-mot-de-passe
// (redirectTo défini dans AuthContext).
//
// Message succès anti-énumération (cohérent B3.5) : ne révèle pas si
// l'email existe en base — texte identique dans tous les cas.
//
// A11y : autoFocus, role="alert" sur erreurs, role="status" sur succès,
//        aria-busy sur submit pendant loading.
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/mot-de-passe-oublie.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MotDePasseOublie() {
  const { user, profile, loading, resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (loading) return null;

  // Déjà connecté → page sans objet, redirect home
  if (user && profile) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!EMAIL_REGEX.test(email)) {
      setError("Format d'email invalide.");
      return;
    }

    setSubmitting(true);
    const { error: err } = await resetPasswordForEmail(email);
    setSubmitting(false);

    if (err) {
      setError(err.message);
      return;
    }

    // Anti-énum : message identique que l'email existe ou non
    setSuccessMessage(
      "Si cette adresse est associée à un compte, un email contenant un " +
        "lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte mail.",
    );
    setEmail("");
  };

  return (
    <div className="mdpo-page">
      <div className="mdpo-container">
        <span className="mdpo-lys">⚜</span>
        <h1 className="mdpo-titre">Un trousseau de rechange</h1>
        <p className="mdpo-sous-titre">
          Saisissez votre adresse email, nous vous enverrons un lien pour
          réinitialiser votre mot de passe.
        </p>

        {successMessage ? (
          <div className="mdpo-success" role="status">
            <span className="mdpo-success-lys">⚜</span>
            <p className="mdpo-success-msg">{successMessage}</p>
          </div>
        ) : (
          <form className="mdpo-form" onSubmit={handleSubmit}>
            <label className="mdpo-label" htmlFor="mdpo-email">
              Adresse email
            </label>
            <input
              id="mdpo-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="mdpo-input"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />

            <button
              type="submit"
              className="mdpo-btn"
              disabled={submitting || !email}
              aria-busy={submitting}
            >
              {submitting ? "Envoi…" : "Recevoir le lien"}
            </button>

            {error && (
              <p className="mdpo-error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        <Link to="/connexion" className="mdpo-back-link">
          ← Retour à la connexion
        </Link>

        <p className="mdpo-footer">
          ⚜ Une partie de nos recettes est reversée à la Fondation du
          Patrimoine.
        </p>
      </div>
    </div>
  );
}
