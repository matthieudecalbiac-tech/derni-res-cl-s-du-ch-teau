// ============================================================
// Edge Function "demande-reservation" — crée une demande de réservation
// (mode sur_place) pour un visiteur PAS ENCORE CONNECTÉ.
//
// POINT DUR : au moment de la soumission, le visiteur n'a pas de session
// (signInWithOtp ne crée pas de session synchrone). auth.uid() n'existe donc
// pas. Cette fonction tourne en service_role : elle BYPASSE la RLS et les CHECK
// applicatifs. Elle est le SEUL rempart — elle RE-VALIDE tout ce que la RLS et
// les contraintes auraient validé, et RECALCULE le prix côté serveur.
//
// verify_jwt = false (config.toml) : appelable sans Authorization (visiteur
// anonyme). Les garde-fous (rate-limit, idempotence, plafond) viennent de la
// migration 2026-07-17-reservation-garde-fous.sql.
//
// MESSAGES D'ERREUR : génériques côté client (jamais l'existence d'un compte,
// jamais la structure interne), précis côté logs (console.*).
//
// PAS d'email dans ce lot (createUser N'ENVOIE PAS d'email ; Brevo = brique 3).
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// EdgeRuntime.waitUntil : garde le worker vivant jusqu'à ce que la promesse en
// arrière-plan (le "nudge" vers send-email) se règle, APRÈS le return au client.
// Fourni par l'Edge Runtime Supabase ; typé ici pour le confort.
declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void } | undefined;

// ── Réglages (dans la fonction, pas en base) ──
const RATE_LIMIT_MAX = 3; // demandes par IP...
const RATE_WINDOW_MS = 15 * 60_000; // ...par fenêtre de 15 min
const PENDING_MAX_PER_EMAIL = 2; // demandes "pending" simultanées par compte
// ⚠ MESSAGE_MAX est DUPLIQUÉ : ici (validation fonction, rejet 400) ET en base
// (CHECK reservations_message_length, migration 2026-07-17-reservation-garde-fous).
// Ceinture et bretelles VOULUE — mais les DEUX valeurs doivent rester égales.
// Si tu changes ce 2000, change AUSSI le CHECK SQL, sinon la fonction validera
// un message que la base refusera (INSERT 23514, demande perdue).
const MESSAGE_MAX = 2000;

// ── CORS : appelé depuis le navigateur (VitrineChateau). "*" suffit ici (la
// fonction ne crée que des demandes pending, rate-limitées) ; à resserrer sur
// le domaine de prod si besoin. ──
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Messages CLIENT (sûrs) ──
// Générique : tout ce qui touche à l'interne (ressource, config, compte, DB).
const ERR_GENERIC =
  "Votre demande n'a pas pu être enregistrée. Merci de réessayer dans un instant.";
// Générique anti-abus : sert AUSSI au plafond par email (ne révèle donc pas
// que le blocage est lié à CET email — pas de fuite d'existence de compte).
const ERR_RATE =
  "Trop de demandes en cours. Merci de patienter quelques minutes avant de réessayer.";
// Générique ressource : ne dit pas si le château existe / est publié / accepte
// le paiement sur place (état non "probable" par un tiers).
const ERR_INDISPO =
  "Cette demande de réservation n'est pas disponible.";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
const ok = (reservationId: string) => json(200, { ok: true, reservationId });
const fail = (status: number, error: string) => json(status, { ok: false, error });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, ERR_GENERIC);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // ─────────────────────────────────────────────────────────
  // 1. RATE LIMIT par IP (purge opportuniste → count → trace)
  // ─────────────────────────────────────────────────────────
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "inconnue";
  const cutoff = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

  // Purge opportuniste : la table s'auto-borne aux 15 dernières minutes.
  await supabase.from("demande_rate_limit").delete().lt("created_at", cutoff);

  const { count: hits, error: rlErr } = await supabase
    .from("demande_rate_limit")
    .select("*", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", cutoff);
  if (rlErr) {
    console.error("[demande-reservation] rate-limit count:", rlErr.message);
    return fail(500, ERR_GENERIC);
  }
  if ((hits ?? 0) >= RATE_LIMIT_MAX) {
    console.warn(`[demande-reservation] rate-limit IP=${ip} hits=${hits}`);
    return fail(429, ERR_RATE);
  }
  // Trace cette tentative AVANT toute validation, DÉLIBÉRÉMENT : une requête
  // malformée (body invalide, dates absurdes) consomme un jeton comme une autre.
  // Sinon un attaquant sonderait gratuitement (spam de payloads invalides sans
  // jamais épuiser son quota). Le jeton se paie à l'appel, pas au succès.
  await supabase.from("demande_rate_limit").insert({ ip });

  // ─────────────────────────────────────────────────────────
  // 2. LECTURE + VALIDATION de l'entrée
  // ─────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Requête invalide.");
  }

  const chateauSlug = String(body.chateauSlug ?? "").trim();
  const chambreId = String(body.chambreId ?? "").trim();
  const dateArrivee = String(body.dateArrivee ?? "").trim();
  const dateDepart = String(body.dateDepart ?? "").trim();
  const voyageurs = Number(body.voyageurs);
  const nom = String(body.nom ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  let message = body.message == null ? null : String(body.message).trim();
  if (message === "") message = null;
  // NB : un éventuel body.prix / prixTotal est IGNORÉ — recalcul serveur (§4).

  if (!chateauSlug || !chambreId || !dateArrivee || !dateDepart || !nom || !email) {
    return fail(400, "Merci de renseigner tous les champs obligatoires.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail(400, "L'adresse email est invalide.");
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(dateArrivee) || !dateRe.test(dateDepart)) {
    return fail(400, "Les dates de séjour sont invalides.");
  }
  if (message && message.length > MESSAGE_MAX) {
    return fail(400, `Votre message est trop long (${MESSAGE_MAX} caractères maximum).`);
  }
  if (!Number.isInteger(voyageurs) || voyageurs < 1) {
    return fail(400, "Le nombre de voyageurs est invalide.");
  }

  const arrMs = Date.parse(`${dateArrivee}T00:00:00Z`);
  const depMs = Date.parse(`${dateDepart}T00:00:00Z`);
  if (Number.isNaN(arrMs) || Number.isNaN(depMs)) {
    return fail(400, "Les dates de séjour sont invalides.");
  }
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (arrMs < todayMs) return fail(400, "La date d'arrivée est déjà passée.");
  if (depMs <= arrMs) return fail(400, "La date de départ doit suivre l'arrivée.");
  const nbNuits = Math.round((depMs - arrMs) / 86_400_000);
  if (nbNuits < 1) return fail(400, "Le séjour doit durer au moins une nuit.");

  // ─────────────────────────────────────────────────────────
  // 3. CHÂTEAU (publié + sur_place) puis CHAMBRE (lui appartient)
  // ─────────────────────────────────────────────────────────
  const { data: chateau, error: cErr } = await supabase
    .from("chateaux")
    .select("id, nom, statut, mode_paiement")
    .eq("slug", chateauSlug)
    .maybeSingle();
  if (cErr) {
    console.error("[demande-reservation] château:", cErr.message);
    return fail(500, ERR_GENERIC);
  }
  if (!chateau || chateau.statut !== "publie" || chateau.mode_paiement !== "sur_place") {
    console.warn(
      `[demande-reservation] château indispo slug=${chateauSlug} statut=${chateau?.statut} mode=${chateau?.mode_paiement}`,
    );
    return fail(409, ERR_INDISPO);
  }

  const { data: chambre, error: chErr } = await supabase
    .from("chambres")
    .select("id, chateau_id, capacite, prix_cents, cleaning_fee_cents, min_stay_nights, max_stay_nights")
    .eq("id", chambreId)
    .maybeSingle();
  if (chErr) {
    console.error("[demande-reservation] chambre:", chErr.message);
    return fail(500, ERR_GENERIC);
  }
  if (!chambre || chambre.chateau_id !== chateau.id) {
    console.warn(
      `[demande-reservation] chambre invalide id=${chambreId} attendu château=${chateau.id} obtenu=${chambre?.chateau_id}`,
    );
    return fail(409, ERR_INDISPO);
  }

  // Règles de séjour (contre la chambre réelle).
  if (voyageurs > chambre.capacite) {
    return fail(400, "Le nombre de voyageurs dépasse la capacité de la chambre.");
  }
  if (nbNuits < chambre.min_stay_nights) {
    return fail(400, `Cette chambre demande un séjour d'au moins ${chambre.min_stay_nights} nuit(s).`);
  }
  if (chambre.max_stay_nights != null && nbNuits > chambre.max_stay_nights) {
    return fail(400, `Cette chambre limite le séjour à ${chambre.max_stay_nights} nuit(s).`);
  }

  // ─────────────────────────────────────────────────────────
  // 4. PRIX RECALCULÉ SERVEUR (le prix client est ignoré)
  // ─────────────────────────────────────────────────────────
  const prixTotalCents = nbNuits * chambre.prix_cents + (chambre.cleaning_fee_cents ?? 0);
  if (!(prixTotalCents > 0)) {
    console.error("[demande-reservation] prix recalculé <= 0", { nbNuits, prix: chambre.prix_cents });
    return fail(500, ERR_GENERIC);
  }

  // ─────────────────────────────────────────────────────────
  // 5. MODULE A (vitrine permanente) du château — existe + actif
  // ─────────────────────────────────────────────────────────
  const { data: moduleA, error: mErr } = await supabase
    .from("modules")
    .select("id")
    .eq("code", "A")
    .limit(1)
    .maybeSingle();
  if (mErr || !moduleA) {
    console.error("[demande-reservation] module A introuvable:", mErr?.message);
    return fail(500, ERR_GENERIC);
  }
  const { data: lien, error: lErr } = await supabase
    .from("chateau_modules")
    .select("id")
    .eq("chateau_id", chateau.id)
    .eq("module_id", moduleA.id)
    .eq("est_actif", true)
    .limit(1)
    .maybeSingle();
  if (lErr) {
    console.error("[demande-reservation] chateau_modules:", lErr.message);
    return fail(500, ERR_GENERIC);
  }
  if (!lien) {
    console.error(`[demande-reservation] module A non actif pour château ${chateau.id}`);
    return fail(409, ERR_INDISPO);
  }

  // ─────────────────────────────────────────────────────────
  // 6. COMPTE : réutiliser l'existant OU créer (jamais d'email, jamais de
  //    modification d'un compte existant). Existence NON révélée au client.
  // ─────────────────────────────────────────────────────────
  let userId: string;
  const { data: existingUser, error: uErr } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (uErr) {
    console.error("[demande-reservation] users lookup:", uErr.message);
    return fail(500, ERR_GENERIC);
  }

  if (existingUser) {
    // Compte connu → réutilisé TEL QUEL. Aucune écriture (pas de rename).
    userId = existingUser.id;
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // marque l'email confirmé — N'ENVOIE PAS d'email
      user_metadata: { full_name: nom },
    });
    if (createErr || !created?.user) {
      // Cas limite : email présent dans auth mais pas (encore) dans public.users.
      // On NE dit RIEN de spécial au client (pas de fuite d'existence de compte).
      console.error("[demande-reservation] createUser:", createErr?.message);
      const { data: retry } = await supabase
        .from("users").select("id").eq("email", email).maybeSingle();
      if (retry) {
        userId = retry.id;
      } else {
        return fail(500, ERR_GENERIC);
      }
    } else {
      userId = created.user.id;
      // full_name renseigné UNIQUEMENT à la création (le trigger handle_new_user
      // n'insère que id/email/role). Non bloquant s'il échoue.
      const { error: nameErr } = await supabase
        .from("users").update({ full_name: nom }).eq("id", userId);
      if (nameErr) console.error("[demande-reservation] full_name update:", nameErr.message);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 7. IDEMPOTENCE + PLAFOND + INSERT
  // ─────────────────────────────────────────────────────────
  // Filtre de la demande "identique" (double-clic) = clé de l'index partiel.
  const idemSelect = () =>
    supabase
      .from("reservations")
      .select("id")
      .eq("user_id", userId)
      .eq("chambre_id", chambreId)
      .eq("date_arrivee", dateArrivee)
      .eq("date_depart", dateDepart)
      .eq("status", "pending")
      .maybeSingle();

  // 7a. Double-clic courant : une demande pending identique existe déjà → même
  //     réponse, même id (équivalent ON CONFLICT DO NOTHING → retourne l'existant).
  const { data: dejaLa, error: exErr } = await idemSelect();
  if (exErr) {
    console.error("[demande-reservation] idempotence select:", exErr.message);
    return fail(500, ERR_GENERIC);
  }
  if (dejaLa) return ok(dejaLa.id);

  // 7b. Plafond de demandes pending par compte (message générique = pas de fuite).
  const { count: pending, error: pErr } = await supabase
    .from("reservations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");
  if (pErr) {
    console.error("[demande-reservation] pending count:", pErr.message);
    return fail(500, ERR_GENERIC);
  }
  if ((pending ?? 0) >= PENDING_MAX_PER_EMAIL) {
    console.warn(`[demande-reservation] plafond pending user=${userId} pending=${pending}`);
    return fail(429, ERR_RATE);
  }

  // 7c. INSERT. L'index unique partiel est le backstop anti-course (23505).
  const { data: inserted, error: iErr } = await supabase
    .from("reservations")
    .insert({
      user_id: userId,
      chambre_id: chambreId,
      module_id: moduleA.id,
      date_arrivee: dateArrivee,
      date_depart: dateDepart,
      voyageurs,
      message,
      prix_total_cents: prixTotalCents,
      status: "pending",
    })
    .select("id")
    .single();
  if (iErr) {
    if (iErr.code === "23505") {
      // Course perdue entre 7a et 7c : une demande identique s'est glissée.
      const { data: race } = await idemSelect();
      if (race) return ok(race.id);
    }
    console.error("[demande-reservation] insert:", iErr.message, iErr.code);
    return fail(500, ERR_GENERIC);
  }

  // ─────────────────────────────────────────────────────────
  // 8. EMAIL (best-effort) — la demande est DÉJÀ durable (§7c). RIEN ci-dessous
  //    ne peut faire échouer le return : la demande ne dépend jamais de l'email
  //    (anti-fuite — le client reçoit le MÊME ok(reservationId) quoi qu'il arrive).
  //
  //    Placement VOULU : on écrit les lignes email_log de façon SYNCHRONE, AVANT
  //    le return. C'est le cœur du modèle (b) : l'intention d'envoi doit être
  //    durable en base pour être reprise si le nudge échoue. Coût = 2 aller-retours
  //    (SELECT contacts + INSERT groupé) — on n'attend JAMAIS Brevo ici (ça, c'est
  //    le nudge/reprise). Le rendu HTML n'est PAS fait ici : payload = { sujet,
  //    params }, send-email met en forme selon le type.
  // ─────────────────────────────────────────────────────────
  try {
    // Faits communs aux 3 gabarits. prixTotalEuros = montant SERVEUR (jamais client).
    const base = {
      chateau: chateau.nom,
      dateArrivee,
      dateDepart,
      voyageurs,
      prixTotalEuros: prixTotalCents / 100,
    };

    // Destinataires châtelains : 0, 1 ou plusieurs contacts actifs → 1 ligne / contact.
    const { data: contacts, error: ctErr } = await supabase
      .from("chateau_contacts")
      .select("email")
      .eq("chateau_id", chateau.id)
      .eq("actif", true);
    if (ctErr) console.error("[demande-reservation] chateau_contacts:", ctErr.message);

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    if (!adminEmail) console.warn("[demande-reservation] ADMIN_EMAIL absent — pas d'email admin");

    // Une ligne email_log par email. Formes de params = celles documentées en tête
    // de send-email/index.ts (ne pas dévier).
    const rows: Array<Record<string, unknown>> = [];

    // client : le CHÂTEAU uniquement, jamais le nom des propriétaires (règle éditoriale).
    rows.push({
      destinataire: email,
      type: "demande_client",
      reservation_id: inserted.id,
      statut: "en_attente",
      payload: {
        sujet: `Votre demande — ${chateau.nom}`,
        params: { nomClient: nom, ...base },
      },
    });

    // chatelain : email de travail (contact + message + prix). Un par contact actif.
    for (const c of contacts ?? []) {
      rows.push({
        destinataire: c.email,
        type: "demande_chatelain",
        reservation_id: inserted.id,
        statut: "en_attente",
        payload: {
          sujet: `Nouvelle demande de séjour — ${chateau.nom}`,
          params: { nomClient: nom, emailClient: email, message, ...base },
        },
      });
    }

    // admin : supervision, tout en clair.
    if (adminEmail) {
      rows.push({
        destinataire: adminEmail,
        type: "demande_admin",
        reservation_id: inserted.id,
        statut: "en_attente",
        payload: {
          sujet: `Demande ${chateau.nom} — ${nom}`,
          params: { nomClient: nom, emailClient: email, message, ...base },
        },
      });
    }

    const { error: elErr } = await supabase.from("email_log").insert(rows);
    if (elErr) {
      // Écriture ratée (rare) : la demande reste valide. On logue, on NE casse PAS
      // le return, et on ne nudge pas (rien à envoyer).
      console.error("[demande-reservation] insert email_log:", elErr.message);
    } else {
      // NUDGE best-effort : déclenche send-email SANS attendre (waitUntil garde le
      // worker vivant après le return). Si le nudge échoue, les lignes restent
      // 'en_attente' → reprises plus tard. Le client ne voit rien de tout ça.
      const nudge = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "",
        },
        body: JSON.stringify({ reservationId: inserted.id }),
      }).catch((e) =>
        console.error("[demande-reservation] nudge send-email:", e instanceof Error ? e.message : String(e))
      );
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
        EdgeRuntime.waitUntil(nudge);
      }
    }
  } catch (e) {
    // Filet ultime : quoi qu'il arrive côté email, la demande est déjà durable.
    console.error("[demande-reservation] bloc email:", e instanceof Error ? e.message : String(e));
  }

  return ok(inserted.id);
});
