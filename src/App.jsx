import { useState } from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import OffresUrgentes from "./components/OffresUrgentes";
import CommentCaMarche from "./components/CommentCaMarche";
import Temoignages from "./components/Temoignages";
import Newsletter from "./components/Newsletter";
import Footer from "./components/Footer";
import ChateauModal from "./components/ChateauModal";

function App() {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [filtresActifs, setFiltresActifs] = useState({});

  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <OffresUrgentes
          onSelectChateau={setChateauSelectionne}
          filtresActifs={filtresActifs}
          onFiltresChange={setFiltresActifs}
        />
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
