import { useNavigate } from "react-router-dom";
import BoutonRetour from "./BoutonRetour";
import "../styles/entete-editoriale.css";

// En-tête éditorial PARTAGÉ (histoire + personnage). Reprend le topbar des
// Vitrines (charte) : médaillon fleur de lys + « Les Clés du
// Château » (clic → accueil), et le nom de section en or italique à droite.
// Composant unique plutôt qu'un markup dupliqué inline (comme vit-topbar/em-topbar).
export default function EnteteEditoriale({ titreSection }) {
  const navigate = useNavigate();
  return (
    <header className="ee-topbar">
      {/* Le retour precede le logo : l'un ramene d'ou l'on vient, l'autre est
          l'ancrage vers l'accueil. Deux gestes distincts, jamais confondus. */}
      <BoutonRetour className="ee-retour" />
      <button className="ee-logo" onClick={() => navigate("/")} aria-label="Retour à l'accueil">
        <img src="/L1.png" alt="" aria-hidden="true" className="ee-embleme" />
        <span className="ee-wordmark">Les Clés du Château</span>
      </button>
      {titreSection && <span className="ee-titre">{titreSection}</span>}
    </header>
  );
}
