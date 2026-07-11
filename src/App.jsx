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
// import ChateauModal from "./components/ChateauModal"; // plus d'appelant dans App (pièce 2 geste 2) — retrait complet en pièce 3
import VitrineChateau from "./components/VitrineChateau";
import ClesEvenementiel from "./components/ClesEvenementiel";
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
import AdminDashboardPlaceholder from "./components/placeholders/AdminDashboardPlaceholder";
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
  const [evenementielOuvert, setEvenementielOuvert] = useState(false);
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
        onOuvrirEvenementiel={() => setEvenementielOuvert(true)}
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
      {evenementielOuvert && (
        <ClesEvenementiel onClose={() => setEvenementielOuvert(false)} />
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
        path="/admin/dashboard"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminDashboardPlaceholder />
            </RequireRole>
          </RequireAuth>
        }
      />
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
