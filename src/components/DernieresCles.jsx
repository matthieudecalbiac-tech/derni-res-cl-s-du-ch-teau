import { useState, useEffect, useRef } from "react";
import { chateaux } from "../data/chateaux";
import ChateauModal from "./ChateauModal";
import TransitionPorte from "./TransitionPorte";
import "../styles/espace-membre.css";
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
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 60);
    const onKey = (e) => { if (e.key === "Escape" && !chateauSelectionne) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, chateauSelectionne]);

  // Init Leaflet
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    if (!L) return;
    const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "\u00a9 OpenStreetMap"
    }).addTo(map);
    map.setView([46.8, 2.5], 6);
    mapInstanceRef.current = map;
  }, [visible]);

  // Marqueurs
  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    chateauxFiltres.filter(c => c.coordonnees).forEach(c => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#C09840;border:2px solid #EDD880;box-shadow:0 0 10px rgba(192,152,64,0.7);cursor:pointer"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([c.coordonnees.lat, c.coordonnees.lng], { icon })
        .addTo(map)
        .bindPopup(`<div style="font-family:serif;min-width:160px"><strong>${c.nom}</strong><br/><span style="color:#888;font-size:0.85em">${c.region} · ${c.distanceParis}</span><br/><span style="color:#C09840;font-size:0.85em">${c.urgence}</span></div>`);
      markersRef.current.push(marker);
    });
  });

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

  return (
    <div className={"em-overlay " + (visible ? "em-overlay--visible" : "")}>
      <header className="em-header">
        <div className="em-header-gauche">
          <span className="em-header-lys">&#x269C;</span>
          <span className="em-header-titre">Les Clés du Château</span>
          <span className="em-header-sep">·</span>
          <span className="em-header-club">Les Dernières Clés</span>
        </div>
        <div className="em-header-droite">
          <button className="em-btn-retour" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="dk-hero">
        <div className="dk-hero-bg" />
        <div className="dk-hero-contenu">
          <div className="em-orn"><div className="em-orn-ligne" /><span className="em-orn-lys">&#x269C;</span><div className="em-orn-ligne" /></div>
          <p className="dk-surtitre">Sélection · Dernière minute · J-7 à J-15</p>
          <h1 className="dk-titre">Les Dernières Clés du Château</h1>
          <p className="dk-accroche">Des créneaux rares, libérés par les châteaux partenaires. Choisissez vos dates.</p>
        </div>
      </div>

      {/* Sélecteur de dates */}
      <div className="dk-dates-section">
        <div className="dk-dates-header">
          <div className="dk-dates-etapes">
            <div className={"dk-dates-etape " + (etape === "arrivee" ? "actif" : dateArrivee ? "done" : "")}>
              <span className="dk-dates-etape-num">1</span>
              <div><span className="dk-dates-etape-label">Arrivée</span><span className="dk-dates-etape-val">{dateArrivee ? formatDate(dateArrivee) : "Choisissez une date"}</span></div>
            </div>
            <div className="dk-dates-sep">→</div>
            <div className={"dk-dates-etape " + (etape === "depart" ? "actif" : dateDepart ? "done" : "")}>
              <span className="dk-dates-etape-num">2</span>
              <div><span className="dk-dates-etape-label">Départ</span><span className="dk-dates-etape-val">{dateDepart ? formatDate(dateDepart) : "Choisissez une date"}</span></div>
            </div>
          </div>
          {dateArrivee && <button className="dk-dates-reset" onClick={reset}>Effacer</button>}
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
        {dateArrivee && (
          <div className="dk-dates-resultat">
            {dateDepart
              ? <p><span className="dk-dates-res-nb">{chateauxFiltres.length}</span> château{chateauxFiltres.length > 1 ? "x" : ""} disponible{chateauxFiltres.length > 1 ? "s" : ""} du <strong>{formatDate(dateArrivee)}</strong> au <strong>{formatDate(dateDepart)}</strong></p>
              : <p>Sélectionnez votre date de départ</p>}
          </div>
        )}
      </div>

      {/* Corps 2 colonnes */}
      <div className="dk-corps-wrap">

        {/* Carte Leaflet */}
        <div className="dk-carte-col">
          <div className="dk-carte-titre">
            <span className="dk-carte-titre-lys">&#x269C;</span>
            <span>Localisation des châteaux</span>
          </div>
          <div ref={mapRef} className="dk-carte-osm-wrap" />
          <div className="dk-carte-legende">
            <span className="dk-carte-legende-nb">{chateauxFiltres.length}</span>
            {" "}domaine{chateauxFiltres.length > 1 ? "s" : ""} disponible{chateauxFiltres.length > 1 ? "s" : ""}
          </div>
        </div>

        {/* Grille châteaux */}
        <div className="dk-corps">
          <div className="dk-grille">
            {chateauxFiltres.map(c => {
              const classBadge = { "J-7": "dk-badge-j7", "J-10": "dk-badge-j10", "J-15": "dk-badge-j15" }[c.urgence] || "dk-badge-j15";
              const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : c.chambres?.[0]?.prix;
              return (
                <div key={c.id} className="dk-carte" onClick={() => setTransitionChateau(c)}>
                  <div className="dk-carte-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                    <div className="dk-carte-img-overlay" />
                    {c.urgence && <span className={"dk-badge " + classBadge}>{c.urgence}</span>}
                    {c.reduction && <span className="dk-badge-reduction">-{c.reduction} %</span>}
                  </div>
                  <div className="dk-carte-corps">
                    <span className="dk-carte-region">{c.region}</span>
                    <h3 className="dk-carte-nom">{c.nom}</h3>
                    <p className="dk-carte-accroche">{c.accroche}</p>
                    <div className="dk-carte-pied">
                      <div className="dk-prix">
                        {c.prixBarre && <span className="dk-prix-barre">{c.prixBarre} €</span>}
                        {prixFinal && <span className="dk-prix-final">{prixFinal} € <span className="dk-prix-nuit">/ nuit</span></span>}
                      </div>
                      <span className="dk-carte-lien">Réserver →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
