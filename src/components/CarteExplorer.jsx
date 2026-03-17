import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { chateaux } from "../data/chateaux";
import "../styles/carte-explorer.css";

// Fix icône Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Icône château dorée
const iconChateau = new L.DivIcon({
  html: `<div style="
    background: linear-gradient(135deg,#c8973e,#e0b85a);
    width:32px;height:32px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:2px solid #fff;
    box-shadow:0 3px 10px rgba(0,0,0,0.4);
  "><span style="transform:rotate(45deg);display:block;line-height:28px;text-align:center;font-size:14px;">🏰</span></div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
});

// Icône position utilisateur
const iconUser = new L.DivIcon({
  html: `<div style="
    width:16px;height:16px;
    background:#4a90d9;
    border-radius:50%;
    border:3px solid #fff;
    box-shadow:0 0 0 3px rgba(74,144,217,0.3);
  "></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Composant pour recentrer la carte
function RecentrerCarte({ centre }) {
  const map = useMap();
  useEffect(() => {
    if (centre) map.flyTo(centre, 8, { duration: 1.5 });
  }, [centre, map]);
  return null;
}

// Calcul distance vol d'oiseau en km
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Rayons en km (approximation voiture)
const RAYONS = [
  { label: "1h", km: 80 },
  { label: "1h30", km: 120 },
  { label: "2h", km: 160 },
  { label: "2h30", km: 200 },
  { label: "3h", km: 240 },
];

export default function CarteExplorer({ onClose, onOuvrirChateau }) {
  const [adresse, setAdresse] = useState("");
  const [positionUser, setPositionUser] = useState(null);
  const [rayonActif, setRayonActif] = useState(null);
  const [chateauxFiltres, setChateauxFiltres] = useState(chateaux);
  const [recherche, setRecherche] = useState(false);
  const [erreur, setErreur] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => setMapReady(true), 300);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Filtrer les châteaux selon rayon
  useEffect(() => {
    if (!positionUser || !rayonActif) {
      setChateauxFiltres(chateaux);
      return;
    }
    const rayon = RAYONS.find((r) => r.label === rayonActif);
    if (!rayon) return;
    const filtres = chateaux.filter((c) => {
      const dist = distanceKm(
        positionUser[0],
        positionUser[1],
        c.coordonnees.lat,
        c.coordonnees.lng
      );
      return dist <= rayon.km;
    });
    setChateauxFiltres(filtres);
  }, [positionUser, rayonActif]);

  const rechercherAdresse = async () => {
    if (!adresse.trim()) return;
    setRecherche(true);
    setErreur("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        adresse + ", France"
      )}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.length === 0) {
        setErreur(
          "Adresse non trouvée. Essaie avec une ville ou un code postal."
        );
        setRecherche(false);
        return;
      }
      setPositionUser([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
      setRecherche(false);
    } catch (e) {
      setErreur("Erreur de recherche. Vérifie ta connexion.");
      setRecherche(false);
    }
  };

  const rayonKm = rayonActif
    ? RAYONS.find((r) => r.label === rayonActif)?.km * 1000
    : null;

  return (
    <div className="carte-explorer-overlay">
      {/* Header */}
      <header className="carte-explorer-header">
        <div className="carte-explorer-header-gauche">
          <button className="carte-explorer-retour" onClick={onClose}>
            ← Retour
          </button>
          <span className="carte-explorer-titre">Explorer les châteaux</span>
        </div>
        <span className="carte-explorer-sous-titre">
          {chateauxFiltres.length} château
          {chateauxFiltres.length > 1 ? "x" : ""}{" "}
          {rayonActif ? `dans un rayon de ${rayonActif}` : "disponibles"}
        </span>
      </header>

      {/* Panneau gauche */}
      <div className="carte-explorer-corps">
        <div className="carte-explorer-panneau">
          {/* Recherche adresse */}
          <div className="carte-explorer-recherche">
            <div className="carte-section-label">Votre point de départ</div>
            <div className="carte-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="carte-input"
                placeholder="Ex: Paris 16e, Versailles, 92100..."
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && rechercherAdresse()}
              />
              <button
                className="carte-btn-recherche"
                onClick={rechercherAdresse}
                disabled={recherche}
              >
                {recherche ? "..." : "→"}
              </button>
            </div>
            {erreur && <p className="carte-erreur">{erreur}</p>}
            {positionUser && !erreur && (
              <p className="carte-succes-adresse">✓ Position localisée</p>
            )}
          </div>

          {/* Filtres rayon */}
          <div className="carte-explorer-filtres">
            <div className="carte-section-label">Rayon de recherche</div>
            <div className="carte-rayons">
              {RAYONS.map((r) => (
                <button
                  key={r.label}
                  className={`carte-rayon-pill ${
                    rayonActif === r.label ? "actif" : ""
                  } ${!positionUser ? "desactive" : ""}`}
                  onClick={() => {
                    if (!positionUser) return;
                    setRayonActif(rayonActif === r.label ? null : r.label);
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {!positionUser && (
              <p className="carte-hint">Entrez d'abord votre adresse</p>
            )}
          </div>

          {/* Liste châteaux filtrés */}
          <div className="carte-explorer-liste">
            <div className="carte-section-label">
              {chateauxFiltres.length} château
              {chateauxFiltres.length > 1 ? "x" : ""}
              {positionUser && rayonActif ? ` à moins de ${rayonActif}` : ""}
            </div>

            {chateauxFiltres.length === 0 ? (
              <div className="carte-vide">
                <p>Aucun château dans ce rayon.</p>
                <p>Essayez un rayon plus grand.</p>
              </div>
            ) : (
              chateauxFiltres.map((c) => {
                const dist = positionUser
                  ? Math.round(
                      distanceKm(
                        positionUser[0],
                        positionUser[1],
                        c.coordonnees.lat,
                        c.coordonnees.lng
                      )
                    )
                  : null;
                return (
                  <div
                    key={c.id}
                    className="carte-chateau-item"
                    onClick={() => onOuvrirChateau(c)}
                  >
                    <img
                      src={c.image}
                      alt={c.nom}
                      className="carte-chateau-item-img"
                    />
                    <div className="carte-chateau-item-info">
                      <span
                        className={`carte-urgence-mini badge-${c.urgence
                          .toLowerCase()
                          .replace("-", "")}`}
                      >
                        {c.urgence}
                      </span>
                      <div className="carte-chateau-item-nom">{c.nom}</div>
                      <div className="carte-chateau-item-meta">
                        {c.region}
                        {dist && (
                          <span className="carte-chateau-item-dist">
                            {" "}
                            · {dist} km
                          </span>
                        )}
                      </div>
                      <div className="carte-chateau-item-prix">
                        {c.prix} € / nuit
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Carte */}
        <div className="carte-explorer-map">
          {mapReady && (
            <MapContainer
              center={[47.5, 2.5]}
              zoom={6}
              scrollWheelZoom={true}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {positionUser && <RecentrerCarte centre={positionUser} />}

              {/* Marqueur position user */}
              {positionUser && (
                <Marker position={positionUser} icon={iconUser}>
                  <Popup>Votre position</Popup>
                </Marker>
              )}

              {/* Cercle rayon */}
              {positionUser && rayonKm && (
                <Circle
                  center={positionUser}
                  radius={rayonKm}
                  pathOptions={{
                    color: "#c8973e",
                    fillColor: "#c8973e",
                    fillOpacity: 0.06,
                    weight: 1.5,
                    dashArray: "6 4",
                  }}
                />
              )}

              {/* Marqueurs châteaux */}
              {chateauxFiltres.map((c) => (
                <Marker
                  key={c.id}
                  position={[c.coordonnees.lat, c.coordonnees.lng]}
                  icon={iconChateau}
                  eventHandlers={{ click: () => onOuvrirChateau(c) }}
                >
                  <Popup>
                    <div
                      style={{ fontFamily: "sans-serif", minWidth: "160px" }}
                    >
                      <strong style={{ fontSize: "13px" }}>{c.nom}</strong>
                      <br />
                      <span style={{ fontSize: "11px", color: "#666" }}>
                        {c.region}
                      </span>
                      <br />
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#c8973e",
                          fontWeight: 600,
                        }}
                      >
                        {c.prix} € / nuit
                      </span>
                      <br />
                      <button
                        onClick={() => onOuvrirChateau(c)}
                        style={{
                          marginTop: "6px",
                          padding: "4px 10px",
                          background: "#c8973e",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "11px",
                          width: "100%",
                        }}
                      >
                        Voir le château
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </div>
  );
}
