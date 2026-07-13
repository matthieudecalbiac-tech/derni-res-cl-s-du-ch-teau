import { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import BandeauOffres from "./components/BandeauOffres";
import BarreRecherche from "./components/BarreRecherche";
import UneDeLaSemaine from "./components/UneDeLaSemaine";
import HeureAuxDemeures from "./components/HeureAuxDemeures";
import PiedPatrimoine from "./components/PiedPatrimoine";
import Conciergerie from "./components/Services";
import VitrineChateau from "./components/VitrineChateau";
import APropos from "./components/APropos";
import VitrinePermanente from "./components/VitrinePermanente";
import DernieresCles from "./components/DernieresCles";
import TransitionPorte from "./components/TransitionPorte";
import PartenairesChateaux from "./components/PartenairesChateaux";

// Sprint S2-α.1 — routing react-router pour les nouveaux écrans transactionnels
// (pattern strangler fig : les overlays historiques restent inchangés).
import RequireAuth from "./components/auth/RequireAuth";
import RequireRole from "./components/auth/RequireRole";
import BookingFlowPlaceholder from "./components/placeholders/BookingFlowPlaceholder";
import BookingConfirmationPlaceholder from "./components/placeholders/BookingConfirmationPlaceholder";
import OwnerDashboardPlaceholder from "./components/placeholders/OwnerDashboardPlaceholder";
// Chantier admin — brique 1 : châssis (layout + sidebar + sections placeholder).
import AdminLayout from "./components/admin/AdminLayout";
import AdminAccueil from "./components/admin/AdminAccueil";
import AdminMessages from "./components/admin/AdminMessages";
import AdminChateaux from "./components/admin/AdminChateaux";
import AdminChateauEdition from "./components/admin/AdminChateauEdition";
import AdminReservations from "./components/admin/AdminReservations";
// Sprint S2-α.1.5 — route vitrine SEO /chateau/:slug?onglet=&theme=&offre=
import VitrineChateauRoute from "./components/VitrineChateauRoute";
import PageClub from "./components/club/PageClub";
import PageResultats from "./components/PageResultats";

// Sprint S2-α.2 — pages auth magic link (remplace AuthCallbackPlaceholder)
import Connexion from "./components/auth/Connexion";
import Inscription from "./components/auth/Inscription";
import MotDePasseOublie from "./components/auth/MotDePasseOublie";
import ReinitialiserMotDePasse from "./components/auth/ReinitialiserMotDePasse";
import CompleterProfil from "./components/auth/CompleterProfil";
import AuthCallback from "./components/auth/AuthCallback";



function App() {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [conciergerieOuvert, setConciergerieOuvert] = useState(false);
  const [aProposOuvert, setAProposOuvert] = useState(false);
  const [vitrinesOuvert, setVitrinesOuvert] = useState(false);
  const [proprietairesOuvert, setProprietairesOuvert] = useState(false);
  const [dernieresOuvert, setDernieresOuvert] = useState(false);
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
        onOuvrirDernieresClefs={() => setDernieresOuvert(true)}
      />
      <main>
        <Hero />
        <BarreRecherche onEntrerChateau={(chateau, url) => setTransitionCarte({ chateau, url })} />
        <BandeauOffres
          onOuvrirDernieres={() => setDernieresOuvert(true)}
          onOuvrirVitrines={() => setVitrinesOuvert(true)}
        />
        <UneDeLaSemaine onOuvrirChateau={ouvrirChateau} />
        <HeureAuxDemeures
          onOuvrirChateau={ouvrirChateau}
          onOuvrirDernieres={() => setDernieresOuvert(true)}
        />
      </main>
      <PiedPatrimoine />

      {proprietairesOuvert && (
        <PartenairesChateaux onClose={() => setProprietairesOuvert(false)} />
      )}
      {vitrinesOuvert && (
        <VitrinePermanente onClose={() => setVitrinesOuvert(false)} />
      )}
      {dernieresOuvert && (
        <DernieresCles onClose={() => setDernieresOuvert(false)} />
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
              <OwnerDashboardPlaceholder />
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
        <Route path="chateaux/:id" element={<AdminChateauEdition />} />
        <Route path="reservations" element={<AdminReservations />} />
      </Route>
      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
      <Route path="/completer-profil" element={<CompleterProfil />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/chateau/:slug" element={<VitrineChateauRoute />} />
      <Route path="/resultats" element={<PageResultats />} />
      <Route path="*" element={homeEtOverlays} />
    </Routes>
  );
}

export default App;
