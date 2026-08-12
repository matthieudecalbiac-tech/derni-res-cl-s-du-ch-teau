import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import ContenuPermanent from "./vitrine/ContenuPermanent";
import ContenuDernieresCles from "./vitrine/ContenuDernieresCles";
import ContenuClub from "./vitrine/ContenuClub";
import ContenuTheme from "./vitrine/ContenuTheme";
import { THEMES } from "./vitrine/OngletsNiveau2";
import { LIBELLES as LIBELLES_MODULES, ICONES } from "./vitrine/OngletsNiveau1";
import { MODULES, useCompteursOffres, detailModule } from "./vitrine/offresResume";
import Modale from "./Modale";
import JournalApercus from "./vitrine/JournalApercus";
import BarreLaterale from "./vitrine/BarreLaterale";
import { useClubMember } from "../hooks/useClubMember";
import { useAuth } from "../contexts/AuthContext";
import "../styles/vitrine-chateau.css";
import "../styles/vitrine-onglets.css";

// Numérotation des sept thèmes dans la feuille mobile. En chiffres romains :
// c'est la numérotation d'un sommaire d'ouvrage, pas d'une liste de courses.
const ROMAINS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export default function VitrineChateau({ chateau, onClose, mode = "modal" }) {
  const isClubMember = useClubMember();
  // VitrineChateau vit déjà sous AuthProvider (useClubMember en est la preuve —
  // il appelle useAuth). On lit ici le profil pour reconnaître le membre.
  const { profile, loading: loadingAuth } = useAuth();
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

  // ── Identité du membre connecté ─────────────────────────────
  // Le tunnel demande-reservation IGNORE totalement la session (verify_jwt =
  // false, aucune lecture d'Authorization) : il résout le compte sur l'EMAIL
  // SOUMIS. Envoyer l'email du profil suffit donc à rattacher la demande au
  // compte — rien à changer côté serveur.
  //
  // LE NOM NE VIENT PAS DE full_name SEUL. Trois chemins écrivent le profil et
  // ils ne remplissent pas les mêmes colonnes : le trigger handle_new_user
  // n'insère que (id, email, role) ; le tunnel pose full_name à la création ;
  // /completer-profil écrit first_name + last_name et NE touche PAS full_name.
  // Un compte né de /inscription puis complété a donc full_name à NULL pour
  // toujours. D'où la composition, avec full_name en simple repli.
  const prefill = useMemo(() => {
    if (loadingAuth || !profile) return { nom: "", email: "" };
    const prenom = (profile.first_name || "").trim();
    const patronyme = (profile.last_name || "").trim();
    return {
      nom: prenom && patronyme ? `${prenom} ${patronyme}` : (profile.full_name || "").trim(),
      email: (profile.email || "").trim(),
    };
  }, [loadingAuth, profile]);

  // Membre RECONNU = on a de quoi réserver sans rien demander. Les deux valeurs
  // sont exigées : sans nom exploitable, le tunnel refuserait la demande (400),
  // donc on retombe sur le formulaire éditable plutôt que d'envoyer un vide.
  // C'est aussi ce qui garantit qu'un visiteur anonyme (profile null) ne
  // rencontre JAMAIS ce mode.
  const membreReconnu = Boolean(prefill.nom && prefill.email);

  // SYNCHRO ASYNCHRONE — un useEffect, PAS un initialiseur useState.
  // Au boot, loading vaut true et profile est null : un initialiseur lu au
  // montage ne verrait rien, et ne rejouerait jamais. Or la modale peut être
  // ouverte AVANT que la session ne soit vérifiée. C'est donc l'arrivée du
  // profil qui déclenche le remplissage.
  //
  // `(v) => v || …` et non une écriture sèche : on ne réécrit jamais par-dessus
  // ce qu'un visiteur a déjà tapé. Utile dans le seul cas mixte — connecté mais
  // sans nom exploitable — où les champs restent visibles avec l'email déjà
  // rempli, et où seul le nom reste à saisir.
  useEffect(() => {
    if (loadingAuth || !profile) return;
    if (prefill.email) setEmail((v) => v || prefill.email);
    if (prefill.nom) setNom((v) => v || prefill.nom);
  }, [loadingAuth, profile, prefill.nom, prefill.email]);

  const [scrollPct, setScrollPct] = useState(0);
  const [heure, setHeure] = useState({ h: "09", m: "42", isNight: false });
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [clubLockOpen, setClubLockOpen] = useState(false);
  const [moduleOuvert, setModuleOuvert] = useState(false);
  // Modale de thème. Distincte de themeActif : le thème a TOUJOURS une valeur
  // (« apercu » par défaut), la modale non. Sans cet état séparé, elle
  // s'ouvrirait à chaque chargement de page.
  const [themeOuvert, setThemeOuvert] = useState(false);
  const corpsRef = useRef(null);
  const sejourRef = useRef(null);
  // Contenu du module (Permanent / Dernières Clés / Club) : cible de défilement
  // depuis « Vérifier les disponibilités ». Remplace ongletsN1Ref, dont la bande
  // d'onglets a quitté le flux.
  const moduleRef = useRef(null);
  // Section Niveau 2 (onglets thèmes + contenu) : cible de défilement des
  // aperçus du journal, qui ouvrent le thème correspondant.
  const themesRef = useRef(null);
  const arriveeRef = useRef(null);
  const journalRef = useRef(null);

  // ── Feuille « Explorer le château » — MOBILE UNIQUEMENT ──
  // Elle remplace la barre latérale, éteinte sous 768 : mêmes trois modules,
  // mêmes sept thèmes, mêmes callbacks. Aucune logique de navigation nouvelle.
  const [sheetOuvert, setSheetOuvert] = useState(false);
  const [sheetOnglet, setSheetOnglet] = useState("themes");
  const [sheetDrag, setSheetDrag] = useState(0);
  const sheetDepart = useRef(null);
  // Même comptage que la barre latérale, un seul aller-retour : offresService
  // mémorise ses réponses (Map, TTL 5 min).
  const { nbB, nbC } = useCompteursOffres(chateau.slug);

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

  // DEEP-LINK : /chateau/x?theme=histoire doit ouvrir la modale au montage.
  // On teste la PRÉSENCE du param, pas la valeur de themeActif — celle-ci vaut
  // « apercu » par défaut, ce qui ferait s'ouvrir la modale sur chaque visite.
  // Au montage seulement : une fermeture manuelle ne doit pas être annulée par
  // un re-rendu.
  useEffect(() => {
    if (mode !== "route") return;
    if (searchParams.get("theme")) setThemeOuvert(true);
    // Même règle pour les modules : /chateau/x?onglet=dernieresCles ouvre la
    // modale du module. On teste la PRÉSENCE du param — moduleEffectif vaut
    // « permanent » par défaut, ce qui ouvrirait la modale à chaque visite.
    if (searchParams.get("onglet")) setModuleOuvert(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape : ferme la couche la plus haute, jamais deux à la fois.
  //
  // ⚠ Chaque Modale pose son PROPRE écouteur Escape (dans Modale.jsx), et tous
  //   sont sur window : sans ce garde, une seule pression fermait la modale ET
  //   la vitrine entière. Trouvé par le Test 7, qui enchaîne six
  //   ouvertures-fermetures — le bouton de la barre se retrouvait détaché du
  //   DOM parce que toute la vitrine venait d'être démontée.
  //   Le garde couvre maintenant les DEUX modales : thème et module. La branche
  //   `mode === "modal" && moduleOuvert` qui fermait l'overlay maison a disparu
  //   avec lui — Modale.jsx s'en charge, et de la même façon dans les deux modes.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (themeOuvert || moduleOuvert || clubLockOpen) return;   // Modale.jsx s'en charge
      // La feuille « Explorer » s'intercale entre les modales et la vitrine :
      // elle est sous elles, au-dessus d'elle. Meme regle — on ferme la couche
      // la plus haute, jamais deux a la fois.
      if (sheetOuvert) { setSheetOuvert(false); return; }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moduleOuvert, themeOuvert, clubLockOpen, sheetOuvert, onClose]);

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
    // Retour à l'ÉTAT DE DÉPART, qui n'est pas le même pour tous : le vide pour
    // un visiteur anonyme (comportement d'origine, inchangé), les valeurs du
    // profil pour un membre. Remettre "" inconditionnellement viderait le
    // pré-remplissage, et le useEffect ci-dessus ne le rejouerait pas (profile
    // n'a pas bougé) : rouvrir la modale montrerait des champs vides à un
    // membre connecté.
    setNom(prefill.nom);
    setEmail(prefill.email);
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

    // Membre reconnu : l'identité vient du PROFIL, pas des champs — ils ne sont
    // plus à l'écran, et le profil est la seule source qui fasse foi. Anonyme :
    // les champs, exactement comme avant.
    const nomEnvoye = membreReconnu ? prefill.nom : nom.trim();
    const emailEnvoye = membreReconnu ? prefill.email : email.trim();

    // Les deux gardes de saisie ne concernent QUE le formulaire. Les appliquer
    // à un membre reconnu afficherait une erreur devant un champ qui n'existe
    // pas : rien à corriger, donc rien à signaler. Les valeurs sont d'ailleurs
    // non vides par définition de membreReconnu, et l'email vient d'un compte.
    if (!membreReconnu) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEnvoye);
      if (nomEnvoye === "") { setErreurReserve("Merci d'indiquer votre nom."); return; }
      if (!emailOk) { setErreurReserve("Merci d'indiquer un email valide."); return; }
    }
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
            nom: nomEnvoye,
            email: emailEnvoye,
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
    // Le contenu du module n'est plus dans le flux : il n'y a plus rien vers
    // quoi défiler. On OUVRE donc la modale Permanent — les chambres et leurs
    // prix, c'est-à-dire exactement ce que le visiteur vient de demander en
    // vérifiant ses dates. Un défilement vers un bloc invisible n'aurait
    // produit aucun effet visible : la décohérence est levée, pas déplacée.
    setModule("permanent");
    setModuleOuvert(true);
  };

  // Contenu d'UN module. Même fabrique pour le bloc SEO et pour la modale : il
  // n'existe donc qu'une définition, et les deux ne peuvent pas diverger.
  //
  // Le Club n'est rendu QUE pour un membre — ni dans la modale, ni dans le bloc
  // crawlable. Le masquage intégral du Module C est une décision actée (offres
  // requires_role, RLS) : le SEO ne doit pas devenir la porte dérobée qui
  // publierait au monde un contenu réservé.
  const contenuDuModule = (m) => {
    if (m === "permanent") return <ContenuPermanent chateau={chateau} onReserver={handleReserver} />;
    if (m === "dernieresCles") return <ContenuDernieresCles chateau={chateau} offreCible={offreCible} onReserver={handleReserver} />;
    if (m === "club" && isClubMember) return <ContenuClub chateau={chateau} offreCible={offreCible} onReserver={handleReserver} />;
    return null;
  };

  const MODULES_SEO = ["permanent", "dernieresCles", "club"];

  return (
    <div className={"vc3-overlay " + (visible ? "vc3-visible" : "vc3-hidden")}>

      {/* PROGRESS BAR */}
      <div className="vc3-progress" style={{ width: scrollPct + "%" }} />

      {/* HEADER */}
      <header className="vc3-header">
        <button className="vc3-retour" onClick={onClose}>← Retour</button>
        <div className="vc3-header-centre">
          {/* Fleur de lys clé — l'ornement de marque, pas le ⚜ unicode. */}
          <img src="/FDL-transparent.png" alt="" className="vc3-header-lys" aria-hidden="true" />
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
            // imgHero assigné en admin s'il existe, sinon la 1re image de la
            // galerie — la source historique, inchangée tant que rien n'est posé.
            <div
              className="vc3-hero2-media"
              style={{ backgroundImage: `url('${chateau.imgHero || chateau.images?.[0]}')` }}
            />
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

        {/* ══ LE JOURNAL — trois aperçus vers les thèmes existants ══
            AJOUT PUR : rien n'est retiré, les onglets Niveau 1 restent le chemin
            de navigation en place et les thèmes Niveau 2 gardent le contenu.
            Le clic pose le thème via setTheme (qui gère déjà les deux modes :
            URL en route, état local en modal) puis fait défiler jusqu'au N2. */}
        {/* Le journal et la barre latérale partagent une zone : deux colonnes
            sur un même fond, séparées par un filet or. La barre est PERMANENTE
            (collante au défilement), pas un panneau — et elle s'ajoute aux
            onglets N1/N2, qui restent en place le temps de vérifier qu'elle
            reprend bien tout. */}
        <div className="vc3-zone-journal" ref={journalRef}>
          <JournalApercus
            chateau={chateau}
            // Les aperçus du journal ouvrent la même modale que la barre : plus
            // rien à faire défiler, le contenu ne vit plus dans le flux.
            onOuvrirTheme={(t) => { setTheme(t); setThemeOuvert(true); }}
          />
          <BarreLaterale
            chateau={chateau}
            prixAPartir={prixAPartir}
            moduleActif={moduleEffectif}
            themeActif={themeActif}
            isClubMember={isClubMember}
            onChoisirModule={(m) => { setModule(m); setModuleOuvert(true); }}
            onChoisirTheme={(t) => { setTheme(t); setThemeOuvert(true); }}
            onClubLock={() => setClubLockOpen(true)}
          />
        </div>

        {/* ══ NAVIGATION RETIRÉE DU FLUX ══
            La bande de cartes Niveau 1 et la barre d'onglets Niveau 2 sont
            retirées : la barre latérale est le SEUL point d'accès. Ce qui est
            retiré, ce sont des SÉLECTEURS — les contenus vivent désormais dans
            les deux blocs crawlables ci-dessous, révélés par des modales. */}

        {/* ══ LES TROIS MODULES — DANS LE DOM, HORS DE L'ŒIL ══
            Même régime que les thèmes : rendus ici pour rester crawlables,
            masqués par clip-path (pas display:none), retirés du focus et de
            l'arbre d'accessibilité par `inert`.
            Le module OUVERT est retiré d'ici et rendu dans la modale : les
            trois existent toujours, jamais en double. */}
        <div className="vc3-themes-seo" ref={moduleRef} inert>
          {MODULES_SEO
            .filter((m) => !(moduleOuvert && m === moduleEffectif))
            .map((m) => (
              <div key={m}>{contenuDuModule(m)}</div>
            ))}
        </div>

        {/* ══ LES SEPT THÈMES — DANS LE DOM, HORS DE L'ŒIL ══
            Rien ne s'insère plus sous le journal : le contenu éditorial est
            rendu ici pour rester CRAWLABLE, et masqué visuellement.

            Masquage par clip-path et non display:none — décision Matthieu, SEO
            d'OTA. Et `inert` plutôt qu'aria-hidden : un seul attribut retire à
            la fois du focus et de l'arbre d'accessibilité. Sans lui, un lecteur
            d'écran traverserait sept sections complètes sans contexte, et la
            tabulation entrerait dans des liens invisibles. React 19 le supporte
            comme prop booléenne.

            LE THÈME OUVERT EST RETIRÉ D'ICI et rendu dans la modale : les sept
            existent toujours, jamais en double. Un crawler n'ouvre pas de
            modale — le HTML qu'il lit porte donc exactement une copie de
            chacun. */}
        <div className="vc3-themes-seo" ref={themesRef} inert>
          {THEMES.filter((t) => !(themeOuvert && t.code === themeActif)).map((t) => (
            <ContenuTheme key={t.code} chateau={chateau} theme={t.code} onChange={setTheme} />
          ))}
        </div>

      </div>

      {/* ══ BARRE D'ACTION — MOBILE UNIQUEMENT ══
          vitrine-chateau.css l'éteint au-dessus du seuil ; en `display:none`
          elle sort de la mise en page, donc la vitrine desktop ne bouge pas
          d'un pixel. Mécanisme éprouvé sur le Sommaire (`.hm-acces`), vérifié
          au SHA-256.

          ⚠ ELLE EST SŒUR DE .vc3-corps, PAS DEDANS. `.vc3-corps` est le
          conteneur de défilement (`flex:1; overflow-y:auto`) : une barre montée
          à l'intérieur serait emportée par le défilement. Ici son parent est
          `.vc3-overlay`, en `position:fixed` et colonne flex — elle reste donc
          collée en bas sans avoir besoin d'être elle-même fixed.

          POURQUOI ELLE EXISTE : sous 768, la barre latérale — seul point
          d'accès aux offres et aux sept thèmes — passe sous le journal et se
          retrouve à 2752 px du haut, soit 3,4 écrans de défilement. Elle est
          éteinte en mobile ; ses deux fonctions remontent ici.

          « Réserver » réutilise EXACTEMENT le geste du CTA d'en-tête : défiler
          jusqu'au bloc séjour puis donner le focus à la date d'arrivée. Aucune
          logique nouvelle. « Explorer » ouvrira le bottom sheet à l'étape 2 ;
          en attendant il mène au journal, qui est la découverte disponible. */}
      <div className="vc3-actions">
        <button
          type="button"
          className="vc3-actions-btn"
          onClick={() => setSheetOuvert(true)}
        >
          Explorer
        </button>
        <button
          type="button"
          className="vc3-actions-btn vc3-actions-btn--cta"
          onClick={() => {
            sejourRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            setTimeout(() => arriveeRef.current?.focus(), 400);
          }}
        >
          Réserver
        </button>
      </div>

      {/* ══ FEUILLE « EXPLORER LE CHÂTEAU » — MOBILE UNIQUEMENT ══
          Elle remplace la barre latérale, éteinte sous 768 (elle y tombait à
          2752 px du haut, soit 3,4 écrans de défilement).

          FEUILLE MAISON ET NON Modale.jsx, pour quatre raisons :
            1. elle doit MONTER DU BAS et se fermer au glissement — Modale ne
               fait ni l'un ni l'autre (elle apparaît en fondu + échelle) ;
            2. elle OUVRE des Modale (thème, module) : l'imbriquer donnerait
               deux verrous de défilement, deux pièges à focus et un Échap
               ambigu ;
            3. aligner le seuil 620 de Modale sur 768 changerait TOUTES les
               modales du site entre ces largeurs — hors périmètre ;
            4. le précédent `.ci-fiche` de la carte interactive a déjà posé
               cette grammaire dans le projet.

          AUCUNE LOGIQUE DE NAVIGATION NOUVELLE. Les items rappellent les mêmes
          callbacks que la barre latérale et le journal : setTheme/setThemeOuvert
          et setModule/setModuleOuvert. Les données viennent des mêmes
          constantes exportées (THEMES, LIBELLES, ICONES) et du même comptage
          (offresResume). On ferme la feuille AVANT d'ouvrir la modale : deux
          couches empilées n'apporteraient rien et brouilleraient Échap.

          `data-theme` et `data-module` reprennent les attributs de la barre
          latérale, et `aria-current` marque l'actif comme elle : un harnais
          peut viser `[data-theme="x"]` sans savoir sur quelle largeur il
          tourne — une seule des deux sources est visible à la fois. */}
      <div
        className={"vcs-fond" + (sheetOuvert ? " vcs-fond--ouvert" : "")}
        onClick={() => setSheetOuvert(false)}
        aria-hidden="true"
      />
      <div
        className={"vcs-sheet" + (sheetOuvert ? " vcs-sheet--ouvert" : "")}
        style={sheetDrag ? { transform: `translateY(${sheetDrag}px)`, transition: "none" } : undefined}
        role="dialog"
        aria-label="Explorer le château"
        aria-modal="true"
        inert={!sheetOuvert}
      >
        {/* Le glissement est capté par la TÊTE seule. Sur la feuille entière il
            entrerait en conflit avec le défilement de la liste : un doigt qui
            descend dans une liste déjà défilée fermerait la feuille au lieu de
            la parcourir. Seuil de 70 px, comme la fiche château de la carte. */}
        <div
          className="vcs-tete"
          onTouchStart={(e) => { sheetDepart.current = e.touches[0].clientY; }}
          onTouchMove={(e) => {
            if (sheetDepart.current == null) return;
            const d = e.touches[0].clientY - sheetDepart.current;
            if (d > 0) setSheetDrag(d);
          }}
          onTouchEnd={() => {
            if (sheetDrag > 70) setSheetOuvert(false);
            setSheetDrag(0);
            sheetDepart.current = null;
          }}
        >
          <span className="vcs-poignee" aria-hidden="true" />
          <p className="vcs-titre">Explorer le château</p>
          <div className="vcs-orn" aria-hidden="true">
            <span className="vcs-orn-l" />
            <img src="/FDL-transparent.png" alt="" className="vcs-orn-lys" />
            <span className="vcs-orn-l" />
          </div>
          <div className="vcs-toggle" role="tablist" aria-label="Thèmes ou offres">
            {[["themes", "Thèmes"], ["offres", "Offres"]].map(([code, label]) => (
              <button
                key={code}
                type="button"
                role="tab"
                aria-selected={sheetOnglet === code}
                className={"vcs-toggle-btn" + (sheetOnglet === code ? " vcs-toggle-btn--actif" : "")}
                data-onglet={code}
                onClick={() => setSheetOnglet(code)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="vcs-liste">
          {sheetOnglet === "themes"
            ? THEMES.map((t, i) => (
                <button
                  key={t.code}
                  type="button"
                  className="vcs-item"
                  data-theme={t.code}
                  aria-current={themeActif === t.code ? "true" : undefined}
                  onClick={() => { setSheetOuvert(false); setTheme(t.code); setThemeOuvert(true); }}
                >
                  <span className="vcs-item-num" aria-hidden="true">{ROMAINS[i]}</span>
                  <span className="vcs-item-txt">
                    <span className="vcs-item-titre">{t.label}</span>
                    <span className="vcs-item-sous">{t.sous}</span>
                  </span>
                  <span className="vcs-item-chev" aria-hidden="true">→</span>
                </button>
              ))
            : MODULES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="vcs-item"
                  data-module={m}
                  aria-current={moduleEffectif === m ? "true" : undefined}
                  onClick={() => {
                    setSheetOuvert(false);
                    // Même règle que la barre latérale : le Club n'est pas
                    // masqué aux non-membres, il est verrouillé au clic. Le
                    // masquer laisserait croire qu'il n'existe pas.
                    if (m === "club" && !isClubMember) { setClubLockOpen(true); return; }
                    setModule(m);
                    setModuleOuvert(true);
                  }}
                >
                  <img className="vcs-item-ico" src={ICONES[m]} alt="" aria-hidden="true" />
                  <span className="vcs-item-txt">
                    <span className="vcs-item-titre">{LIBELLES_MODULES[m]}</span>
                    <span className="vcs-item-sous">
                      {detailModule(m, { chateau, prixAPartir, isClubMember, nbB, nbC }) || " "}
                    </span>
                  </span>
                  <span className="vcs-item-chev" aria-hidden="true">→</span>
                </button>
              ))}
        </div>
      </div>

      {/* MODALE RÉSERVE — câblée sur l'Edge Function demande-reservation.
          PORTÉE SUR <body>. Elle vit sinon à l'intérieur de .vc3-overlay, qui
          est position:fixed + z-index:9000 et crée donc un CONTEXTE
          D'EMPILEMENT : son z-index 9100 ne vaut qu'à l'intérieur de ce
          contexte, et ne peut pas dépasser un portail frère posé au niveau du
          body. Depuis que les modules s'ouvrent dans Modale.jsx (portail,
          z-index 9000, plus tard dans le DOM), la modale de réservation se
          retrouvait DESSOUS — un clic sur une chambre ouvrait un formulaire
          inatteignable. Le markup et les classes sont inchangés : seul le point
          de montage bouge, donc les tests qui la ciblent restent valides. */}
      {reserve && createPortal(
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
                  {/* Membre reconnu : la saisie disparaît, l'identité s'affiche.
                      Elle reste VISIBLE et non masquée — c'est l'email qui
                      détermine à quel compte la demande sera rattachée, le
                      voyageur doit pouvoir le lire. Branche anonyme strictement
                      inchangée. */}
                  {membreReconnu ? (
                    <div className="vc3-reserve-field vc3-reserve-field--full vc3-reserve-identite">
                      <span className="vc3-reserve-identite-label">Réservation au nom de</span>
                      <span className="vc3-reserve-identite-nom">{prefill.nom}</span>
                      <span className="vc3-reserve-identite-email">{prefill.email}</span>
                    </div>
                  ) : (
                    <>
                      <div className="vc3-reserve-field vc3-reserve-field--full">
                        <label htmlFor="vc3-reserve-nom">Nom</label>
                        <input id="vc3-reserve-nom" type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" />
                      </div>
                      <div className="vc3-reserve-field vc3-reserve-field--full">
                        <label htmlFor="vc3-reserve-email">Email</label>
                        <input id="vc3-reserve-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                      </div>
                    </>
                  )}
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
        </div>,
        document.body,
      )}

      {/* ══ MODALE DE MODULE ══
          L'overlay maison (.vc3-module-overlay / -panel / -close) est retiré :
          les modules passent au MÊME régime que les thèmes, sur Modale.jsx —
          portal, verrou de défilement, Échap, clic sur le fond, piège à focus,
          et max-height 88vh avec défilement interne.
          Elle RÉVÈLE : le contenu vient du même contenuDuModule que le bloc
          crawlable, dont le module actif a été retiré le temps de l'ouverture.
          Et elle ne dépend plus du mode — route et overlay se comportent enfin
          pareil, là où le contenu était inline d'un côté et en overlay de
          l'autre. */}
      <Modale
        ouvert={moduleOuvert}
        onClose={() => setModuleOuvert(false)}
        titre={LIBELLES_MODULES[moduleEffectif]}
        largeur={1080}
      >
        {contenuDuModule(moduleEffectif)}
      </Modale>

      {/* ══ MODALE DE THÈME ══
          Elle RÉVÈLE, elle n'insère pas : le contenu vient du même
          ContenuTheme que le bloc SEO ci-dessus, dont le thème actif a été
          retiré le temps de l'ouverture.
          Modale.jsx réutilisée telle quelle — portal, verrou de défilement,
          Échap, clic sur le fond, piège à focus, et max-height 88vh avec
          défilement interne pour les thèmes longs (Photos, Chambres). */}
      <Modale
        ouvert={themeOuvert}
        onClose={() => setThemeOuvert(false)}
        titre={THEMES.find((t) => t.code === themeActif)?.label}
        largeur={980}
      >
        <ContenuTheme chateau={chateau} theme={themeActif} onChange={setTheme} />
      </Modale>

      {/* ══ VERROU CLUB (non-membre) ══
          Passe sur Modale.jsx comme les modules et les themes : portail,
          verrou de defilement, Echap, clic sur le fond, piege a focus. Il vivait
          jusqu ici dans un overlay maison PIEGE dans le contexte d empilement de
          .vc3-overlay — il serait passe SOUS la modale de module.

          ⚠ CONTRASTE REPARE AU PASSAGE. Ses styles inline dataient d un temps ou
          .vc3-reserve-modal etait sombre : ils posaient du texte creme
          (rgba(247,242,232,.75)) sur ce qui est devenu #FFFDF8 depuis la
          migration en palette claire. Le message etait donc quasi illisible.
          Les couleurs suivent desormais l encre du reste du site. */}
      <Modale
        ouvert={clubLockOpen}
        onClose={fermerClubLock}
        titre="Club Châtelain"
        largeur={460}
      >
        <div className="vc3-clublock">
          <p className="vc3-clublock-sur">Réservé aux membres</p>
          <p className="vc3-clublock-txt">
            Connectez-vous pour accéder aux offres exclusives réservées aux membres du Club Châtelain.
          </p>
          <button
            className="vc3-reserve-btn"
            onClick={() => {
              // Sprint S2-α.2 Mini-Phase 6.1 : localStorage et non
              // sessionStorage — ce dernier est scope a un onglet et ne survit
              // pas au nouvel onglet ouvert depuis la boite mail.
              // Sprint α.2.5 Phase B4.5 : on stocke la route CANONIQUE
              // /chateau/<slug> et non window.location.pathname — en mode
              // overlay depuis la home, pathname vaut "/" et le visiteur
              // perdait le contexte chateau apres authentification.
              localStorage.setItem(
                "lcc_auth_next",
                chateau.slug ? `/chateau/${chateau.slug}` : "/",
              );
              navigate("/inscription");
            }}
          >
            Se connecter →
          </button>
          <button className="vc3-clublock-fermer" onClick={fermerClubLock}>Fermer</button>
        </div>
      </Modale>
    </div>
  );
}
