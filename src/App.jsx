import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ClesAlaUne from "./components/ClesAlaUne";
import TousLesChateaux from "./components/TousLesChateaux";
import Services from "./components/Services";
import CommentCaMarche from "./components/CommentCaMarche";
import Temoignages from "./components/Temoignages";
import Footer from "./components/Footer";
import ChateauModal from "./components/ChateauModal";
import CarteExplorer from "./components/CarteExplorer";
import AuthModal from "./components/AuthModal";
import CompteUser from "./components/CompteUser";
import ClubChatelains from "./components/ClubChatelains";
import ClesEvenementiel from "./components/ClesEvenementiel";
import APropos from "./components/APropos";
import EspaceMembre from "./components/EspaceMembre";
import VitrinePermanente from "./components/VitrinePermanente";
import DernieresClés from "./components/DernieresCles";
import TransitionPorte from "./components/TransitionPorte";
import PartenairesChateaux from "./components/PartenairesChateaux";
import PatrimoineSection from "./components/PatrimoineSection";

const LysPattern = () => (
  <svg
    style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
  >
    <defs>
      <pattern
        id="lys-pattern"
        x="0"
        y="0"
        width="120"
        height="160"
        patternUnits="userSpaceOnUse"
      >
        <text
          x="20"
          y="80"
          fontSize="48"
          fill="white"
          fontFamily="serif"
          textAnchor="middle"
        >
          ⚜
        </text>
        <text
          x="80"
          y="160"
          fontSize="48"
          fill="white"
          fontFamily="serif"
          textAnchor="middle"
        >
          ⚜
        </text>
        <text
          x="80"
          y="0"
          fontSize="48"
          fill="white"
          fontFamily="serif"
          textAnchor="middle"
        >
          ⚜
        </text>
        <text
          x="-40"
          y="160"
          fontSize="48"
          fill="white"
          fontFamily="serif"
          textAnchor="middle"
        >
          ⚜
        </text>
      </pattern>
    </defs>
  </svg>
);

function App() {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [carteOuverte, setCarteOuverte] = useState(false);
  const [tousOuvert, setTousOuvert] = useState(false);
  const [authOuvert, setAuthOuvert] = useState(false);
  const [authMode, setAuthMode] = useState("inscription");
  const [compteOuvert, setCompteOuvert] = useState(false);
  const [userConnecte, setUserConnecte] = useState(null);
  const [clubOuvert, setClubOuvert] = useState(false);
  const [evenementielOuvert, setEvenementielOuvert] = useState(false);
  const [aProposOuvert, setAProposOuvert] = useState(false);
  const [espaceMembreOuvert, setEspaceMembreOuvert] = useState(false);
  const [vitrinesOuvert, setVitrinesOuvert] = useState(false);
  const [proprietairesOuvert, setProprietairesOuvert] = useState(false);
  const [dernieresOuvert, setDernieresOuvert] = useState(false);
  const [transitionChateau, setTransitionChateau] = useState(null);

  const ouvrirAuth = (mode = "inscription") => {
    setAuthMode(mode);
    setClubOuvert(false);
    setAuthOuvert(true);
  };

  const gererConnexion = (user) => {
    setUserConnecte(user);
    setEspaceMembreOuvert(true);
  };

  const ouvrirChateau = (chateau) => {
    setCarteOuverte(false);
    setTousOuvert(false);
    setTransitionChateau(chateau);
  };

  return (
    <div className="app">
      <LysPattern />
      <Header
        onOuvrirCarte={() => setCarteOuverte(true)}
        onOuvrirTous={() => setTousOuvert(true)}
        onOuvrirAuth={ouvrirAuth}
        onOuvrirCompte={() => setCompteOuvert(true)}
        onOuvrirClub={() => setClubOuvert(true)}
        onOuvrirEvenementiel={() => setEvenementielOuvert(true)}
        onOuvrirAPropos={() => setAProposOuvert(true)}
        onOuvrirVitrines={() => setVitrinesOuvert(true)}
        onOuvrirProprietaires={() => setProprietairesOuvert(true)}
        onOuvrirDernieresClefs={() => setDernieresOuvert(true)}
        onConnexion={() => ouvrirAuth("connexion")}
        userConnecte={userConnecte}
      />
      <main>
        <Hero
          onOuvrirAuth={ouvrirAuth}
          onOuvrirClub={() => setClubOuvert(true)}
          onOuvrirDernieresClefs={() => setDernieresOuvert(true)}
          onOuvrirVitrines={() => setVitrinesOuvert(true)}
        onOuvrirProprietaires={() => setProprietairesOuvert(true)}
        />
        <ClesAlaUne onSelectChateau={ouvrirChateau} />
        <Services />
        <CommentCaMarche onOuvrirClub={() => setClubOuvert(true)} onOuvrirVitrines={() => setVitrinesOuvert(true)} onOuvrirDernieresClefs={() => setDernieresOuvert(true)} />
        <PatrimoineSection />
        <Temoignages />
      </main>
      <Footer onOuvrirAPropos={() => setAProposOuvert(true)} onOuvrirProprietaires={() => setProprietairesOuvert(true)} onOuvrirCarte={() => setCarteOuverte(true)} />

      {proprietairesOuvert && (
        <PartenairesChateaux onClose={() => setProprietairesOuvert(false)} />
      )}
      {vitrinesOuvert && (
        <VitrinePermanente onClose={() => setVitrinesOuvert(false)} />
      )}
      {dernieresOuvert && (
        <DernieresClés onClose={() => setDernieresOuvert(false)} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <ChateauModal
          chateau={transitionChateau || chateauSelectionne}
          onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }}
        />
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
      {carteOuverte && (
        <CarteExplorer
          onClose={() => setCarteOuverte(false)}
          onOuvrirChateau={ouvrirChateau}
        />
      )}
      {tousOuvert && (
        <TousLesChateaux
          onClose={() => setTousOuvert(false)}
          onSelectChateau={ouvrirChateau}
        />
      )}
      {authOuvert && (
        <AuthModal
          modeInitial={authMode}
          onClose={() => setAuthOuvert(false)}
          onConnexion={gererConnexion}
        />
      )}
      {compteOuvert && userConnecte && (
        <CompteUser
          user={userConnecte}
          onClose={() => setCompteOuvert(false)}
          onDeconnexion={() => {
            setUserConnecte(null);
            setCompteOuvert(false);
          }}
        />
      )}
      {clubOuvert && (
        <ClubChatelains
          onClose={() => setClubOuvert(false)}
          onOuvrirAuth={ouvrirAuth}
        />
      )}
      {evenementielOuvert && (
        <ClesEvenementiel onClose={() => setEvenementielOuvert(false)} />
      )}
      {aProposOuvert && <APropos onClose={() => setAProposOuvert(false)} />}
      {espaceMembreOuvert && userConnecte && (
        <EspaceMembre
          user={userConnecte}
          onClose={() => setEspaceMembreOuvert(false)}
          onDeconnexion={() => {
            setUserConnecte(null);
            setEspaceMembreOuvert(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
