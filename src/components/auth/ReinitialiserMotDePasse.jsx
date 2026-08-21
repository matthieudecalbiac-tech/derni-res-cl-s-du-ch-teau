// ═══════════════════════════════════════════════════════════════
// LCC — Page /reinitialiser-mot-de-passe (Sprint alpha.2.5 Phase B4.2)
// ═══════════════════════════════════════════════════════════════
// Page atterrissage après clic email reset password.
//
// FLOW :
//   1. User clique le lien dans l'email reset
//   2. Supabase lit le token recovery dans l'URL hash
//   3. detectSessionInUrl + onAuthStateChange émettent l'event
//      "PASSWORD_RECOVERY" (distinct de "SIGNED_IN" classique)
//   4. Cette page détecte la session recovery → autorise updatePassword
//   5. Si pas de session recovery → écran "Trousseau expiré"
//
// SÉCURITÉ : updatePassword ne fonctionne QUE pendant la session
//            recovery — garanti par Supabase nativement.
//
// FIX A (race PASSWORD_RECOVERY) — detectSessionInUrl parse le hash
// au boot du module supabase.js, AVANT le mount de ce composant.
// L'event peut donc fire avant l'enregistrement du listener.
// Triple piste défensive :
//   1. getSession() immédiat au mount (race-safe)
//   2. onAuthStateChange listener (cas event tardif)
//   3. timeout 3s fallback (functional setState pour éviter closure stale)
//
// EDGE CASES :
//   - Accès direct URL (pas de token) → écran "Trousseau expiré"
//   - Token expiré (>1h) ou déjà utilisé → idem
//
// A11y : autoFocus 1er champ, role="alert", role="status", aria-busy,
//        2 toggles 👁 indépendants pour mdp et confirmation.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import "../../styles/reinitialiser-mot-de-passe.css";

// Le delai de grace avant de conclure. Trois secondes : le visiteur vient de
// cliquer un lien dans sa boite mail et regarde l'ecran — on ne le fait pas
// patienter comme au chargement du site (huit secondes a `AuthContext`).
const DELAI_VERIFICATION_MS = 3000;

export default function ReinitialiserMotDePasse() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [initError, setInitError] = useState(null);
  // ⚠ LE TITRE DE CET ECRAN EST EN DUR : « Trousseau expire ». Juste quand le
  // lien a vraiment expire, FAUX quand c'est le reseau qui a manque — et un
  // titre ment aussi surement qu'un paragraphe. On retient donc la CAUSE, pas
  // seulement le message.
  const [panneReseau, setPanneReseau] = useState(false);

  // Détection session recovery — fix A : 3 pistes défensives
  useEffect(() => {
    let annule = false;

    // ── UN SEUL MECANISME DE DELAI, QUI TRANCHE ENTRE DEUX CAUSES ─────────────
    //
    // Le repli existant concluait toujours la meme chose au bout de trois
    // secondes : « Lien invalide ou expire ». Mesure du 21 aout, session stockee
    // et auth injoignable —
    //
    //   /reinitialiser-mot-de-passe   3 640 ms   « Lien invalide ou expire »
    //
    // ... alors que le lien n'y etait pour rien. `supabase.auth.getSession()` NE
    // SE REGLE JAMAIS quand l'auth ne repond pas (meme mecanique qu'a
    // `AuthContext` : ni resolution, ni rejet, il boucle). Un `.catch` n'y peut
    // rien, et le repli parlait donc seul — pour accuser le lien a tort et
    // envoyer demander un nouveau lien POUR RIEN.
    //
    // ⚠ ON N'AJOUTE PAS UN SECOND MINUTEUR. Le repli reste l'unique horloge ; ce
    // qui change, c'est qu'il SAIT desormais pourquoi il s'est reveille :
    //
    //   getSession a REPONDU, pas de session, pas d'evenement  -> lien expire
    //   getSession n'a PAS repondu (ou a echoue)               -> reseau
    //
    // Deux causes, deux messages, une seule horloge. Croiser deux minuteurs avec
    // des `clearTimeout` reciproques aurait rouvert le risque qu'on ferme :
    // deux mecanismes qui posent la meme erreur finissent par se contredire.
    //
    // ⚠ LES TROIS SECONDES NE SONT PAS UN DELAI RESEAU, C'EST UN DELAI DE GRACE.
    // La piste 2 existe parce que `PASSWORD_RECOVERY` peut arriver APRES que
    // `getSession` a repondu sans session. Conclure des sa reponse condamnerait
    // les liens valides dont l'evenement traine. On attend donc, puis on tranche.
    //
    // Plus court qu'`AuthContext` (huit secondes) : ici le visiteur vient de
    // cliquer un lien dans sa boite mail et regarde l'ecran.
    let etatSession = "en-vol"; // "en-vol" | "repondu" | "echoue"

    // 1. Race-safe : session déjà active si l'event PASSWORD_RECOVERY
    //    a fired avant le mount (detectSessionInUrl parse le hash au
    //    boot du module supabase.js).
    supabase.auth
      .getSession()
      .then(({ data }) => {
        etatSession = "repondu";
        if (annule) return;
        if (data.session) setRecoveryReady(true);
      })
      .catch(() => {
        // Un rejet franc est un probleme de RESEAU, pas un lien perime : on ne
        // le marque donc pas « repondu ». Il rejoint le silence.
        etatSession = "echoue";
      });

    // 2. Late-arriving event (hash parsé après le mount)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
        setInitError(null);
        setPanneReseau(false);
      }
    });

    // 3. L'horloge unique — functional setState pour éviter la closure
    //    stale qui figerait recoveryReady à l'instant de l'effet.
    const minuteur = setTimeout(() => {
      if (annule) return;
      setRecoveryReady((ready) => {
        if (!ready) {
          if (etatSession === "repondu") {
            // ⚠ LE CAS NORMAL DE CETTE FORMULE, ET IL RESTE. Supabase a repondu,
            // il n'y a pas de session, aucun evenement n'est venu : le lien est
            // reellement perime. « Trousseau expire » est alors vrai, et
            // « demandez un nouveau lien » est le bon geste.
            setInitError(
              "Lien invalide ou expiré. Demandez un nouveau lien de réinitialisation.",
            );
          } else {
            // On n'a jamais su. On ne condamne donc pas le lien : il est
            // peut-etre parfaitement valide.
            setPanneReseau(true);
            setInitError(
              "Nous n’avons pas pu vérifier ce lien — votre connexion a peut-être été interrompue.",
            );
          }
        }
        return ready;
      });
    }, DELAI_VERIFICATION_MS);

    return () => {
      annule = true;
      subscription.unsubscribe();
      clearTimeout(minuteur);
    };
  }, []); // deps vides — un seul cycle de détection au mount

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    const { error: err } = await updatePassword(password);
    setSubmitting(false);

    if (err) {
      setError(err.message);
      return;
    }

    // Succès : la session recovery devient une session SIGNED_IN
    // standard. L'utilisateur est désormais connecté avec son nouveau
    // mot de passe → redirect home.
    navigate("/", { replace: true });
  };

  // ── Écran erreur : lien invalide ou expiré ──
  if (initError) {
    return (
      <div className="rmdp-page">
        <div className="rmdp-container">
          <span className="rmdp-lys">⚜</span>
          <h1 className="rmdp-titre">
            {panneReseau ? "Vérification impossible" : "Trousseau expiré"}
          </h1>
          <p className="rmdp-error-msg" role="alert">
            {initError}
          </p>
          {/* ⚠ LE GESTE PROPOSE SUIT LA CAUSE, comme le titre. « Demander un
              nouveau lien » sur une panne reseau enverrait refaire un lien qui
              n'a peut-etre rien — et la demande echouerait de la meme facon. */}
          {panneReseau ? (
            <button
              type="button"
              className="rmdp-back-link"
              onClick={() => window.location.reload()}
            >
              Réessayer →
            </button>
          ) : (
            <Link to="/mot-de-passe-oublie" className="rmdp-back-link">
              Demander un nouveau lien →
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Écran loading : vérification de la session recovery ──
  if (!recoveryReady) {
    return (
      <div className="rmdp-page">
        <div className="rmdp-container">
          <span className="rmdp-lys rmdp-lys-spin">⚜</span>
          <p className="rmdp-loading">Vérification du lien…</p>
        </div>
      </div>
    );
  }

  // ── Session recovery active : formulaire nouveau mot de passe ──
  return (
    <div className="rmdp-page">
      <div className="rmdp-container">
        <span className="rmdp-lys">⚜</span>
        <h1 className="rmdp-titre">Choisir vos nouvelles clés</h1>
        <p className="rmdp-sous-titre">
          Saisissez votre nouveau mot de passe ci-dessous.
        </p>

        <form className="rmdp-form" onSubmit={handleSubmit}>
          <label className="rmdp-label" htmlFor="rmdp-password">
            Nouveau mot de passe{" "}
            <span className="rmdp-label-hint">(8 caractères minimum)</span>
          </label>
          <div className="rmdp-password-wrapper">
            <input
              id="rmdp-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoFocus
              autoComplete="new-password"
              className="rmdp-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="rmdp-show-password-toggle"
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

          <label className="rmdp-label" htmlFor="rmdp-confirm-password">
            Confirmer le mot de passe
          </label>
          <div className="rmdp-password-wrapper">
            <input
              id="rmdp-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              className="rmdp-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
            />
            <button
              type="button"
              className="rmdp-show-password-toggle"
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
            className="rmdp-btn"
            disabled={submitting || !password || !confirmPassword}
            aria-busy={submitting}
          >
            {submitting ? "Réinitialisation…" : "Réinitialiser"}
          </button>

          {error && (
            <p className="rmdp-error" role="alert">
              {error}
            </p>
          )}
        </form>

        <p className="rmdp-footer">
          ⚜ Une partie de nos recettes est reversée à la Fondation du
          Patrimoine.
        </p>
      </div>
    </div>
  );
}
