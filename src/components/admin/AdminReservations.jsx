import { useState, useEffect, useMemo } from "react";
import {
  getReservationsAdmin,
  getStatsAdmin,
} from "../../services/reservationsAdminService";

// Section admin — Réservations (brique 1/2 : LECTURE + CHIFFRES, aucune action).
//
// Le tableau de bord d'exploitation : toutes les réservations, tous châteaux,
// avec le contact client — que le châtelain, lui, ne voit jamais (LCC reste
// l'intermédiaire). Deux vues en base font le travail : reservations_admin_view
// pour la liste, reservations_stats_admin pour les agrégats (PostgREST ne sait
// pas faire de GROUP BY).
//
// LECTURE SEULE, et pas par oubli : le durcissement du 23 juillet a retiré tout
// droit d'écriture directe sur reservations à `authenticated`, admin compris.
// Annuler et forcer un statut demanderont des RPC dédiées — brique 2/2.
//
// Modèle AdminMessages pour les états (data/loading/erreur + useEffect
// cancelled). Registre « relevé », pas « dashboard » : sobre, chiffré, sans
// couleur criarde (contrainte Phase 4.2 — jamais un dashboard SaaS B2B).

// Les quatre statuts de l'enum reservation_status. Un statut inconnu (ajout
// futur) s'affiche BRUT dans le tableau plutôt que de disparaître — l'écran
// montre ce qui est, il ne corrige pas la base.
const LIBELLE_STATUT = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};

const ONGLETS = [
  { id: "tous", label: "Toutes" },
  { id: "pending", label: "En attente" },
  { id: "confirmed", label: "Confirmées" },
  { id: "cancelled", label: "Annulées" },
  { id: "completed", label: "Terminées" },
];

// Même formatage que ChatelainDashboard : centimes → euros, séparateur FR.
function euros(cents) {
  return (Math.round(cents ?? 0) / 100).toLocaleString("fr-FR") + " €";
}

// "2026-08-12" → "12 août 2026". Colonne date Postgres, jamais un timestamp :
// on découpe la chaîne au lieu de la passer à Date(), qui la lirait en UTC et
// pourrait reculer d'un jour selon le fuseau du navigateur.
const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
function dateFr(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  if (!m) return "—";
  const [, a, mo, j] = m;
  return `${Number(j)} ${MOIS[Number(mo) - 1] ?? ""} ${a}`;
}

// Le séjour en une cellule. Même mois et même année → « 12 – 15 août 2026 ».
function sejour(arrivee, depart) {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(arrivee ?? ""));
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(depart ?? ""));
  if (a && d && a[1] === d[1] && a[2] === d[2]) {
    return `${Number(a[3])} – ${dateFr(depart)}`;
  }
  return `${dateFr(arrivee)} – ${dateFr(depart)}`;
}

// Le nom si on l'a, l'email sinon (même règle que AdminMessages : un compte
// créé par le tunnel peut n'avoir que full_name, ou rien du tout).
function nomClient(r) {
  return (r?.client_nom || "").trim() || r?.client_email || "Client";
}

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [ongletActif, setOngletActif] = useState("tous");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    // Les deux vues en parallèle : elles sont indépendantes, et les chiffres ne
    // dérivent PAS de la liste (les agrégats sont calculés en base, sur la
    // totalité des lignes, pas sur ce que le tableau affiche).
    Promise.all([getReservationsAdmin(), getStatsAdmin()])
      .then(([listeLignes, agregats]) => {
        if (cancelled) return;
        setReservations(listeLignes);
        setStats(agregats);
      })
      .catch((e) => {
        if (!cancelled) setErreur(e.message || "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Les chiffres, dérivés des agrégats (château × statut) en les repliant sur
  // le statut seul. La vue reste factuelle : c'est ICI que se décide ce qui
  // compte comme revenu, et le choix est de ne JAMAIS mélanger.
  //
  //   réalisé = confirmed + completed → du revenu qui existe
  //   attente = pending              → un potentiel, pas un revenu
  //   annulé  = cancelled            → ni l'un ni l'autre : un compte, sans montant
  //
  // Additionner les trois donnerait un « chiffre d'affaires » faux, et faux
  // dans le sens flatteur — c'est précisément ce que cet écran refuse d'afficher.
  //
  // On lit le statut RÉEL, sans présumer d'aucun parcours : une réservation
  // instantanée future qui naîtrait 'confirmed' sans passer par 'pending'
  // tombe dans « réalisé » sans traitement particulier.
  const chiffres = useMemo(() => {
    const parStatut = new Map();
    for (const s of stats) {
      const acc = parStatut.get(s.status) || { nb: 0, prix: 0, commission: 0 };
      acc.nb += Number(s.nb) || 0;
      acc.prix += Number(s.somme_prix_cents) || 0;
      acc.commission += Number(s.somme_commission_cents) || 0;
      parStatut.set(s.status, acc);
    }
    const vide = { nb: 0, prix: 0, commission: 0 };
    const lire = (k) => parStatut.get(k) || vide;
    const confirmees = lire("confirmed");
    const terminees = lire("completed");
    return {
      realise: {
        nb: confirmees.nb + terminees.nb,
        prix: confirmees.prix + terminees.prix,
        commission: confirmees.commission + terminees.commission,
      },
      attente: lire("pending"),
      annule: lire("cancelled"),
    };
  }, [stats]);

  const lignes = useMemo(
    () =>
      ongletActif === "tous"
        ? reservations
        : reservations.filter((r) => r.status === ongletActif),
    [reservations, ongletActif],
  );

  return (
    <div className="adm-page">
      <div className="adm-page-tete">
        <h1 className="adm-page-titre">Réservations</h1>
      </div>

      {loading && <p className="adm-page-note">Chargement…</p>}

      {!loading && erreur && (
        <p className="adm-erreur">Impossible de charger les réservations : {erreur}</p>
      )}

      {!loading && !erreur && (
        <>
          {/* ── Le relevé. Trois blocs qui ne s'additionnent pas. ── */}
          <div className="adm-stats">
            <div className="adm-stat">
              <span className="adm-stat-label">Confirmé et réalisé</span>
              <span className="adm-stat-valeur">{euros(chiffres.realise.prix)}</span>
              <span className="adm-stat-detail">
                {chiffres.realise.nb} séjour{chiffres.realise.nb > 1 ? "s" : ""}
                {" · commission "}
                {euros(chiffres.realise.commission)}
              </span>
            </div>

            <div className="adm-stat adm-stat--attente">
              <span className="adm-stat-label">En attente de réponse</span>
              <span className="adm-stat-valeur">{euros(chiffres.attente.prix)}</span>
              <span className="adm-stat-detail">
                {chiffres.attente.nb} demande{chiffres.attente.nb > 1 ? "s" : ""}
                {" · montant potentiel"}
              </span>
            </div>

            <div className="adm-stat adm-stat--annule">
              <span className="adm-stat-label">Annulé</span>
              <span className="adm-stat-valeur">{chiffres.annule.nb}</span>
              <span className="adm-stat-detail">
                séjour{chiffres.annule.nb > 1 ? "s" : ""} sans suite
              </span>
            </div>
          </div>

          {/* ── Filtre par statut ── */}
          <nav className="adm-onglets" aria-label="Filtrer par statut">
            {ONGLETS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={
                  "adm-onglet" + (ongletActif === o.id ? " adm-onglet--actif" : "")
                }
                aria-pressed={ongletActif === o.id}
                onClick={() => setOngletActif(o.id)}
              >
                {o.label}
              </button>
            ))}
          </nav>

          {lignes.length === 0 && (
            <p className="adm-page-note">
              {reservations.length === 0
                ? "Aucune réservation."
                : "Aucune réservation dans cet état."}
            </p>
          )}

          {lignes.length > 0 && (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Château</th>
                  <th>Chambre</th>
                  <th>Séjour</th>
                  <th>Voyageurs</th>
                  <th>Montant</th>
                  <th>Commission</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="adm-client-nom">{nomClient(r)}</span>
                      <span className="adm-client-email">{r.client_email}</span>
                    </td>
                    <td>{r.chateau_nom}</td>
                    <td>{r.chambre_nom}</td>
                    <td>{sejour(r.date_arrivee, r.date_depart)}</td>
                    <td>{r.voyageurs}</td>
                    <td>{euros(r.prix_total_cents)}</td>
                    <td>{euros(r.commission_lcc_cents)}</td>
                    <td>
                      <span className={"adm-badge adm-badge--" + r.status}>
                        {LIBELLE_STATUT[r.status] || r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
