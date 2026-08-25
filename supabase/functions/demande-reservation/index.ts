// ============================================================
// Edge Function "demande-reservation" — crée une demande de réservation
// (mode sur_place) pour un visiteur PAS ENCORE CONNECTÉ.
//
// POINT DUR : au moment de la soumission, le visiteur n'a pas de session
// (signInWithOtp ne crée pas de session synchrone). auth.uid() n'existe donc
// pas. Cette fonction tourne en service_role : elle BYPASSE la RLS et les CHECK
// applicatifs. Elle est le SEUL rempart — elle RE-VALIDE tout ce que la RLS et
// les contraintes auraient validé, et NE PREND JAMAIS un montant du client.
//
// ⚠ LE PRIX N'EST PLUS CALCULÉ ICI (P3, 25 août 2026) : il vient de la fonction
// SQL `prix_sejour`, appelée AUSSI par le front pour afficher. Une seule source,
// donc « afficher = facturer » par construction — cf. § 4. Un échec de cette
// lecture REFUSE la demande ; c'est l'inverse du § 3 bis, et c'est voulu.
//
// La COMMISSION LCC est recalculée ici pour la même raison que le prix : le taux
// (chateau_modules.commission_pct_negociee) n'est jamais exposé au front, et un
// montant venu du client serait falsifiable. Taux absent = commission 0, jamais
// un refus — cf. § 5 bis.
//
// verify_jwt = false (config.toml) : appelable sans Authorization (visiteur
// anonyme). Les garde-fous (rate-limit, idempotence, plafond) viennent de la
// migration 2026-07-17-reservation-garde-fous.sql.
//
// MESSAGES D'ERREUR : génériques côté client (jamais l'existence d'un compte,
// jamais la structure interne), précis côté logs (console.*).
// ⚠ UNE EXCEPTION DEPUIS LE 23 AOÛT : ERR_DATES_PRISES est SPÉCIFIQUE. La
// discrétion aurait été mieux servie par ERR_INDISPO, mais elle protégerait une
// information que le calendrier public montrera de toute façon — au prix d'un
// visiteur qui ne saurait pas que changer de dates suffirait. Arbitrage assumé,
// détaillé au-dessus de la constante.
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
// ⚠ SPÉCIFIQUE, contrairement aux trois ci-dessus — décision du 23 août 2026.
//
// Le message-valise ERR_INDISPO aurait mieux servi la discrétion : le visiteur
// n'aurait pas pu distinguer « dates prises » de « château non publié ». Trois
// raisons de ne pas le réutiliser ici :
//   1. le calendrier public (jours_disponibles, étape 2.3) montrera de toute
//      façon les dates prises — on protégerait une information déjà publique ;
//   2. le sondage reste borné par le rate-limit : 3 demandes par IP par 15 min,
//      et le jeton se consomme MÊME en cas d'échec (cf. §1) ;
//   3. « Cette demande n'est pas disponible » sur un formulaire rempli, c'est un
//      visiteur qui abandonne sans savoir que d'autres dates passeraient.
//
// ⚠ La discrétion n'est pas abandonnée, elle est CIBLÉE : les trois autres
// causes d'ERR_INDISPO (statut, mode_paiement, module) restent indiscernables.
// Factuel, sans nommer de contrainte ni révéler la réservation d'un tiers.
const ERR_DATES_PRISES =
  "Ces dates ne sont plus disponibles pour cette chambre.";

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
    // ⚠ NI prix_cents NI cleaning_fee_cents depuis P3 : le prix ne se lit plus
    //   sur la chambre, il vient de `prix_sejour` (§ 4). Les retirer n'est pas
    //   du ménage — c'est le VERROU 2 du § 4 : aucune valeur de repli ne doit
    //   exister dans la portée, sans quoi un `?? nbNuits * chambre.prix_cents`
    //   s'écrirait tout seul le jour d'une panne.
    .select("id, chateau_id, capacite, min_stay_nights, max_stay_nights")
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
  // 3 bis. LES DATES SONT-ELLES LIBRES ? (moteur de disponibilité, étape 2.5)
  // ─────────────────────────────────────────────────────────
  // Ce contrôle MANQUAIT. Les trois ERR_INDISPO ci-dessus couvrent le château,
  // l'appartenance de la chambre et le module — jamais les dates. Un visiteur
  // pouvait donc demander une chambre déjà vendue, et la contrainte
  // reservations_pas_de_chevauchement ne l'arrêtait pas : elle n'occupe que sur
  // 'confirmed', or la demande entre en 'pending'. Le refus n'arrivait qu'à la
  // confirmation du châtelain — trop tard, et c'est LUI qui portait la gêne.
  //
  // ⚠ PLACÉ ICI, ET PAS PLUS BAS : la section 6 CRÉE un compte utilisateur.
  //    Refuser après elle laisserait un compte fantôme derrière chaque demande
  //    morte-née — le seul effet de bord de cette fonction qui survive à la
  //    requête.
  //
  // dateArrivee / dateDepart sont déjà "YYYY-MM-DD", validés par regex en §2 :
  // aucune conversion, donc aucune question de fuseau (contrairement au front,
  // où versJour() existe précisément pour ça — cf. disponibilitesService).
  //
  // Niveau CHAMBRE, pas château : le visiteur a choisi une chambre précise, et
  // c'est elle qu'on réserve. Dire « une autre chambre est libre » ne servirait
  // à rien ici.
  const { data: libre, error: dispoErr } = await supabase.rpc("est_disponible", {
    p_chambre_id: chambreId,
    p_arrivee: dateArrivee,
    p_depart: dateDepart,
  });

  if (dispoErr || typeof libre !== "boolean") {
    // ⚠ ON OUVRE — décision du 23 août. Ce contrôle est une AMÉLIORATION
    //   D'EXPÉRIENCE, pas la barrière de sûreté : la barrière reste la
    //   contrainte d'exclusion, qui tranche à la confirmation. Transformer une
    //   erreur de lecture transitoire en panne totale du tunnel de demande
    //   serait un mal plus grand que celui qu'on corrige. On retombe alors sur
    //   le comportement d'avant 2.5 — pas pire, et tracé.
    //
    // ⚠ SEUL UN `false` EXPLICITE BLOQUE. Un retour non booléen est un problème
    //   de lecture, pas un refus : il rejoint cette branche. Écrire `!libre`
    //   aurait fait bloquer un null, soit l'inverse de la décision.
    //
    // Le libellé dit « IGNORÉ » pour qu'une lecture des logs ne prenne jamais un
    // correctif inerte pour un correctif qui passe.
    console.error(
      "[demande-reservation] est_disponible indisponible — contrôle des dates IGNORÉ:",
      dispoErr?.message ?? `retour inattendu (${typeof libre})`,
    );
  } else if (!libre) {
    // Précis côté logs, factuel côté client — la discipline du fichier.
    console.warn(
      `[demande-reservation] dates prises chambre=${chambreId} ${dateArrivee}->${dateDepart}`,
    );
    return fail(409, ERR_DATES_PRISES);
  }

  // ─────────────────────────────────────────────────────────
  // 4. PRIX FACTURÉ — par prix_sejour, la SOURCE UNIQUE (P3)
  // ─────────────────────────────────────────────────────────
  // Le montant n'est plus calculé ici. Il vient de la fonction SQL
  // `prix_sejour` — celle-là même que le front appellera pour AFFICHER (P4).
  // Littéralement la même fonction pour les deux : c'est ce qui rend
  // « afficher = facturer » vrai PAR CONSTRUCTION, et non par vigilance.
  //
  // ⚠ Deux codes qui « calculent pareil » ne garantissent rien ; un seul, si.
  //   La formule qui vivait ici — nbNuits * prix_cents + cleaning_fee — était
  //   juste, et elle serait devenue fausse au premier prix_special_cents saisi
  //   par un châtelain : on aurait montré un tarif et facturé l'autre.
  //
  // ⚠ `nbNuits` RESTE UTILISÉ plus haut (min_stay_nights / max_stay_nights,
  //   § 3). Il cesse seulement d'entrer dans le prix.
  //
  // ⚠ AUCUNE CONVERSION DE DATE : dateArrivee / dateDepart sont déjà
  //   "YYYY-MM-DD", validés par regex en § 2. Même raison qu'en § 3 bis — le
  //   piège de fuseau qui a coûté un bug au front n'existe pas ici.
  //
  // ⚠ Le GRANT EXECUTE à `service_role` posé par la migration P1
  //   (2026-08-25-prix-sejour.sql) sert ICI, et nulle part ailleurs : cette
  //   fonction est le seul appelant serveur. Sans lui, 42501 à chaque demande.
  //
  // ═══════════════════════════════════════════════════════════════════════
  // ⚠⚠ NE PAS HARMONISER CE GARDE AVEC CELUI DU § 3 bis — ILS SONT INVERSES
  // ═══════════════════════════════════════════════════════════════════════
  // Vingt lignes plus haut, `est_disponible` en échec fait OUVRIR : le contrôle
  // des dates est une AMÉLIORATION D'EXPÉRIENCE, adossée à la contrainte
  // d'exclusion qui tranche à la confirmation. Transformer une erreur de
  // lecture transitoire en panne du tunnel serait un mal plus grand.
  //
  // ⚠ ICI C'EST UN MONTANT, ET ON REFUSE. Mieux vaut une demande qui échoue
  //   qu'une demande enregistrée à un prix faux : la ligne `reservations` est
  //   DURABLE, elle part dans trois emails, elle porte la commission, et c'est
  //   elle que le châtelain confirmera. Un mauvais montant ne se rattrape pas
  //   à la confirmation — il s'y exécute.
  //
  // ⚠⚠ ET SURTOUT : AUCUN REPLI SUR L'ANCIENNE FORMULE. La tentation, en
  //   lisant « on refuse », sera d'ajouter un `?? nbNuits * chambre.prix_cents`
  //   « pour ne pas perdre la demande ». Ce serait rétablir exactement la
  //   divergence afficher != facturer que tout ce chantier ferme — et de la
  //   pire façon, puisqu'elle ne se manifesterait que les jours de panne.
  //
  // Trois autres verrous rendent l'oubli difficile, et ils sont structurels :
  //   1. le garde ci-dessous a le REFUS POUR DÉFAUT (à l'inverse du § 3 bis,
  //      où le défaut est le passage) ;
  //   2. aucune valeur de repli n'existe dans la portée — retirer le garde ne
  //      rendrait pas l'ancien prix, mais `null` ;
  //   3. `reservations.prix_total_cents` est NOT NULL + CHECK (> 0) : un
  //      montant absent ne peut pas s'enregistrer en silence.
  // ═══════════════════════════════════════════════════════════════════════
  const { data: prixRpc, error: prixErr } = await supabase.rpc("prix_sejour", {
    p_chambre_id: chambreId,
    p_arrivee: dateArrivee,
    p_depart: dateDepart,
  });

  // Number() pour la même raison qu'en § 5 bis : PostgREST sérialise un entier
  // tantôt en nombre, tantôt en chaîne. `Number(null)` vaut 0 — d'où le
  // isInteger + le > 0 qui suivent, seuls garants qu'un retour vide ne devienne
  // pas « séjour à 0 € ».
  const prixTotalCents = Number(prixRpc);

  if (prixErr || !Number.isInteger(prixTotalCents) || prixTotalCents <= 0) {
    // ⚠ 22023 = la fonction a REFUSÉ la plage (départ <= arrivée, arrivée
    //   passée, séjour > 366 nuits, chambre introuvable). C'est une SAISIE, pas
    //   une panne — d'où un 400, et le message de dates DÉJÀ employé en § 2.
    //
    // ⚠ CE N'EST PAS UN CAS D'ÉCOLE : `prix_sejour` borne à 366 nuits, et
    //   AUCUNE chambre du parc ne porte de max_stay_nights (62/62 à NULL,
    //   mesuré le 25 août). Un séjour de 400 nuits franchit donc toutes les
    //   gardes du § 2 et arrive ici. C'est aussi le moyen d'exercer ce chemin
    //   de refus depuis le vrai formulaire, sans toucher à aucun droit.
    //
    // ⚠ PAS ERR_DATES_PRISES : ces dates ne sont pas prises par quelqu'un
    //   d'autre, elles sont invalides. Confondre les deux enverrait le visiteur
    //   chercher d'autres dates alors que c'est sa plage qui ne tient pas.
    const plageRefusee = prixErr?.code === "22023";
    console.error(
      `[demande-reservation] prix_sejour — demande REFUSÉE (${plageRefusee ? "plage invalide" : "échec de lecture"})`,
      {
        chambre: chambreId,
        sejour: `${dateArrivee}->${dateDepart}`,
        erreur: prixErr?.message ?? `retour inattendu (${JSON.stringify(prixRpc)})`,
      },
    );
    return plageRefusee
      ? fail(400, "Les dates de séjour sont invalides.")
      : fail(500, ERR_GENERIC);
  }

  // ─────────────────────────────────────────────────────────
  // 5. MODULE A (vitrine permanente) du château — existe + actif, ET son taux
  //    de commission négocié.
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
  // commission_pct_negociee voyage avec cette ligne : c'est EXACTEMENT le couple
  // (château × module) qui porte le taux, et la requête existait déjà pour le
  // contrôle est_actif. Le taux ne coûte donc AUCUN aller-retour supplémentaire.
  const { data: lien, error: lErr } = await supabase
    .from("chateau_modules")
    .select("id, commission_pct_negociee")
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
  // 5 bis. COMMISSION LCC — recalculée SERVEUR, comme le prix
  // ─────────────────────────────────────────────────────────
  // Même principe que le prix : le client n'a pas voix au chapitre. Le taux
  // vit en base (chateau_modules.commission_pct_negociee, numeric(5,2), un
  // taux par couple château × module) et n'est jamais exposé au front — la vue
  // chateau_modules_public existe précisément pour le cacher.
  //
  // Number() et pas une lecture directe : PostgREST sérialise numeric tantôt en
  // nombre, tantôt en chaîne selon la précision. Le passer par Number() rend le
  // calcul indifférent aux deux, et Number(null) vaut 0 — d'où le isFinite qui
  // suit, seul garant que « pas de taux » ne devienne pas « taux 0 » par
  // accident de typage.
  //
  // TAUX ABSENT = COMMISSION 0, jamais un échec. Un château sans accord négocié
  // doit pouvoir recevoir des demandes : refuser la réservation pour une
  // question de facturation punirait le visiteur d'un trou de paramétrage. Le
  // console.warn est là pour que ce trou se voie dans les logs — c'est très
  // exactement ce qui a caché la commission à 0 jusqu'ici.
  //
  // Math.round et non Math.floor : l'arrondi au centime le plus proche, et il
  // s'aligne sur le round() de Postgres (demi vers le haut pour les positifs)
  // qu'emploie le script de recalcul rétroactif — les deux chemins produisent
  // donc le MÊME centime.
  //
  // Le CHECK reservations_commission_valide (0 <= commission <= prix) est
  // satisfait par construction : le CHECK chateau_modules_commission_valide
  // borne déjà le taux à 0..100.
  const tauxPct = Number(lien.commission_pct_negociee);
  let commissionCents = 0;
  if (Number.isFinite(tauxPct) && lien.commission_pct_negociee != null) {
    commissionCents = Math.round(prixTotalCents * (tauxPct / 100));
  } else {
    console.warn(
      `[demande-reservation] commission_pct_negociee absent pour château ${chateau.id} (module A) — commission 0`,
    );
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
      commission_lcc_cents: commissionCents,
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

    // ── Lien vers l'espace membre (email client uniquement) ──
    // SITE_URL est un secret Supabase (`supabase secrets set SITE_URL=...`), au
    // même titre qu'ADMIN_EMAIL. Il n'existe AUCUN équivalent côté front : le
    // navigateur dérive tout de window.location.origin, ce qu'une Edge Function
    // n'a pas. Ne pas confondre avec SUPABASE_URL, qui est l'API.
    //
    // On ne lit PAS l'en-tête Origin de la requête : cette fonction est appelable
    // par un anonyme (verify_jwt = false), donc Origin est fourni par l'appelant.
    // Mettre une URL d'appelant dans un email que nous signons offrirait un
    // vecteur de phishing.
    //
    // Lien vers /connexion en magic link, PAS d'action_link Supabase : un
    // action_link est un credential à usage unique, et payload finit en clair
    // dans email_log. Le membre demande son lien lui-même depuis la page.
    // (?mode=magic-link est inerte tant que Connexion.jsx ne lit pas le param —
    // le compte créé par le tunnel n'ayant PAS de mot de passe, c'est bien le
    // mode magic link qu'il lui faut.)
    const siteUrl = Deno.env.get("SITE_URL");
    if (!siteUrl) console.warn("[demande-reservation] SITE_URL absent — email client sans lien vers l'espace");
    // next=/club : le bouton dit « Accéder à mon espace », il doit y mener. Sans
    // lui, /connexion → /completer-profil → "/" (la home), et la promesse du
    // bouton tombe à plat. /connexion dépose ce chemin dans lcc_auth_next, que
    // CompleterProfil consomme en fin de parcours.
    const lienEspace = siteUrl
      ? `${siteUrl.replace(/\/+$/, "")}/connexion?mode=magic-link&next=%2Fclub`
      : null;

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
        // lienEspace : le SEUL des trois gabarits à le porter. Le châtelain et
        // l'admin ont leurs propres accès, ce bloc ne s'adresse qu'au visiteur
        // dont le compte vient d'être créé sans qu'il le sache.
        params: { nomClient: nom, ...base, lienEspace },
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
