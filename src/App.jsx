import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ClesAlaUne from "./components/ClesAlaUne";
import TousLesChateaux from "./components/TousLesChateaux";
import Services from "./components/Services";
import CommentCaMarche from "./components/CommentCaMarche";
import Temoignages from "./components/Temoignages";
import Newsletter from "./components/Newsletter";
import Footer from "./components/Footer";
import ChateauModal from "./components/ChateauModal";
import CarteExplorer from "./components/CarteExplorer";
import AuthModal from "./components/AuthModal";
import CompteUser from "./components/CompteUser";

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

  const ouvrirAuth = (mode = "inscription") => {
    setAuthMode(mode);
    setAuthOuvert(true);
  };

  const ouvrirChateau = (chateau) => {
    setCarteOuverte(false);
    setTousOuvert(false);
    setChateauSelectionne(chateau);
  };

  return (
    <div className="app">
      <LysPattern />
      <Header
        onOuvrirCarte={() => setCarteOuverte(true)}
        onOuvrirTous={() => setTousOuvert(true)}
        onOuvrirAuth={ouvrirAuth}
        onOuvrirCompte={() => setCompteOuvert(true)}
        userConnecte={userConnecte}
      />
      <main>
        <Hero onOuvrirAuth={() => ouvrirAuth("inscription")} />
        <ClesAlaUne onSelectChateau={ouvrirChateau} />
        <Services />
        <CommentCaMarche />
        <Temoignages />
        <Newsletter onOuvrirAuth={() => ouvrirAuth("inscription")} />
      </main>
      <Footer />

      {chateauSelectionne && (
        <ChateauModal
          chateau={chateauSelectionne}
          onClose={() => setChateauSelectionne(null)}
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
          onConnexion={(user) => setUserConnecte(user)}
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
    </div>
  );
}

export default App;
