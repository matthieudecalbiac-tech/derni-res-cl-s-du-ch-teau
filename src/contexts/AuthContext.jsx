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

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────────────────────────────────────────────
  // 1. Bootstrap session + listener onAuthStateChange
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Récupère la session initiale (persistée par Supabase dans localStorage)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    // Listener : magic link callback, signOut, refresh token, expiration
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    // Cleanup obligatoire — évite memory leak + accumulation de listeners
    return () => subscription.unsubscribe();
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
    supabase
      .from("users")
      .select("id, email, role, full_name, telephone")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[AuthContext] Failed to fetch profile:", error);
          setProfile(null);
          return;
        }
        setProfile(data);
      });
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
