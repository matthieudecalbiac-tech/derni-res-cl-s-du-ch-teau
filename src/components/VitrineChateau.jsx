import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import OngletsNiveau1 from "./vitrine/OngletsNiveau1";
import OngletsNiveau2 from "./vitrine/OngletsNiveau2";
import ContenuPermanent from "./vitrine/ContenuPermanent";
import ContenuDernieresCles from "./vitrine/ContenuDernieresCles";
import ContenuClub from "./vitrine/ContenuClub";
import IntroTroncCommun from "./vitrine/IntroTroncCommun";
import ContenuTheme from "./vitrine/ContenuTheme";
import { useClubMember } from "../hooks/useClubMember";
import "../styles/vitrine-chateau.css";
import "../styles/vitrine-onglets.css";

export default function VitrineChateau({ chateau, onClose, mode = "modal" }) {
  const isClubMember = useClubMember();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [reserve, setReserve] = useState(false);
  const [chambreIdx, setChambreIdx] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [heure, setHeure] = useState({ h: "09", m: "42", isNight: false });
  const [cursorPos, setCursorPos] = useState({ x: -200, y: -200 });
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [clubLockOpen, setClubLockOpen] = useState(false);
  const corpsRef = useRef(null);

  const fermerClubLock = () => setClubLockOpen(false);

  // Onglets : useState local en mode modal, useSearchParams en mode route.
  // Le mode est passé par VitrineChateauRoute pour les URL /chateau/:slug et reste
  // "modal" par défaut pour l'overlay legacy depuis home/VitrinePermanente.
  const [moduleLocal, setModuleLocal] = useState("permanent");
  const [themeLocal, setThemeLocal] = useState("apercu");
  const [searchParams, setSearchParams] = useSearchParams();

  const moduleParam =
    mode === "route" ? searchParams.get("onglet") || "permanent" : moduleLocal;
  const themeActif =
    mode === "route" ? searchParams.get("theme") || "apercu" : themeLocal;
  const offreCible = mode === "route" ? searchParams.get("offre") : null;

  // Fallback : club si non-membre → permanent (URL conservée mais contenu différent)
  const moduleEffectif =
    moduleParam === "club" && !isClubMember ? "permanent" : moduleParam;

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

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
    };
  }, [onClose]);

  const onCorpsScroll = (e) => {
    const el = e.currentTarget;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    setScrollPct(Math.min(100, Math.max(0, pct)));
  };

  const setModule = (m) => {
    if (mode === "route") {
      const newP = new URLSearchParams(searchParams);
      newP.set("onglet", m);
      newP.delete("offre");
      setSearchParams(newP);
    } else {
      setModuleLocal(m);
    }
  };

  const setTheme = (t) => {
    if (mode === "route") {
      const newP = new URLSearchParams(searchParams);
      newP.set("theme", t);
      setSearchParams(newP);
    } else {
      setThemeLocal(t);
    }
  };

  // CTA "Réserver →" unifié — ouvre la modale legacy.
  // - chambre permanente : arg = index numérique → pre-select chambre + open modal
  // - offre B/C : arg = offreId string → open modal sans changer la chambre
  //   (l'offre est traçable côté UI via highlight, le booking flow réel est α.3)
  const handleReserver = (arg) => {
    if (typeof arg === "number") setChambreIdx(arg);
    setReserve(true);
  };

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

        {/* ══ HERO PARALLAXE NOCTURNE — INCHANGÉ ══ */}
        <section className={"vc3-hero " + (heure.isNight ? "vc3-hero--nuit" : "vc3-hero--jour")}>
          {chateau.videoBackground ? (
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
              {chateau.heroNightStars === true && (
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
              )}
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

        {/* ══ NIVEAU 1 — Modules commerciaux (sticky) ══ */}
        <OngletsNiveau1
          chateau={chateau}
          actif={moduleEffectif}
          isClubMember={isClubMember}
          onChange={setModule}
          onClubLock={() => setClubLockOpen(true)}
        />

        {moduleEffectif === "permanent" && (
          <ContenuPermanent chateau={chateau} onReserver={handleReserver} />
        )}
        {moduleEffectif === "dernieresCles" && (
          <ContenuDernieresCles
            chateau={chateau}
            offreCible={offreCible}
            onReserver={handleReserver}
          />
        )}
        {moduleEffectif === "club" && isClubMember && (
          <ContenuClub
            chateau={chateau}
            offreCible={offreCible}
            onReserver={handleReserver}
          />
        )}

        {/* ══ Intro tronc commun + Niveau 2 — Découverte éditoriale ══ */}
        <IntroTroncCommun chateau={chateau} />
        <OngletsNiveau2 actif={themeActif} onChange={setTheme} />
        <ContenuTheme chateau={chateau} theme={themeActif} />

      </div>

      {/* MODALE RÉSERVE — INCHANGÉE (legacy) */}
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
              <div className="vc3-reserve-field">
                <label htmlFor="vc3-reserve-arrivee">Arrivée</label>
                <input id="vc3-reserve-arrivee" type="date" />
              </div>
              <div className="vc3-reserve-field">
                <label htmlFor="vc3-reserve-depart">Départ</label>
                <input id="vc3-reserve-depart" type="date" />
              </div>
            </div>
            <button className="vc3-reserve-btn">Confirmer la réservation →</button>
            <p className="vc3-reserve-fond">⚜ Une partie sera reversée à la Fondation du Patrimoine</p>
          </div>
        </div>
      )}

      {/* MODALE STUB AUTH CLUB — TODO α.2 : brancher Supabase auth */}
      {clubLockOpen && (
        <div className="vc3-reserve-overlay" onClick={fermerClubLock}>
          <div className="vc3-reserve-modal" onClick={(e) => e.stopPropagation()}>
            <button className="vc3-reserve-close" onClick={fermerClubLock}>✕</button>
            <div className="vc3-reserve-lys">⚜</div>
            <h2 className="vc3-reserve-titre">Club Châtelain</h2>
            <p className="vc3-reserve-sub">Réservé aux membres</p>
            <div className="vc3-reserve-sep" />
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: "15px",
                lineHeight: 1.6,
                textAlign: "center",
                margin: "0 0 28px",
                color: "rgba(247, 242, 232, 0.75)",
                maxWidth: "420px",
              }}
            >
              Connectez-vous pour accéder aux offres exclusives réservées aux membres du Club Châtelain.
            </p>
            <button
              className="vc3-reserve-btn"
              onClick={() => {
                // Sprint S2-α.2 Mini-Phase 6.1 : bascule sessionStorage →
                // localStorage. sessionStorage est session-scoped à un tab,
                // ne survit pas au nouveau tab Gmail. localStorage est
                // cross-tab same-origin → robuste au flow magic link.
                localStorage.setItem(
                  "lcc_auth_next",
                  window.location.pathname + window.location.search,
                );
                navigate("/inscription");
              }}
            >
              Se connecter →
            </button>
            <button
              onClick={fermerClubLock}
              style={{
                marginTop: "12px",
                background: "transparent",
                border: "1px solid rgba(192, 152, 64, 0.6)",
                color: "rgba(247, 242, 232, 0.7)",
                padding: "12px 28px",
                fontFamily: "'Crimson Pro', serif",
                fontSize: "12px",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.25s ease",
                width: "100%",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
