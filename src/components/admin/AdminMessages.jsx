import { useState, useEffect, useCallback } from "react";
import {
  getFilsAdmin,
  getFilAdmin,
  repondreAdmin,
  marquerLuAdmin,
} from "../../services/messagesService";

// Section admin — Messages. Le côté LCC de la messagerie du Club : la table
// `messages` et ses policies existent depuis 2026-07-09, le membre écrit déjà
// via OngletMessages, mais personne ne pouvait lui répondre.
//
// Deux panneaux : la liste des fils (vue messages_fils_admin, agrégée en base)
// et le fil ouvert. Modèle AdminChateaux pour les états (useState data/loading/
// erreur + useEffect cancelled). Outil de travail : sobre et lisible prime.

function formatHorodatage(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const memeJour = d.toDateString() === new Date().toDateString();
    const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (memeJour) return heure;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) + " · " + heure;
  } catch {
    return "";
  }
}

// Le nom si on l'a, l'email sinon — l'email reste affiché en second pour
// identifier sans ambiguïté deux homonymes.
function nomAffiche(fil) {
  const n = (fil?.full_name || "").trim();
  return n || fil?.email || "Membre";
}

export default function AdminMessages() {
  const [fils, setFils] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [filActif, setFilActif] = useState(null); // ligne de messages_fils_admin
  const [messages, setMessages] = useState([]);
  const [loadingFil, setLoadingFil] = useState(false);
  const [erreurFil, setErreurFil] = useState(null);

  const [brouillon, setBrouillon] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState(null);

  // Rechargement de la liste : après un marquage lu (les compteurs bougent) et
  // après un envoi (le dernier message change). Sans ça, le panneau de gauche
  // ment jusqu'au prochain montage.
  const rechargerFils = useCallback(async () => {
    try {
      const data = await getFilsAdmin();
      setFils(data);
    } catch {
      // Le service a déjà loggé. La liste reste sur son état précédent plutôt
      // que de vider l'écran sous les yeux de l'admin.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getFilsAdmin()
      .then((data) => {
        if (!cancelled) setFils(data);
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

  // Ouverture d'un fil : on charge, puis on marque lus les messages du membre —
  // ouvrir, c'est lire (symétrique du comportement côté membre).
  useEffect(() => {
    const userId = filActif?.user_id;
    if (!userId) return;
    let cancelled = false;
    setLoadingFil(true);
    setErreurFil(null);
    setErreurEnvoi(null);

    getFilAdmin(userId)
      .then(async (data) => {
        if (cancelled) return;
        setMessages(data);
        setLoadingFil(false);
        const marques = await marquerLuAdmin(userId);
        if (!cancelled && marques > 0) await rechargerFils();
      })
      .catch((e) => {
        if (!cancelled) {
          setErreurFil(e.message || "Erreur de chargement");
          setLoadingFil(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filActif?.user_id, rechargerFils]);

  const ouvrirFil = (fil) => {
    setBrouillon("");
    setMessages([]);
    setFilActif(fil);
  };

  const handleEnvoi = async () => {
    const texte = brouillon.trim();
    if (!texte || envoi || !filActif?.user_id) return;
    setEnvoi(true);
    setErreurEnvoi(null);
    try {
      // expediteur='equipe' est posé explicitement dans le service : la policy
      // le vérifie, elle ne le devine pas à notre place.
      const envoye = await repondreAdmin(filActif.user_id, texte);
      if (envoye) {
        setMessages((m) => [...m, envoye]);
        setBrouillon("");
        await rechargerFils();
      }
    } catch {
      // Message générique : le détail brut de Postgres ne va jamais à l'écran.
      setErreurEnvoi("Le message n'a pas pu être envoyé. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  };

  const handleTouche = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnvoi();
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-tete">
        <h1 className="adm-page-titre">Messages</h1>
      </div>

      {loading && <p className="adm-page-note">Chargement…</p>}

      {!loading && erreur && (
        <p className="adm-erreur">Impossible de charger les fils : {erreur}</p>
      )}

      {!loading && !erreur && fils.length === 0 && (
        <p className="adm-page-note">Aucune conversation pour le moment.</p>
      )}

      {!loading && !erreur && fils.length > 0 && (
        <div className="adm-msgs">
          {/* PANNEAU GAUCHE — les fils */}
          <ul className="adm-fils">
            {fils.map((f) => (
              <li key={f.user_id}>
                <button
                  type="button"
                  className={
                    "adm-fil" +
                    (filActif?.user_id === f.user_id ? " adm-fil--actif" : "") +
                    (f.a_non_lus ? " adm-fil--non-lu" : "")
                  }
                  onClick={() => ouvrirFil(f)}
                >
                  <span className="adm-fil-tete">
                    <span className="adm-fil-nom">{nomAffiche(f)}</span>
                    {f.non_lus > 0 && <span className="adm-fil-pastille">{f.non_lus}</span>}
                  </span>
                  <span className="adm-fil-email">{f.email}</span>
                  <span className="adm-fil-extrait">
                    {/* Qui a parlé en dernier : sait-on si la balle est chez nous. */}
                    {f.dernier_expediteur === "equipe" && (
                      <span className="adm-fil-prefixe">Vous : </span>
                    )}
                    {f.dernier_contenu}
                  </span>
                  <span className="adm-fil-date">{formatHorodatage(f.dernier_at)}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* PANNEAU DROIT — le fil ouvert */}
          <div className="adm-conv">
            {!filActif && (
              <p className="adm-page-note adm-conv-vide">
                Choisissez une conversation pour la lire et y répondre.
              </p>
            )}

            {filActif && (
              <>
                <div className="adm-conv-tete">
                  <span className="adm-conv-nom">{nomAffiche(filActif)}</span>
                  <span className="adm-conv-email">{filActif.email}</span>
                </div>

                <div className="adm-conv-fil">
                  {loadingFil && <p className="adm-page-note">Chargement…</p>}
                  {!loadingFil && erreurFil && (
                    <p className="adm-erreur">Impossible de charger le fil : {erreurFil}</p>
                  )}
                  {!loadingFil && !erreurFil && messages.length === 0 && (
                    <p className="adm-page-note">Ce fil est vide.</p>
                  )}
                  {!loadingFil &&
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={
                          "adm-bulle adm-bulle--" +
                          (m.expediteur === "equipe" ? "equipe" : "membre")
                        }
                      >
                        <span className="adm-bulle-auteur">
                          {m.expediteur === "equipe" ? "Les Clés du Château" : nomAffiche(filActif)}
                        </span>
                        <p className="adm-bulle-contenu">{m.contenu}</p>
                        <span className="adm-bulle-heure">{formatHorodatage(m.created_at)}</span>
                      </div>
                    ))}
                </div>

                <div className="adm-conv-saisie">
                  {erreurEnvoi && <p className="adm-msg adm-msg--erreur">{erreurEnvoi}</p>}
                  <textarea
                    className="adm-textarea"
                    value={brouillon}
                    onChange={(e) => setBrouillon(e.target.value)}
                    onKeyDown={handleTouche}
                    placeholder="Votre réponse…"
                    rows={3}
                    disabled={envoi}
                  />
                  <div className="adm-conv-actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn--primary"
                      onClick={handleEnvoi}
                      disabled={!brouillon.trim() || envoi}
                    >
                      {envoi ? "Envoi…" : "Répondre"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
