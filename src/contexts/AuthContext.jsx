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
//   - signInWithMagicLink(email) : envoie un magic link à l'email donné
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
  const signInWithMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Force le retour sur l'origine actuelle (dev/preview/prod cohérent)
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
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
