import { useEffect, useState, useRef } from "react";
import "../styles/vitrine-chateau.css";

export default function VitrineChateau({ chateau, onClose }) {
  const [visible, setVisible] = useState(false);
  const [reserve, setReserve] = useState(false);
  const [chambreIdx, setChambreIdx] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [heure, setHeure] = useState({ h: "09", m: "42", isNight: false });
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [tlVisible, setTlVisible] = useState({});
  const [meteo, setMeteo] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [modePresentation, setModePresentation] = useState(false);
  const [prochaineDispo, setProchaineDispo] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const itemRefs = useRef([]);
  const corpsRef = useRef(null);

  const chambre = chateau.chambres?.[chambreIdx];
  const prixFinal = chateau.prixBarre
    ? Math.round(chateau.prixBarre * (1 - (chateau.reduction || 0) / 100))
    : chambre?.prix || chateau.chambres?.[0]?.prix;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => { setVisible(true); setHeroLoaded(true); }, 40);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);

    const now = new Date();
    const h = now.getHours();
    setHeure({
      h: String(h).padStart(2, "0"),
      m: String(now.getMinutes()).padStart(2, "0"),
      isNight: h >= 20 || h < 7,
    });

    const onMove = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);

    // Météo temps réel
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${chateau.coordonnees?.lat||48.92}&longitude=${chateau.coordonnees?.lng||0.73}&current=temperature_2m,weathercode,windspeed_10m&timezone=Europe/Paris`)
      .then(r => r.json())
      .then(d => {
        const code = d.current?.weathercode;
        const temp = Math.round(d.current?.temperature_2m);
        const desc = code <= 1 ? 'Ciel dégagé' : code <= 3 ? 'Nuageux' : code <= 67 ? 'Pluie' : 'Variable';
        const phrase = code <= 1 ? "Le parc est à son meilleur aujourd'hui." : code <= 3 ? "Lumière dorée sur les douves." : "Soirée idéale au coin du feu.";
        setMeteo({ temp, desc, phrase });
      }).catch(() => setMeteo({ temp: 14, desc: 'Variable', phrase: "Le château vous attend." }));

    // Prochaine disponibilité simulée
    const today = new Date();
    const options = [];
    for (let i = 3; i <= 14; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      if (d.getDay() === 5 || d.getDay() === 6) options.push(d);
    }
    if (options.length > 0) {
      const d = options[0];
      setProchaineDispo(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
    }

    // Géolocalisation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude; const lon = pos.coords.longitude;
        const R = 6371;
        const cLat = chateau.coordonnees?.lat || 48.9167;
        const cLon = chateau.coordonnees?.lng || 0.7333;
        const dLat = (cLat - lat) * Math.PI / 180;
        const dLon = (cLon - lon) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(cLat*Math.PI/180)*Math.sin(dLon/2)**2;
        const km = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
        const h = Math.floor(km / 80); const m = Math.round((km / 80 - h) * 60);
        setDistanceInfo({ km, temps: h > 0 ? h+'h'+String(m).padStart(2,'0') : m+'min' });
      }, () => setDistanceInfo({ km: 185, temps: '2h14' }));
    } else {
      setDistanceInfo({ km: 185, temps: '2h14' });
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
    };
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setTlVisible((p) => ({ ...p, [e.target.dataset.idx]: true }));
      });
    }, { threshold: 0.15 });
    itemRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [visible]);

  const onCorpsScroll = (e) => {
    const el = e.currentTarget;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    setScrollPct(Math.min(100, Math.max(0, pct)));
  };

  const cinematique = chateau.timeline
    ? [...chateau.timeline.slice(0, 5).map(t => ({ annee: t.annee, texte: t.evenement })),
       { annee: "Ce soir", texte: "Vous y dormez.", final: true }]
    : [{ annee: chateau.siecle, texte: chateau.accroche }, { annee: "Ce soir", texte: "Vous y dormez.", final: true }];

  return (
    <div className={"vc3-overlay " + (visible ? "vc3-visible" : "vc3-hidden")}>

      {/* CURSEUR */}
      <div className="vc3-cursor" style={{ left: cursorPos.x, top: cursorPos.y }}>⚜</div>

      {/* PROGRESS BAR */}
      <div className="vc3-progress" style={{ width: scrollPct + "%" }} />

      {/* HEADER */}
      <header className="vc3-header">
        <button className="vc3-retour" onClick={onClose}>← Retour</button>
        <div className="vc3-header-centre">
          <span className="vc3-header-lys">⚜</span>
          <span className="vc3-header-nom">{chateau.nom}</span>
          <span className="vc3-header-region">{chateau.region} · {chateau.distanceParis}</span>
        </div>
        <button className="vc3-header-cta" onClick={() => setReserve(true)}>
          Réserver · {prixFinal} €/nuit
        </button>
      </header>

      <div className="vc3-corps" ref={corpsRef} onScroll={onCorpsScroll}>

        {/* ══ INNOVATION 1 : HERO PARALLAXE NOCTURNE ══ */}
        <section className={"vc3-hero " + (heure.isNight ? "vc3-hero--nuit" : "vc3-hero--jour")}>
          {chateau.videoBackground && !heure.isNight ? (
            <div className="vc3-hero-video-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${chateau.videoBackground}?autoplay=1&mute=1&loop=1&controls=0&playlist=${chateau.videoBackground}`}
                className="vc3-hero-iframe"
                allow="autoplay; encrypted-media"
                title="château"
              />
            </div>
          ) : (
            <div className="vc3-hero-bg" style={{ backgroundImage: `url('${chateau.images?.[0]}')` }} />
          )}
          <div className="vc3-hero-vign" />
          {heure.isNight && (
            <div className="vc3-hero-nuit-overlay">
              <div className="vc3-hero-moon" />
              <div className="vc3-hero-stars">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="vc3-hero-star" style={{
                    width: Math.random() > 0.7 ? "3px" : "2px",
                    height: Math.random() > 0.7 ? "3px" : "2px",
                    top: Math.random() * 50 + "%",
                    left: Math.random() * 100 + "%",
                    opacity: 0.4 + Math.random() * 0.6,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div className={"vc3-hero-content " + (heroLoaded ? "vc3-hero-content--in" : "")}>
            <p className="vc3-hero-eyebrow">{chateau.region} · {chateau.departement} · {chateau.siecle}</p>
            <h1 className="vc3-hero-titre">
              <span className="vc3-hero-titre-init">{chateau.nom[0]}</span>{chateau.nom.slice(1)}
            </h1>
            <div className="vc3-hero-orn">
              <div className="vc3-hero-orn-l" />
              <span className="vc3-hero-orn-lys">⚜</span>
              <div className="vc3-hero-orn-l" />
            </div>
            <p className="vc3-hero-accroche">{chateau.accroche}</p>
            <div className="vc3-hero-meta">
              <div className="vc3-hero-meta-item">
                <span className="vc3-hero-meta-val">{prixFinal} €</span>
                <span className="vc3-hero-meta-lab">/ nuit</span>
              </div>
              <span className="vc3-hero-meta-sep">·</span>
              <div className="vc3-hero-meta-item">
                <span className="vc3-hero-meta-val">{chateau.distanceParis}</span>
                <span className="vc3-hero-meta-lab">de Paris</span>
              </div>
              {chateau.urgence && <span className="vc3-hero-urgence">{chateau.urgence}</span>}
            </div>
            <button className="vc3-hero-btn" onClick={() => setReserve(true)}>
              Réserver ce séjour
            </button>
          </div>
          <div className="vc3-hero-scroll">
            <div className="vc3-hero-scroll-l" />
            <span className="vc3-hero-scroll-txt">Défiler</span>
          </div>
          <div className="vc3-hero-ambiance-badge">
            {heure.isNight ? "⚜ Nuit au château" : "⚜ Le château vous attend"}
            <span className="vc3-hero-heure">{heure.h}:{heure.m}</span>
          </div>
        </section>

        {/* CHIFFRES CLÉS */}
        <div className="vc3-chiffres">
          <div className="vc3-chiffre"><span className="vc3-chiffre-val">1290</span><span className="vc3-chiffre-lab">Année de fondation</span></div>
          <div className="vc3-chiffre"><span className="vc3-chiffre-val">3</span><span className="vc3-chiffre-lab">Familles en 7 siècles</span></div>
          <div className="vc3-chiffre"><span className="vc3-chiffre-val">8 ha</span><span className="vc3-chiffre-lab">Parc classé</span></div>
          <div className="vc3-chiffre"><span className="vc3-chiffre-val">1949</span><span className="vc3-chiffre-lab">Monument Historique</span></div>
        </div>

        {/* CINÉMATIQUE */}
        <section className="vc3-cinema">
          <div className="vc3-cinema-wrap">
            <div className="vc3-cinema-inner">
              <p className="vc3-eyebrow">L'histoire</p>
              {cinematique.map((item, i) => (
                <div
                  key={i}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  data-idx={i}
                  className={"vc3-cinema-line " + (tlVisible[i] ? "vc3-cinema-line--on" : "")}
                >
                  <span className="vc3-cinema-yr">{item.annee}</span>
                  <span className={"vc3-cinema-txt " + (item.final ? "vc3-cinema-txt--final" : "")}>
                    {item.texte}
                    {item.final && <span className="vc3-cinema-cursor" />}
                  </span>
                </div>
              ))}
            </div>
            <div className="vc3-cinema-visual">
              <div className="vc3-cinema-img" style={{ backgroundImage: `url('${chateau.images?.[1] || chateau.images?.[0]}')` }} />
              <div className="vc3-cinema-vign" />
            </div>
          </div>
        </section>

        {/* ══ INNOVATION 2 : DIPTIQUE JOUR/NUIT ══ */}
        <section className="vc3-diptique">
          <div className="vc3-dip-label">⚜ &nbsp; Chaque heure a son château</div>
          <div className="vc3-dip-panels">
            <div className="vc3-dip-panel vc3-dip-jour">
              <div className="vc3-dip-bg" style={{ backgroundImage: `url('${chateau.images?.[0]}')`, filter: "brightness(1.1) saturate(0.9) sepia(0.1)" }} />
              <div className="vc3-dip-vign" style={{ background: "linear-gradient(135deg,rgba(220,190,80,0.08),rgba(7,16,30,0.55))" }} />
              <div className="vc3-dip-content">
                <span className="vc3-dip-moment" style={{ color: "rgba(80,55,10,0.7)" }}>Le matin</span>
                <span className="vc3-dip-heure">{heure.h}:{heure.m}</span>
                <span className="vc3-dip-desc">Brouillard sur les douves · Petit-déjeuner dans la salle de garde</span>
              </div>
            </div>
            <div className="vc3-dip-sep">
              <div className="vc3-dip-sep-l" />
              <span className="vc3-dip-sep-lys">⚜</span>
              <div className="vc3-dip-sep-l" />
            </div>
            <div className="vc3-dip-panel vc3-dip-nuit">
              <div className="vc3-dip-bg" style={{ backgroundImage: `url('${chateau.images?.[2] || chateau.images?.[0]}')`, filter: "brightness(0.5) saturate(0.4)" }} />
              <div className="vc3-dip-vign" style={{ background: "linear-gradient(135deg,rgba(7,16,30,0.6),rgba(7,16,30,0.2))" }} />
              <div className="vc3-dip-content">
                <span className="vc3-dip-moment">La nuit</span>
                <span className="vc3-dip-heure">22:15</span>
                <span className="vc3-dip-desc">Silence absolu · Grenouilles des douves · Ciel sans lumière parasite</span>
              </div>
            </div>
          </div>
        </section>

        {/* CITATION PLEIN ÉCRAN */}
        {chateau.proprietaires && (
          <section className="vc3-citation">
            <div className="vc3-citation-qmark">"</div>
            <p className="vc3-citation-txt">{chateau.proprietaires.citation}</p>
            <p className="vc3-citation-auteur">— {chateau.proprietaires.nom}</p>
          </section>
        )}

        {/* ══ INNOVATION 3 : PORTRAIT TYPOGRAPHIE MONUMENTALE ══ */}
        {chateau.proprietaires && (
          <section className="vc3-portrait">
            <div className="vc3-portrait-typo">
              <div className="vc3-portrait-typo-bg">1290</div>
              <div className="vc3-portrait-typo-ligne" />
              <div className="vc3-portrait-typo-content">
                <span className="vc3-eyebrow">Les propriétaires</span>
                <div className="vc3-portrait-typo-nom">
                  <span className="vc3-portrait-init">{chateau.proprietaires.nom[0]}</span>
                  <span className="vc3-portrait-reste">{chateau.proprietaires.nom.slice(1).split(' ').slice(0,3).join(' ')}</span>
                </div>
                <span className="vc3-portrait-famille">{chateau.proprietaires.nom.split(' ').slice(3).join(' ')}</span>
                <span className="vc3-portrait-role">Propriétaires depuis {chateau.proprietaires.depuis}</span>
              </div>
              <div className="vc3-portrait-stats">
                <div className="vc3-portrait-stat"><span className="vc3-portrait-stat-val">734</span><span className="vc3-portrait-stat-lab">Années d'histoire</span></div>
                <div className="vc3-portrait-stat"><span className="vc3-portrait-stat-val">3</span><span className="vc3-portrait-stat-lab">Familles propriétaires</span></div>
                <div className="vc3-portrait-stat"><span className="vc3-portrait-stat-val">8 ha</span><span className="vc3-portrait-stat-lab">Parc classé</span></div>
              </div>
            </div>
            <div className="vc3-portrait-img">
              <div className="vc3-portrait-img-bg" style={{ backgroundImage: `url('${chateau.proprietaires.portrait}')` }} />
              <div className="vc3-portrait-img-vign" />
              <p className="vc3-portrait-bio">{chateau.proprietaires.description}</p>
            </div>
          </section>
        )}

        {/* GALERIE */}
        <section className="vc3-galerie">
          <div className="vc3-galerie-grille">
            {chateau.images?.slice(0, 3).map((img, i) => (
              <div key={i} className={"vc3-galerie-item " + (i === 0 ? "vc3-galerie-item--grande" : "")}>
                <img src={img} alt={chateau.nom} />
                <div className="vc3-galerie-vign" />
              </div>
            ))}
          </div>
          <div className="vc3-galerie-desc">
            <p className="vc3-eyebrow">Le domaine</p>
            <h2 className="vc3-galerie-titre">{chateau.nom}</h2>
            <p className="vc3-galerie-txt">{chateau.description}</p>
          </div>
        </section>

        {/* CHAMBRES */}
        {chateau.chambres && (
          <section className="vc3-chambres">
            <div className="vc3-chambres-head">
              <p className="vc3-eyebrow">Les chambres</p>
              <h2 className="vc3-chambres-titre">Deux refuges d'exception</h2>
            </div>
            <div className="vc3-chambres-grille">
              {chateau.chambres.map((ch, i) => (
                <div key={i} className="vc3-chambre">
                  <div className="vc3-chambre-photo">
                    <img src={ch.image} alt={ch.nom} />
                    <div className="vc3-chambre-photo-vign" />
                    <div className="vc3-chambre-prix">{ch.prix} €<span>/nuit</span></div>
                  </div>
                  <div className="vc3-chambre-infos">
                    <h3 className="vc3-chambre-nom">{ch.nom}</h3>
                    <p className="vc3-chambre-sup">{ch.superficie} · {ch.capacite} personnes</p>
                    <p className="vc3-chambre-desc">{ch.description}</p>
                    <button className="vc3-chambre-btn" onClick={() => { setChambreIdx(i); setReserve(true); }}>
                      Réserver · {ch.prix} €/nuit →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TIMELINE */}
        {chateau.timeline && (
          <section className="vc3-timeline">
            <div className="vc3-timeline-inner">
              <p className="vc3-eyebrow" style={{ justifyContent: "center" }}>Chronologie</p>
              <h2 className="vc3-timeline-titre">Sept siècles d'une même pierre</h2>
              <div className="vc3-tl-axe" />
              <div className="vc3-tl-items">
                {chateau.timeline.map((item, i) => (
                  <div
                    key={i}
                    ref={(el) => { itemRefs.current[100 + i] = el; }}
                    data-idx={100 + i}
                    className={"vc3-tl-item " + (i % 2 === 0 ? "vc3-tl-g" : "vc3-tl-d") + " " + (tlVisible[100 + i] ? "vc3-tl-on" : "")}
                  >
                    <div className="vc3-tl-dot" />
                    <div className="vc3-tl-content">
                      <span className="vc3-tl-yr">{item.annee}</span>
                      <p className="vc3-tl-evt">{item.evenement}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TERRITOIRE */}
        {chateau.regionNarrative && (
          <section className="vc3-territoire">
            <div className="vc3-territoire-wrap">
              <div>
                <p className="vc3-eyebrow">Le territoire</p>
                <h2 className="vc3-territoire-titre">{chateau.region}</h2>
                <p className="vc3-territoire-txt">{chateau.regionNarrative}</p>
              </div>
              {chateau.alentours && (
                <div className="vc3-alentours">
                  {chateau.alentours.slice(0, 4).map((a, i) => (
                    <div key={i} className="vc3-alentour">
                      <div className="vc3-alentour-head">
                        <span className="vc3-alentour-ico">{a.icone}</span>
                        <span className="vc3-alentour-dist">{a.distance}</span>
                      </div>
                      <div className="vc3-alentour-nom">{a.nom}</div>
                      <p className="vc3-alentour-desc">{a.description.substring(0, 80)}…</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ MÉTÉO EN TEMPS RÉEL ══ */}
        {meteo && (
          <div className="vc3-meteo">
            <div className="vc3-meteo-inner">
              <div className="vc3-meteo-now">
                <span className="vc3-meteo-temp">{meteo.temp}°</span>
                <div className="vc3-meteo-details">
                  <span className="vc3-meteo-desc">{meteo.desc}</span>
                  <span className="vc3-meteo-lieu">En ce moment à Rugles · Normandie</span>
                </div>
              </div>
              <p className="vc3-meteo-phrase">⚜ &nbsp; {meteo.phrase}</p>
            </div>
          </div>
        )}

        {/* ══ DISTANCE + PROCHAIN DÉPART ══ */}
        <div className="vc3-depart">
          <div className="vc3-depart-inner">
            {distanceInfo && (
              <div className="vc3-depart-distance">
                <span className="vc3-depart-val">{distanceInfo.temps}</span>
                <span className="vc3-depart-label">de chez vous · {distanceInfo.km} km</span>
              </div>
            )}
            <div className="vc3-depart-sep" />
            <div className="vc3-depart-weekend">
              {prochaineDispo && (
                <>
                  <span className="vc3-depart-label">Prochain week-end disponible</span>
                  <span className="vc3-depart-date">{prochaineDispo}</span>
                </>
              )}
            </div>
            <button className="vc3-depart-btn" onClick={() => setReserve(true)}>
              Partir ce week-end →
            </button>
          </div>
        </div>

        {/* ══ MODE PRÉSENTATION ══ */}
        {!modePresentation && (
          <div className="vc3-mode-pres-trigger">
            <button className="vc3-mode-pres-btn" onClick={() => setModePresentation(true)}>
              ⚜ &nbsp; Version présentation propriétaire
            </button>
          </div>
        )}

        {modePresentation && (
          <div className="vc3-pres-overlay">
            <div className="vc3-pres-header">
              <span className="vc3-pres-lys">⚜</span>
              <span className="vc3-pres-titre">Les Clés du Château</span>
              <span className="vc3-pres-sub">Plateforme patrimoniale · Présentation partenaire</span>
            </div>
            <div className="vc3-pres-chateau">
              <div className="vc3-pres-photo" style={{ backgroundImage: `url('${chateau.images?.[0]}')` }} />
              <div className="vc3-pres-vign" />
              <div className="vc3-pres-content">
                <p className="vc3-pres-eyebrow">{chateau.region} · {chateau.siecle}</p>
                <h1 className="vc3-pres-nom">{chateau.nom}</h1>
                <div className="vc3-pres-orn">
                  <div className="vc3-pres-orn-l" />
                  <span>⚜</span>
                  <div className="vc3-pres-orn-l" />
                </div>
                <p className="vc3-pres-desc">{chateau.accroche}</p>
              </div>
            </div>
            <div className="vc3-pres-valeurs">
              <div className="vc3-pres-val">
                <span className="vc3-pres-val-ico">⚜</span>
                <span className="vc3-pres-val-titre">Référencement sans frais fixes</span>
                <span className="vc3-pres-val-desc">Commission uniquement sur les séjours effectivement réservés via la plateforme.</span>
              </div>
              <div className="vc3-pres-val">
                <span className="vc3-pres-val-ico">◆</span>
                <span className="vc3-pres-val-titre">Votre histoire, votre image</span>
                <span className="vc3-pres-val-desc">Vitrine éditoriale unique, storytelling personnalisé, jamais bradé.</span>
              </div>
              <div className="vc3-pres-val">
                <span className="vc3-pres-val-ico">◇</span>
                <span className="vc3-pres-val-titre">Fondation du Patrimoine</span>
                <span className="vc3-pres-val-desc">Une partie de chaque réservation reversée pour préserver le patrimoine français.</span>
              </div>
            </div>
            <button className="vc3-pres-close" onClick={() => setModePresentation(false)}>
              Quitter la présentation
            </button>
          </div>
        )}

                {/* FINAL */}
        <section className="vc3-final">
          <div className="vc3-fondation">
            <span className="vc3-fondation-lys">⚜</span>
            <p className="vc3-fondation-txt">Une partie de chaque réservation est reversée à la <strong>Fondation du Patrimoine</strong>.</p>
          </div>
          <h2 className="vc3-cta-titre">Prêt à vivre {chateau.nom.replace("Château du ","").replace("Château des ","").replace("Château de ","").replace("Château d'","")} ?</h2>
          <p className="vc3-cta-sub">À partir de {prixFinal} € la nuit · {chateau.distanceParis}</p>
          <button className="vc3-cta-btn" onClick={() => setReserve(true)}>Réserver maintenant</button>
        </section>

      </div>

      {/* MODALE */}
      {reserve && (
        <div className="vc3-reserve-overlay" onClick={() => setReserve(false)}>
          <div className="vc3-reserve-modal" onClick={(e) => e.stopPropagation()}>
            <button className="vc3-reserve-close" onClick={() => setReserve(false)}>✕</button>
            <div className="vc3-reserve-lys">⚜</div>
            <h2 className="vc3-reserve-titre">{chateau.nom}</h2>
            <p className="vc3-reserve-sub">{chambre?.nom || chateau.chambres?.[0]?.nom} · {prixFinal} €/nuit</p>
            <div className="vc3-reserve-sep" />
            {chateau.chambres && (
              <div className="vc3-reserve-chs">
                {chateau.chambres.map((ch, i) => (
                  <button key={i} className={"vc3-reserve-ch " + (chambreIdx === i ? "actif" : "")} onClick={() => setChambreIdx(i)}>
                    <span>{ch.nom}</span>
                    <span className="vc3-reserve-ch-prix">{ch.prix} €</span>
                  </button>
                ))}
              </div>
            )}
            <div className="vc3-reserve-form">
              <div className="vc3-reserve-field"><label>Arrivée</label><input type="date" /></div>
              <div className="vc3-reserve-field"><label>Départ</label><input type="date" /></div>
            </div>
            <button className="vc3-reserve-btn">Confirmer la réservation →</button>
            <p className="vc3-reserve-fond">⚜ Une partie sera reversée à la Fondation du Patrimoine</p>
          </div>
        </div>
      )}
    </div>
  );
}
