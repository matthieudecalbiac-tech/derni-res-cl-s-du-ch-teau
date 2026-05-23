// ═══════════════════════════════════════════════════════════════
// LCC — Page /completer-profil (Sprint alpha.2.5 Phase B4.5)
// ═══════════════════════════════════════════════════════════════
// Page intermédiaire APRÈS confirmation email d'inscription.
// Collecte civilité (optionnelle), first_name + last_name (requis),
// téléphone (optionnel), marketing_consent (RGPD pré-décoché).
//
// ROUTING — déclenchée depuis AuthCallback (et Connexion fix E) quand
// profile incomplet :
//   - !user (non connecté) → redirect /connexion
//   - profile.first_name && profile.last_name (déjà complet) → redirect /
//   - sinon → formulaire
//
// SUBMIT — UPDATE public.users via Supabase. Au succès, restaure
// lcc_auth_next mémorisé (modale Club, RequireAuth…), sinon "/".
//
// SÉCURITÉ — RLS users_update_self_no_role autorise l'UPDATE par
// l'utilisateur sur sa propre ligne, et bloque le changement de
// role (anti-escalade).
//
// A11y : autoFocus prénom, labels associés, role="alert" sur erreurs,
//        aria-busy sur submit, sémantique form/label/input.
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/completer-profil.css";

export default function CompleterProfil() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [civilite, setCivilite] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [telephone, setTelephone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return null;

  // Pas de session → vers /connexion
  if (!user || !profile) {
    return <Navigate to="/connexion" replace />;
  }

  // Profil déjà complet → vers home
  if (profile.first_name && profile.last_name) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Prénom et nom sont requis.");
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase
      .from("users")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        civilite: civilite || null,
        telephone: telephone.trim() || null,
        marketing_consent: marketingConsent,
      })
      .eq("id", user.id);
    setSubmitting(false);

    if (err) {
      setError(err.message || "Erreur lors de l'enregistrement.");
      return;
    }

    // Fix D — restaure l'origine mémorisée (modale Club / RequireAuth),
    // sinon home. lcc_auth_next traverse le funnel signup → confirmation
    // email → /completer-profil sans être clearé en cours de route.
    const origin = localStorage.getItem("lcc_auth_next") || "/";
    localStorage.removeItem("lcc_auth_next");
    navigate(origin, { replace: true });
  };

  return (
    <div className="cpr-page">
      <div className="cpr-container">
        <span className="cpr-lys">⚜</span>
        <h1 className="cpr-titre">Bienvenue au Club</h1>
        <p className="cpr-sous-titre">
          Votre adhésion est confirmée. Aidez-nous à mieux vous connaître.
        </p>

        <form className="cpr-form" onSubmit={handleSubmit}>
          <label className="cpr-label" htmlFor="cpr-civilite">
            Civilité <span className="cpr-label-hint">(optionnel)</span>
          </label>
          <select
            id="cpr-civilite"
            className="cpr-select"
            value={civilite}
            onChange={(e) => setCivilite(e.target.value)}
            disabled={submitting}
          >
            <option value="">—</option>
            <option value="M">M.</option>
            <option value="Mme">Mme</option>
            <option value="Mx">Mx</option>
          </select>

          <label className="cpr-label" htmlFor="cpr-first-name">
            Prénom <span className="cpr-label-required">*</span>
          </label>
          <input
            id="cpr-first-name"
            type="text"
            required
            autoFocus
            autoComplete="given-name"
            className="cpr-input"
            placeholder="Votre prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={submitting}
          />

          <label className="cpr-label" htmlFor="cpr-last-name">
            Nom <span className="cpr-label-required">*</span>
          </label>
          <input
            id="cpr-last-name"
            type="text"
            required
            autoComplete="family-name"
            className="cpr-input"
            placeholder="Votre nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={submitting}
          />

          <label className="cpr-label" htmlFor="cpr-telephone">
            Téléphone <span className="cpr-label-hint">(optionnel)</span>
          </label>
          <input
            id="cpr-telephone"
            type="tel"
            autoComplete="tel"
            className="cpr-input"
            placeholder="+33 6 12 34 56 78"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            disabled={submitting}
          />

          <label className="cpr-checkbox-label">
            <input
              type="checkbox"
              className="cpr-checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              disabled={submitting}
            />
            <span>
              Je souhaite recevoir les communications du Club des Châtelains
              (offres confidentielles, événements). Désinscription possible à
              tout moment.
            </span>
          </label>

          <button
            type="submit"
            className="cpr-btn"
            disabled={submitting || !firstName.trim() || !lastName.trim()}
            aria-busy={submitting}
          >
            {submitting ? "Enregistrement…" : "Recevoir mes clés du Club"}
          </button>

          {error && (
            <p className="cpr-error" role="alert">
              {error}
            </p>
          )}
        </form>

        <p className="cpr-footer">
          ⚜ Une partie de nos recettes est reversée à la Fondation du
          Patrimoine.
        </p>
      </div>
    </div>
  );
}
