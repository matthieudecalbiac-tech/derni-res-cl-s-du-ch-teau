import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getEspaceClub } from "../../services/clubService.js";
import { compterNonLus } from "../../services/messagesService.js";
import DashboardClub from "./DashboardClub";
import OngletOffresClub from "./OngletOffresClub";
import OngletAvantages from "./OngletAvantages";
import OngletSejours from "./OngletSejours";
import OngletInfos from "./OngletInfos";
import BienvenueClub from "./BienvenueClub";
import OngletMessages from "./OngletMessages";
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
  { id: "dashboard", label: "Club des Châtelains" },
  { id: "offres", label: "Offres du Club" },
  { id: "reservations", label: "Mes réservations" },
  { id: "sejours", label: "Mes séjours" },
  { id: "messages", label: "Messages" },
  { id: "avantages", label: "Mes avantages" },
  { id: "infos", label: "Informations personnelles" },
  { id: "preferences", label: "Préférences" },
];

export default function PageClub() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [ongletActif, setOngletActif] = useState("dashboard");
  const [espace, setEspace] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [nonLus, setNonLus] = useState(0);

  // Bienvenue : une fois par session, et seulement quand le prenom est connu.
  // prefers-reduced-motion : on ne joue pas l'animation du tout.
  const [bienvenue, setBienvenue] = useState(false);
  const [bienvenueEvaluee, setBienvenueEvaluee] = useState(false);

  useEffect(() => {
    if (bienvenueEvaluee) return;
    const prenom = profile?.first_name?.trim();
    if (!prenom) return;   // on attend que le profil arrive (null au premier rendu)

    setBienvenueEvaluee(true);

    const dejaVue = sessionStorage.getItem("lcc_club_bienvenue") === "1";
    const motionReduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (dejaVue || motionReduit) return;

    setBienvenue(true);
  }, [profile?.first_name, bienvenueEvaluee]);

  useEffect(() => {
    if (!user?.id) return;
    let annule = false;
    setChargement(true);
    getEspaceClub(user.id)
      .then((data) => { if (!annule) { setEspace(data); setChargement(false); } })
      .catch((e) => { if (!annule) { setErreur(e); setChargement(false); } });
    return () => { annule = true; };
  }, [user?.id]);

  // Le compteur de messages non lus, charge une fois. Il ne se rafraichit pas
  // au changement d'onglet : seule l'ouverture de Messages le remet a zero.
  useEffect(() => {
    if (!user?.id) return;
    let annule = false;
    compterNonLus(user.id)
      .then((n) => { if (!annule) setNonLus(n); })
      .catch(() => { /* une pastille absente vaut mieux qu'une erreur */ });
    return () => { annule = true; };
  }, [user?.id]);

  const handleDeconnexion = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      {bienvenue && (
        <BienvenueClub
          prenom={profile?.first_name}
          onTermine={() => {
            // Le drapeau marque "vue", pas "evaluee" : une visite qui ne joue pas
            // l'animation (motion reduit, profil incomplet) ne la consomme pas.
            sessionStorage.setItem("lcc_club_bienvenue", "1");
            setBienvenue(false);
          }}
        />
      )}
      <div className="club">
      {/* SIDEBAR */}
      <aside className="club-sidebar">
        <button className="club-logo" onClick={() => navigate("/")} aria-label="Retour a l'accueil">
          <span className="club-logo-nom">Les Clés du Château</span>
          <span className="club-logo-sub">Séjours d'exception</span>
        </button>

        <nav className="club-nav">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              className={"club-nav-item " + (ongletActif === o.id ? "actif" : "")}
              onClick={() => setOngletActif(o.id)}
            >
              <span>{o.label}</span>
              {o.id === "messages" && nonLus > 0 && (
                <span className="club-pastille" aria-label={`${nonLus} message${nonLus > 1 ? "s" : ""} non lu${nonLus > 1 ? "s" : ""}`}>
                  {nonLus}
                </span>
              )}
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
          <h1 className="club-titre">Club des Châtelains</h1>
          <p className="club-sous-titre">Votre espace privilégié au sein des Clés du Château.</p>
        </header>

        {chargement && <div className="club-etat">Chargement de votre espace...</div>}
        {erreur && <div className="club-etat club-etat--erreur">Une erreur est survenue.</div>}

        {!chargement && !erreur && espace && (
          <div className="club-panneau">
            {ongletActif === "dashboard" && (
              <DashboardClub espace={espace} profile={profile} />
            )}
            {ongletActif === "offres" && <OngletOffresClub />}
            {ongletActif === "reservations" && (
              <OngletSejours
                mode="avenir"
                reservations={(espace.reservations || []).filter((r) => r.date_depart >= new Date().toISOString().slice(0,10)).sort((a,b) => a.date_arrivee.localeCompare(b.date_arrivee))}
              />
            )}
            {ongletActif === "sejours" && (
              <OngletSejours
                mode="passes"
                reservations={(espace.reservations || []).filter((r) => r.date_depart < new Date().toISOString().slice(0,10)).sort((a,b) => b.date_arrivee.localeCompare(a.date_arrivee))}
              />
            )}
            {ongletActif === "messages" && (
              <OngletMessages userId={user?.id} onLu={() => setNonLus(0)} />
            )}
            {ongletActif === "avantages" && <OngletAvantages espace={espace} />}
            {ongletActif === "infos" && <OngletInfos profile={profile} user={user} />}
            {ongletActif === "preferences" && <div className="club-placeholder-onglet">Préférences (a definir)</div>}
          </div>
        )}
      </main>
      </div>
    </>
  );
}
