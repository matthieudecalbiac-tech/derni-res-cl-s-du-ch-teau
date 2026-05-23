// ═══════════════════════════════════════════════════════════════════════════
// LCC — Page /connexion (Sprint alpha.2.5 Phase B2)
// ═══════════════════════════════════════════════════════════════════════════
// Page d'entrée auth — formulaire hybride email + mot de passe.
//
// DEUX MODES (état `mode`)
//   "password"   (défaut)  : email + mot de passe → signInWithPassword
//   "magic-link" (fallback): email seul → signInWithMagicLink (lien par email)
//
// FLOW password
//   1. Saisie email + mot de passe → submit
//   2. signInWithPassword → si erreur, message FR (mappé dans AuthContext)
//   3. Succès → redirige vers lcc_auth_next mémorisé, sinon "/"
//
// FLOW magic link (conservé en fallback hybride)
//   1. Saisie email → submit → signInWithMagicLink
//   2. Succès → message "lien envoyé" + cooldown 60s avant renvoi
//
// Si l'utilisateur est déjà connecté (back button), écran d'état dédié.
//
// A11y : autoFocus 1er champ, role="alert"/"status" sur messages,
//        aria-busy sur submit, labels associés, toggle mot de passe étiqueté.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/connexion.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_SECONDS = 60;

export default function Connexion() {
  const {
    user,
    profile,
    loading,
    signInWithPassword,
    signInWithMagicLink,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("password"); // "password" | "magic-link"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown (magic link uniquement, 1 s tick)
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (loading) return null;

  // ── Déjà connecté → écran d'état (inchangé Phase B2) ──
  if (user && profile) {
    return (
      <div className="cnx-page">
        <div className="cnx-container">
          <span className="cnx-lys">⚜</span>
          <h1 className="cnx-titre">Vous êtes connecté</h1>
          <p className="cnx-sous-titre">
            Compte : <strong>{user.email}</strong>
            <br />
            Rôle : <em>{profile.role}</em>
          </p>
          <button
            type="button"
            className="cnx-btn"
            onClick={() => {
              const origin = localStorage.getItem("lcc_auth_next") || "/";
              localStorage.removeItem("lcc_auth_next");
              navigate(origin);
            }}
          >
            Retour à l'accueil
          </button>
          <button
            type="button"
            className="cnx-btn-secondary"
            onClick={async () => {
              await signOut();
            }}
          >
            Se déconnecter
          </button>
          <p className="cnx-footer">
            ⚜ Une partie de nos recettes est reversée à la Fondation du Patrimoine.
          </p>
        </div>
      </div>
    );
  }

  // Bascule de mode — reset des messages
  const basculerMode = (nouveauMode) => {
    setMode(nouveauMode);
    setError(null);
    setSuccessMessage(null);
  };

  // ── Soumission connexion mot de passe ──
  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setError("Format d'email invalide.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { user: signedUser, error: err } = await signInWithPassword(
      email,
      password,
    );
    if (err) {
      setSubmitting(false);
      setError(err.message);
      return;
    }

    // Sprint α.2.5 Phase B4.5 (fix E) — vérifier la complétion du profil.
    // AuthContext refetch profile en async via onAuthStateChange ; pour ne
    // pas attendre un cycle de re-render, on lit directement public.users.
    // Couvre l'edge case : user a confirmé email mais n'a jamais soumis
    // /completer-profil → ramené ici à chaque login.
    const { data: signedProfile } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", signedUser.id)
      .single();
    setSubmitting(false);
    if (!signedProfile?.first_name || !signedProfile?.last_name) {
      navigate("/completer-profil", { replace: true });
      return;
    }

    // Profil complet → restaure l'origine mémorisée (RequireAuth / modale Club), sinon home
    const origin = localStorage.getItem("lcc_auth_next") || "/";
    localStorage.removeItem("lcc_auth_next");
    navigate(origin, { replace: true });
  };

  // ── Soumission magic link (fallback hybride) ──
  const handleSubmitMagicLink = async (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setError("Format d'email invalide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const next = localStorage.getItem("lcc_auth_next") || null;
      await signInWithMagicLink(email, next);
      setSuccessMessage(
        "Lien de connexion envoyé. Vérifiez votre boîte mail (et vos spams).",
      );
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setError(err?.message || "Erreur lors de l'envoi du lien.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cnx-page">
      <div className="cnx-container">
        <span className="cnx-lys">⚜</span>
        <h1 className="cnx-titre">Espace membre du Club</h1>
        <p className="cnx-sous-titre">
          {mode === "password"
            ? "Connectez-vous pour accéder à vos séjours et aux offres du Club."
            : "Recevez un lien de connexion par email, sans mot de passe."}
        </p>

        {/* ── MODE MOT DE PASSE ── */}
        {mode === "password" && (
          <>
            <form className="cnx-form" onSubmit={handleSubmitPassword}>
              <label className="cnx-label" htmlFor="cnx-email">
                Adresse email
              </label>
              <input
                id="cnx-email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                className="cnx-input"
                placeholder="vous@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />

              <label className="cnx-label" htmlFor="cnx-password">
                Mot de passe
              </label>
              <div className="cnx-password-wrapper">
                <input
                  id="cnx-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="current-password"
                  className="cnx-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="cnx-show-password-toggle"
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

              <button
                type="submit"
                className="cnx-btn"
                disabled={submitting || !email || !password}
                aria-busy={submitting}
              >
                {submitting ? "Connexion…" : "Se connecter"}
              </button>

              {error && (
                <p className="cnx-error" role="alert">
                  {error}
                </p>
              )}

              <Link to="/mot-de-passe-oublie" className="cnx-forgot">
                Vous avez perdu vos clés ?
              </Link>
            </form>

            <p className="cnx-no-account">
              Pas encore de compte ?{" "}
              <Link to="/inscription">Rejoindre le Club</Link>
            </p>

            <div className="cnx-separator">
              <span>ou</span>
            </div>

            <button
              type="button"
              className="cnx-alt-method"
              onClick={() => basculerMode("magic-link")}
            >
              Recevoir un lien de connexion par email
            </button>
          </>
        )}

        {/* ── MODE MAGIC LINK (fallback hybride) ── */}
        {mode === "magic-link" && (
          <form className="cnx-form" onSubmit={handleSubmitMagicLink}>
            <label className="cnx-label" htmlFor="cnx-email-ml">
              Adresse email
            </label>
            <input
              id="cnx-email-ml"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="cnx-input"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />

            <button
              type="submit"
              className="cnx-btn"
              disabled={submitting || cooldown > 0 || !email}
              aria-busy={submitting}
            >
              {submitting
                ? "Envoi…"
                : cooldown > 0
                  ? `Renvoyer le lien (${cooldown}s)`
                  : "Recevoir le lien"}
            </button>

            {error && (
              <p className="cnx-error" role="alert">
                {error}
              </p>
            )}
            {successMessage && (
              <div className="cnx-success" role="status">
                <p className="cnx-success-msg">{successMessage}</p>
              </div>
            )}

            <button
              type="button"
              className="cnx-alt-method"
              onClick={() => basculerMode("password")}
            >
              ← Retour à la connexion par mot de passe
            </button>
          </form>
        )}

        <p className="cnx-footer">
          ⚜ Une partie de nos recettes est reversée à la Fondation du Patrimoine.
        </p>
      </div>
    </div>
  );
}
