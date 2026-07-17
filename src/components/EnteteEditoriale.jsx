import { useNavigate } from "react-router-dom";
import "../styles/entete-editoriale.css";

// En-tête éditorial PARTAGÉ (histoire + personnage). Reprend le topbar des
// Vitrines Permanentes (charte) : médaillon fleur de lys + « Les Clés du
// Château » (clic → accueil), et le nom de section en or italique à droite.
// Composant unique plutôt qu'un markup dupliqué inline (comme vit-topbar/em-topbar).
export default function EnteteEditoriale({ titreSection }) {
  const navigate = useNavigate();
  return (
    <header className="ee-topbar">
      <button className="ee-logo" onClick={() => navigate("/")} aria-label="Retour à l'accueil">
        <img src="/L1.png" alt="" aria-hidden="true" className="ee-embleme" />
        <span className="ee-wordmark">Les Clés du Château</span>
      </button>
      {titreSection && <span className="ee-titre">{titreSection}</span>}
    </header>
  );
}
