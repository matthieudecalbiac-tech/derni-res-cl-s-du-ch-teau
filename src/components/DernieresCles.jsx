import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useChateaux } from "../hooks/useChateaux";
import { getSlugsAvecOffreDernieresCles } from "../services/offresService.js";
import {
  chateauxDisponibles,
  datesAvecOffre,
  predicatDateOuverte,
} from "../services/disponibilitesService.js";
import CalendrierDK from "./CalendrierDK";
import SkeletonChateau from "./SkeletonChateau";
import { formatDate } from "../utils/dates";
import "../styles/dernieres-cles.css";

export default function DernieresCles({ onClose }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Sprint S2-α.1.5 FIX D : ouvrir la nouvelle vitrine Module B via la route
  // canonique avec ?onglet=dernieresCles. onClose() en amont pour éviter
  // l'overlay fantôme au retour /. TransitionPorte animation perdue sur ce path
  // (trade-off SEO+cohérence URL).
  //
  // Etape 2 refonte Prop 3 : la branche legacy est retiree. `transitionChateau`
  // et `chateauSelectionne` n'etaient plus jamais renseignes depuis ce FIX D —
  // aucun `setTransitionChateau(valeur)` dans le fichier — donc TransitionPorte
  // et VitrineDernieresCle etaient montes sur une condition toujours fausse.
  // VitrineDernieresCle.jsx et sa feuille sont supprimes ; TransitionPorte
  // reste, elle sert toujours a App.jsx et VitrinePermanente.
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
  const [filtreRegion, setFiltreRegion] = useState("toutes");
  const [filtreTri, setFiltreTri] = useState("pertinence");
  const [chateauSurvol, setChateauSurvol] = useState(null);
  const { chateaux, loading, error } = useChateaux();
  // Slugs des chateaux ayant une offre Dernieres Cles reelle. null tant que non charge :
  // on attend cette source comme on attend les chateaux, pour ne pas afficher de grille vide.
  const [slugsAvecOffre, setSlugsAvecOffre] = useState(null);
  // Jours ouverts du calendrier. `null` = pas encore su (cf. estSelectionnable).
  const [datesOuvertes, setDatesOuvertes] = useState(null);
  // Audit Fondation J2 — P0-2 : ne lister que les châteaux ayant réellement une
  // offre Module B visible (le Set slugsAvecOffre, interrogé en base). Sans ce
  // filtre, un clic sur un château sans offre navigue vers /chateau/<slug> qui
  // n'aurait rien à montrer sous l'onglet Dernières Clés.
  const chateauxFiltres = useMemo(() => {
    let base = chateaux.filter((c) => slugsAvecOffre?.has(c.slug));
    if (filtreRegion !== "toutes") base = base.filter((c) => c.region === filtreRegion);
    return chateauxDisponibles(base, dateArrivee);
  }, [chateaux, dateArrivee, filtreRegion, slugsAvecOffre]);

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
    const base = chateaux.filter((c) => slugsAvecOffre?.has(c.slug));
    return ["toutes", ...Array.from(new Set(base.map((c) => c.region))).sort()];
  }, [chateaux, slugsAvecOffre]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 60);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => {
    let annule = false;
    getSlugsAvecOffreDernieresCles()
      .then((set) => { if (!annule) setSlugsAvecOffre(set); })
      .catch(() => { if (!annule) setSlugsAvecOffre(new Set()); }); // en cas d'echec, grille vide plutot que plantage
    return () => { annule = true; };
  }, []);

  // Les jours que le calendrier ouvre. Même patron de cancellation, même
  // repli : en cas d'échec, aucune date ouverte plutôt qu'un écran cassé.
  useEffect(() => {
    let annule = false;
    datesAvecOffre()
      .then((set) => { if (!annule) setDatesOuvertes(set); })
      .catch(() => { if (!annule) setDatesOuvertes(new Set()); });
    return () => { annule = true; };
  }, []);

  // Le nombre de nuits n'est plus SAISI, il est LU sur la plage. Le premier
  // clic pose donc toujours l'arrivee et passe au depart : la branche qui
  // deduisait un depart d'un nombre de nuits pre-choisi n'a plus d'objet.
  const handleSelectDate = (d) => {
    if (etape === "arrivee") {
      setDateArrivee(d);
      setDateDepart(null);
      setEtape("depart");
    } else {
      if (d > dateArrivee) { setDateDepart(d); setEtape("done"); }
      else { setDateArrivee(d); setDateDepart(null); setEtape("depart"); }
    }
  };

  const reset = () => { setDateArrivee(null); setDateDepart(null); setEtape("arrivee"); };
  const moisPrecedent = () =>
    setMoisAffiche(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const moisSuivant = () =>
    setMoisAffiche(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const survolChateau = (id) => {
    setChateauSurvol(id);
  };

  // Étape 3 refonte Prop 3 : le calendrier n'ouvre plus J+1..J+30 uniformément.
  // Il ouvre les dates qui ont RÉELLEMENT une offre, calculées par la fonction
  // sœur du service. Le composant ne fabrique aucune règle et ne lit aucune clé
  // de date : il reçoit un Set et en fait un prédicat via la fabrique du module.
  //
  // `null` tant que ça charge → prédicat toujours faux → aucune case active.
  // C'est volontaire : ouvrir par défaut afficherait des dates qu'on n'a pas
  // encore vérifiées, et un clic dessus mènerait à une liste vide.
  const estSelectionnable = predicatDateOuverte(datesOuvertes);

  // Nombre de nuits — DERIVE, jamais saisi. Le selecteur « Nombre de nuits »
  // faisait double emploi avec le calendrier : deux facons de dire la meme
  // chose, qui pouvaient se contredire. La plage est desormais la seule source,
  // et ceci n'en est que la lecture. `null` tant que la plage est incomplete.
  const nuits = (dateArrivee && dateDepart)
    ? Math.round((dateDepart - dateArrivee) / 86400000)
    : null;

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

        <div className="dk-tete">

        {/* SECTION 1 : HERO éditorial */}
        <section className="dk-section dk-section-hero">
          <div className="dk-orn"><div className="dk-orn-ligne" /><span className="dk-orn-lys">&#x269C;</span><div className="dk-orn-ligne" /></div>
          <h2 className="dk-panneau-titre">Dernières clés</h2>
          <p className="dk-hero-soustitre">Les offres de dernière minute</p>
          <div className="dk-hero-sep"><span className="dk-hero-sep-l" /><span className="dk-hero-sep-pt">&#x2756;</span><span className="dk-hero-sep-l" /></div>
          <p className="dk-panneau-accroche"><strong>Des séjours rares, à saisir sur leurs créneaux d’exception. Choisissez vos dates.</strong></p>
          <p className="dk-hero-para">Accédez à une sélection confidentielle de demeures disponibles, pour des escapades aussi brèves que mémorables.</p>
        </section>

        {/* SECTION 2 : DATES */}
        <section className="dk-section dk-section-dates">
          <div className="dk-dates-bloc">
            <div className="dk-bloc-cal">
              <CalendrierDK
                moisAffiche={moisAffiche}
                dateArrivee={dateArrivee}
                dateDepart={dateDepart}
                estSelectionnable={estSelectionnable}
                onSelectDate={handleSelectDate}
                onMoisPrecedent={moisPrecedent}
                onMoisSuivant={moisSuivant}
              />
            </div>

            <div className="dk-bloc-selection">
              <span className="dk-bloc-selection-titre">Sélection actuelle</span>
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

            {/* La duree, en LECTURE seule. Elle remplace le selecteur « Nombre
                de nuits » : celui-ci disait la meme chose que le calendrier, et
                deux sources pour un meme fait finissent toujours par diverger.
                Ne s'affiche qu'une fois la plage complete — avant, il n'y a
                rien a lire. */}
            {nuits !== null && (
              <span className="dk-dates-duree">{nuits} {nuits > 1 ? "nuits" : "nuit"}</span>
            )}

            <div className="dk-selecteurs">
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
          </div>
        </section>

        </div>

        {/* SECTION 3 : FILTRES (réservé, rempli en étape D) */}
        <section className="dk-section dk-section-filtres">
          <div className="dk-filtres-barre">
            <div className="dk-filtres-titre">
              <svg className="dk-filtres-ico" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <line x1="3" y1="6" x2="17" y2="6" stroke="#C09840" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="3" y1="10" x2="17" y2="10" stroke="#C09840" strokeWidth="1.3" strokeLinecap="round"/>
                <line x1="3" y1="14" x2="17" y2="14" stroke="#C09840" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="7" cy="6" r="2" fill="#FEFCF8" stroke="#C09840" strokeWidth="1.3"/>
                <circle cx="13" cy="10" r="2" fill="#FEFCF8" stroke="#C09840" strokeWidth="1.3"/>
                <circle cx="9" cy="14" r="2" fill="#FEFCF8" stroke="#C09840" strokeWidth="1.3"/>
              </svg>
              <span className="dk-filtres-titre-txt">Filtrer les offres</span>
            </div>
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
              {loading || slugsAvecOffre === null ? (
                <SkeletonChateau count={6} />
              ) : (
                chateauxAffiches.map(c => {
                const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : c.chambres?.[0]?.prix;
                return (
                  <div
                    key={c.id}
                    className={"dk-carte-offre " + (chateauSurvol === c.id ? "survol" : "")}
                    onClick={() => ouvrirChateauModuleB(c)}
                    onMouseEnter={() => survolChateau(c.id)}
                    onMouseLeave={() => setChateauSurvol(null)}
                  >
                    <div className="dk-carte-offre-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                      {/* badge fixe — à brancher sur chambresRestantes/dispo au sprint Supabase */}
                      <span className="dk-carte-offre-badge">DISPONIBLE</span>
                    </div>
                    <div className="dk-carte-offre-corps">
                      <div className="dk-carte-offre-region">{c.region} · {c.distanceParis}</div>
                      <div className="dk-carte-offre-nom">{c.nom}</div>
                      <div className="dk-carte-offre-prix">
                        {c.prixBarre && <span className="dk-carte-offre-prix-barre">{c.prixBarre} €</span>}
                        {prixFinal && <span className="dk-carte-offre-prix-final">{prixFinal} € <span className="dk-carte-offre-prix-nuit">/ nuit</span></span>}
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
    </div>
  );
}