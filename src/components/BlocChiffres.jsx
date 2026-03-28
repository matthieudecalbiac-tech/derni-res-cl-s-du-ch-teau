import "../styles/bloc-chiffres.css";

export default function BlocChiffres() {
  return (
    <div className="bc-section">
      <div className="bc-inner">
        <div className="bc-item">
          <span className="bc-nombre">81</span>
          <span className="bc-label">Demeures sélectionnées</span>
        </div>
        <div className="bc-sep">·</div>
        <div className="bc-item">
          <span className="bc-nombre">&lt;3h</span>
          <span className="bc-label">De Paris</span>
        </div>
        <div className="bc-sep">·</div>
        <div className="bc-item">
          <span className="bc-nombre">⚜</span>
          <span className="bc-label">Partenaire Fondation du Patrimoine</span>
        </div>
      </div>
    </div>
  );
}
