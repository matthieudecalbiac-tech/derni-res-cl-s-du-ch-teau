import { useState, useEffect } from "react";
import { getDemandesChatelain } from "../../services/chatelainService";
import { libelleStatutChatelain } from "../../utils/reservations";
import "../../styles/chatelain.css";

// Dashboard châtelain — LECTURE seule des demandes de séjour (brique 1).
// AUCUNE action (accepter/refuser = brique suivante). Modèle : AdminChateaux
// (useState data/loading/erreur, useEffect cancelled, 4 états).
// UI patrimoniale (cartes), pas de "dashboard SaaS B2B" (cf. CLAUDE.md Phase 4.2).

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// "2026-08-12" -> "12 août 2026". Parsing manuel (pas de new Date) pour éviter
// tout décalage de fuseau. Fallback : la valeur brute.
function formatJour(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "—";
  return `${Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}`;
}

function formatEuros(cents) {
  return (Math.round(cents ?? 0) / 100).toLocaleString("fr-FR") + " €";
}

export default function ChatelainDashboard() {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getDemandesChatelain()
      .then((data) => {
        if (!cancelled) setDemandes(data);
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

  return (
    <div className="che-page">
      <header className="che-tete">
        <p className="che-eyebrow">Espace châtelain</p>
        <h1 className="che-titre">Vos demandes de séjour</h1>
      </header>

      {loading && <p className="che-note">Chargement…</p>}

      {!loading && erreur && (
        <p className="che-erreur">Impossible de charger vos demandes : {erreur}</p>
      )}

      {!loading && !erreur && demandes.length === 0 && (
        <p className="che-note">Aucune demande de séjour pour le moment.</p>
      )}

      {!loading && !erreur && demandes.length > 0 && (
        <ul className="che-liste">
          {demandes.map((d) => (
            <li key={d.id} className="che-carte">
              <div className="che-carte-tete">
                <span className="che-chambre">
                  {d.chambre_nom}
                  <span className="che-chateau">{d.chateau_nom}</span>
                </span>
                <span className={"che-statut che-statut--" + d.status}>
                  {libelleStatutChatelain(d.status)}
                </span>
              </div>

              <dl className="che-faits">
                <div>
                  <dt>Séjour</dt>
                  <dd>{formatJour(d.date_arrivee)} → {formatJour(d.date_depart)}</dd>
                </div>
                <div>
                  <dt>Voyageurs</dt>
                  <dd>{d.voyageurs}</dd>
                </div>
                <div>
                  <dt>Montant</dt>
                  <dd>{formatEuros(d.prix_total_cents)}</dd>
                </div>
              </dl>

              {d.message && <blockquote className="che-message">{d.message}</blockquote>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
