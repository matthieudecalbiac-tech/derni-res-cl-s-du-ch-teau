import { useState, useEffect, useRef } from "react";
import Modale from "../Modale";
import {
  getDemandesChatelain,
  repondreDemande,
  ERR_DEJA_TRAITEE,
} from "../../services/chatelainService";
import { libelleStatutChatelain } from "../../utils/reservations";
import "../../styles/chatelain.css";

// Dashboard châtelain — lecture des demandes de séjour + réponse du châtelain
// (accepter / refuser) via la RPC repondre_demande. Modèle : AdminChateaux
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

  // Sous-états de l'action "répondre".
  const [confirmation, setConfirmation] = useState(null); // { id, decision } | null
  const [traitement, setTraitement] = useState(false);    // appel RPC en vol
  const [actionErreur, setActionErreur] = useState(null); // échec générique, DANS la modale
  const [avis, setAvis] = useState(null);                 // information, au-dessus de la liste

  // Toujours monté ? Garde les setState d'après-await sans annuler l'appel en
  // vol (on ne veut pas perdre une réponse déjà écrite en base). Repassé à true
  // à chaque montage : StrictMode démonte/remonte une fois en dev.
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

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

  // Re-lecture de la liste après une action : c'est la BASE qui dicte le statut
  // affiché, jamais une mutation locale optimiste.
  async function rafraichir() {
    try {
      const data = await getDemandesChatelain();
      if (monte.current) setDemandes(data);
    } catch {
      // Le service a déjà loggé. On garde l'avis le plus précis s'il y en a un.
      if (monte.current) {
        setAvis((precedent) => precedent ?? "La liste n'a pas pu être rafraîchie. Rechargez la page.");
      }
    }
  }

  function ouvrirConfirmation(id, decision) {
    setAvis(null);
    setActionErreur(null);
    setConfirmation({ id, decision });
  }

  // Fermeture de la modale : reset de TOUS ses sous-états (convention projet).
  // Ignorée tant qu'un appel est en vol -> `traitement` est nécessairement false
  // ici, et c'est le finally de confirmer() qui le repasse à false.
  function fermerConfirmation() {
    if (traitement) return;
    setConfirmation(null);
    setActionErreur(null);
  }

  async function confirmer() {
    if (!confirmation) return;
    setTraitement(true);
    setActionErreur(null);
    try {
      await repondreDemande(confirmation.id, confirmation.decision);

      // Succès : le statut est écrit en base. On referme et on relit — la carte
      // quitte "En attente" pour "Confirmée"/"Refusée" et ses deux boutons
      // disparaissent (ils ne s'affichent que sur pending).
      //
      // ⚠ L'EMAIL N'EST PAS PARTI. La RPC a écrit une ligne email_log
      // 'en_attente' (outbox) dans la même transaction que le statut, mais rien
      // ne draine cette file aujourd'hui : le balayage pg_cron de send-email est
      // la brique suivante. Le statut change à l'écran tout de suite ; le mail
      // au voyageur partira au prochain drain. On ne nudge PAS send-email depuis
      // le front : l'appeler demande le secret de la fonction, et un secret posé
      // dans le navigateur est un secret publié. C'est au serveur de drainer.
      if (monte.current) setConfirmation(null);
      await rafraichir();
    } catch (e) {
      if (!monte.current) return;
      if (e?.code === ERR_DEJA_TRAITEE) {
        // Deux onglets ouverts, ou un co-propriétaire a répondu avant : ce n'est
        // pas une panne. On referme, on le dit en clair, et on relit la base.
        setConfirmation(null);
        setAvis("Cette demande a déjà été traitée.");
        await rafraichir();
      } else {
        // Message générique : le détail brut de la RPC (SQL, ERRCODE, ids) ne
        // remonte jamais à l'écran. La modale reste ouverte pour réessayer.
        setActionErreur("Votre réponse n'a pas pu être enregistrée. Réessayez dans un instant.");
      }
    } finally {
      if (monte.current) setTraitement(false);
    }
  }

  return (
    <div className="che-page">
      <header className="che-tete">
        <p className="che-eyebrow">Espace châtelain</p>
        <h1 className="che-titre">Vos demandes de séjour</h1>
      </header>

      {avis && <p className="che-avis">{avis}</p>}

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

              {/* Répondre n'a de sens que sur une demande en attente : la RPC
                  refuse tout autre statut, l'UI ne propose donc rien d'autre. */}
              {d.status === "pending" && (
                <div className="che-actions">
                  <button
                    type="button"
                    className="che-btn"
                    onClick={() => ouvrirConfirmation(d.id, "refuser")}
                    disabled={traitement}
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    className="che-btn che-btn--primaire"
                    onClick={() => ouvrirConfirmation(d.id, "accepter")}
                    disabled={traitement}
                  >
                    Accepter
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Décision actée : on la fait confirmer avant d'écrire quoi que ce soit. */}
      <Modale
        ouvert={confirmation !== null}
        onClose={fermerConfirmation}
        largeur={420}
      >
        <div className="che-confirm">
          <p className="che-confirm-texte">
            {confirmation?.decision === "accepter"
              ? "Confirmer ce séjour ? Le voyageur en sera informé."
              : "Refuser cette demande ? Le voyageur en sera informé."}
          </p>

          {actionErreur && <p className="che-erreur">{actionErreur}</p>}

          <div className="che-confirm-actions">
            <button
              type="button"
              className="che-btn"
              onClick={fermerConfirmation}
              disabled={traitement}
            >
              Annuler
            </button>
            <button
              type="button"
              className="che-btn che-btn--primaire"
              onClick={confirmer}
              disabled={traitement}
            >
              {traitement ? "Traitement…" : "Confirmer"}
            </button>
          </div>
        </div>
      </Modale>
    </div>
  );
}
