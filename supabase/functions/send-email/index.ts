// ============================================================
// Edge Function "send-email" — traite la FILE email_log (modèle b).
//
// RÔLE : lire les lignes email_log à envoyer, rendre le HTML depuis
// (type + payload.params), poster à Brevo, et tracer le résultat sur la ligne
// (statut / brevo_message_id / derniere_erreur / tentatives). Elle NE calcule
// PAS les destinataires : ils sont déjà dans email_log.destinataire (écrits par
// demande-reservation à la brique suivante). Ici on ne fait que du rendu +
// transport + reprise.
//
// BARRIÈRE (seule protection) : header X-Internal-Secret == secret Supabase
// INTERNAL_FUNCTION_SECRET. Sans lui : 401, rien n'est traité. send-email n'est
// JAMAIS appelable par un visiteur. Le JWT ne discrimine rien (l'anon key est
// publique) → verify_jwt = false (config.toml), on fait le contrôle nous-mêmes.
//
// SERVICE_ROLE : la fonction tourne en service_role (comme demande-reservation).
// GRANTs email_log = SELECT/INSERT/UPDATE pour service_role (migration
// 2026-07-18-email-infra.sql). Pas de DELETE (un log ne s'efface pas).
//
// ── FILE / REPRISE ────────────────────────────────────────────
// SELECT email_log WHERE statut != 'envoye' AND tentatives < 5
//                  [AND reservation_id = reservationId si fourni].
//   • != 'envoye'  → reprend en_attente (jamais tenté) ET echoue (transitoire).
//                    Aligné sur l'index partiel idx_email_log_a_renvoyer.
//                    (NB : élargi depuis "= en_attente" du brief pour que les
//                     lignes passées à 'echoue' en cas d'échec transitoire soient
//                     réellement rejouées — sinon la reprise serait lettre morte.)
//   • tentatives < 5 → borne l'acharnement. Au-delà, la ligne reste 'echoue' mais
//                      n'est plus reprise (pas de statut "abandonné" dans l'enum ;
//                      statut IN en_attente/envoye/echoue).
//
// ── MAPPING BREVO ─────────────────────────────────────────────
//   • 201            → statut='envoye', brevo_message_id=messageId, tentatives++.
//   • 4xx sauf 429   → statut='echoue', derniere_erreur, tentatives++ (définitif).
//   • 429 / 5xx / net→ statut='echoue', derniere_erreur, tentatives++ (transitoire,
//                      rejoué au prochain appel tant que tentatives < 5).
//   (429 et 4xx-définitif finissent tous en 'echoue' : la seule différence est que
//    le second est peu susceptible de réussir en rejouant — la borne tentatives<5
//    le neutralise de toute façon.)
//
// ── RÉPONSE ───────────────────────────────────────────────────
// { ok, traites, envoyes, echoues } — AUCUN email en clair (pas de fuite).
//
// ══════════════════════════════════════════════════════════════
// FORME EXACTE de payload.params attendue par chaque gabarit (email_log.type).
// Pour tester à la main : insérer une ligne email_log avec le bon `type`, un
// `destinataire`, et un `payload` = { "sujet": "...", "params": { ... } }.
//
//   type = 'demande_client'   (email AU visiteur — rassurant)
//     params: {
//       nomClient:      string   // salutation ("Bonjour <nomClient>,")
//       chateau:        string   // NOM DU CHÂTEAU UNIQUEMENT — jamais le nom des
//                                //   propriétaires (règle éditoriale, non négociable)
//       dateArrivee:    "YYYY-MM-DD"
//       dateDepart:     "YYYY-MM-DD"
//       voyageurs:      number
//       prixTotalEuros?: number  // optionnel, affiché discrètement ("montant estimé")
//     }
//
//   type = 'demande_chatelain'  (email de TRAVAIL au châtelain)
//     params: {
//       chateau:        string
//       nomClient:      string   // pour que le château sache qui répondre
//       emailClient:    string   // pour répondre au visiteur
//       dateArrivee:    "YYYY-MM-DD"
//       dateDepart:     "YYYY-MM-DD"
//       voyageurs:      number
//       message:        string | null  // message libre du visiteur (peut être null)
//       prixTotalEuros: number
//     }
//
//   type = 'demande_admin'  (supervision, tout en clair pour Matthieu)
//     params: {
//       chateau:        string
//       nomClient:      string
//       emailClient:    string
//       dateArrivee:    "YYYY-MM-DD"
//       dateDepart:     "YYYY-MM-DD"
//       voyageurs:      number
//       message:        string | null
//       prixTotalEuros: number
//     }
//
// Toutes les valeurs texte issues des params sont échappées (escapeHtml) avant
// insertion dans le HTML — le `message` du visiteur est du texte non fiable.
// ══════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";

const TENTATIVES_MAX = 5; // au-delà, on ne rejoue plus (borne d'acharnement)

// Expéditeur vérifié Brevo (non négociable ici).
const SENDER = { name: "Les Clés du Château", email: "matthieu.de.calbiac@gmail.com" };

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Utilitaires de rendu ──────────────────────────────────────
function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// "2026-08-12" → "12 août 2026". Renvoie la valeur brute si non parsable.
function dateFr(iso: unknown): string {
  const s = String(iso ?? "");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return escapeHtml(s);
  const [, y, mo, d] = m;
  const mi = Number(mo) - 1;
  if (mi < 0 || mi > 11) return escapeHtml(s);
  return `${Number(d)} ${MOIS_FR[mi]} ${y}`;
}

function euros(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${Math.round(v)} €`;
  }
}

// ── Enveloppe patrimoniale commune ────────────────────────────
// Sobre, sérif, palette LCC. Pas d'emoji. Pas de logo Fondation. Le pied de page
// évoque le reversement SANS pourcentage ("une partie de nos recettes") et ne
// nomme pas la Fondation (dont le partenariat reste en cours de discussions).
function enveloppe(titre: string, corps: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F2E8;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Georgia,'Times New Roman',serif;color:#07101E;">
    <div style="text-align:center;letter-spacing:0.14em;text-transform:uppercase;font-size:13px;color:#C09840;">Les Clés du Château</div>
    <hr style="border:none;border-top:1px solid #C09840;opacity:0.4;margin:20px 0 28px;">
    <h1 style="font-size:22px;font-weight:normal;line-height:1.3;margin:0 0 20px;color:#07101E;">${titre}</h1>
    ${corps}
    <hr style="border:none;border-top:1px solid #C09840;opacity:0.3;margin:32px 0 16px;">
    <p style="font-size:12px;line-height:1.6;color:#5a5a5a;margin:0;">
      Une partie de nos recettes est reversée à la préservation du patrimoine.
    </p>
  </div>
</body></html>`;
}

function ligneFait(label: string, valeur: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:14px;color:#5a5a5a;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;font-size:15px;color:#07101E;">${valeur}</td>
  </tr>`;
}

function tableFaits(rows: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0;">${rows}</table>`;
}

// ── Gabarits par type ─────────────────────────────────────────
type Params = Record<string, unknown>;

function gabaritClient(p: Params): string {
  const sejour = tableFaits(
    ligneFait("Château", escapeHtml(p.chateau)) +
    ligneFait("Arrivée", dateFr(p.dateArrivee)) +
    ligneFait("Départ", dateFr(p.dateDepart)) +
    ligneFait("Voyageurs", escapeHtml(p.voyageurs)),
  );
  const prix = p.prixTotalEuros != null && euros(p.prixTotalEuros)
    ? `<p style="font-size:14px;line-height:1.7;color:#5a5a5a;margin:16px 0 0;">Montant estimé du séjour : ${euros(p.prixTotalEuros)}.</p>`
    : "";
  const corps = `
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Bonjour ${escapeHtml(p.nomClient)},</p>
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
      Votre demande de séjour est bien reçue. Le château en est informé et reviendra
      vers vous pour la suite. Vous n'avez rien d'autre à faire pour l'instant.
    </p>
    <p style="font-size:15px;line-height:1.7;margin:0 0 8px;color:#5a5a5a;">Récapitulatif de votre demande :</p>
    ${sejour}
    ${prix}
    <p style="font-size:15px;line-height:1.7;margin:20px 0 0;">Avec toute notre attention.</p>`;
  return enveloppe("Votre demande est bien reçue", corps);
}

function gabaritChatelain(p: Params): string {
  const message = p.message != null && String(p.message).trim() !== ""
    ? `<p style="font-size:15px;line-height:1.7;margin:20px 0 8px;color:#5a5a5a;">Message du visiteur :</p>
       <blockquote style="margin:0;padding:12px 16px;border-left:2px solid #C09840;background:#F7F2E8;font-size:15px;line-height:1.7;color:#07101E;">${escapeHtml(p.message)}</blockquote>`
    : "";
  const faits = tableFaits(
    ligneFait("Château", escapeHtml(p.chateau)) +
    ligneFait("Visiteur", escapeHtml(p.nomClient)) +
    ligneFait("Contact", escapeHtml(p.emailClient)) +
    ligneFait("Arrivée", dateFr(p.dateArrivee)) +
    ligneFait("Départ", dateFr(p.dateDepart)) +
    ligneFait("Voyageurs", escapeHtml(p.voyageurs)) +
    ligneFait("Montant", euros(p.prixTotalEuros) || "—"),
  );
  const corps = `
    <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Vous avez reçu une nouvelle demande de séjour.</p>
    ${faits}
    ${message}
    <p style="font-size:15px;line-height:1.7;margin:20px 0 0;color:#5a5a5a;">
      Vous pouvez répondre directement au visiteur à l'adresse indiquée ci-dessus.
    </p>`;
  return enveloppe("Nouvelle demande de séjour", corps);
}

function gabaritAdmin(p: Params): string {
  const faits = tableFaits(
    ligneFait("Château", escapeHtml(p.chateau)) +
    ligneFait("Visiteur", escapeHtml(p.nomClient)) +
    ligneFait("Email", escapeHtml(p.emailClient)) +
    ligneFait("Arrivée", dateFr(p.dateArrivee)) +
    ligneFait("Départ", dateFr(p.dateDepart)) +
    ligneFait("Voyageurs", escapeHtml(p.voyageurs)) +
    ligneFait("Montant", euros(p.prixTotalEuros) || "—"),
  );
  const message = p.message != null && String(p.message).trim() !== ""
    ? `<p style="font-size:14px;line-height:1.6;margin:16px 0 6px;color:#5a5a5a;">Message :</p>
       <blockquote style="margin:0;padding:10px 14px;border-left:2px solid #C09840;background:#F7F2E8;font-size:14px;line-height:1.6;">${escapeHtml(p.message)}</blockquote>`
    : "";
  const corps = `
    <p style="font-size:15px;line-height:1.7;margin:0 0 12px;">Supervision — nouvelle demande enregistrée.</p>
    ${faits}
    ${message}`;
  return enveloppe("Nouvelle demande (supervision)", corps);
}

const GABARITS: Record<string, (p: Params) => string> = {
  demande_client: gabaritClient,
  demande_chatelain: gabaritChatelain,
  demande_admin: gabaritAdmin,
};

// ══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  // ── 1. BARRIÈRE X-Internal-Secret (avant tout : lecture, DB, Brevo) ──
  const expected = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!expected) {
    // Misconfiguration serveur : le secret n'est pas posé. On ne traite rien et
    // on ne laisse pas passer non plus (500, pas 401 : ce n'est pas l'appelant).
    console.error("[send-email] INTERNAL_FUNCTION_SECRET absent de l'environnement");
    return json(500, { ok: false, error: "server_misconfigured" });
  }
  const provided = req.headers.get("X-Internal-Secret");
  if (!provided || provided !== expected) {
    console.warn("[send-email] appel rejeté : X-Internal-Secret absent ou invalide");
    return json(401, { ok: false, error: "unauthorized" });
  }

  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoKey) {
    console.error("[send-email] BREVO_API_KEY absent de l'environnement");
    return json(500, { ok: false, error: "server_misconfigured" });
  }

  // ── Body optionnel : { reservationId } ──
  let reservationId: string | undefined;
  try {
    const body = await req.json();
    if (body && typeof body === "object" && body.reservationId != null) {
      reservationId = String(body.reservationId).trim() || undefined;
    }
  } catch {
    // Body absent/non-JSON : toléré → on traite toute la file (cas balayage).
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // ── 2. Lire la file (en_attente + echoue, sous la borne tentatives) ──
  let q = supabase
    .from("email_log")
    .select("id, destinataire, type, payload, tentatives")
    .neq("statut", "envoye")
    .lt("tentatives", TENTATIVES_MAX);
  if (reservationId) q = q.eq("reservation_id", reservationId);

  const { data: lignes, error: selErr } = await q;
  if (selErr) {
    console.error("[send-email] SELECT email_log:", selErr.message);
    return json(500, { ok: false, error: "db_error" });
  }

  let traites = 0;
  let envoyes = 0;
  let echoues = 0;

  // ── 3. Traiter chaque ligne : rendre → poster → tracer ──
  for (const ligne of lignes ?? []) {
    traites++;

    // Échec (statut='echoue') centralisé : trace derniere_erreur + tentatives++.
    const marquerEchoue = async (raison: string) => {
      echoues++;
      const { error: upErr } = await supabase
        .from("email_log")
        .update({
          statut: "echoue",
          derniere_erreur: raison.slice(0, 500),
          tentatives: (ligne.tentatives ?? 0) + 1,
        })
        .eq("id", ligne.id);
      if (upErr) console.error(`[send-email] UPDATE echoue id=${ligne.id}:`, upErr.message);
    };

    // Rendu HTML depuis type + payload.params. Type inconnu / payload malformé =
    // échec définitif (inutile d'appeler Brevo).
    const gabarit = GABARITS[ligne.type as string];
    if (!gabarit) {
      await marquerEchoue(`type inconnu: ${ligne.type}`);
      continue;
    }
    const payload = (ligne.payload ?? {}) as { sujet?: unknown; params?: Params };
    const params = (payload.params ?? {}) as Params;
    const sujet = payload.sujet != null && String(payload.sujet).trim() !== ""
      ? String(payload.sujet)
      : "Les Clés du Château";

    let htmlContent: string;
    try {
      htmlContent = gabarit(params);
    } catch (e) {
      await marquerEchoue(`rendu gabarit: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    // POST Brevo.
    let resp: Response;
    try {
      resp = await fetch(BREVO_URL, {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          sender: SENDER,
          to: [{ email: ligne.destinataire }],
          subject: sujet,
          htmlContent,
        }),
      });
    } catch (e) {
      // Erreur réseau = transitoire → echoue (rejoué tant que tentatives < 5).
      await marquerEchoue(`réseau: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    if (resp.status === 201) {
      let messageId: string | null = null;
      try {
        const data = await resp.json();
        messageId = data?.messageId ?? null;
      } catch {
        // 201 sans corps JSON exploitable : on considère l'envoi réussi quand même.
      }
      const { error: upErr } = await supabase
        .from("email_log")
        .update({
          statut: "envoye",
          brevo_message_id: messageId,
          tentatives: (ligne.tentatives ?? 0) + 1,
        })
        .eq("id", ligne.id);
      if (upErr) {
        console.error(`[send-email] UPDATE envoye id=${ligne.id}:`, upErr.message);
      }
      envoyes++;
      continue;
    }

    // Échec : lire le corps d'erreur Brevo (code + message), sans le divulguer au client.
    let detail = `HTTP ${resp.status}`;
    try {
      const err = await resp.json();
      if (err?.code || err?.message) detail = `HTTP ${resp.status} ${err.code ?? ""} ${err.message ?? ""}`.trim();
    } catch {
      // pas de corps JSON
    }
    // 4xx sauf 429 = définitif ; 429 / 5xx = transitoire. Dans les deux cas :
    // statut='echoue' + tentatives++ (la borne tentatives<5 neutralise le définitif).
    console.warn(`[send-email] Brevo échec id=${ligne.id} type=${ligne.type}: ${detail}`);
    await marquerEchoue(detail);
  }

  // ── 4. Résumé sans fuite (aucun email en clair) ──
  return json(200, { ok: true, traites, envoyes, echoues });
});
