import { supabase } from "../lib/supabase.js";
import { logErreurSupabase } from "../utils/logSupabase.js";

// ============================================================
// Messagerie du Club. Un fil unique par membre, avec l'equipe.
//
// La securite n'est pas ici : elle est dans les policies. Un membre ne peut
// ecrire que dans son fil et signe "membre" (WITH CHECK), et ne marquer lus
// que les messages qu'il recoit. Le service se contente d'exprimer l'intention ;
// la base refuse le reste.
//
// Pas de cache : un fil de discussion doit etre frais. Le TTL de cinq minutes
// des autres services y ferait manquer une reponse.
// ============================================================

// Le fil du membre, du plus ancien au plus recent.
export async function getFil(userId) {
  if (!userId) return [];
  const { data, error, status } = await supabase
    .from("messages")
    .select("id, expediteur, contenu, lu_le, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    logErreurSupabase("[messagesService] getFil:", error, status);
    throw error;
  }
  return data ?? [];
}

// Envoie un message. L'expediteur est impose : la policy le verifie de toute
// facon, mais l'ecrire ici evite qu'un appelant croie pouvoir choisir.
export async function envoyerMessage(userId, contenu) {
  const texte = (contenu ?? "").trim();
  if (!userId || !texte) return null;

  const { data, error, status } = await supabase
    .from("messages")
    .insert({ user_id: userId, expediteur: "membre", contenu: texte })
    .select("id, expediteur, contenu, lu_le, created_at")
    .single();

  if (error) {
    logErreurSupabase("[messagesService] envoyerMessage:", error, status);
    throw error;
  }
  return data;
}

// Combien de messages de l'equipe le membre n'a pas encore lus.
// C'est le chiffre de la pastille dans la barre laterale.
export async function compterNonLus(userId) {
  if (!userId) return 0;
  const { count, error, status } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("expediteur", "equipe")
    .is("lu_le", null);

  if (error) {
    logErreurSupabase("[messagesService] compterNonLus:", error, status);
    throw error;
  }
  return count ?? 0;
}

// Marque lus les messages de l'equipe, a l'ouverture de l'onglet.
// La policy interdit de toucher aux messages du membre lui-meme.
export async function marquerLu(userId) {
  if (!userId) return 0;
  const { data, error, status } = await supabase
    .from("messages")
    .update({ lu_le: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("expediteur", "equipe")
    .is("lu_le", null)
    .select("id");

  if (error) {
    logErreurSupabase("[messagesService] marquerLu:", error, status);
    throw error;
  }
  return data?.length ?? 0;
}

// ============================================================
// COTE LCC (admin). Les fonctions ci-dessus parlent au nom du MEMBRE ; celles-ci
// parlent au nom de l'EQUIPE. Meme table, meme policies : c'est is_admin() qui
// ouvre la lecture de tous les fils et l'ecriture en expediteur='equipe'.
// ============================================================

// La liste des fils, un par membre. Passe par la vue messages_fils_admin
// (PostgREST ne fait pas de GROUP BY) : elle agrege dernier message + non-lus,
// et sa RLS (security_invoker) fait le filtrage — pas de garde ici.
//
// Tri : non-lus d'abord, PUIS par date du dernier message. Deux .order()
// successifs, sur le booleen puis sur la date. Trier sur non_lus (le nombre)
// donnerait autre chose : un fil a 3 non-lus d'il y a une semaine passerait
// devant un fil a 1 non-lu de ce matin.
export async function getFilsAdmin() {
  const { data, error, status } = await supabase
    .from("messages_fils_admin")
    .select("user_id, email, full_name, non_lus, a_non_lus, dernier_at, dernier_contenu, dernier_expediteur")
    .order("a_non_lus", { ascending: false })
    .order("dernier_at", { ascending: false });

  if (error) {
    logErreurSupabase("[messagesService] getFilsAdmin:", error, status);
    throw error;
  }
  return data ?? [];
}

// Le fil d'UN membre, vu par l'equipe. Meme forme que getFil (chronologique),
// mais sans .eq("user_id", auth.uid()) implicite : ici l'admin choisit le fil,
// et c'est is_admin() dans messages_select qui l'y autorise.
export async function getFilAdmin(userId) {
  if (!userId) return [];
  const { data, error, status } = await supabase
    .from("messages")
    .select("id, expediteur, contenu, lu_le, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    logErreurSupabase("[messagesService] getFilAdmin:", error, status);
    throw error;
  }
  return data ?? [];
}

// Reponse de l'equipe dans le fil d'un membre.
//
// expediteur: "equipe" est ecrit EXPLICITEMENT ici. La policy messages_insert
// l'exige et le verifiera (is_admin() AND expediteur = 'equipe') — mais elle est
// le REMPART, pas la source de verite du code. Qui parle doit se lire dans
// l'appel, pas se deduire d'une policy qu'il faut aller ouvrir.
export async function repondreAdmin(userId, contenu) {
  const texte = (contenu ?? "").trim();
  if (!userId || !texte) return null;

  const { data, error, status } = await supabase
    .from("messages")
    .insert({ user_id: userId, expediteur: "equipe", contenu: texte })
    .select("id, expediteur, contenu, lu_le, created_at")
    .single();

  if (error) {
    logErreurSupabase("[messagesService] repondreAdmin:", error, status);
    throw error;
  }
  return data;
}

// Marque lus les messages DU MEMBRE, a l'ouverture du fil par l'equipe.
// Symetrique de marquerLu : chacun ne marque que ce qu'il RECOIT (la policy
// messages_update_lu impose is_admin() AND expediteur = 'membre').
export async function marquerLuAdmin(userId) {
  if (!userId) return 0;
  const { data, error, status } = await supabase
    .from("messages")
    .update({ lu_le: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("expediteur", "membre")
    .is("lu_le", null)
    .select("id");

  if (error) {
    logErreurSupabase("[messagesService] marquerLuAdmin:", error, status);
    throw error;
  }
  return data?.length ?? 0;
}
