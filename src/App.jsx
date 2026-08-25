import { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import BandeauOffres from "./components/BandeauOffres";
import BarreRecherche from "./components/BarreRecherche";
import ToggleCarteListe from "./components/ToggleCarteListe";
import PastillesInspiration from "./components/PastillesInspiration";
import "./styles/accueil.css";
import "./styles/route-catalogue.css";
import UneDeLaSemaine from "./components/UneDeLaSemaine";
import HeureAuxDemeures from "./components/HeureAuxDemeures";
import BanniereApp from "./components/BanniereApp";
import PiedPatrimoine from "./components/PiedPatrimoine";
import Conciergerie from "./components/Services";
import VitrineChateau from "./components/VitrineChateau";
import APropos from "./components/APropos";
import VitrinePermanente from "./components/VitrinePermanente";
import DernieresCles from "./components/DernieresCles";
import BoutonRetour, { useRetour } from "./components/BoutonRetour";
import EtatErreur from "./components/EtatErreur";
import { useChateaux } from "./hooks/useChateaux";
import TransitionPorte from "./components/TransitionPorte";
import PartenairesChateaux from "./components/PartenairesChateaux";

// Sprint S2-α.1 — routing react-router pour les nouveaux écrans transactionnels
// (pattern strangler fig : les overlays historiques restent inchangés).
import RequireAuth from "./components/auth/RequireAuth";
import PageIntrouvable from "./components/PageIntrouvable";
import RequireRole from "./components/auth/RequireRole";
import BookingFlowPlaceholder from "./components/placeholders/BookingFlowPlaceholder";
import BookingConfirmationPlaceholder from "./components/placeholders/BookingConfirmationPlaceholder";
import ChatelainDashboard from "./components/chatelain/ChatelainDashboard";
// Chantier admin — brique 1 : châssis (layout + sidebar + sections placeholder).
import AdminLayout from "./components/admin/AdminLayout";
import AdminAccueil from "./components/admin/AdminAccueil";
import AdminMessages from "./components/admin/AdminMessages";
import AdminChateaux from "./components/admin/AdminChateaux";
import AdminChateauNouveau from "./components/admin/AdminChateauNouveau";
import AdminChateauEdition from "./components/admin/AdminChateauEdition";
import AdminChateauApercu from "./components/admin/AdminChateauApercu";
import AdminChateauDisponibilites from "./components/admin/AdminChateauDisponibilites";
import AdminPersonnages from "./components/admin/AdminPersonnages";
import AdminPersonnageEdition from "./components/admin/AdminPersonnageEdition";
import AdminReservations from "./components/admin/AdminReservations";
import AdminCommissions from "./components/admin/AdminCommissions";
// Sprint S2-α.1.5 — route vitrine SEO /chateau/:slug?onglet=&theme=&offre=
import VitrineChateauRoute from "./components/VitrineChateauRoute";
import PageClub from "./components/club/PageClub";
import PageResultats from "./components/PageResultats";
import PagePersonnage from "./components/PagePersonnage";
import PageHistoire from "./components/PageHistoire";

// Sprint S2-α.2 — pages auth magic link (remplace AuthCallbackPlaceholder)
import Connexion from "./components/auth/Connexion";
import EspaceProfessionnel from "./components/auth/EspaceProfessionnel";
import Inscription from "./components/auth/Inscription";
import MotDePasseOublie from "./components/auth/MotDePasseOublie";
import ReinitialiserMotDePasse from "./components/auth/ReinitialiserMotDePasse";
import CompleterProfil from "./components/auth/CompleterProfil";
import AuthCallback from "./components/auth/AuthCallback";



// Ecran des Dernieres Cles servi par la route `/dernieres-cles`.
//
// C'EST ICI QUE LA NAVIGATION SE DECIDE, et nulle part ailleurs. `DernieresCles`
// signale trois intentions distinctes — quitter, ouvrir une demeure, rentrer —
// et ce conteneur leur donne trois destinations. Le composant, lui, ne connait
// aucune URL.
//
// La distinction n'est pas theorique : quand l'ecran naviguait lui-meme, le clic
// sur une carte fermait PUIS naviguait, et les deux navigations se couraient
// apres — on atterrissait sur l'accueil au lieu de la vitrine.
// Ecran des Vitrines, servi par `/vitrines`.
//
// ⚠ LE CALQUE IMBRIQUE RESTE. Cliquer un chateau y ouvre `VitrineChateau`
// PAR-DESSUS, avec l'animation de porte — etat local du composant, que la route
// ne touche pas. L'URL ne bouge donc pas, a la difference de /dernieres-cles :
// asymetrie assumee, c'est le prix de l'animation qu'on garde (decision DA).
function RouteVitrines() {
  const revenir = useRetour();
  const navigate = useNavigate();
  return (
    <div className="route-catalogue">
      <VitrinePermanente onClose={revenir} onAccueil={() => navigate("/")} />
    </div>
  );
}

// Ecran Proprietaires, servi par `/proprietaires` — EN MODE PAGE.
//
// `enCalque={false}` retire le chrome de calque (classe `part-overlay`, en-tete,
// bouton « Fermer ») : c'est une page, elle porte le « ← Retour » standard.
// Le drapeau est explicite parce que le composant lisait jusqu'ici la PRESENCE
// d'`onClose` pour en decider — un rappel qui sert de drapeau finit par mentir.
// Ecran A propos, servi par `/a-propos` — EN MODE PAGE.
function RouteAPropos() {
  const navigate = useNavigate();
  return (
    <div className="route-catalogue">
      <div className="btn-retour-ligne">
        <BoutonRetour />
      </div>
      <APropos enCalque={false} onAccueil={() => navigate("/")} />
    </div>
  );
}

function RouteProprietaires() {
  return (
    <div className="route-catalogue">
      <div className="btn-retour-ligne">
        <BoutonRetour />
      </div>
      <PartenairesChateaux enCalque={false} />
    </div>
  );
}

// ⚠ EN VEILLE — plus monte par aucune route depuis le passage des Dernieres
//   Cles au Club. Conserve INTACT, avec son import : reactiver l'ecran ne
//   demande que de restaurer la ligne <Route path="/dernieres-cles"> plus bas.
//   ⚠ Ne pas « nettoyer » cette fonction en la croyant morte : elle est
//   dormante, et c'est une decision.
function RouteDernieresCles() {
  const revenir = useRetour();
  const navigate = useNavigate();
  // `.route-catalogue` pose un fond creme OPAQUE sous l'ecran. Sans lui, le
  // fondu d'entree du calque joue sur le body navy — 350 ms de navy a nu, que
  // le mode calque masquait derriere l'accueil. Cf. route-catalogue.css.
  return (
    <div className="route-catalogue">
      <DernieresCles
        /* quitter : on revient d'ou l'on vient (Echap) */
        onClose={revenir}
        /* ouvrir une demeure : la route DEMONTE l'ecran d'elle-meme, donc rien
           a fermer en amont — c'est tout le piege qu'on retire ici. */
        onSelectChateau={(c) => navigate(`/chateau/${c.slug}?onglet=dernieresCles`)}
        /* le logo est un ancrage : toujours l'accueil, jamais un retour */
        onAccueil={() => navigate("/")}
      />
    </div>
  );
}

// Leve au rendu, pour que le filet d'erreur ait quelque chose a attraper.
// Montee par la seule route `/__sonde-filet-erreur`, elle-meme absente du
// bundle de production (cf. le commentaire de cette route, plus bas).
function SondeQuiLeve() {
  throw new Error("sonde du filet d'erreur");
}

function App() {
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [conciergerieOuvert, setConciergerieOuvert] = useState(false);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const navigate = useNavigate();

  // ── L'ERREUR DE L'ACCUEIL SE DECIDE ICI, PAS DANS SES SECTIONS ──────────
  //
  // CINQ sections consomment les chateaux (BarreRecherche, PastillesInspiration,
  // ToggleCarteListe, UneDeLaSemaine, HeureAuxDemeures). Si chacune affichait son
  // propre message, une panne reseau empilerait SIX blocs identiques — pire que
  // le vide muet qu'on remplace.
  //
  // Cet appel supplementaire ne coute AUCUN aller-retour : le service memorise la
  // promesse, donc les six consommateurs partagent la meme requete (cf. PR #121).
  //
  // ⚠ DONNEE PRINCIPALE SEULEMENT. `useCompteurs` (BandeauOffres) n'entre pas
  // dans cette decision : un compteur absent degrade en silence, il ne justifie
  // pas de masquer la page.
  const { error: erreurDonnees, refetch: rechargerDonnees } = useChateaux();

  const [transitionCarte, setTransitionCarte] = useState(null); // { chateau, url }

  const ouvrirChateau = (chateau) => {
    setTransitionChateau(chateau);
  };

  // Contenu historique : home + tous les overlays existants. Servi sur "/" et
  // sur tout chemin non transactionnel (route catch-all "*" ci-dessous).
  // INCHANGÉ par rapport à avant S2-α.1 — seul l'enveloppe <Routes> est ajoutée.
  const homeEtOverlays = (
    <div className="app">

      <Header />
      <main>
        {/* ── L'ACCUEIL EN PANNE : UN SEUL BLOC, PAS SIX ─────────────────────
            CINQ sections d'ici consomment les chateaux. Si chacune rendait son
            propre message, une coupure reseau empilerait autant de blocs
            identiques — le visiteur lirait cinq fois la meme phrase et croirait
            a cinq pannes. La decision se prend donc ICI, une fois.

            ⚠ SUR `error`, JAMAIS SUR UNE LISTE VIDE : un catalogue vide est une
            reponse juste, pas une panne. Le filet garde cette distinction.

            Le Header et le pied de page RESTENT : on ne prend pas le visiteur au
            piege d'un ecran sans issue — il peut toujours partir ailleurs. */}
        {erreurDonnees ? (
          <div className="err-sous-entete">
            <EtatErreur onReessayer={rechargerDonnees} />
          </div>
        ) : (
          <>
            {/* Accueil (DA) : grille 2 colonnes.
                Gauche : slogan -> barre -> pastilles (serres verticalement).
                Droite : carte illustree -> toggle Carte/Liste. */}
            <section className="accueil-hero">
              <div className="accueil-hero-inner">
                <div className="acc-gauche">
                  <Hero />
                  <BarreRecherche />
                  <PastillesInspiration />
                </div>
                <div className="acc-droite">
                  <div className="acc-carte">
                    <img src="/homedessin14-detouree.png" alt="Carte des châteaux depuis Paris" className="hero-illus-img" />
                  </div>
                  <ToggleCarteListe onEntrerChateau={(chateau, url) => setTransitionCarte({ chateau, url })} />
                </div>
              </div>
            </section>
            <BandeauOffres onOuvrirVitrines={() => navigate("/vitrines")} />
            <UneDeLaSemaine
              onOuvrirChateau={ouvrirChateau}
              /* « Voir tout » du carrousel mobile -> catalogue complet. Le lien est
                 masque au-dessus du seuil (une-semaine.css), la prop est inerte en
                 desktop. */
              onVoirTout={() => navigate("/vitrines")}
            />
            {/* ⚠ CE CTA MENAIT AUX DERNIERES CLES, ET C'ETAIT DEJA FAUX AVANT
                LA SIMPLIFICATION DE L'OFFRE : son libelle dit « demeures », qui
                sont Les Vitrines. Il a ete rebranche sur /vitrines plutot que
                retire — il sort du chemin des Dernieres Cles ET cesse de mentir.

                ⚠ LA PROP AVAIT D'ABORD GARDE SON NOM, `onOuvrirDernieres`, au
                motif que la renommer aurait touche un composant que rien
                n'obligeait a bouger. CE MOTIF A DISPARU : la refonte de la
                section 2 a rouvert HeureAuxDemeures de fond en comble. Le nom
                designait un module retire du public — il est donc aligne sur
                `onVoirTout`, deja employe par UneDeLaSemaine pour le meme
                geste. Deux sections, une seule prop pour « aller au catalogue ».

                ⚠ Le libelle visible, lui, ne change pas : « Voir toutes les
                demeures → ». */}
            <HeureAuxDemeures
              onOuvrirChateau={ouvrirChateau}
              onVoirTout={() => navigate("/vitrines")}
            />
            {/* Bandeau « Bientot l'application » : rendu en permanence, masque
                au-dessus du seuil par banniere-app.css. */}
            <BanniereApp />
          </>
        )}
      </main>
      <PiedPatrimoine />

      {(transitionChateau || chateauSelectionne) && (
        <VitrineChateau chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
      {transitionChateau && (
        <TransitionPorte
          chateau={transitionChateau}
          onTermine={() => {
            setChateauSelectionne(transitionChateau);
            setTransitionChateau(null);
          }}
        />
      )}
      {transitionCarte && (
        <TransitionPorte
          chateau={transitionCarte.chateau}
          onTermine={() => {
            const url = transitionCarte.url;
            setTransitionCarte(null);
            navigate(url);
          }}
        />
      )}
      {conciergerieOuvert && (
        <Conciergerie onClose={() => setConciergerieOuvert(false)} overlay={true} />
      )}
    </div>
  );

  return (
    <Routes>
      {/* ⚠ CETTE LIGNE N'EXISTAIT PAS, ET C'EST LE PIEGE DE PR3. L'accueil
          n'avait AUCUNE route a lui : il n'etait servi QUE par le catch-all
          `*`. Remplacer ce catch-all par la page introuvable a donc supprime
          l'accueil du site — mesure immediate, `/` rendait « Cette porte
          n'existe pas ». Deux tests du filet l'ont attrape avant le commit.
          L'accueil a desormais son chemin, et `*` ne sert plus que l'inconnu. */}
      <Route path="/" element={homeEtOverlays} />
      <Route path="/reserver/:chateauSlug" element={<BookingFlowPlaceholder />} />
      <Route path="/reservation/:id/confirmation" element={<BookingConfirmationPlaceholder />} />
      <Route path="/club" element={<RequireAuth><PageClub /></RequireAuth>} />
      <Route path="/mon-compte" element={<Navigate to="/club" replace />} />
      <Route
        path="/chatelain/dashboard"
        element={
          <RequireAuth>
            <RequireRole role="chatelain">
              <ChatelainDashboard />
            </RequireRole>
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <AdminLayout />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<AdminAccueil />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="chateaux" element={<AdminChateaux />} />
        <Route path="chateaux/nouveau" element={<AdminChateauNouveau />} />
        <Route path="chateaux/:id" element={<AdminChateauEdition />} />
        <Route path="chateaux/:id/apercu" element={<AdminChateauApercu />} />
        {/* Sœur d'apercu : même :id, même garde héritée de la route parente.
            ⚠ Un écran à part, PAS une 18ᵉ section d'AdminChateauEdition — ce
            formulaire est un REPLACE tout-ou-rien, la saisie de dates est
            incrémentale ; les mêler ferait deux modèles d'écriture au même
            endroit. */}
        <Route path="chateaux/:id/disponibilites" element={<AdminChateauDisponibilites />} />
        <Route path="personnages" element={<AdminPersonnages />} />
        <Route path="personnages/:id" element={<AdminPersonnageEdition />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="commissions" element={<AdminCommissions />} />
      </Route>
      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
      {/* Aiguillage seul : cette route ne garde rien et n'est pas gardée. Les
          deux destinations qu'elle propose, elles, restent sous RequireRole. */}
      <Route path="/professionnel" element={<EspaceProfessionnel />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/inscription" element={<Inscription />} />
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePasse />} />
      <Route path="/completer-profil" element={<CompleterProfil />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/chateau/:slug" element={<VitrineChateauRoute />} />
      <Route path="/personnage/:slug" element={<PagePersonnage />} />
      <Route path="/histoire" element={<PageHistoire />} />
      <Route path="/resultats" element={<PageResultats />} />
      {/* ⚠ LA ROUTE /dernieres-cles EST RETIREE — EN VEILLE, PAS SUPPRIMEE.
          Les Dernieres Cles deviennent une offre RESERVEE AUX CONNECTES, a
          l'interieur du Club : elles n'ont plus d'ecran public a elles.
          `RouteDernieresCles` et son import restent en place juste au-dessus,
          prets a etre rebranches — restaurer cette ligne suffit.

          ⚠ UNE URL EN FAVORI TOMBE DESORMAIS SUR LA 404, et c'est le
          comportement voulu : mieux vaut une porte qui dit qu'elle n'existe
          plus qu'une porte qui ouvre sur un ecran vide.

          Le commentaire d'origine expliquait pourquoi cet ecran etait devenu
          une ROUTE plutot qu'un calque (les boutons du Header retombaient sur
          l'accueil depuis /resultats). Ce raisonnement reste vrai et vaut pour
          les trois routes ci-dessous — il n'est pas perdu. */}
      <Route path="/vitrines" element={<RouteVitrines />} />
      <Route path="/proprietaires" element={<RouteProprietaires />} />
      <Route path="/a-propos" element={<RouteAPropos />} />
      {/* ⚠ CETTE ROUTE SERVAIT L'ACCUEIL COMPLET pour n'importe quelle URL.
          Mesure du 21 aout sur le build de production : /cette-page-nexiste-pas,
          /chateau/ et /admin/nimporte-quoi rendaient tous les trois l'accueil
          entier, URL inchangee. Le visiteur ne savait pas qu'il s'etait trompe.
          ⚠ Le statut HTTP reste 200 (rewrite SPA de vercel.json) : cette page
          regle ce que le VISITEUR voit, pas ce que Google comprend. Dette SEO
          assumee, tracee dans CLAUDE.md. */}
      {/* ── LA SONDE DU FILET D'ERREUR ─────────────────────────────────────
          Un filet qui n'a jamais rien attrape ne prouve rien. Cette route leve
          volontairement, pour que le E2E constate que `FiletErreur` intercepte
          et que le repli s'affiche — au lieu de l'ecran blanc.

          ⚠ ELLE N'EXISTE PAS EN PRODUCTION. `import.meta.env.DEV` est remplace
          par `false` a la compilation : la branche entiere disparait du bundle.
          Verifie — 0 occurrence de « sonde-filet-erreur » dans `dist/`.
          Les tests E2E tournent contre le serveur de DEV (playwright.config.cjs,
          `webServer: npm run dev`), la sonde y est donc bien presente. */}
      {import.meta.env.DEV && (
        <Route path="/__sonde-filet-erreur" element={<SondeQuiLeve />} />
      )}
      <Route path="*" element={<PageIntrouvable />} />
    </Routes>
  );
}

export default App;
