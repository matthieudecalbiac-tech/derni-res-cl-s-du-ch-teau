import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import OngletsNiveau1 from "./vitrine/OngletsNiveau1";
import OngletsNiveau2 from "./vitrine/OngletsNiveau2";
import ContenuPermanent from "./vitrine/ContenuPermanent";
import ContenuDernieresCles from "./vitrine/ContenuDernieresCles";
import ContenuClub from "./vitrine/ContenuClub";
import ContenuTheme from "./vitrine/ContenuTheme";
import { useClubMember } from "../hooks/useClubMember";
import "../styles/vitrine-chateau.css";
import "../styles/vitrine-onglets.css";

export default function VitrineChateau({ chateau, onClose, mode = "modal" }) {
  const isClubMember = useClubMember();
  const navigate = useNavigate();
  // En mode route (arrivee directe / apres TransitionPorte), on demarre visible
  // pour eviter le fade-in opacity 0->1 qui laisserait transparaitre le body navy.
  // En mode modal (overlay depuis la home), le fade-in reste (visible = false).
  const [visible, setVisible] = useState(mode === "route");
  const [reserve, setReserve] = useState(false);
  // Modale réservation — champs contact + états du flux d'envoi (in-modale).
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurReserve, setErreurReserve] = useState(null);
  const [succesReserve, setSuccesReserve] = useState(false);
  const [chambreIdx, setChambreIdx] = useState(0);
  const [dateArrivee, setDateArrivee] = useState("");
  const [dateDepart, setDateDepart] = useState("");
  const [voyageurs, setVoyageurs] = useState(2);
  const [messageDispo, setMessageDispo] = useState(null);
  const [dispoVerifiee, setDispoVerifiee] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [heure, setHeure] = useState({ h: "09", m: "42", isNight: false });
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [clubLockOpen, setClubLockOpen] = useState(false);
  const [moduleOuvert, setModuleOuvert] = useState(false);
  const corpsRef = useRef(null);
  const ongletsN1Ref = useRef(null);
  const sejourRef = useRef(null);
  const arriveeRef = useRef(null);

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
  // Prix d'entree : le plus bas des chambres (independant de la chambre choisie).
  const prixAPartir = chateau.chambres?.length
    ? Math.min(...chateau.chambres.map((c) => c.prix))
    : prixFinal;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => { setVisible(true); setHeroLoaded(true); }, 40);

    const now = new Date();
    const h = now.getHours();
    setHeure({
      h: String(h).padStart(2, "0"),
      m: String(now.getMinutes()).padStart(2, "0"),
      isNight: h >= 20 || h < 7,
    });

    return () => {
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Maillon 4 (parcours carte) : en mode route, pre-remplit la reservation depuis
  // l'URL (arrivee/depart en ISO YYYY-MM-DD, invites total). Ne s'execute qu'au
  // montage : une modif manuelle de l'utilisateur ne doit pas etre reecrasee.
  useEffect(() => {
    if (mode !== "route") return;
    const estISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
    const a = searchParams.get("arrivee");
    const d = searchParams.get("depart");
    if (estISO(a)) setDateArrivee(a);
    if (estISO(d)) setDateDepart(d);
    const inv = parseInt(searchParams.get("invites"), 10);
    if (!Number.isNaN(inv)) setVoyageurs(Math.min(8, Math.max(1, inv)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape : ferme d'abord l'overlay module s'il est ouvert, sinon ferme la vitrine.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (mode === "modal" && moduleOuvert) { setModuleOuvert(false); return; }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, moduleOuvert, onClose]);

  // Reinitialise la verification de dispo si les criteres changent (libelle jamais perime)
  useEffect(() => {
    setDispoVerifiee(false);
    setMessageDispo(null);
  }, [dateArrivee, dateDepart, voyageurs]);

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

  // Fermeture : reset de TOUS les sous-états propres à la modale (champs contact +
  // flux d'envoi), pour qu'une réouverture reparte propre. On NE touche PAS aux
  // dates / voyageurs / chambre : ils appartiennent au contexte séjour partagé.
  const fermerReserve = () => {
    setReserve(false);
    setNom("");
    setEmail("");
    setMessage("");
    setEnvoi(false);
    setErreurReserve(null);
    setSuccesReserve(false);
  };

  // Soumission de la demande. Validation client MINIMALE (le serveur revalide
  // TOUT et recalcule le prix — aucun prix n'est envoyé). Messages toujours
  // génériques : jamais de détail brut, jamais l'existence d'un compte.
  const soumettreReserve = async () => {
    setErreurReserve(null);
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (nom.trim() === "") { setErreurReserve("Merci d'indiquer votre nom."); return; }
    if (!emailOk) { setErreurReserve("Merci d'indiquer un email valide."); return; }
    if (!dateArrivee || !dateDepart) { setErreurReserve("Merci de renseigner les dates de séjour."); return; }
    if (dateArrivee >= dateDepart) { setErreurReserve("La date de départ doit suivre l'arrivée."); return; }

    setEnvoi(true);
    try {
      const reponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demande-reservation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chateauSlug: chateau.slug,
            chambreId: chambre.id,
            dateArrivee,
            dateDepart,
            voyageurs,
            message: message.trim() || null,
            nom: nom.trim(),
            email: email.trim(),
          }),
        },
      );
      const data = await reponse.json().catch(() => null);
      if (reponse.ok && data?.ok) {
        setSuccesReserve(true);
      } else {
        // response.error est déjà générique et anti-fuite côté serveur ; fallback neutre.
        setErreurReserve(data?.error || "Un problème est survenu, merci de réessayer.");
      }
    } catch {
      // Réseau KO / fetch rejeté : jamais de détail brut.
      setErreurReserve("Un problème est survenu, merci de réessayer.");
    } finally {
      setEnvoi(false);
    }
  };

  // POINT UNIQUE PLUG-READY dispo — a brancher sur Supabase le jour J (ne touche QUE le corps)
  const verifierDispo = () => {
    setDispoVerifiee(true);
    setMessageDispo("Voir les disponibilites ci-dessous");
    // scroll vers les onglets Niveau 1
    ongletsN1Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Contenu module (Permanent / Dernieres Cles / Club) — source unique.
  // Rendu inline dans le flux en mode route (deep-link SEO), en overlay au clic
  // en mode modal (overlay home). Un mount est route XOR modal → jamais dupliqué.
  const contenuModule = (
    <>
      {moduleEffectif === "permanent" && (
        <ContenuPermanent chateau={chateau} onReserver={handleReserver} />
      )}
      {moduleEffectif === "dernieresCles" && (
        <ContenuDernieresCles chateau={chateau} offreCible={offreCible} onReserver={handleReserver} />
      )}
      {moduleEffectif === "club" && isClubMember && (
        <ContenuClub chateau={chateau} offreCible={offreCible} onReserver={handleReserver} />
      )}
    </>
  );

  return (
    <div className={"vc3-overlay " + (visible ? "vc3-visible" : "vc3-hidden")}>

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
        <button className="vc3-header-cta" onClick={() => {
          sejourRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => arriveeRef.current?.focus(), 400);
        }}>
          Réserver
        </button>
      </header>

      <div className="vc3-corps" ref={corpsRef} onScroll={onCorpsScroll}>

        <section className="vc3-hero2">
          {/* FOND PHOTO (conserve) */}
          {chateau.videoBackground && !heure.isNight ? (
            <div className="vc3-hero2-media">
              <iframe
                src={`https://www.youtube.com/embed/${chateau.videoBackground}?autoplay=1&mute=1&loop=1&controls=0&playlist=${chateau.videoBackground}`}
                className="vc3-hero2-iframe"
                allow="autoplay; encrypted-media"
                title="chateau"
              />
            </div>
          ) : (
            <div className="vc3-hero2-media" style={{ backgroundImage: `url('${chateau.images?.[0]}')` }} />
          )}
          <div className="vc3-hero2-vign" />

          <div className="vc3-hero2-inner">
            {/* COLONNE GAUCHE : identite */}
            <div className="vc3-hero2-identite">
              <p className="vc3-hero2-eyebrow">{chateau.region} · {chateau.departement} · {chateau.siecle}</p>
              <h1 className="vc3-hero2-titre">
                <span className="vc3-hero2-titre-init">{chateau.nom[0]}</span>{chateau.nom.slice(1)}
              </h1>
              <div className="vc3-hero2-orn">
                <div className="vc3-hero2-orn-l" />
                <span className="vc3-hero2-orn-lys">⚜</span>
                <div className="vc3-hero2-orn-l" />
              </div>
              <p className="vc3-hero2-accroche">{chateau.accroche}</p>
            </div>

            {/* COLONNE DROITE : carte Votre sejour */}
            <div className="vc3-sejour" ref={sejourRef}>
              <div className="vc3-sejour-head">
                <span className="vc3-sejour-titre">Votre sejour</span>
                <span className="vc3-sejour-prix"><span className="vc3-sejour-prix-pre">des </span>{prixAPartir} €<span className="vc3-sejour-prix-u">/nuit</span></span>
              </div>
              <div className="vc3-sejour-sep" />

              <div className="vc3-sejour-dates">
                <div className="vc3-sejour-field">
                  <label htmlFor="vc3-sejour-arrivee">Arrivee</label>
                  <input id="vc3-sejour-arrivee" ref={arriveeRef} type="date" value={dateArrivee} onChange={(e) => setDateArrivee(e.target.value)} />
                </div>
                <div className="vc3-sejour-field">
                  <label htmlFor="vc3-sejour-depart">Depart</label>
                  <input id="vc3-sejour-depart" type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} />
                </div>
              </div>

              <div className="vc3-sejour-field">
                <label>Voyageurs</label>
                <div className="vc3-sejour-compteur">
                  <button type="button" onClick={() => setVoyageurs((v) => Math.max(1, v - 1))}>−</button>
                  <span>{voyageurs}</span>
                  <button type="button" onClick={() => setVoyageurs((v) => Math.min(8, v + 1))}>+</button>
                </div>
              </div>

              {messageDispo && <p className="vc3-sejour-dispo">⚜ {messageDispo}</p>}

              <button className="vc3-sejour-btn" onClick={verifierDispo}>
                Verifier les disponibilites
              </button>
            </div>
          </div>
        </section>

        {/* ══ NIVEAU 1 — Modules commerciaux (sticky) ══ */}
        <div ref={ongletsN1Ref}>
          <OngletsNiveau1
            chateau={chateau}
            actif={moduleEffectif}
            isClubMember={isClubMember}
            onChange={(m) => { setModule(m); setModuleOuvert(true); }}
            onClubLock={() => setClubLockOpen(true)}
            dispoVerifiee={dispoVerifiee}
            dateArrivee={dateArrivee}
            dateDepart={dateDepart}
            voyageurs={voyageurs}
            prixAPartir={prixAPartir}
          />
        </div>

        {/* Mode route : contenu module inline dans le flux (deep-link SEO, pas de scrim). */}
        {mode === "route" && (
          <div className="vc3-module-inline">{contenuModule}</div>
        )}

        {/* ══ Niveau 2 — Découverte éditoriale ══ */}
        <OngletsNiveau2 actif={themeActif} onChange={setTheme} />
        <ContenuTheme chateau={chateau} theme={themeActif} onChange={setTheme} />

      </div>

      {/* MODALE RÉSERVE — câblée sur l'Edge Function demande-reservation */}
      {reserve && (
        <div className="vc3-reserve-overlay" onClick={fermerReserve}>
          <div className="vc3-reserve-modal" onClick={(e) => e.stopPropagation()}>
            <button className="vc3-reserve-close" onClick={fermerReserve}>✕</button>
            <div className="vc3-reserve-lys">⚜</div>

            {succesReserve ? (
              /* ── ÉCRAN DE SUCCÈS — in-modale, aucune redirection ── */
              <>
                <h2 className="vc3-reserve-titre">Demande envoyée</h2>
                <div className="vc3-reserve-sep" />
                <p className="vc3-reserve-succes">
                  Votre demande est bien partie. Le château vous répondra très vite.
                </p>
                <button className="vc3-reserve-btn" onClick={fermerReserve}>Fermer</button>
              </>
            ) : (
              <>
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
                    <input id="vc3-reserve-arrivee" type="date" value={dateArrivee} onChange={(e) => setDateArrivee(e.target.value)} />
                  </div>
                  <div className="vc3-reserve-field">
                    <label htmlFor="vc3-reserve-depart">Départ</label>
                    <input id="vc3-reserve-depart" type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} />
                  </div>
                  <div className="vc3-reserve-field vc3-reserve-field--full">
                    <label htmlFor="vc3-reserve-voyageurs">Voyageurs</label>
                    <input id="vc3-reserve-voyageurs" type="text" value={`${voyageurs} personne${voyageurs > 1 ? "s" : ""}`} readOnly />
                  </div>
                  <div className="vc3-reserve-field vc3-reserve-field--full">
                    <label htmlFor="vc3-reserve-nom">Nom</label>
                    <input id="vc3-reserve-nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" />
                  </div>
                  <div className="vc3-reserve-field vc3-reserve-field--full">
                    <label htmlFor="vc3-reserve-email">Email</label>
                    <input id="vc3-reserve-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                  </div>
                  <div className="vc3-reserve-field vc3-reserve-field--full">
                    <label htmlFor="vc3-reserve-message">Message (facultatif)</label>
                    <textarea id="vc3-reserve-message" className="vc3-reserve-textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                  </div>
                </div>
                {erreurReserve && <p className="vc3-reserve-erreur">{erreurReserve}</p>}
                <button className="vc3-reserve-btn" onClick={soumettreReserve} disabled={envoi}>
                  {envoi ? "Envoi…" : "Confirmer la réservation →"}
                </button>
                <p className="vc3-reserve-fond">Une partie de nos recettes est reversée à la Fondation du Patrimoine.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* OVERLAY MODULE — mode modal (overlay home) : contenu en superposition au clic carte */}
      {mode === "modal" && moduleOuvert && (
        <div className="vc3-module-overlay" onClick={() => setModuleOuvert(false)}>
          <div className="vc3-module-panel" onClick={(e) => e.stopPropagation()}>
            <button className="vc3-module-close" onClick={() => setModuleOuvert(false)}>✕</button>
            {contenuModule}
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
                //
                // Sprint α.2.5 Phase B4.5 (bug fix) : on stocke la route
                // canonique /chateau/<slug> plutôt que window.location.pathname.
                // En mode "modal" (overlay depuis home), pathname = "/" → le
                // user perdait le contexte château post-auth. La route
                // canonique (servie par VitrineChateauRoute) ramène à la
                // vitrine identique. Fallback "/" défensif si slug absent.
                localStorage.setItem(
                  "lcc_auth_next",
                  chateau.slug ? `/chateau/${chateau.slug}` : "/",
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
