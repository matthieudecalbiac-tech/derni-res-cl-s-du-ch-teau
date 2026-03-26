import { useState, useEffect, useRef } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import TransitionPorte from "./TransitionPorte";
import "../styles/dernieres-cles.css";

function getDatesPossibles() {
  const today = new Date();
  const dates = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function joursAvant(d) {
  const today = new Date();
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

function chateauxDisponibles(liste, dateArrivee) {
  if (!dateArrivee) return liste;
  const jours = joursAvant(dateArrivee);
  return liste.filter(c => {
    const seuil = { "J-7": 7, "J-10": 10, "J-15": 15 }[c.urgence] || 15;
    return jours <= seuil;
  });
}

export default function DernieresCles({ onClose }) {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dateArrivee, setDateArrivee] = useState(null);
  const [dateDepart, setDateDepart] = useState(null);
  const [etape, setEtape] = useState("arrivee");
  const [chateauSurvol, setChateauSurvol] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 60);
    const onKey = (e) => { if (e.key === "Escape" && !chateauSelectionne) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose, chateauSelectionne]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !visible) return;
    const L = window.L;
    if (!L) return;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "\u00a9 OpenStreetMap"
    }).addTo(map);
    map.setView([46.8, 2.5], 6);
    mapInstanceRef.current = map;
  }, [visible]);

  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    chateauxFiltres.filter(c => c.coordonnees).forEach(c => {
      const isHover = chateauSurvol === c.id;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${isHover?18:12}px;height:${isHover?18:12}px;border-radius:50%;background:${isHover?"#EDD880":"#C09840"};border:2px solid ${isHover?"#FFF":"#EDD880"};box-shadow:0 0 ${isHover?16:8}px rgba(192,152,64,${isHover?0.9:0.6});transition:all 0.2s;cursor:pointer"></div>`,
        iconSize: [isHover?18:12, isHover?18:12],
        iconAnchor: [isHover?9:6, isHover?9:6],
      });
      const marker = L.marker([c.coordonnees.lat, c.coordonnees.lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:Georgia,serif;min-width:180px;padding:4px"><strong style="font-size:0.95rem">${c.nom}</strong><br/><span style="color:#888;font-size:0.82em">${c.region} · ${c.distanceParis}</span><br/><span style="color:#C09840;font-weight:bold;font-size:0.85em">${c.urgence}</span></div>`)
        .on("click", () => setTransitionChateau(c));
      markersRef.current[c.id] = marker;
    });
  }, [chateauxFiltres, chateauSurvol, mapInstanceRef.current]);

  const dates = getDatesPossibles();
  const chateauxFiltres = chateauxDisponibles(chateaux, dateArrivee);

  const handleSelectDate = (d) => {
    if (etape === "arrivee") {
      setDateArrivee(d); setDateDepart(null); setEtape("depart");
    } else {
      if (d > dateArrivee) { setDateDepart(d); setEtape("done"); }
      else { setDateArrivee(d); setDateDepart(null); setEtape("depart"); }
    }
  };

  const reset = () => { setDateArrivee(null); setDateDepart(null); setEtape("arrivee"); };
  const isArrivee = (d) => dateArrivee && d.toDateString() === dateArrivee.toDateString();
  const isDepart = (d) => dateDepart && d.toDateString() === dateDepart.toDateString();
  const isBetween = (d) => dateArrivee && dateDepart && d > dateArrivee && d < dateDepart;

  const survolChateau = (id) => {
    setChateauSurvol(id);
    const map = mapInstanceRef.current;
    const marker = markersRef.current[id];
    if (map && marker) { marker.openPopup(); }
  };

  return (
    <div className={"dk-overlay " + (visible ? "dk-overlay--visible" : "")}>
      <header className="dk-header">
        <div className="dk-header-gauche">
          <span className="dk-header-lys">&#x269C;</span>
          <span className="dk-header-titre">Les Clés du Château</span>
          <span className="dk-header-sep">·</span>
          <span className="dk-header-club">Les Dernières Clés</span>
        </div>
        <div className="dk-header-droite">
          <button className="dk-btn-retour" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="dk-layout">

        {/* ── PANNEAU GAUCHE ── */}
        <div className="dk-panneau">

          {/* En-tête éditorial */}
          <div className="dk-panneau-hero">
            <div className="dk-orn"><div className="dk-orn-ligne" /><span className="dk-orn-lys">&#x269C;</span><div className="dk-orn-ligne" /></div>
            <h2 className="dk-panneau-titre">Les Dernières Clés</h2>
            <p className="dk-panneau-accroche">Des créneaux rares sur leurs dates difficiles. Choisissez vos dates.</p>
          </div>

          {/* Sélecteur dates */}
          <div className="dk-dates-bloc">
            <div className="dk-dates-etapes">
              <div className={"dk-dates-etape " + (etape === "arrivee" ? "actif" : dateArrivee ? "done" : "")} onClick={() => setEtape("arrivee")}>
                <span className="dk-dates-etape-num">1</span>
                <div>
                  <span className="dk-dates-etape-label">Arrivée</span>
                  <span className="dk-dates-etape-val">{dateArrivee ? formatDate(dateArrivee) : "Choisir"}</span>
                </div>
              </div>
              <span className="dk-dates-fleche">→</span>
              <div className={"dk-dates-etape " + (etape === "depart" ? "actif" : dateDepart ? "done" : "")} onClick={() => dateArrivee && setEtape("depart")}>
                <span className="dk-dates-etape-num">2</span>
                <div>
                  <span className="dk-dates-etape-label">Départ</span>
                  <span className="dk-dates-etape-val">{dateDepart ? formatDate(dateDepart) : "Choisir"}</span>
                </div>
              </div>
              {dateArrivee && <button className="dk-dates-reset" onClick={reset}>✕</button>}
            </div>

            <div className="dk-calendrier">
              {dates.map((d, i) => {
                const j = joursAvant(d);
                const urg = j <= 7 ? "j7" : j <= 10 ? "j10" : "j15";
                return (
                  <button key={i} className={"dk-cal-jour dk-cal-" + urg + (isArrivee(d) ? " dk-cal-arrivee" : "") + (isDepart(d) ? " dk-cal-depart" : "") + (isBetween(d) ? " dk-cal-between" : "")} onClick={() => handleSelectDate(d)}>
                    <span className="dk-cal-jour-nom">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                    <span className="dk-cal-jour-num">{d.toLocaleDateString("fr-FR", { day: "numeric" })}</span>
                    <span className="dk-cal-jour-mois">{d.toLocaleDateString("fr-FR", { month: "short" })}</span>
                    {j <= 15 && <span className={"dk-cal-urgence dk-cal-urgence-" + urg}>J-{j}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liste châteaux */}
          <div className="dk-liste">
            <div className="dk-liste-header">
              <span className="dk-liste-nb">{chateauxFiltres.length}</span>
              {" "}domaine{chateauxFiltres.length > 1 ? "s" : ""} disponible{chateauxFiltres.length > 1 ? "s" : ""}
              {dateArrivee && dateDepart && <span className="dk-liste-dates"> · {formatDate(dateArrivee)} → {formatDate(dateDepart)}</span>}
            </div>
            <div className="dk-liste-items">
              {chateauxFiltres.map(c => {
                const classBadge = { "J-7": "dk-badge-j7", "J-10": "dk-badge-j10", "J-15": "dk-badge-j15" }[c.urgence] || "dk-badge-j15";
                const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : c.chambres?.[0]?.prix;
                return (
                  <div
                    key={c.id}
                    className={"dk-liste-item " + (chateauSurvol === c.id ? "survol" : "")}
                    onClick={() => setTransitionChateau(c)}
                    onMouseEnter={() => survolChateau(c.id)}
                    onMouseLeave={() => setChateauSurvol(null)}
                  >
                    <div className="dk-liste-item-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                      {c.urgence && <span className={"dk-badge dk-badge-sm " + classBadge}>{c.urgence}</span>}
                    </div>
                    <div className="dk-liste-item-info">
                      <div className="dk-liste-item-region">{c.region} · {c.distanceParis}</div>
                      <div className="dk-liste-item-nom">{c.nom}</div>
                      <div className="dk-liste-item-prix">
                        {c.prixBarre && <span className="dk-liste-prix-barre">{c.prixBarre} €</span>}
                        {prixFinal && <span className="dk-liste-prix-final">{prixFinal} € <span className="dk-liste-prix-nuit">/ nuit</span></span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── CARTE DROITE ── */}
        <div ref={mapRef} className="dk-carte-zone" />
      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <ChateauModal chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </div>
  );
}
