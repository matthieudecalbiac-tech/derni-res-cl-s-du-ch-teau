import { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import BandeauOffres from "./components/BandeauOffres";
import BarreRecherche from "./components/BarreRecherche";
import ToggleCarteListe from "./components/ToggleCarteListe";
import PastillesInspiration from "./components/PastillesInspiration";
import "./styles/accueil.css";
import "./styles/route-catalogue.css";
import UneDeLaSemaine from "./components/UneDeLaSemaine";
import HeureAuxDemeures from "./components/HeureAuxDemeures";
import BanniereApp from "./components/BanniereApp";
import PiedPatrimoine from "./components/PiedPatrimoine";
import Conciergerie from "./components/Services";
import VitrineChateau from "./components/VitrineChateau";
import APropos from "./components/APropos";
import VitrinePermanente from "./components/VitrinePermanente";
import DernieresCles from "./components/DernieresCles";
import { useRetour } from "./components/BoutonRetour";
import TransitionPorte from "./components/TransitionPorte";
import PartenairesChateaux from "./components/PartenairesChateaux";

// Sprint S2-α.1 — routing react-router pour les nouveaux écrans transactionnels
// (pattern strangler fig : les overlays historiques restent inchangés).
import RequireAuth from "./components/auth/RequireAuth";
import RequireRole from "./components/auth/RequireRole";
import BookingFlowPlaceholder from "./components/placeholders/BookingFlowPlaceholder";
import BookingConfirmationPlaceholder from "./components/placeholders/BookingConfirmationPlaceholder";
import ChatelainDashboard from "./components/chatelain/ChatelainDashboard";
// Chantier admin — brique 1 : châssis (layout + sidebar + sections placeholder).
import AdminLayout from "./components/admin/AdminLayout";
import AdminAccueil from "./components/admin/AdminAccueil";
import AdminMessages from "./components/admin/AdminMessages";
import AdminChateaux from "./components/admin/AdminChateaux";
import AdminChateauNouveau from "./components/admin/AdminChateauNouveau";
import AdminChateauEdition from "./components/admin/AdminChateauEdition";
import AdminChateauApercu from "./components/admin/AdminChateauApercu";
import AdminPersonnages from "./components/admin/AdminPersonnages";
import AdminPersonnageEdition from "./components/admin/AdminPersonnageEdition";
import AdminReservations from "./components/admin/AdminReservations";
import AdminCommissions from "./components/admin/AdminCommissions";
// Sprint S2-α.1.5 — route vitrine SEO /chateau/:slug?onglet=&theme=&offre=
import VitrineChateauRoute from "./components/VitrineChateauRoute";
import PageClub from "./components/club/PageClub";
import PageResultats from "./components/PageResultats";
import PagePersonnage from "./components/PagePersonnage";
import PageHistoire from "./components/PageHistoire";

// Sprint S2-α.2 — pages auth magic link (remplace AuthCallbackPlaceholder)
import Connexion from "./components/auth/Connexion";
import EspaceProfessionnel from "./components/auth/EspaceProfessionnel";
import Inscription from "./components/auth/Inscription";
import MotDePasseOublie from "./components/auth/MotDePasseOublie";
import ReinitialiserMotDePasse from "./components/auth/ReinitialiserMotDePasse";
import CompleterProfil from "./components/auth/CompleterProfil";
import AuthCallback from "./components/auth/AuthCallback";



// Ecran des Dernieres Cles servi par la route `/dernieres-cles`.
//
// C'EST ICI QUE LA NAVIGATION SE DECIDE, et nulle part ailleurs. `DernieresCles`
// signale trois intentions distinctes — quitter, ouvrir une demeure, rentrer —
// et ce conteneur leur donne trois destinations. Le composant, lui, ne connait
// aucune URL.
//
// La distinction n'est pas theorique : quand l'ecran naviguait lui-meme, le clic
// sur une carte fermait PUIS naviguait, et les deux navigations se couraient
// apres — on atterrissait sur l'accueil au lieu de la vitrine.
function RouteDernieresCles() {
  const revenir = useRetour();
  const navigate = useNavigate();
  // `.route-catalogue` pose un fond creme OPAQUE sous l'ecran. Sans lui, le
  // fondu d'entree du calque joue sur le body navy — 350 ms de navy a nu, que
  // le mode calque masquait derriere l'accueil. Cf. route-catalogue.css.
  return (
    <div className="route-catalogue">
      <DernieresCles
        /* quitter : on revient d'ou l'on vient (Echap) */
        onClose={revenir}
        /* ouvrir une demeure : la route DEMONTE l'ecran d'elle-meme, donc rien
           a fermer en amont — c'est tout le piege qu'on retire ici. */
        onSelectChateau={(c) => navigate(`/chateau/${c.slug}?onglet=dernieresCles`)}
        /* le logo est un ancrage : toujours l'accueil, jamais un retour */
        onAccueil={() => navigate("/")}
      />
    </div>
  );
}

function App() {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [conciergerieOuvert, setConciergerieOuvert] = useState(false);
  const [aProposOuvert, setAProposOuvert] = useState(false);
  const [vitrinesOuvert, setVitrinesOuvert] = useState(false);
  const [proprietairesOuvert, setProprietairesOuvert] = useState(false);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const navigate = useNavigate();
  const [transitionCarte, setTransitionCarte] = useState(null); // { chateau, url }

  const ouvrirChateau = (chateau) => {
    setTransitionChateau(chateau);
  };

  // Contenu historique : home + tous les overlays existants. Servi sur "/" et
  // sur tout chemin non transactionnel (route catch-all "*" ci-dessous).
  // INCHANGÉ par rapport à avant S2-α.1 — seul l'enveloppe <Routes> est ajoutée.
  const homeEtOverlays = (
    <div className="app">

      <Header
        onOuvrirAPropos={() => setAProposOuvert(true)}
        onOuvrirVitrines={() => setVitrinesOuvert(true)}
        onOuvrirProprietaires={() => setProprietairesOuvert(true)}
        onOuvrirDernieresClefs={() => navigate("/dernieres-cles")}
      />
      <main>
        {/* Accueil (DA) : grille 2 colonnes.
            Gauche : slogan -> barre -> pastilles (serres verticalement).
            Droite : carte illustree -> toggle Carte/Liste. */}
        <section className="accueil-hero">
          <div className="accueil-hero-inner">
            <div className="acc-gauche">
              <Hero />
              <BarreRecherche />
              <PastillesInspiration />
            </div>
            <div className="acc-droite">
              <div className="acc-carte">
                <img src="/homedessin14-detouree.png" alt="Carte des châteaux depuis Paris" className="hero-illus-img" />
              </div>
              <ToggleCarteListe onEntrerChateau={(chateau, url) => setTransitionCarte({ chateau, url })} />
            </div>
          </div>
        </section>
        <BandeauOffres
          onOuvrirDernieres={() => navigate("/dernieres-cles")}
          onOuvrirVitrines={() => setVitrinesOuvert(true)}
        />
        <UneDeLaSemaine
          onOuvrirChateau={ouvrirChateau}
          /* « Voir tout » du carrousel mobile -> catalogue complet. Le lien est
             masque au-dessus du seuil (une-semaine.css), la prop est inerte en
             desktop. */
          onVoirTout={() => setVitrinesOuvert(true)}
        />
        <HeureAuxDemeures
          onOuvrirChateau={ouvrirChateau}
          onOuvrirDernieres={() => navigate("/dernieres-cles")}
        />
        {/* Bandeau « Bientot l'application » : rendu en permanence, masque
            au-dessus du seuil par banniere-app.css. */}
        <BanniereApp />
      </main>
      <PiedPatrimoine />

      {proprietairesOuvert && (
        <PartenairesChateaux onClose={() => setProprietairesOuvert(false)} />
      )}
      {vitrinesOuvert && (
        <VitrinePermanente onClose={() => setVitrinesOuvert(false)} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <VitrineChateau chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
      {transitionChateau && (
        <TransitionPorte
          chateau={transitionChateau}
          onTermine={() => {
            setChateauSelectionne(transitionChateau);
            setTransitionChateau(null);
          }}
        />
      )}
      {transitionCarte && (
        <TransitionPorte
          chateau={transitionCarte.chateau}
          onTermine={() => {
            const url = transitionCarte.url;
            setTransitionCarte(null);
            navigate(url);
          }}
        />
      )}
      {conciergerieOuvert && (
        <Conciergerie onClose={() => setConciergerieOuvert(false)} overlay={true} />
      )}
      {aProposOuvert && <APropos onClose={() => setAProposOuvert(false)} />}
    </div>
  );

  return (
    <Routes>
      <Route path="/reserver/:chateauSlug" element={<BookingFlowPlaceholder />} />
      <Route path="/reservation/:id/confirmation" element={<BookingConfirmationPlaceholder />} />
      <Route path="/club" element={<RequireAuth><PageClub /></RequireAuth>} />
      <Route path="/mon-compte" element={<Navigate to="/club" replace />} />
      <Route
        path="/chatelain/dashboard"
        element={
          <RequireAuth>
            <RequireRole role="chatelain">
              <ChatelainDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<AdminAccueil />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="chateaux" element={<AdminChateaux />} />
        <Route path="chateaux/nouveau" element={<AdminChateauNouveau />} />
        <Route path="chateaux/:id" element={<AdminChateauEdition />} />
        <Route path="chateaux/:id/apercu" element={<AdminChateauApercu />} />
        <Route path="personnages" element={<AdminPersonnages />} />
        <Route path="personnages/:id" element={<AdminPersonnageEdition />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="commissions" element={<AdminCommissions />} />
      </Route>
      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
      {/* Aiguillage seul : cette route ne garde rien et n'est pas gardée. Les
          deux destinations qu'elle propose, elles, restent sous RequireRole. */}
      <Route path="/professionnel" element={<EspaceProfessionnel />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
      <Route path="/completer-profil" element={<CompleterProfil />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/chateau/:slug" element={<VitrineChateauRoute />} />
      <Route path="/personnage/:slug" element={<PagePersonnage />} />
      <Route path="/histoire" element={<PageHistoire />} />
      <Route path="/resultats" element={<PageResultats />} />
      {/* Les Dernieres Cles ne sont plus un calque de l'accueil mais un ECRAN.
          Depuis une route (`/resultats`), un calque d'`App` est inatteignable —
          `<Routes>` est exclusif — et les boutons du Header y retombaient sur
          l'accueil. Une URL leur donne une destination qui vaut partout.
          Une SEULE voie : les trois sites d'ouverture naviguent, aucun ne monte
          plus de calque. Deux chemins vers un meme ecran, c'est la dualite qui
          avait produit le defaut. */}
      <Route path="/dernieres-cles" element={<RouteDernieresCles />} />
      <Route path="*" element={homeEtOverlays} />
    </Routes>
  );
}

export default App;
