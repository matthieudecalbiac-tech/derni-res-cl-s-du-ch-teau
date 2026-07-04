import "../styles/carte-chateaux.css";
import { FRANCE_MAIN, FRANCE_CORSE, projeter } from "../utils/franceSvg";

export default function CarteChateaux({ chateaux = [], survolId = null, onSurvol, onOuvrir }) {
  const points = chateaux
    .filter((c) => c.coordonnees && typeof c.coordonnees.lat === "number")
    .map((c) => ({ id: c.id, nom: c.nom, ...projeter(c.coordonnees.lat, c.coordonnees.lng) }));

  return (
    <div className="carte-fr">
      <svg viewBox="0 0 520 520" className="carte-fr-svg" role="img" aria-label="Carte des chateaux de France">
        <defs>
          <filter id="cfInk" x="-12%" y="-12%" width="124%" height="124%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id="cfCote" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* ombrage cotier + halo encre + terre */}
        <path d={FRANCE_MAIN} className="cf-cote" filter="url(#cfCote)" />
        <path d={FRANCE_MAIN} className="cf-halo" filter="url(#cfInk)" />
        <path d={FRANCE_MAIN} className="cf-terre" />
        <path d={FRANCE_CORSE} className="cf-cote" filter="url(#cfCote)" />
        <path d={FRANCE_CORSE} className="cf-halo" filter="url(#cfInk)" />
        <path d={FRANCE_CORSE} className="cf-terre" />

        {points.map((p) => {
          const actif = survolId === p.id;
          return (
            <g key={p.id}
               className={"carte-fr-pt" + (actif ? " actif" : "")}
               onClick={() => onOuvrir && onOuvrir(p.id)}
               onMouseEnter={() => onSurvol && onSurvol(p.id)}
               onMouseLeave={() => onSurvol && onSurvol(null)}>
              <circle cx={p.x} cy={p.y} r="5" className="carte-fr-dot" />
            </g>
          );
        })}
        {/* point actif re-rendu EN DERNIER pour passer au-dessus de tous les autres */}
        {(() => {
          const pa = points.find((p) => p.id === survolId);
          if (!pa) return null;
          return (
            <g className="carte-fr-pt actif"
               onClick={() => onOuvrir && onOuvrir(pa.id)}
               onMouseEnter={() => onSurvol && onSurvol(pa.id)}
               onMouseLeave={() => onSurvol && onSurvol(null)}>
              <circle cx={pa.x} cy={pa.y} r="9" className="carte-fr-halo-pt" />
              <circle cx={pa.x} cy={pa.y} r="5" className="carte-fr-dot" />
              <text x={pa.x} y={pa.y - 15} className="carte-fr-label" textAnchor="middle">{pa.nom}</text>
            </g>
          );
        })()}
      </svg>
      <img src="/rose-des-vents.png" alt="" aria-hidden="true" className="carte-fr-rose" />
    </div>
  );
}
