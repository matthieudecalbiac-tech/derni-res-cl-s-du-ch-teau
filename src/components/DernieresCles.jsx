import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChateaux } from "../hooks/useChateaux";
import VitrineDernieresCle from "./VitrineDernieresCle";
import TransitionPorte from "./TransitionPorte";
import SkeletonChateau from "./SkeletonChateau";
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

function genererGrilleMois(premierJourMois) {
  const annee = premierJourMois.getFullYear();
  const mois = premierJourMois.getMonth();
  const premier = new Date(annee, mois, 1);
  // getDay() : 0=dim..6=sam ; on veut Lundi=0 => (getDay()+6)%7
  const decalage = (premier.getDay() + 6) % 7;
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cases = [];
  for (let i = 0; i < decalage; i++) cases.push({ date: null, horsMois: true });
  for (let j = 1; j <= nbJours; j++) cases.push({ date: new Date(annee, mois, j), horsMois: false });
  while (cases.length < 42) cases.push({ date: null, horsMois: true });
  return cases;
}

export default function DernieresCles({ onClose }) {
  const navigate = useNavigate();
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [visible, setVisible] = useState(false);

  // Sprint S2-α.1.5 FIX D : ouvrir la nouvelle vitrine Module B via la route
  // canonique avec ?onglet=dernieresCles. onClose() en amont pour éviter
  // l'overlay fantôme au retour /. TransitionPorte animation perdue sur ce path
  // (trade-off SEO+cohérence URL). VitrineDernieresCle.jsx devient orphelin
  // (dette nettoyage Sprint S5).
  const ouvrirChateauModuleB = (c) => {
    onClose?.();
    navigate(`/chateau/${c.slug}?onglet=dernieresCles`);
  };
  const [dateArrivee, setDateArrivee] = useState(null);
  const [dateDepart, setDateDepart] = useState(null);
  const [etape, setEtape] = useState("arrivee");
  const [moisAffiche, setMoisAffiche] = useState(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // 1er jour du mois actuellement affiché dans le calendrier mensuel
  const [voyageurs, setVoyageurs] = useState(2);
  // DECORATIF — aucune capacité dans les données château. Ne filtre rien.
  // À brancher au sprint dispo/capacité Supabase (cf brique disponibilités transverse).
  const [nbNuits, setNbNuits] = useState(null);
  // nb de nuits choisi via le sélecteur ; pilote la date de départ si arrivée fixée.
  const [filtreRegion, setFiltreRegion] = useState("toutes");
  const [filtreTri, setFiltreTri] = useState("pertinence");
  const [chateauSurvol, setChateauSurvol] = useState(null);
  const { chateaux, loading, error } = useChateaux();
  // Audit Fondation J2 — P0-2 : ne lister que les châteaux ayant réellement une
  // offre Module B (modules.dernieresCles). Sans ce filtre, un clic sur un
  // château mock (id 1-6, !estLaUne) navigue vers /chateau/<slug> qui redirige
  // aussitôt vers la home (VitrineChateauRoute). Aujourd'hui : Briottières,
  // Blanc Buisson, Chantilly.
  const chateauxFiltres = useMemo(() => {
    let base = chateaux.filter((c) => c.modules?.dernieresCles === true);
    if (filtreRegion !== "toutes") base = base.filter((c) => c.region === filtreRegion);
    return chateauxDisponibles(base, dateArrivee);
  }, [chateaux, dateArrivee, filtreRegion]);

  const prixDe = (c) =>
    c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100))
                : (c.chambres?.[0]?.prix ?? Infinity);
  const chateauxAffiches = useMemo(() => {
    const arr = [...chateauxFiltres];
    if (filtreTri === "prix-asc") arr.sort((a, b) => prixDe(a) - prixDe(b));
    else if (filtreTri === "prix-desc") arr.sort((a, b) => prixDe(b) - prixDe(a));
    return arr; // "pertinence" = ordre naturel (pas de tri)
  }, [chateauxFiltres, filtreTri]);

  const regionsDispo = useMemo(() => {
    const base = chateaux.filter((c) => c.modules?.dernieresCles === true);
    return ["toutes", ...Array.from(new Set(base.map((c) => c.region))).sort()];
  }, [chateaux]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 60);
    const onKey = (e) => { if (e.key === "Escape" && !chateauSelectionne) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose, chateauSelectionne]);

  const dates = getDatesPossibles();

  const handleSelectDate = (d) => {
    if (etape === "arrivee") {
      setDateArrivee(d);
      if (nbNuits) {
        const dep = new Date(d);
        dep.setDate(dep.getDate() + nbNuits);
        setDateDepart(dep);
        setEtape("done");
      } else {
        setDateDepart(null);
        setEtape("depart");
      }
    } else {
      if (d > dateArrivee) { setDateDepart(d); setEtape("done"); }
      else { setDateArrivee(d); setDateDepart(null); setEtape("depart"); }
    }
  };

  const choisirNuits = (n) => {
    setNbNuits(n);
    if (dateArrivee) {
      const dep = new Date(dateArrivee);
      dep.setDate(dep.getDate() + n);
      setDateDepart(dep);
      setEtape("done");
    }
  };

  const reset = () => { setDateArrivee(null); setDateDepart(null); setEtape("arrivee"); setNbNuits(null); };
  const moisPrecedent = () =>
    setMoisAffiche(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const moisSuivant = () =>
    setMoisAffiche(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const isArrivee = (d) => dateArrivee && d.toDateString() === dateArrivee.toDateString();
  const isDepart = (d) => dateDepart && d.toDateString() === dateDepart.toDateString();
  const isBetween = (d) => dateArrivee && dateDepart && d > dateArrivee && d < dateDepart;

  const survolChateau = (id) => {
    setChateauSurvol(id);
  };

  const estSelectionnable = (d) => {
    if (!d) return false;
    const j = joursAvant(d);
    return j >= 1 && j <= 30;
  };
  // garde la même fenêtre J+1..J+30 que la bande actuelle, pour cohérence du filtrage

  const labelMois = moisAffiche.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const nuitsEffectives = (dateArrivee && dateDepart)
    ? Math.round((dateDepart - dateArrivee) / 86400000)
    : nbNuits;

  return (
    <div className={"dk-overlay " + (visible ? "dk-overlay--visible" : "")}>
      <header className="dk-topbar">
        <button className="dk-topbar-logo" onClick={onClose} aria-label="Accueil">
          <img src="/L1.png" alt="" aria-hidden="true" className="dk-topbar-embleme" />
          <img src="/L2.png" alt="Les Clés du Château" className="dk-topbar-wordmark" />
        </button>
        <span className="dk-topbar-titre">Dernières clés</span>
      </header>

      <div className="dk-page">

        {/* SECTION 1 : HERO éditorial */}
        <section className="dk-section dk-section-hero">
          <div className="dk-orn"><div className="dk-orn-ligne" /><span className="dk-orn-lys">&#x269C;</span><div className="dk-orn-ligne" /></div>
          <h2 className="dk-panneau-titre">Les Dernières Clés</h2>
          <p className="dk-panneau-accroche">Des séjours rares, à saisir. Choisissez vos dates.</p>
        </section>

        {/* SECTION 2 : DATES */}
        <section className="dk-section dk-section-dates">
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

            <div className="dk-cal-mois">
              <div className="dk-cal-nav">
                <button className="dk-cal-nav-btn" onClick={moisPrecedent} aria-label="Mois précédent">‹</button>
                <span className="dk-cal-nav-label">{labelMois}</span>
                <button className="dk-cal-nav-btn" onClick={moisSuivant} aria-label="Mois suivant">›</button>
              </div>
              <div className="dk-cal-grille">
                {["Lu","Ma","Me","Je","Ve","Sa","Di"].map((j) => (
                  <span key={j} className="dk-cal-jour-entete">{j}</span>
                ))}
                {genererGrilleMois(moisAffiche).map((caseJour, i) => {
                  if (!caseJour.date) return <span key={i} className="dk-cal-case dk-cal-case-vide" />;
                  const d = caseJour.date;
                  const selectionnable = estSelectionnable(d);
                  const classes =
                    "dk-cal-case" +
                    (selectionnable ? " dk-cal-case-dispo" : " dk-cal-case-off") +
                    (isArrivee(d) ? " dk-cal-arrivee" : "") +
                    (isDepart(d) ? " dk-cal-depart" : "") +
                    (isBetween(d) ? " dk-cal-between" : "");
                  return (
                    <button
                      key={i}
                      className={classes}
                      disabled={!selectionnable}
                      onClick={() => selectionnable && handleSelectDate(d)}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="dk-selecteurs">
              <div className="dk-selecteur">
                <span className="dk-selecteur-label">Nombre de nuits</span>
                <div className="dk-selecteur-options">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={"dk-selecteur-opt " + (nuitsEffectives === n ? "actif" : "")}
                      onClick={() => choisirNuits(n)}
                    >
                      {n} {n > 1 ? "nuits" : "nuit"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dk-selecteur">
                <span className="dk-selecteur-label">Voyageurs</span>
                <div className="dk-selecteur-options">
                  {[1, 2, 3, 4].map((v) => (
                    <button
                      key={v}
                      className={"dk-selecteur-opt " + (voyageurs === v ? "actif" : "")}
                      onClick={() => setVoyageurs(v)}
                    >
                      {v}{v === 4 ? "+" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 : FILTRES (réservé, rempli en étape D) */}
        <section className="dk-section dk-section-filtres">
          <div className="dk-filtres-barre">
            <div className="dk-filtre">
              <label className="dk-filtre-label">Région</label>
              <select className="dk-filtre-select" value={filtreRegion} onChange={(e) => setFiltreRegion(e.target.value)}>
                {regionsDispo.map((r) => (
                  <option key={r} value={r}>{r === "toutes" ? "Toutes les régions" : r}</option>
                ))}
              </select>
            </div>
            <div className="dk-filtre">
              <label className="dk-filtre-label">Trier par</label>
              <select className="dk-filtre-select" value={filtreTri} onChange={(e) => setFiltreTri(e.target.value)}>
                <option value="pertinence">Pertinence</option>
                <option value="prix-asc">Prix croissant</option>
                <option value="prix-desc">Prix décroissant</option>
              </select>
            </div>
          </div>
        </section>

        {/* SECTION 4 : GRILLE */}
        <section className="dk-section dk-section-grille">
          <div className="dk-liste">
            <div className="dk-liste-header">
              <span className="dk-liste-nb">{chateauxAffiches.length}</span>
              {" "}domaine{chateauxAffiches.length > 1 ? "s" : ""} disponible{chateauxAffiches.length > 1 ? "s" : ""}
              {dateArrivee && dateDepart && <span className="dk-liste-dates"> · {formatDate(dateArrivee)} → {formatDate(dateDepart)}</span>}
            </div>
            <div className="dk-liste-items">
              {loading ? (
                <SkeletonChateau count={6} />
              ) : (
                chateauxAffiches.map(c => {
                const classBadge = { "J-7": "dk-badge-j7", "J-10": "dk-badge-j10", "J-15": "dk-badge-j15" }[c.urgence] || "dk-badge-j15";
                const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : c.chambres?.[0]?.prix;
                return (
                  <div
                    key={c.id}
                    className={"dk-liste-item " + (chateauSurvol === c.id ? "survol" : "")}
                    onClick={() => ouvrirChateauModuleB(c)}
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
                        {c.prixBarre && <span className="dk-liste-prix-barre">{c.prixBarre} €</span>}
                        {prixFinal && <span className="dk-liste-prix-final">{prixFinal} € <span className="dk-liste-prix-nuit">/ nuit</span></span>}
                      </div>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        </section>

      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <VitrineDernieresCle chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </div>
  );
}