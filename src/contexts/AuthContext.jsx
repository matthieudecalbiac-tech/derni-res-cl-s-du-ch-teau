// ═══════════════════════════════════════════════════════════════════════════
// LCC — AUTH CONTEXT (Sprint S2-α.2)
// ═══════════════════════════════════════════════════════════════════════════
// Provider + hook useAuth pour l'authentification Supabase magic link.
//
// EXPOSITION
//   - session : Supabase Session object | null
//   - user    : session.user (auth.users) | null
//   - profile : ligne public.users (id, email, role, full_name, telephone) | null
//   - loading : true tant que getSession() initial n'a pas retourné
//   - signInWithPassword(email, password) : connexion email + mot de passe
//   - signUp(email, password) : inscription (envoie un email de confirmation)
//   - resetPasswordForEmail(email) : envoie un email de réinitialisation
//   - updatePassword(newPassword) : applique un nouveau mot de passe (session recovery)
//   - signInWithMagicLink(email) : envoie un magic link à l'email (méthode hybride conservée)
//   - signOut() : déconnexion
//
// FLOW
//   1. Au boot, getSession() restaure la session persistée (localStorage Supabase)
//   2. onAuthStateChange listener s'abonne aux changements (callback magic link,
//      signOut, refresh token automatique)
//   3. Quand session.user change, fetch profile depuis public.users (RLS S1-β
//      autorise SELECT own profile via auth.uid() = id)
//
// emailRedirectTo : `${window.location.origin}/auth/callback`
//   → garantit le retour sur le bon environnement (dev/preview/prod). Sans ça
//   Supabase utiliserait Site URL configurée Dashboard (= prod) y compris en
//   dev local — magic link cassé hors prod.
//
// detectSessionInUrl: true (déjà configuré dans src/lib/supabase.js) :
//   → parse automatiquement le `#access_token=...` au retour magic link, donc
//   AuthCallbackPlaceholder peut rester simple en Phase 3.
// ═══════════════════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

// Combien de temps on attend la session avant de conclure. Huit secondes :
// assez pour une connexion lente et honnete, trop peu pour un ecran blanc.
// ⚠ CE N'EST PAS UN DELAI DE REQUETE mais une BORNE D'ATTENTE : `getSession()`
// peut ne jamais se regler (mesure du 21 aout : blanc a 120 s, 13 tentatives),
// et une promesse qui ne se regle pas n'a pas de `.catch` a declencher.
const DELAI_SESSION_MS = 8000;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────────────────────────────────────────────
  // 1. Bootstrap session + listener onAuthStateChange
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let annule = false;

    // ── L'ECRAN BLANC N'ETAIT PAS UN REJET : C'ETAIT UNE ATTENTE SANS FIN ─────
    //
    // Ce `.then` n'avait pas de `.catch`, et l'on a d'abord cru a un rejet non
    // attrape. LA MESURE DIT AUTRE CHOSE, et c'est ce qui commande la forme du
    // correctif — reconstruit apres coup, session stockee et auth coupee :
    //
    //   /club  TOUJOURS BLANC apres 120 s   —   13 requetes auth tentees
    //
    // `supabase.auth.getSession()` NE SE REGLE JAMAIS : ni resolution, ni rejet.
    // Il boucle. UN `.catch` SEUL EST DONC IMPUISSANT — il attend un rejet qui
    // n'arrive pas. C'est pourquoi il y a une BORNE, et pas seulement un `.catch`.
    //
    // ⚠ « Suspendu » serait un euphemisme : `RequireAuth` rend `null` pendant le
    // chargement, si bien qu'une route protegee ne rendait RIEN — page
    // entierement blanche, sans un mot, sans issue.
    //
    // ⚠ ET CELA NE FRAPPAIT QUE LES GENS CONNECTES :
    //
    //   sans session stockee, auth coupee   /club -> /connexion   (normal)
    //   AVEC session stockee, auth coupee   /club -> PAGE BLANCHE
    //
    // `getSession()` lit d'abord `localStorage` : sans session enregistree il
    // n'y a aucun appel reseau a echouer, ni meme a tenter. Le defaut visait donc
    // precisement les membres du Club, ceux pour qui il compte le plus.
    //
    // ── LA BORNE, ET LE REPLI QU'ELLE DECLENCHE ───────────────────────────────
    //
    // Huit secondes, decision actee. Au-dela : `session = null`, `loading = false`
    // — non-connecte SUR. La securite prime : jamais d'etat ambigu, jamais les
    // donnees d'un autre. Le prix est un faux verrou passager, un membre qui doit
    // recharger apres une coupure. C'est assume, et sans commune mesure avec un
    // ecran blanc dont on ne sort pas.
    //
    // Le `.catch` attrape DESORMAIS LES DEUX — le vrai rejet reseau et le
    // depassement — et les traite pareil : on ne sait pas qui est cette personne.
    //
    // ⚠ « ANONYME » N'EST PAS UNE ERREUR, ET LA BORNE NE LE MENACE PAS. Pour un
    // visiteur sans session, `getSession()` lit `localStorage` et REUSSIT
    // immediatement avec `data.session === null` — sans reseau, sans attente. Le
    // `.then` traite ce cas depuis toujours, bien avant la huitieme seconde. Ni
    // la borne ni le `.catch` ne le voient jamais.
    //
    // ⚠ LE MINUTEUR EST NETTOYE. Une fois la course gagnee par `getSession`, le
    // rejet tardif du minuteur serait ignore — une promesse deja reglee ne se
    // regle pas deux fois. Mais le `setTimeout` continuerait de courir jusqu'a
    // son terme pour rien, et sur un demontage il tiendrait l'effet en vie
    // huit secondes de plus. On l'annule donc explicitement, dans les deux cas.
    let minuteur;
    const borne = new Promise((_, rejeter) => {
      minuteur = setTimeout(() => rejeter(new Error("delai-session")), DELAI_SESSION_MS);
    });

    Promise.race([supabase.auth.getSession(), borne])
      .then(({ data }) => {
        clearTimeout(minuteur);
        if (annule) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(minuteur);
        if (annule) return;
        setSession(null);
        setLoading(false);
      });

    // Listener : magic link callback, signOut, refresh token, expiration
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (annule) return;
      setSession(newSession);
    });

    // Cleanup obligatoire — évite memory leak + accumulation de listeners.
    // ⚠ `annule` s'y ajoute pour le meme motif que partout ailleurs : StrictMode
    // monte deux fois en dev, et une reponse tardive ne doit pas ecrire dans un
    // provider demonte. Il ne change RIEN au parcours normal — il ne se leve
    // qu'au demontage.
    return () => {
      annule = true;
      clearTimeout(minuteur);
      subscription.unsubscribe();
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────
  // 2. Fetch profile public.users quand session change
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }
    let cancelled = false;

    // ⚠ CE SITE-CI GERAIT DEJA L'ECHEC — A MOITIE. Le corps du `.then` traitait
    // l'erreur APPLICATIVE (`error` renvoye par Supabase : ligne introuvable,
    // RLS qui refuse). Il ne voyait pas le REJET reseau, qui ne passe pas par
    // `error` mais par la promesse elle-meme.
    //
    // Les deux appellent pourtant le meme traitement : on ne sait pas qui est
    // cette personne, donc pas de profil. Un seul chemin, ecrit une fois — un
    // `.catch` qui recopierait le corps du `.then` divergerait tot ou tard.
    const sansProfil = (motif) => {
      if (cancelled) return;
      console.error("[AuthContext] Failed to fetch profile:", motif);
      setProfile(null);
    };

    supabase
      .from("users")
      .select("id, email, role, full_name, first_name, last_name, civilite, telephone, marketing_consent, created_at")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          sansProfil(error);
          return;
        }
        setProfile(data);
      })
      .catch(sansProfil);
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // ──────────────────────────────────────────────────────────────────────
  // 3. Actions exposées
  // ──────────────────────────────────────────────────────────────────────
  const signInWithMagicLink = async (email, next = null) => {
    // Sprint S2-α.2 Mini-Phase 6 : `next` est encodé dans emailRedirectTo
    // via query param `?next=`. Ce param survit au nouveau tab Gmail
    // (contrairement à sessionStorage qui est session-scoped à un tab).
    // AuthCallback.jsx lira useSearchParams().get("next") avec whitelist
    // anti open-redirect.
    const callbackUrl = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Force le retour sur l'origine actuelle (dev/preview/prod cohérent)
        emailRedirectTo: callbackUrl,
      },
    });
    if (error) throw error;
  };

  // ──────────────────────────────────────────────────────────────────────
  // Auth email + mot de passe (Sprint alpha.2.5 Phase B)
  // Pattern : retour { error } (natif Supabase). Les messages d'erreur sont
  // mappes en francais ICI — source unique de verite des libelles.
  // ──────────────────────────────────────────────────────────────────────
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
      },
    });
    if (error) {
      let message = error.message;
      if (/user already registered/i.test(error.message))
        message = "Un compte existe déjà avec cet email.";
      else if (/password.*characters|at least.*characters/i.test(error.message))
        message = "Le mot de passe doit contenir au moins 8 caractères.";
      else if (/unable to validate email|invalid email/i.test(error.message))
        message = "Format d'email invalide.";
      return { user: null, error: { ...error, message } };
    }
    return { user: data.user, error: null };
  };

  const signInWithPassword = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      let message = error.message;
      if (/invalid login credentials/i.test(error.message))
        message = "Email ou mot de passe incorrect.";
      else if (/email not confirmed/i.test(error.message))
        message =
          "Vous devez d'abord confirmer votre email (lien envoyé à l'inscription).";
      return { user: null, session: null, error: { ...error, message } };
    }
    return { user: data.user, session: data.session, error: null };
  };

  const resetPasswordForEmail = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    return { error };
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { user: data?.user ?? null, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    const uid = session?.user?.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from("users")
      .select("id, email, role, full_name, first_name, last_name, civilite, telephone, marketing_consent, created_at")
      .eq("id", uid)
      .single();
    if (!error && data) setProfile(data);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signInWithPassword,
        signUp,
        resetPasswordForEmail,
        updatePassword,
        signInWithMagicLink,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
