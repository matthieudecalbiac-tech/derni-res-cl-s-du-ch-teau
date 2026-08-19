import { useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useChateau } from "../hooks/useChateaux";
import VitrineChateau from "./VitrineChateau";

// Route /chateau/:slug — voie canonique SEO/démo Sprint S2-α.1.5.
// L'overlay legacy (modal depuis home/VitrinePermanente) reste disponible
// en parallèle (strangler fig). VitrineChateau distingue les deux via `mode`.
export default function VitrineChateauRoute() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { chateau, loading, error } = useChateau(slug);

  // ── FERMER N'EST PAS RECULER ────────────────────────────────────────────────
  //
  // La vitrine ecrit son theme dans l'URL (`?theme=histoire`) : chaque theme
  // consulte EMPILE une entree d'historique. Un simple `navigate(-1)` y recule
  // donc d'un theme au lieu de sortir — mesure : trois themes ouverts, et il
  // fallait trois pressions d'Escape pour quitter la demeure. C'est le filet
  // `vitrines-tous-chateaux` qui l'a attrape, et il avait raison.
  //
  // La fleche NATIVE du navigateur garde ce comportement, et c'est normal :
  // reculer theme par theme est ce qu'elle promet. Mais `.vc3-retour` et
  // `Escape` FERMENT — ils doivent sortir d'un seul geste, quel que soit le
  // nombre de themes parcourus.
  //
  //   delta = idx_courant - idxEntree            (= nombre de themes empiles)
  //   idxEntree  >  0  ->  navigate(-(delta + 1))   on retombe sur l'origine
  //   idxEntree === 0  ->  navigate("/")            arrivee directe, repli
  //
  // Mesure du 19 aout, depuis /resultats?region=Normandie&invites=2 :
  //   0 theme  delta=0  go(-1)  -> /resultats?region=Normandie&invites=2
  //   1 theme  delta=1  go(-2)  -> idem, criteres intacts
  //   3 themes delta=3  go(-4)  -> idem, criteres intacts
  //   arrivee directe + 3 themes : go(-3) ramene SUR la vitrine, pas dehors —
  //   d'ou le repli "/" obligatoire dans ce cas.
  // Le cas 0 theme se reduit exactement a `navigate(-1)` : la formule
  // GENERALISE le comportement deja valide, elle ne le remplace pas.
  //
  // ⚠ POSE UNE SEULE FOIS. StrictMode monte, demonte et remonte en dev ; et
  // surtout, ce composant se re-rend a CHAQUE ouverture de theme. Reecrire la
  // reference a un rendu ulterieur ecraserait l'entree par l'etat courant, et
  // `delta` retomberait a zero — la sortie ne sauterait plus rien.
  //
  // ⚠ ANGLE MORT ASSUME, MESURE LE 19 AOUT : aucun lien ne mene d'une vitrine a
  // une AUTRE vitrine (les alentours ne sont pas cliquables, il n'y a ni
  // « chateaux voisins » ni carte dans la vitrine, et le seul autre lien du
  // sous-arbre mene a /personnage). Un changement de `slug` sans demontage est
  // donc impossible aujourd'hui. Si un lien inter-chateau est ajoute un jour,
  // REINITIALISER `idxEntree` au changement de slug : sinon `delta` se
  // calculerait depuis l'entree de la vitrine PRECEDENTE et la sortie sauterait
  // trop loin.
  const idxEntree = useRef(null);
  if (idxEntree.current === null) {
    idxEntree.current = window.history.state?.idx ?? 0;
  }

  const fermer = () => {
    const entree = idxEntree.current ?? 0;
    if (entree === 0) {
      navigate("/");
      return;
    }
    const courant = window.history.state?.idx ?? entree;
    const delta = Math.max(0, courant - entree);
    navigate(-(delta + 1));
  };

  // Fetch en cours → placeholder creme (evite que le body navy transparaisse
  // entre la fin de la TransitionPorte creme et le paint de la vitrine)
  if (loading) return <div className="vitrine-route-placeholder" />;

  // Erreur Supabase → home
  if (error) return <Navigate to="/" replace />;

  // Slug inconnu, ou château non publié (le service filtre sur statut, donc
  // getChateauBySlug renvoie null) → home. Toute demeure servie a sa vitrine,
  // mise en avant (estLaUne) ou non.
  if (!chateau) return <Navigate to="/" replace />;

  return (
    <VitrineChateau
      chateau={chateau}
      mode="route"
      onClose={fermer}
    />
  );
}
