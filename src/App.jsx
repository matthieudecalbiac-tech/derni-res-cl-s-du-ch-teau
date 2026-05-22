import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import BandeauOffres from "./components/BandeauOffres";
import CitationPont from "./components/CitationPont";
import UneDeLaSemaine from "./components/UneDeLaSemaine";
import HeureAuxDemeures from "./components/HeureAuxDemeures";
import PiedPatrimoine from "./components/PiedPatrimoine";
import { useHorloge } from "./utils/heure";
import Conciergerie from "./components/Services";
import ChateauModal from "./components/ChateauModal";
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
import ClientAccountPlaceholder from "./components/placeholders/ClientAccountPlaceholder";
import OwnerDashboardPlaceholder from "./components/placeholders/OwnerDashboardPlaceholder";
import AdminDashboardPlaceholder from "./components/placeholders/AdminDashboardPlaceholder";
// Sprint S2-α.1.5 — route vitrine SEO /chateau/:slug?onglet=&theme=&offre=
import VitrineChateauRoute from "./components/VitrineChateauRoute";

// Sprint S2-α.2 — pages auth magic link (remplace AuthCallbackPlaceholder)
import Connexion from "./components/auth/Connexion";
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
  const horloge = useHorloge();

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
        onOuvrirConciergerie={() => setConciergerieOuvert(true)}
        onOuvrirAPropos={() => setAProposOuvert(true)}
        onOuvrirVitrines={() => setVitrinesOuvert(true)}
        onOuvrirProprietaires={() => setProprietairesOuvert(true)}
        onOuvrirDernieresClefs={() => setDernieresOuvert(true)}
      />
      <main>
        <Hero />
        <BandeauOffres
          onOuvrirDernieres={() => setDernieresOuvert(true)}
          onOuvrirVitrines={() => setVitrinesOuvert(true)}
        />
        <CitationPont
          chapitre="I"
          citation="Chaque lundi, une demeure entrouvre sa porte. Cette semaine, elles sont deux."
          livraison="LA UNE DE LA SEMAINE · LIVRAISON N°47 · PRINTEMPS 2026"
        />
        <UneDeLaSemaine onOuvrirChateau={ouvrirChateau} />
        <CitationPont
          chapitre="II"
          citation={`Ailleurs en France, il est ${horloge.hh} heures ${horloge.mm}. Voici l'heure qu'il est dans nos autres demeures.`}
          livraison={`LE JOURNAL DES DEMEURES · ${horloge.jour} ${horloge.jj} ${horloge.mois} · ${horloge.hh} : ${horloge.mm}`}
        />
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
        (transitionChateau || chateauSelectionne).estLaUne === true
          ? <VitrineChateau chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
          : <ChateauModal chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
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
      <Route
        path="/mon-compte"
        element={
          <RequireAuth>
            <ClientAccountPlaceholder />
          </RequireAuth>
        }
      />
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
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/chateau/:slug" element={<VitrineChateauRoute />} />
      <Route path="*" element={homeEtOverlays} />
    </Routes>
  );
}

export default App;
