import { supabase } from "../lib/supabase.js";

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
  const { data, error } = await supabase
    .from("messages")
    .select("id, expediteur, contenu, lu_le, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messagesService] getFil:", error);
    throw error;
  }
  return data ?? [];
}

// Envoie un message. L'expediteur est impose : la policy le verifie de toute
// facon, mais l'ecrire ici evite qu'un appelant croie pouvoir choisir.
export async function envoyerMessage(userId, contenu) {
  const texte = (contenu ?? "").trim();
  if (!userId || !texte) return null;

  const { data, error } = await supabase
    .from("messages")
    .insert({ user_id: userId, expediteur: "membre", contenu: texte })
    .select("id, expediteur, contenu, lu_le, created_at")
    .single();

  if (error) {
    console.error("[messagesService] envoyerMessage:", error);
    throw error;
  }
  return data;
}

// Combien de messages de l'equipe le membre n'a pas encore lus.
// C'est le chiffre de la pastille dans la barre laterale.
export async function compterNonLus(userId) {
  if (!userId) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("expediteur", "equipe")
    .is("lu_le", null);

  if (error) {
    console.error("[messagesService] compterNonLus:", error);
    throw error;
  }
  return count ?? 0;
}

// Marque lus les messages de l'equipe, a l'ouverture de l'onglet.
// La policy interdit de toucher aux messages du membre lui-meme.
export async function marquerLu(userId) {
  if (!userId) return 0;
  const { data, error } = await supabase
    .from("messages")
    .update({ lu_le: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("expediteur", "equipe")
    .is("lu_le", null)
    .select("id");

  if (error) {
    console.error("[messagesService] marquerLu:", error);
    throw error;
  }
  return data?.length ?? 0;
}
