import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Regroupement des marqueurs — MOBILE UNIQUEMENT (cf. l'effet de creation de
// la carte). Le paquet s'enregistre sur le L global au chargement : il faut
// donc l'importer APRES leaflet, et il ajoute L.markerClusterGroup.
// Seul le CSS de base est importe ; MarkerCluster.Default.css (le bleu Leaflet)
// est volontairement OMIS — le style des clusters est repris dans
// carte-interactive.css, a la palette LCC.
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { formatDate } from "../utils/dates";
import { prixAffiche } from "../utils/derivePrix";
import { capaciteSuffisante } from "../utils/capacite";
import { chateauPorteEquipements } from "../utils/equipements";
import { getEquipements } from "../services/chateauxService";
import CalendrierPlage from "./CalendrierPlage";
import GrilleEquipements from "./GrilleEquipements";
import "../styles/carte-interactive.css";

export default function CarteInteractive({ chateaux, dateArrivee, dateDepart, etapeDate, onSelectDate, onResetDates, invites, setInvites, onVoirChateau }) {
  const conteneurRef = useRef(null);
  const carteRef = useRef(null);
  const [survolId, setSurvolId] = useState(null);
  const [calOuvert, setCalOuvert] = useState(false);
  const [voyOuvert, setVoyOuvert] = useState(false);
  const [apercuChateau, setApercuChateau] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(null);

  // Liste des vignettes en MOBILE : repli, pas defaut. Sous 768 la carte est
  // plein ecran et la liste remonte du bas a la demande (carte-interactive.css
  // la reduit a un panneau escamotable ; au-dessus du seuil cet etat n'a aucun
  // effet, la liste reste la colonne de gauche du split).
  const [listeMobile, setListeMobile] = useState(false);

  // ── Drapeau mobile, au niveau du composant ───────────────────────────────
  // Le rendu lui-meme differe sous le seuil : en desktop l'apercu REMPLACE la
  // carte (ternaire historique, inchange) ; en mobile il monte du bas en fiche
  // compacte AU-DESSUS d'une carte qui reste vivante. Aucune feuille de style ne
  // peut exprimer ca — il faut le savoir en JS.
  // Reactif (listener) et non lu une seule fois : un changement d'orientation
  // doit rebasculer le rendu, sinon on garderait une fiche de travers.
  const [estMobile, setEstMobile] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function"
      && window.matchMedia("(max-width: 768px)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const surChangement = (e) => setEstMobile(e.matches);
    mq.addEventListener("change", surChangement);
    return () => mq.removeEventListener("change", surChangement);
  }, []);

  // La carte est-elle MONTEE ? En desktop elle disparait quand l'apercu s'ouvre
  // (le conteneur est demonte par le ternaire) ; en mobile elle reste toujours
  // la. Cette valeur pilote l'effet de creation : sans elle, chaque tap sur un
  // marqueur detruirait et reconstruirait la carte en mobile — et le cadrage
  // reviendrait a zero a chaque fiche ouverte.
  const carteMontee = estMobile || !apercuChateau;

  // Glissement vers le bas pour refermer la fiche mobile. Etat purement gestuel :
  // il n'existe que le temps du doigt sur l'ecran.
  const toucheY = useRef(null);
  const [glissement, setGlissement] = useState(0);

  // Filtre "Sur place" (equipements) — etat LOCAL, meme grain que dates/invites.
  const [equipOuvert, setEquipOuvert] = useState(false);
  const [equipements, setEquipements] = useState([]); // slugs coches
  const [equipRef, setEquipRef] = useState([]); // referentiel [{slug,libelle,ordre}]

  // Referentiel equipements : chargement unique au montage.
  useEffect(() => {
    let cancelled = false;
    getEquipements()
      .then((liste) => { if (!cancelled) setEquipRef(liste); })
      .catch((e) => console.error("[CarteInteractive] getEquipements:", e));
    return () => { cancelled = true; };
  }, []);

  const toggleEquipement = (slug) =>
    setEquipements((cur) =>
      cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]
    );

  // La carte ne montre que les chateaux reels (!isDemoMock) : seuls routables vers
  // une vraie vitrine. Puis filtre capacite (voyageurs herites de la barre).
  // Un seul tableau alimente la liste ET les marqueurs.
  // Memoise : reference stable tant que les entrees (chateaux, capacite) ne
  // changent pas -> l'effet marqueurs peut en dependre EXPLICITEMENT sans se
  // reconstruire a chaque rendu. Les futurs filtres (equipements) s'ajouteront
  // ici : reels change -> les marqueurs se reposent.
  const totalInvites = invites ? invites.adultes + invites.enfants : 0;
  const reels = useMemo(
    () =>
      (chateaux || [])
        .filter((c) => !c.isDemoMock)
        .filter((c) => capaciteSuffisante(c, totalInvites))
        // Filtre "Sur place" : meme predicat ET que /resultats (helper partage).
        .filter((c) => chateauPorteEquipements(c, equipements)),
    [chateaux, totalInvites, equipements]
  );

  useEffect(() => {
    if (!conteneurRef.current || carteRef.current) return;

    const carte = L.map(conteneurRef.current, {
      center: [46.7, 2.3],
      zoom: 6,
      scrollWheelZoom: true,
      zoomSnap: 0,
      attributionControl: true,
    });
    carteRef.current = carte;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(carte);

    // ── REGROUPEMENT DES MARQUEURS : MOBILE UNIQUEMENT ──────────────────────
    // Mesure du 6 aout 2026 a 375 px : les 7 demeures, toutes a moins de 3 h de
    // Paris, tiennent dans une zone de 43x77 px. CINQ marqueurs sur sept etaient
    // recouverts par un autre a leur centre — physiquement intapables.
    //
    // Le desktop n'a pas ce probleme (la carte y fait plus de 900 px de large) et
    // ne doit RIEN changer : d'ou la condition. C'est le seul endroit du projet
    // ou une bascule mobile se joue en JS plutot qu'en CSS, parce qu'un
    // regroupement de marqueurs n'a aucune expression en feuille de style.
    //
    // ⚠ Lu UNE FOIS a la creation de la carte. Une rotation d'ecran ne rebascule
    //   pas : la carte se recree a l'ouverture de la modale, ce qui couvre le cas
    //   reel (on ouvre la carte dans l'orientation ou on la consulte).
    const estMobile =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 768px)").matches;

    // Garde : si le paquet n'a pas charge, on retombe sur les marqueurs nus
    // plutot que de casser la carte.
    const clusterDispo = typeof L.markerClusterGroup === "function";

    const groupe = estMobile && clusterDispo
      ? L.markerClusterGroup({
          // 45 px : deux pastilles de prix cote a cote en font ~120 ; en dessous
          // de ce rayon elles se chevauchent encore.
          maxClusterRadius: 45,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          // Le zoom max de regroupement est laisse au defaut : en zoomant, les
          // clusters se defont d'eux-memes jusqu'aux marqueurs individuels.
          iconCreateFunction: (cluster) =>
            L.divIcon({
              className: "ci-cluster-wrap",
              html: `<span class="ci-cluster">${cluster.getChildCount()}</span>`,
              iconSize: null,
            }),
        })
      : null;

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
      const marqueur = L.marker([lat, lng], { icon: icone });
      marqueur.on("click", () => setApercuChateau(c));
      marqueur.on("mouseover", () => setSurvolId(c.id));
      marqueur.on("mouseout", () => setSurvolId(null));
      if (groupe) groupe.addLayer(marqueur);
      else marqueur.addTo(carte);
    });
    if (groupe) carte.addLayer(groupe);

    // Taper le fond de carte referme la fiche. Leaflet n'emet `click` sur la
    // carte que HORS marqueur : taper un autre chateau enchaine donc d'une fiche
    // a l'autre sans fermeture intermediaire, ce qui est tout l'interet d'avoir
    // garde la carte vivante derriere.
    carte.on("click", () => setApercuChateau(null));

    // Bornes de la France metropolitaine : garantit que le pays entier tient
    // dans le conteneur, quelle que soit sa taille (un zoom fixe ne le peut pas).
    const BORNES_FRANCE = L.latLngBounds([42.3, -5.2], [51.1, 8.3]);

    // ── CADRAGE ────────────────────────────────────────────────────────────
    // DESKTOP : les bornes de la France, inchangé.
    //
    // MOBILE : les bornes des DEMEURES. Un ecran de 375x735 est deux fois plus
    // haut que large, alors que la France est a peu pres carree en distances
    // reelles. Ajuster sa largeur dans 343 px impose un zoom si faible que la
    // hauteur deborde de Glasgow a Gibraltar — la France se retrouve minuscule
    // au centre. Cadrer sur les demeures (toutes a moins de 3 h de Paris) donne
    // le nord-centre de la France en plein cadre : c'est ce qu'on est venu voir.
    const bornesDemeures = () => {
      const pts = reels
        .map((c) => [c.coordonnees?.lat, c.coordonnees?.lng])
        .filter(([a, b]) => typeof a === "number" && typeof b === "number");
      return pts.length ? L.latLngBounds(pts) : null;
    };

    // Le recadrage automatique n'a lieu QU'UNE FOIS. Les appels suivants du
    // ResizeObserver se contentent d'invalidateSize : sans ce garde-fou, une
    // rotation d'ecran ramenerait brutalement le visiteur au cadrage initial et
    // effacerait son exploration.
    let cadrageFait = false;
    const cadrer = () => {
      carte.invalidateSize();
      if (cadrageFait) return;
      const cible = estMobile ? (bornesDemeures() || BORNES_FRANCE) : BORNES_FRANCE;
      // Padding genereux en mobile : les pastilles de prix depassent du point,
      // et le rappel « Liste » occupe le bas de l'ecran.
      carte.fitBounds(cible, { padding: estMobile ? [46, 70] : [20, 20] });
      cadrageFait = true;
    };
    const t = setTimeout(cadrer, 120);

    // ⚠ UN SEUL invalidateSize A 120 ms NE SUFFIT PAS.
    // En plein ecran mobile, la hauteur du conteneur vient d'un flex:1 dans un
    // parent en 100dvh : elle se stabilise APRES ce delai. Leaflet gardait alors
    // la taille d'avant — mesure du 6 aout : 8 tuiles demandees pour un
    // conteneur de 735 px de haut (il en faut une douzaine), et la carte
    // s'affichait en aplat gris, tuiles chargees mais posees hors du cadre.
    // Le ResizeObserver recadre a CHAQUE changement de taille reel : il couvre
    // ce cas, la rotation d'ecran, et l'ouverture du panneau liste.
    const ro = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => cadrer())
      : null;
    if (ro && conteneurRef.current) ro.observe(conteneurRef.current);

    return () => {
      clearTimeout(t);
      if (ro) ro.disconnect();
      carte.remove();
      carteRef.current = null;
    };
    // Depend de la liste FILTREE (reels), pas de `chateaux` brut ni de la
    // reference instable `onVoirChateau` (non utilisee dans cet effet) : un
    // useCallback pose un jour sur onVoirChateau ne pourrait plus casser le
    // filtrage en silence. `carteMontee` remplace `apercuChateau` : en desktop
    // il en est l'inverse exact (meme comportement qu'avant), mais en mobile il
    // reste vrai en permanence — la carte n'est plus detruite a chaque fiche.
  }, [reels, carteMontee]);

  // Sens vignette -> pastille : au survol d'une vignette (survolId), surligne la
  // pastille correspondante. Les pastilles portent data-id ; querySelector no-op
  // si absente (vue apercu). Nettoie l'ancienne a chaque changement.
  useEffect(() => {
    const root = conteneurRef.current?.closest(".ci-conteneur") || document;
    // retire le surlignage de toutes les pastilles
    root.querySelectorAll(".ci-pastille--survol").forEach((el) => el.classList.remove("ci-pastille--survol"));
    if (survolId != null) {
      const el = root.querySelector(`.ci-pastille[data-id="${survolId}"]`);
      if (el) el.classList.add("ci-pastille--survol");
    }
  }, [survolId]);

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

  const labelDatesFiltre = () => {
    if (dateArrivee && dateDepart) return `${formatDate(dateArrivee)} → ${formatDate(dateDepart)}`;
    if (dateArrivee) return `${formatDate(dateArrivee)} → …`;
    return "Ajouter des dates";
  };

  const prix = apercuChateau ? prixAffiche(apercuChateau) : null;

  return (
    <div className="ci-conteneur">
      {/* DESKTOP : l'apercu REMPLACE la carte — ternaire historique, inchange.
          MOBILE : on ne bascule plus. La fiche compacte monte du bas au-dessus
          d'une carte qui reste vivante (cf. .ci-fiche plus bas). */}
      {!estMobile && apercuChateau ? (
        <div className="ci-apercu">
          <div className="ci-apercu-barre">
            <button type="button" className="ci-apercu-retour" onClick={() => setApercuChateau(null)}>
              ← Retour à la carte
            </button>
            <button type="button" className="ci-apercu-cta" onClick={() => onVoirChateau(apercuChateau)}>
              Voir la vitrine pour réserver →
            </button>
          </div>

          <div className="ci-apercu-photos">
            {(apercuChateau.images || []).slice(0, 3).map((src, i) => (
              <div key={i} className="ci-apercu-photo" style={{ backgroundImage: `url('${src}')` }}
                onClick={() => setPhotoZoom(src)} />
            ))}
          </div>

          <div className="ci-apercu-tete">
            <div className="ci-apercu-region">{apercuChateau.region} · {apercuChateau.distanceParis}</div>
            <h2 className="ci-apercu-nom">{apercuChateau.nom}</h2>
            <p className="ci-apercu-accroche">{apercuChateau.accroche}</p>
          </div>

          {Array.isArray(apercuChateau.chiffresCles) && apercuChateau.chiffresCles.length > 0 && (
            <div className="ci-apercu-chiffres">
              {apercuChateau.chiffresCles.slice(0, 4).map((c, i) => (
                <div key={i} className="ci-apercu-chiffre">
                  <span className="ci-apercu-chiffre-val">{c.valeur ?? c.val}</span>
                  <span className="ci-apercu-chiffre-lab">{c.label ?? c.lab}</span>
                </div>
              ))}
            </div>
          )}

          {/* LE LIEU */}
          {apercuChateau.description && (
            <div className="ci-apercu-section">
              <h3 className="ci-apercu-titre">Le lieu</h3>
              <p className="ci-apercu-texte">{apercuChateau.description}</p>
              <div className="ci-apercu-localisation">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path d="M9 16s5-4.4 5-8.5a5 5 0 0 0-10 0C4 11.6 9 16 9 16Z" stroke="#C09840" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="9" cy="7.5" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
                </svg>
                {apercuChateau.ville}, {apercuChateau.departement} · {apercuChateau.distanceParis}
              </div>
            </div>
          )}

          {/* CHAMBRES */}
          {Array.isArray(apercuChateau.chambres) && apercuChateau.chambres.length > 0 && (
            <div className="ci-apercu-section">
              <h3 className="ci-apercu-titre">Aperçu des chambres</h3>
              <div className="ci-apercu-chambres">
                {apercuChateau.chambres.map((ch, i) => (
                  <div key={i} className="ci-apercu-chambre">
                    {ch.image && (
                      <div className="ci-apercu-chambre-photo" style={{ backgroundImage: `url('${ch.image}')` }}
                        onClick={() => setPhotoZoom(ch.image)} />
                    )}
                    <div className="ci-apercu-chambre-corps">
                      <div className="ci-apercu-chambre-nom">{ch.nom}</div>
                      <div className="ci-apercu-chambre-meta">
                        {ch.superficie ? `${ch.superficie} · ` : ""}{ch.capacite} pers.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SERVICES (illustratifs, a completer) */}
          <div className="ci-apercu-section">
            <h3 className="ci-apercu-titre">Services & prestations</h3>
            <div className="ci-apercu-services">
              {["Spa", "Piscine", "Table d’hôtes", "Parc & jardins", "Animaux bienvenus", "Wifi", "Parking"].map((s) => (
                <span key={s} className="ci-apercu-service">{s}</span>
              ))}
            </div>
            <p className="ci-apercu-services-note">Prestations détaillées à venir</p>
          </div>

          <div className="ci-apercu-pied">
            {prix && <span className="ci-apercu-prix">à partir de <strong>{prix} €</strong> / nuit</span>}
          </div>

          {photoZoom && (
            <div className="ci-lightbox" onClick={() => setPhotoZoom(null)}>
              <button className="ci-lightbox-close" onClick={() => setPhotoZoom(null)} aria-label="Fermer">✕</button>
              <img src={photoZoom} alt="" className="ci-lightbox-img" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </div>
      ) : (
        <>
      {/* BARRE DE FILTRES */}
      <div className="ci-filtres">
        <img src="/FDL-transparent.png" alt="" className="ci-filtres-logo" />
        <div className="ci-filtre-dates">
          <button
            type="button"
            className="ci-filtre-btn"
            onClick={() => setCalOuvert((o) => !o)}
            aria-expanded={calOuvert}
          >
            <svg className="ci-filtre-ico" width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="4.5" width="12" height="10.5" rx="1.5" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 7.5h12M6 3v3M12 3v3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {labelDatesFiltre()}
          </button>
          {calOuvert && (
            <div className="ci-cal-pop">
              <CalendrierPlage
                dateArrivee={dateArrivee}
                dateDepart={dateDepart}
                etape={etapeDate}
                onSelectDate={(d) => {
                  onSelectDate(d);
                  // referme quand la plage est complete (depart pose)
                  if (etapeDate === "depart" && dateArrivee && d > dateArrivee) {
                    setCalOuvert(false);
                  }
                }}
                onReset={onResetDates}
              />
            </div>
          )}
        </div>

        <div className="ci-filtre-voyageurs">
          <button
            type="button"
            className="ci-filtre-btn"
            onClick={() => setVoyOuvert((o) => !o)}
            aria-expanded={voyOuvert}
          >
            <svg className="ci-filtre-ico" width="16" height="16" viewBox="0 0 18 18" fill="none">
              <circle cx="6.8" cy="6.5" r="2.3" stroke="#C09840" strokeWidth="1.5"/>
              <circle cx="12.2" cy="7" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 15c0-2.1 1.7-3.4 3.8-3.4S10.6 12.9 10.6 15" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11.2 11.7c1.9 0 3.3 1.2 3.3 3.3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {invites.adultes + invites.enfants} voyageur{invites.adultes + invites.enfants > 1 ? "s" : ""}
          </button>
          {voyOuvert && (
            <div className="ci-voy-pop">
              <div className="ci-voy-ligne">
                <span className="ci-voy-label">Adultes</span>
                <div className="ci-voy-stepper">
                  <button type="button" className="ci-voy-btn" aria-label="Diminuer les adultes"
                    onClick={() => setInvites((v) => ({ ...v, adultes: Math.max(1, v.adultes - 1) }))}
                    disabled={invites.adultes <= 1}>−</button>
                  <span className="ci-voy-val">{invites.adultes}</span>
                  <button type="button" className="ci-voy-btn" aria-label="Augmenter les adultes"
                    onClick={() => setInvites((v) => ({ ...v, adultes: v.adultes + 1 }))}
                    disabled={invites.adultes + invites.enfants >= 20}>+</button>
                </div>
              </div>
              <div className="ci-voy-ligne">
                <span className="ci-voy-label">Enfants</span>
                <div className="ci-voy-stepper">
                  <button type="button" className="ci-voy-btn" aria-label="Diminuer les enfants"
                    onClick={() => setInvites((v) => ({ ...v, enfants: Math.max(0, v.enfants - 1) }))}
                    disabled={invites.enfants <= 0}>−</button>
                  <span className="ci-voy-val">{invites.enfants}</span>
                  <button type="button" className="ci-voy-btn" aria-label="Augmenter les enfants"
                    onClick={() => setInvites((v) => ({ ...v, enfants: v.enfants + 1 }))}
                    disabled={invites.adultes + invites.enfants >= 20}>+</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filtre "Sur place" (equipements) : bouton + popover, meme pattern que
            dates/voyageurs. La grille (GrilleEquipements) est trop large pour la
            barre -> dropdown. Reutilise le composant partage, aucune duplication. */}
        <div className="ci-filtre-equip">
          <button
            type="button"
            className="ci-filtre-btn"
            onClick={() => setEquipOuvert((o) => !o)}
            aria-expanded={equipOuvert}
          >
            <svg className="ci-filtre-ico" width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M3 5.5h7.5M14 5.5H15M3 12.5h1M7.5 12.5H15" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="12" cy="5.5" r="1.7" stroke="#C09840" strokeWidth="1.5"/>
              <circle cx="5.5" cy="12.5" r="1.7" stroke="#C09840" strokeWidth="1.5"/>
            </svg>
            Sur place{equipements.length > 0 ? ` · ${equipements.length}` : ""}
          </button>
          {equipOuvert && (
            <div className="ci-equip-pop">
              <GrilleEquipements
                referentiel={equipRef}
                selection={equipements}
                onToggle={toggleEquipement}
              />
            </div>
          )}
        </div>
      </div>

      {/* SPLIT liste + carte */}
      <div className={"ci-split" + (listeMobile ? " ci-split--liste" : "")}>
      {/* LISTE DE VIGNETTES */}
      <div className="ci-liste">
        <div className="ci-liste-tete">
          <span className="ci-liste-nb">{reels.length}</span> demeure{reels.length > 1 ? "s" : ""}
          {rappelSejour() && <span className="ci-liste-sejour"> · {rappelSejour()}</span>}
          {/* Fermeture du panneau — MOBILE UNIQUEMENT (masquee au-dessus du
              seuil, ou la liste est une colonne permanente). */}
          <button
            type="button"
            className="ci-liste-fermer"
            onClick={() => setListeMobile(false)}
            aria-label="Revenir à la carte"
          >
            ✕
          </button>
        </div>
        {reels.length === 0 && (
          <div className="ci-liste-vide">
            <span className="ci-liste-vide-lys">⚜</span>
            {equipements.length > 0 ? (
              // Des equipements sont coches : c'est le critere que l'utilisateur
              // vient d'ajouter -> on en parle, et on offre la sortie (les retirer).
              <>
                <p className="ci-liste-vide-txt">
                  Aucune demeure ne réunit ces prestations pour l’instant.
                </p>
                <p className="ci-liste-vide-sous">
                  Notre réseau s’agrandit — allégez votre choix pour élargir la recherche.
                </p>
                <button
                  type="button"
                  className="ci-liste-vide-action"
                  onClick={() => setEquipements([])}
                >
                  Retirer les prestations
                </button>
              </>
            ) : (
              // Aucun equipement coche : la cause ne peut etre que la capacite.
              // Message d'origine, inchange (la sortie est le stepper voyageurs).
              <>
                <p className="ci-liste-vide-txt">
                  Aucune demeure ne peut accueillir {totalInvites} voyageurs pour l’instant.
                </p>
                <p className="ci-liste-vide-sous">
                  Notre réseau s’agrandit — réduisez le nombre de voyageurs ou revenez bientôt.
                </p>
              </>
            )}
          </div>
        )}
        {reels.map((c) => {
          const prix = prixAffiche(c);
          return (
            <div
              key={c.id}
              className={"ci-vignette" + (survolId === c.id ? " ci-vignette--survol" : "")}
              role="button"
              tabIndex={0}
              onClick={() => setApercuChateau(c)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setApercuChateau(c); } }}
              onMouseEnter={() => setSurvolId(c.id)}
              onMouseLeave={() => setSurvolId(null)}
            >
              <div
                className="ci-vignette-photo"
                style={c.images?.[0] ? { backgroundImage: `url('${c.images[0]}')` } : undefined}
              />
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
                    tabIndex={-1}
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

        {/* Rappel flottant vers la liste — MOBILE UNIQUEMENT.
            Pastille en bas, sous le pouce, plutot qu'un onglet en haut : elle ne
            vole aucune hauteur a la carte, et c'est l'idiome des applications de
            voyage. Masquee au-dessus du seuil, ou la liste est toujours la. */}
        <button
          type="button"
          className="ci-liste-rappel"
          onClick={() => setListeMobile(true)}
          aria-expanded={listeMobile}
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M6 5h9M6 9h9M6 13h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="3" cy="5" r="1" fill="currentColor"/>
            <circle cx="3" cy="9" r="1" fill="currentColor"/>
            <circle cx="3" cy="13" r="1" fill="currentColor"/>
          </svg>
          Liste
          <span className="ci-liste-rappel-nb">{reels.length}</span>
        </button>

        {/* ── FICHE COMPACTE — MOBILE UNIQUEMENT ────────────────────────────
            PAS de Modale.jsx ici, et c'est deliberé : Modale pose un voile
            plein ecran qui capte les clics. Or la consigne est que la carte
            reste TAPABLE derriere, pour passer d'un chateau a l'autre sans
            fermer. Un voile l'interdirait. On reprend donc le patron du panneau
            liste : panneau absolu en bas de .ci-split, sans scrim.
            Le detail complet (chambres, services, chronologie) n'est PAS
            duplique ici — il vit dans la vitrine, ou mene le bouton. */}
        {estMobile && apercuChateau && (
          <div
            className="ci-fiche"
            style={glissement ? { transform: `translateY(${glissement}px)` } : undefined}
            role="dialog"
            aria-label={apercuChateau.nom}
            onTouchStart={(e) => { toucheY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => {
              if (toucheY.current == null) return;
              const dy = e.touches[0].clientY - toucheY.current;
              // Vers le bas seulement : un glissement vers le haut ne doit pas
              // decoller la fiche de son bord.
              if (dy > 0) setGlissement(dy);
            }}
            onTouchEnd={() => {
              // 70 px : au-dessous, c'est un frolement, pas une intention.
              if (glissement > 70) setApercuChateau(null);
              setGlissement(0);
              toucheY.current = null;
            }}
          >
            <span className="ci-fiche-poignee" aria-hidden="true" />
            <button
              type="button"
              className="ci-fiche-fermer"
              onClick={() => setApercuChateau(null)}
              aria-label="Fermer la fiche"
            >
              ✕
            </button>

            {apercuChateau.images?.[0] && (
              <div
                className="ci-fiche-photo"
                style={{ backgroundImage: `url('${apercuChateau.images[0]}')` }}
                role="img"
                aria-label={apercuChateau.nom}
              />
            )}

            <div className="ci-fiche-corps">
              <p className="ci-fiche-region">
                {apercuChateau.region}
                {apercuChateau.departement ? ` · ${apercuChateau.departement}` : ""}
              </p>
              <h2 className="ci-fiche-nom">{apercuChateau.nom}</h2>
              {apercuChateau.accroche && (
                <p className="ci-fiche-accroche">{apercuChateau.accroche}</p>
              )}
              <div className="ci-fiche-pied">
                {prix && (
                  <span className="ci-fiche-prix">
                    à partir de <strong>{prix} €</strong> <span className="ci-fiche-nuit">/ nuit</span>
                  </span>
                )}
                <button
                  type="button"
                  className="ci-fiche-cta"
                  onClick={() => onVoirChateau(apercuChateau)}
                >
                  Voir la vitrine <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
