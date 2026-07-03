import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/carte-interactive.css";

// Prix "a partir de" : meme cascade que PageResultats (prix reduit -> prixBarre
// -> 1er prix chambre). Une seule facon de calculer un prix dans le produit.
const prixAffiche = (c) => {
  if (c.prixBarre && c.reduction) {
    return Math.round(c.prixBarre * (1 - c.reduction / 100));
  }
  return c.prixBarre || c.chambres?.[0]?.prix || null;
};

export default function CarteInteractive({ chateaux, onSelectChateau }) {
  const conteneurRef = useRef(null); // div DOM cible
  const carteRef = useRef(null);     // instance Leaflet (montage unique)

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
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(carte);

    (chateaux || []).forEach((c) => {
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
      marqueur.on("click", () => onSelectChateau && onSelectChateau(c));
    });

    const t = setTimeout(() => carte.invalidateSize(), 120);

    return () => {
      clearTimeout(t);
      carte.remove();
      carteRef.current = null;
    };
  }, [chateaux, onSelectChateau]);

  return <div className="ci-carte" ref={conteneurRef} />;
}
