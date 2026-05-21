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
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/connexion.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_SECONDS = 60;

export default function Connexion() {
  const { user, profile, loading, signInWithMagicLink, signOut } = useAuth();
  const navigate = useNavigate();
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

  if (loading) return null;

  // Sprint S2-α.2 Phase 4.1 : si l'utilisateur est déjà connecté (ex. il a
  // cliqué "Se connecter" dans la modale Club alors qu'il est role='client'),
  // afficher un écran d'état au lieu de redirect immédiat — sinon le bouton
  // "Se connecter" devient inerte côté UX (redirect home sans feedback).
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
              // Mini-Phase 6.1 : localStorage (clé lcc_auth_next)
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
              // signOut → onAuthStateChange trigger → user=null → ce composant
              // re-render et affiche le formulaire magic link (état idle)
              await signOut();
            }}
          >
            Se déconnecter
          </button>
          <p className="cnx-footer">
            ⚜ Une partie de chaque réservation est reversée à la Fondation du Patrimoine.
          </p>
        </div>
      </div>
    );
  }

  const envoyerMagicLink = async () => {
    if (!EMAIL_REGEX.test(email)) {
      setStatus("error");
      setErrorMessage("Format d'email invalide.");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    try {
      // Sprint S2-α.2 Mini-Phase 6.1 : lit localStorage (clé lcc_auth_next,
      // écrite par RequireAuth ou le bouton "Se connecter" modale Club).
      // localStorage est cross-tab same-origin → robuste au nouveau tab Gmail.
      // Le param est aussi passé à signInWithMagicLink qui l'encode en ?next=
      // dans emailRedirectTo (fallback défensif au cas où Supabase préserve
      // un jour les query params — actuellement v2 les strip).
      const next = localStorage.getItem("lcc_auth_next") || null;
      await signInWithMagicLink(email, next);
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
