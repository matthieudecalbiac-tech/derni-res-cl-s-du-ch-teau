import "../styles/champ-case.css";

// Case a cocher generique (label + checkbox). Extraite d'AdminChateauEdition
// (refactor pur) pour etre consommable hors admin (panneau "+ Filtres").
// Presentationnel : ne porte aucun etat, tout vient des props.
export default function ChampCase({ label, checked, onChange }) {
  return (
    <label className="champ-case">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
