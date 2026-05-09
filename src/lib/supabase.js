// ═══════════════════════════════════════════════════════════════════════════
// LCC — CLIENT SUPABASE PARTAGÉ (S1-δ)
// ═══════════════════════════════════════════════════════════════════════════
// Instance unique du client Supabase utilisée dans toute l'application.
// Source de vérité pour la connexion au projet lcc-prod (eu-west-1).
//
// Variables requises dans .env :
//   VITE_SUPABASE_URL      — URL du projet (https://<ref>.supabase.co)
//   VITE_SUPABASE_ANON_KEY — clé publique anon (RLS protège les données)
//
// La clé anon est sûre côté client : RLS bloque les accès non autorisés.
// La clé service_role n'est JAMAIS exposée côté client (bypass RLS).
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant. " +
    "Vérifie ton fichier .env à la racine du repo (cf. .env.example)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
