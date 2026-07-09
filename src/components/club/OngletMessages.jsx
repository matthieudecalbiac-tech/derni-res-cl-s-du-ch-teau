import { useEffect, useRef, useState } from "react";
import { getFil, envoyerMessage, marquerLu } from "../../services/messagesService.js";

function formatHorodatage(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const aujourdhui = new Date();
    const memeJour = d.toDateString() === aujourdhui.toDateString();
    const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (memeJour) return heure;
    const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    return `${date} à ${heure}`;
  } catch {
    return "";
  }
}

export default function OngletMessages({ userId, onLu }) {
  const [fil, setFil] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [brouillon, setBrouillon] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const basDuFil = useRef(null);

  // Charge le fil, puis marque lus les messages de l'equipe : ouvrir
  // l'onglet, c'est lire.
  useEffect(() => {
    if (!userId) return;
    let annule = false;

    getFil(userId)
      .then(async (messages) => {
        if (annule) return;
        setFil(messages);
        setChargement(false);
        const marques = await marquerLu(userId);
        if (marques > 0) onLu?.();
      })
      .catch(() => { if (!annule) { setErreur(true); setChargement(false); } });

    return () => { annule = true; };
  }, [userId, onLu]);

  // Le fil se lit par le bas.
  useEffect(() => {
    basDuFil.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [fil.length]);

  const handleEnvoi = async () => {
    const texte = brouillon.trim();
    if (!texte || envoi) return;
    setEnvoi(true);
    try {
      const envoye = await envoyerMessage(userId, texte);
      if (envoye) {
        setFil((f) => [...f, envoye]);
        setBrouillon("");
      }
    } catch {
      setErreur(true);
    } finally {
      setEnvoi(false);
    }
  };

  const handleTouche = (e) => {
    // Entrée envoie, Maj+Entrée passe à la ligne.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnvoi();
    }
  };

  return (
    <div className="msg">
      <header className="msg-entete">
        <h2 className="msg-titre">Messages</h2>
        <p className="msg-sous">Votre conversation avec l'équipe des Clés du Château.</p>
      </header>

      <div className="msg-fil">
        {chargement && <p className="msg-etat">Chargement de votre conversation…</p>}
        {erreur && <p className="msg-etat msg-etat--erreur">Un problème est survenu.</p>}

        {!chargement && !erreur && fil.length === 0 && (
          <div className="msg-vide">
            <p>Votre conversation avec l'équipe commence ici.</p>
          </div>
        )}

        {!chargement && fil.map((m) => (
          <div
            key={m.id}
            className={"msg-bulle msg-bulle--" + (m.expediteur === "membre" ? "membre" : "equipe")}
          >
            {m.expediteur === "equipe" && (
              <span className="msg-auteur">Les Clés du Château</span>
            )}
            <p className="msg-contenu">{m.contenu}</p>
            <span className="msg-heure">{formatHorodatage(m.created_at)}</span>
          </div>
        ))}
        <div ref={basDuFil} />
      </div>

      <div className="msg-saisie">
        <textarea
          className="msg-champ"
          value={brouillon}
          onChange={(e) => setBrouillon(e.target.value)}
          onKeyDown={handleTouche}
          placeholder="Écrivez votre message…"
          rows={2}
          disabled={envoi}
        />
        <button
          className="msg-envoyer"
          onClick={handleEnvoi}
          disabled={!brouillon.trim() || envoi}
        >
          {envoi ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
