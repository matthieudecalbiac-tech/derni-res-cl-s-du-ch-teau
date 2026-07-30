import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getReservationsAdmin,
  getStatsAdmin,
  annulerReservationAdmin,
  forcerStatutAdmin,
} from "../../services/reservationsAdminService";

// Section admin — Réservations (lecture + chiffres + actions).
//
// Le tableau de bord d'exploitation : toutes les réservations, tous châteaux,
// avec le contact client — que le châtelain, lui, ne voit jamais (LCC reste
// l'intermédiaire). Deux vues en base font la lecture : reservations_admin_view
// pour la liste, reservations_stats_admin pour les agrégats (PostgREST ne sait
// pas faire de GROUP BY).
//
// LES ÉCRITURES PASSENT PAR DEUX RPC, et c'est le seul chemin : le durcissement
// du 23 juillet a retiré tout droit d'UPDATE direct sur reservations à
// `authenticated`, admin compris.
//
//   annuler       → admin_annuler_reservation, un GESTE : le client reçoit un
//                   email. Bornée à pending/confirmed, parce qu'annoncer une
//                   annulation à qui a déjà dormi au château serait faux.
//   forcer statut → admin_forcer_statut, une CORRECTION : liberté totale sur la
//                   transition, aucun email.
//
// Modèle AdminMessages pour les états (data/loading/erreur + useEffect
// cancelled, rechargement après action). Registre « relevé », pas
// « dashboard » : sobre, chiffré, sans couleur criarde (contrainte Phase 4.2).

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

  // Action en cours : l'id de la réservation touchée, ou null. Sert à désactiver
  // les commandes de CETTE ligne seulement — un double-clic sur « Annuler »
  // enverrait deux fois l'email au client.
  const [actionEnCours, setActionEnCours] = useState(null);
  const [erreurAction, setErreurAction] = useState(null);
  // Réservation en attente de confirmation d'annulation (objet, pas booléen :
  // la modale a besoin du nom et des dates pour que l'admin voie ce qu'il annule).
  const [aAnnuler, setAAnnuler] = useState(null);
  const [motif, setMotif] = useState("");

  // Rechargement des DEUX sources. Après une action, les chiffres bougent
  // autant que la liste : un confirmed annulé sort du réalisé et entre dans
  // l'annulé. Ne recharger que la liste laisserait un relevé qui ment.
  const recharger = useCallback(async () => {
    // Les deux vues en parallèle : elles sont indépendantes, et les chiffres ne
    // dérivent PAS de la liste (les agrégats sont calculés en base, sur la
    // totalité des lignes, pas sur ce que le tableau affiche).
    const [listeLignes, agregats] = await Promise.all([
      getReservationsAdmin(),
      getStatsAdmin(),
    ]);
    setReservations(listeLignes);
    setStats(agregats);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    recharger()
      .catch((e) => {
        if (!cancelled) setErreur(e.message || "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recharger]);

  // Enveloppe commune aux deux actions : verrou de ligne, erreur générique,
  // rechargement. Si l'action réussit mais que le rechargement échoue, on garde
  // l'écran sur son état précédent plutôt que de le vider — l'écriture, elle,
  // a bien eu lieu. Même règle que AdminMessages.
  const executer = async (reservationId, travail) => {
    setActionEnCours(reservationId);
    setErreurAction(null);
    try {
      await travail();
      try {
        await recharger();
      } catch {
        // Le service a déjà loggé. Rien à dire à l'admin : son action a abouti.
      }
      return true;
    } catch {
      // Détail Postgres jamais à l'écran (il porte des noms de fonctions et des
      // ERRCODE). Le service l'a loggé.
      setErreurAction("L'action n'a pas pu être effectuée.");
      return false;
    } finally {
      setActionEnCours(null);
    }
  };

  const confirmerAnnulation = async () => {
    const cible = aAnnuler;
    if (!cible) return;
    const ok = await executer(cible.id, () =>
      annulerReservationAdmin(cible.id, motif),
    );
    if (ok) {
      setAAnnuler(null);
      setMotif("");
    }
  };

  // Le sélecteur renvoie toujours une valeur de l'enum. On ignore le choix
  // identique au statut courant : forcer 'confirmed' sur une confirmée
  // écrirait une ligne d'historique pour rien.
  const changerStatut = (r, cible) => {
    if (!cible || cible === r.status) return;
    executer(r.id, () => forcerStatutAdmin(r.id, cible));
  };

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

          {erreurAction && (
            <p className="adm-erreur" role="alert">{erreurAction}</p>
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
                  <th>Actions</th>
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
                    <td>
                      <div className="adm-actions">
                        {/* « Annuler » n'apparaît que là où la RPC l'accepte —
                            pending et confirmed. Sur un séjour terminé ou déjà
                            annulé, l'email serait faux ; le sélecteur ci-contre
                            fait la transition en silence si elle est nécessaire. */}
                        {(r.status === "pending" || r.status === "confirmed") && (
                          <button
                            type="button"
                            className="adm-btn-suppr"
                            disabled={actionEnCours === r.id}
                            onClick={() => {
                              setErreurAction(null);
                              setMotif("");
                              setAAnnuler(r);
                            }}
                          >
                            Annuler
                          </button>
                        )}
                        {/* Forçage : liberté totale, aucun email. La valeur
                            affichée est le statut RÉEL de la ligne — on ne
                            présume aucun parcours, y compris une réservation
                            instantanée future née 'confirmed'. */}
                        <select
                          className="adm-input adm-select-statut"
                          aria-label={`Forcer le statut — ${nomClient(r)}`}
                          value={r.status}
                          disabled={actionEnCours === r.id}
                          onChange={(e) => changerStatut(r, e.target.value)}
                        >
                          {Object.entries(LIBELLE_STATUT).map(([valeur, libelle]) => (
                            <option key={valeur} value={valeur}>{libelle}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ── Confirmation d'annulation ──────────────────────────
          Une modale et non un window.confirm : l'annulation envoie un EMAIL au
          client, elle mérite qu'on relise ce qu'on annule avant de le faire.
          Le motif est facultatif et reste EN BASE (cancellation_reason) pour le
          support — il n'entre jamais dans l'email, comme le motif d'annulation
          côté client. */}
      {aAnnuler && (
        <div
          className="adm-modal-fond"
          onClick={() => { if (!actionEnCours) setAAnnuler(null); }}
        >
          <div
            className="adm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-annul-titre"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="adm-annul-titre" className="adm-modal-titre">Annuler ce séjour</h2>
            <p className="adm-modal-texte">
              {nomClient(aAnnuler)} — {aAnnuler.chateau_nom}, {aAnnuler.chambre_nom}
              <br />
              {sejour(aAnnuler.date_arrivee, aAnnuler.date_depart)}
            </p>
            <p className="adm-modal-avert">
              Le voyageur recevra un email lui annonçant que son séjour n'aura pas
              lieu. Le château est prévenu que ses dates se libèrent.
            </p>

            <label className="adm-champ-label" htmlFor="adm-annul-motif">
              Motif (facultatif, interne)
            </label>
            <textarea
              id="adm-annul-motif"
              className="adm-textarea"
              rows={2}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              disabled={actionEnCours === aAnnuler.id}
            />
            <p className="adm-champ-aide">
              Conservé pour le support. N'apparaît pas dans l'email.
            </p>

            {erreurAction && <p className="adm-erreur" role="alert">{erreurAction}</p>}

            <div className="adm-modal-actions">
              <button
                type="button"
                className="adm-btn"
                disabled={actionEnCours === aAnnuler.id}
                onClick={() => setAAnnuler(null)}
              >
                Revenir
              </button>
              <button
                type="button"
                className="adm-btn-danger"
                disabled={actionEnCours === aAnnuler.id}
                onClick={confirmerAnnulation}
              >
                {actionEnCours === aAnnuler.id ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
