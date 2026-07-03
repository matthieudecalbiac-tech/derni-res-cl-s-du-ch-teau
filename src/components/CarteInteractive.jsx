import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDate } from "../utils/dates";
import "../styles/carte-interactive.css";

// Prix "a partir de" : meme cascade que PageResultats (prix reduit -> prixBarre
// -> 1er prix chambre). Une seule facon de calculer un prix dans le produit.
const prixAffiche = (c) => {
  if (c.prixBarre && c.reduction) {
    return Math.round(c.prixBarre * (1 - c.reduction / 100));
  }
  return c.prixBarre || c.chambres?.[0]?.prix || null;
};

export default function CarteInteractive({ chateaux, dateArrivee, dateDepart, invites, onVoirChateau }) {
  const conteneurRef = useRef(null);
  const carteRef = useRef(null);
  const [survolId, setSurvolId] = useState(null);

  // La carte ne montre que les chateaux reels (estLaUne) : seuls routables vers
  // une vraie vitrine. Un seul tableau alimente la liste ET les marqueurs.
  const reels = (chateaux || []).filter((c) => c.estLaUne === true);

  useEffect(() => {
    if (!conteneurRef.current || carteRef.current) return;

    const carte = L.map(conteneurRef.current, {
      center: [46.7, 2.3],
      zoom: 6,
      scrollWheelZoom: true,
      attributionControl: true,
    });
    carteRef.current = carte;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(carte);

    reels.forEach((c) => {
      const lat = c.coordonnees?.lat;
      const lng = c.coordonnees?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      const prix = prixAffiche(c);
      const label = prix ? `${prix} €` : "Voir";
      const icone = L.divIcon({
        className: "ci-pastille-wrap",
        html: `<button type="button" class="ci-pastille" data-id="${c.id}">${label}</button>`,
        iconSize: null,
      });
      const marqueur = L.marker([lat, lng], { icon: icone }).addTo(carte);
      marqueur.on("click", () => onVoirChateau && onVoirChateau(c));
    });

    const t = setTimeout(() => carte.invalidateSize(), 120);

    return () => {
      clearTimeout(t);
      carte.remove();
      carteRef.current = null;
    };
  }, [chateaux, onVoirChateau]);

  const rappelSejour = () => {
    const parts = [];
    if (dateArrivee && dateDepart) parts.push(`${formatDate(dateArrivee)} → ${formatDate(dateDepart)}`);
    if (invites) {
      const a = invites.adultes, e = invites.enfants;
      let s = `${a} adulte${a > 1 ? "s" : ""}`;
      if (e > 0) s += `, ${e} enfant${e > 1 ? "s" : ""}`;
      parts.push(s);
    }
    return parts.join(" · ");
  };

  return (
    <div className="ci-split">
      {/* LISTE DE VIGNETTES */}
      <div className="ci-liste">
        <div className="ci-liste-tete">
          <span className="ci-liste-nb">{reels.length}</span> demeure{reels.length > 1 ? "s" : ""}
          {rappelSejour() && <span className="ci-liste-sejour"> · {rappelSejour()}</span>}
        </div>
        {reels.map((c) => {
          const prix = prixAffiche(c);
          return (
            <div
              key={c.id}
              className={"ci-vignette" + (survolId === c.id ? " ci-vignette--survol" : "")}
              onMouseEnter={() => setSurvolId(c.id)}
              onMouseLeave={() => setSurvolId(null)}
            >
              <div className="ci-vignette-photo" style={{ backgroundImage: `url('${c.images?.[0]}')` }} />
              <div className="ci-vignette-corps">
                <div className="ci-vignette-region">{c.region} · {c.distanceParis}</div>
                <h3 className="ci-vignette-nom">{c.nom}</h3>
                <p className="ci-vignette-accroche">{c.accroche}</p>
                <div className="ci-vignette-bas">
                  {prix && (
                    <span className="ci-vignette-prix">
                      dès <strong>{prix} €</strong> / nuit
                    </span>
                  )}
                  <button
                    className="ci-vignette-cta"
                    type="button"
                    onClick={() => onVoirChateau && onVoirChateau(c)}
                  >
                    Voir le château →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CARTE */}
      <div className="ci-carte" ref={conteneurRef} />
    </div>
  );
}
