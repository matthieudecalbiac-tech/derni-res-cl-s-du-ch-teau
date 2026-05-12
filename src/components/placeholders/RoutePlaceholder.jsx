import "../../styles/s2-placeholder.css";

// Coquille visuelle partagée des placeholders de routes S2 (α.1).
// `route` : le chemin affiché. `children` : contenu optionnel sous le badge.
export default function RoutePlaceholder({ route, children }) {
  return (
    <div className="s2-placeholder">
      <span className="s2-placeholder-route">{route}</span>
      <p className="s2-placeholder-note">
        Écran en attente d'implémentation — Sprint S2-α.2 / α.3.
      </p>
      {children}
    </div>
  );
}
