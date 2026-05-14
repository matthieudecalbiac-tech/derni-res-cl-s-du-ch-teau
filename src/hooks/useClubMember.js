import { useAuth } from "../contexts/AuthContext";

/**
 * Sprint S2-α.2 Phase 4 — Hook lecture du rôle 'membre_club'.
 *
 * Retourne `false` pendant le loading initial : on suppose non-membre tant
 * que la session n'est pas vérifiée (sécuritaire — évite un flash de
 * contenu privé pendant la 1ère seconde du boot).
 *
 * Précédent : remplace le stub `const IS_CLUB_MEMBER = false` posé en
 * Sprint S2-α.1.5 dans VitrineChateau.jsx.
 *
 * @returns {boolean}
 */
export function useClubMember() {
  const { profile, loading } = useAuth();
  if (loading) return false;
  return profile?.role === "membre_club";
}
