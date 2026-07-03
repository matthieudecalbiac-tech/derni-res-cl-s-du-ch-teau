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

export default function CarteInteractive({ chateaux, dateArrivee, dateDepart, invites, onSelectChateau, onVoirChateau }) {
  const conteneurRef = useRef(null);
  const carteRef = useRef(null);
  const [selection, setSelection] = useState(null);

  // La carte ne montre que les chateaux reels (estLaUne) : seuls routables vers
  // une vraie vitrine. Coherent avec PageResultats qui filtre pareil. Evite un
  // cul-de-sac (clic mock -> panneau -> vitrine vide).
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
      marqueur.on("click", () => {
        setSelection(c);
        onSelectChateau && onSelectChateau(c);
      });
    });

    const t = setTimeout(() => carte.invalidateSize(), 120);

    return () => {
      clearTimeout(t);
      carte.remove();
      carteRef.current = null;
    };
  }, [chateaux, onSelectChateau]);

  const rappelSejour = () => {
    const parts = [];
    if (dateArrivee && dateDepart) parts.push(`${formatDate(dateArrivee)} → ${formatDate(dateDepart)}`);
    if (invites) {
      const a = invites.adultes, e = invites.enfants;
      let s = `${a} adulte${a > 1 ? "s" : ""}`;
      if (e > 0) s += `, ${e} enfant${e > 1 ? "s" : ""}`;
      parts.push(s);
    }
    return parts;
  };

  return (
    <div className="ci-wrap">
      <div className="ci-carte" ref={conteneurRef} />

      {selection && (
        <div className="ci-detail">
          <button className="ci-detail-close" onClick={() => setSelection(null)} aria-label="Fermer">✕</button>
          <div className="ci-detail-photo" style={{ backgroundImage: `url('${selection.images?.[0]}')` }} />
          <div className="ci-detail-corps">
            <div className="ci-detail-region">{selection.region} · {selection.distanceParis}</div>
            <h3 className="ci-detail-nom">{selection.nom}</h3>
            <p className="ci-detail-accroche">{selection.accroche}</p>
            {rappelSejour().length > 0 && (
              <div className="ci-detail-sejour">
                {rappelSejour().map((p, i) => (
                  <span key={i} className="ci-detail-sejour-item">{p}</span>
                ))}
              </div>
            )}
            {prixAffiche(selection) && (
              <div className="ci-detail-prix">
                À partir de <strong>{prixAffiche(selection)} €</strong> / nuit
              </div>
            )}
            <button
              className="ci-detail-cta"
              type="button"
              onClick={() => onVoirChateau && onVoirChateau(selection)}
            >
              Voir le château →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
