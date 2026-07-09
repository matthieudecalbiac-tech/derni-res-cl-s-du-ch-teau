// ═══════════════════════════════════════════════════════════════════
// LCC — Page /inscription (refonte auth — deux colonnes)
// ═══════════════════════════════════════════════════════════════════
// Landing conversion Club : argumentaire (colonne gauche) + formulaire
// creation compte (colonne droite). Tient sans scroll sur ecran standard.
//
// FLOW :
//   1. Visiteur arrive (CTA "Rejoindre le Club" Header ou lien depuis /connexion)
//   2. Colonne gauche : pitch + 4 avantages ; colonne droite : formulaire
//   3. Submit -> signUp -> Supabase envoie email confirmation
//   4. Message succes "Verifiez votre email" (remplace le formulaire, colonne droite)
//
// A11y : role alert sur erreurs, role status sur success, aria-busy sur submit,
//        labels associes, toggle mot de passe etiquete. Pas d'autoFocus (il faisait
//        sauter la page au formulaire, sautant l'argumentaire).
// ═══════════════════════════════════════════════════════════════════

import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { IconOeil, IconOeilBarre } from "./IconesOeil";
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
      <div className="ins-split">

        {/* COLONNE GAUCHE : argumentaire */}
        <div className="ins-gauche">
          <img src="/FDL-transparent.png" alt="" className="ins-logo" />
          <p className="ins-eyebrow">─── Rejoindre le Club ───</p>
          <h1 className="ins-titre">Le Club des Châtelains</h1>
          <p className="ins-sous-titre">
            L'accès privilégié aux séjours patrimoniaux
            <br />
            et aux demeures qui ont fait la France.
          </p>

          <div className="ins-avantages-grille">
            <div className="ins-avantage">
              <h3 className="ins-avantage-titre">Offres confidentielles</h3>
              <p className="ins-avantage-desc">
                Des séjours pensés pour les membres, jamais publics, jamais bradés.
              </p>
            </div>
            <div className="ins-avantage">
              <h3 className="ins-avantage-titre">Vitrines permanentes</h3>
              <p className="ins-avantage-desc">
                L'accès aux châteaux d'exception sélectionnés par notre équipe.
              </p>
            </div>
            <div className="ins-avantage">
              <h3 className="ins-avantage-titre">Une fidélité qui se mérite</h3>
              <p className="ins-avantage-desc">
                Hôte dès l'inscription, puis Habitué, Familier, Compagnon. À chaque
                séjour confirmé, vos privilèges grandissent.
              </p>
            </div>
            <div className="ins-avantage">
              <h3 className="ins-avantage-titre">Des demeures vivantes</h3>
              <p className="ins-avantage-desc">
                Sept siècles d'histoire, des familles qui les habitent encore. Vous
                n'entrez pas dans un musée.
              </p>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : formulaire */}
        <div className="ins-droite">
          <div className="ins-form-carte">
            <h2 className="ins-form-titre">Créer votre compte</h2>

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
                    {showPassword ? <IconOeilBarre /> : <IconOeil />}
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
                    {showConfirmPassword ? <IconOeilBarre /> : <IconOeil />}
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
          </div>
        </div>

      </div>
    </div>
  );
}
