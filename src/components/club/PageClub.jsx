import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getEspaceClub } from "../../services/clubService.js";
import "../../styles/club.css";

// Avatar monogramme (initiales) tant qu'on n'a pas d'upload photo.
function initiales(profile) {
  const f = (profile?.first_name || "").trim();
  const l = (profile?.last_name || "").trim();
  if (f || l) return ((f[0] || "") + (l[0] || "")).toUpperCase();
  const fn = (profile?.full_name || "").trim();
  if (fn) {
    const parts = fn.split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  }
  return (profile?.email?.[0] || "?").toUpperCase();
}

function nomAffiche(profile) {
  const f = (profile?.first_name || "").trim();
  const l = (profile?.last_name || "").trim();
  if (f || l) return `${f} ${l}`.trim();
  return profile?.full_name || profile?.email || "Membre";
}

const ONGLETS = [
  { id: "dashboard", label: "Club des Chatelains" },
  { id: "reservations", label: "Mes reservations" },
  { id: "sejours", label: "Mes sejours" },
  { id: "messages", label: "Messages" },
  { id: "avantages", label: "Mes avantages" },
  { id: "infos", label: "Informations personnelles" },
  { id: "preferences", label: "Preferences" },
];

export default function PageClub() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [ongletActif, setOngletActif] = useState("dashboard");
  const [espace, setEspace] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let annule = false;
    setChargement(true);
    getEspaceClub(user.id)
      .then((data) => { if (!annule) { setEspace(data); setChargement(false); } })
      .catch((e) => { if (!annule) { setErreur(e); setChargement(false); } });
    return () => { annule = true; };
  }, [user?.id]);

  const handleDeconnexion = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="club">
      {/* SIDEBAR */}
      <aside className="club-sidebar">
        <button className="club-logo" onClick={() => navigate("/")} aria-label="Retour a l'accueil">
          <span className="club-logo-nom">Les Cles du Chateau</span>
          <span className="club-logo-sub">Sejours d'exception</span>
        </button>

        <nav className="club-nav">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              className={"club-nav-item " + (ongletActif === o.id ? "actif" : "")}
              onClick={() => setOngletActif(o.id)}
            >
              {o.label}
            </button>
          ))}
        </nav>

        <div className="club-sidebar-bas">
          <div className="club-membre">
            <div className="club-avatar">{initiales(profile)}</div>
            <span className="club-membre-nom">{nomAffiche(profile)}</span>
          </div>
          <button className="club-deconnexion" onClick={handleDeconnexion}>
            Se deconnecter
          </button>
        </div>
      </aside>

      {/* CONTENU */}
      <main className="club-contenu">
        <header className="club-entete">
          <h1 className="club-titre">Club des Chatelains</h1>
          <p className="club-sous-titre">Votre espace privilegie au sein des Cles du Chateau.</p>
        </header>

        {chargement && <div className="club-etat">Chargement de votre espace...</div>}
        {erreur && <div className="club-etat club-etat--erreur">Une erreur est survenue.</div>}

        {!chargement && !erreur && espace && (
          <div className="club-panneau">
            {ongletActif === "dashboard" && (
              <div className="club-placeholder-onglet">
                Tableau de bord — palier {espace.palierActuel?.nom}, {espace.nbSejours} sejour(s) confirme(s).
                <br />(contenu detaille a venir)
              </div>
            )}
            {ongletActif === "reservations" && <div className="club-placeholder-onglet">Mes reservations a venir (a construire)</div>}
            {ongletActif === "sejours" && <div className="club-placeholder-onglet">Mes sejours passes (a construire)</div>}
            {ongletActif === "messages" && <div className="club-placeholder-onglet">Messagerie (a construire)</div>}
            {ongletActif === "avantages" && <div className="club-placeholder-onglet">Mes avantages (a construire)</div>}
            {ongletActif === "infos" && <div className="club-placeholder-onglet">Informations personnelles (a construire)</div>}
            {ongletActif === "preferences" && <div className="club-placeholder-onglet">Preferences (a definir)</div>}
          </div>
        )}
      </main>
    </div>
  );
}
