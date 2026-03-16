import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import OffresUrgentes from "./components/OffresUrgentes";
import Services from "./components/Services";
import CommentCaMarche from "./components/CommentCaMarche";
import Temoignages from "./components/Temoignages";
import Newsletter from "./components/Newsletter";
import Footer from "./components/Footer";
import ChateauModal from "./components/ChateauModal";

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
  const [filtresActifs, setFiltresActifs] = useState({});

  return (
    <div className="app">
      <LysPattern />

      <Header />
      <main>
        <Hero />
        <OffresUrgentes
          onSelectChateau={setChateauSelectionne}
          filtresActifs={filtresActifs}
          onFiltresChange={setFiltresActifs}
        />
        <Services />
        <CommentCaMarche />
        <Temoignages />
        <Newsletter />
      </main>
      <Footer />
      {chateauSelectionne && (
        <ChateauModal
          chateau={chateauSelectionne}
          onClose={() => setChateauSelectionne(null)}
        />
      )}
    </div>
  );
}

export default App;
