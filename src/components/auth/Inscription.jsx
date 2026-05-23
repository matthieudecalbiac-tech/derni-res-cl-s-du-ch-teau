// ═══════════════════════════════════════════════════════════════════
// LCC — Page /inscription (Sprint alpha.2.5 Phase B3)
// ═══════════════════════════════════════════════════════════════════
// Mini-landing argumentaire Club + formulaire creation compte.
//
// FLOW :
//   1. Visiteur arrive (CTA "Rejoindre le Club" Header ou redirect depuis
//      /connexion via lien "Pas encore de compte ?")
//   2. Hero argumentaire + 4 avantages (scroll naturel)
//   3. Formulaire : email + password + confirm password
//   4. Submit -> signUp -> Supabase envoie email confirmation
//   5. Message succes "Verifiez votre email pour confirmer votre compte"
//   6. Pas de redirect immediat (confirmation email obligatoire)
//
// A11y : autoFocus h1, role alert sur erreurs, role status sur success,
//        aria-busy sur submit, labels associes, toggle mot de passe etiquete.
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/inscription.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Inscription() {
  const { user, profile, loading, signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (loading) return null;

  // Si deja connecte, redirect home : une landing de conversion n'a aucun
  // sens pour un user authentifie. <Navigate> declaratif (pas de side-effect
  // pendant le render).
  if (user && profile) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation client
    if (!EMAIL_REGEX.test(email)) {
      setError("Format d'email invalide.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const { error: err } = await signUp(email, password);
    setSubmitting(false);

    if (err) {
      setError(err.message);
      return;
    }

    // Succes : confirmation email obligatoire
    setSuccessMessage(
      `Un email de confirmation vient d'être envoyé à ${email}. ` +
        `Cliquez sur le lien pour activer votre compte.`,
    );
    // Reset des champs
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="ins-page">
      {/* SECTION 1 — Hero argumentaire */}
      <section className="ins-hero">
        <span className="ins-lys">⚜</span>
        <p className="ins-eyebrow">─── Rejoindre le Club ───</p>
        <h1 className="ins-titre">Le Club des Châtelains</h1>
        <div className="ins-ornement">
          <span className="ins-trait" />
          <span className="ins-lys-petit">⚜</span>
          <span className="ins-trait" />
        </div>
        <p className="ins-sous-titre">
          L'accès privilégié aux séjours patrimoniaux
          <br />
          et aux demeures qui ont fait la France.
        </p>
      </section>

      {/* SECTION 2 — Avantages */}
      <section className="ins-avantages">
        <h2 className="ins-section-titre">─ Les avantages ─</h2>
        <div className="ins-avantages-grille">
          <div className="ins-avantage">
            <span className="ins-avantage-lys">⚜</span>
            <h3 className="ins-avantage-titre">Offres confidentielles</h3>
            <p className="ins-avantage-desc">
              Des séjours pensés pour les membres, jamais publics, jamais bradés.
            </p>
          </div>
          <div className="ins-avantage">
            <span className="ins-avantage-lys">⚜</span>
            <h3 className="ins-avantage-titre">Vitrines Permanentes</h3>
            <p className="ins-avantage-desc">
              L'accès aux châteaux d'exception sélectionnés par notre équipe.
            </p>
          </div>
          <div className="ins-avantage">
            <span className="ins-avantage-lys">⚜</span>
            <h3 className="ins-avantage-titre">Tarifs préférentiels</h3>
            <p className="ins-avantage-desc">
              Des conditions réservées aux Châtelains, à chaque séjour réservé.
            </p>
          </div>
          <div className="ins-avantage">
            <span className="ins-avantage-lys">⚜</span>
            <h3 className="ins-avantage-titre">Contribution patrimoniale</h3>
            <p className="ins-avantage-desc">
              Une partie de nos recettes est reversée à la Fondation du
              Patrimoine.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Formulaire création */}
      <section className="ins-form-section">
        <h2 className="ins-section-titre">─ Créer votre compte ─</h2>

        {successMessage ? (
          <div className="ins-success" role="status">
            <span className="ins-success-lys">⚜</span>
            <p className="ins-success-msg">{successMessage}</p>
            <p className="ins-success-hint">
              Vous avez déjà un compte ?{" "}
              <Link to="/connexion">Se connecter</Link>
            </p>
          </div>
        ) : (
          <form className="ins-form" onSubmit={handleSubmit}>
            <label className="ins-label" htmlFor="ins-email">
              Adresse email
            </label>
            <input
              id="ins-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="ins-input"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />

            <label className="ins-label" htmlFor="ins-password">
              Mot de passe{" "}
              <span className="ins-label-hint">(8 caractères minimum)</span>
            </label>
            <div className="ins-password-wrapper">
              <input
                id="ins-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                className="ins-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="ins-show-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>

            <label className="ins-label" htmlFor="ins-confirm-password">
              Confirmer le mot de passe
            </label>
            <div className="ins-password-wrapper">
              <input
                id="ins-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                className="ins-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
              />
              <button
                type="button"
                className="ins-show-password-toggle"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword
                    ? "Masquer le mot de passe"
                    : "Afficher le mot de passe"
                }
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </button>
            </div>

            <button
              type="submit"
              className="ins-btn"
              disabled={
                submitting || !email || !password || !confirmPassword
              }
              aria-busy={submitting}
            >
              {submitting ? "Création…" : "Créer mon compte"}
            </button>

            {error && (
              <p className="ins-error" role="alert">
                {error}
              </p>
            )}

            <p className="ins-already-member">
              Déjà membre ? <Link to="/connexion">Se connecter</Link>
            </p>
          </form>
        )}

        <p className="ins-footer">
          ⚜ Une partie de nos recettes est reversée à la Fondation du
          Patrimoine.
        </p>
      </section>
    </div>
  );
}
