import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChateau } from "../hooks/useChateaux";
import VitrineChateau from "./VitrineChateau";
import EtatErreur from "./EtatErreur";
import PageIntrouvable from "./PageIntrouvable";

// Route /chateau/:slug — voie canonique SEO/démo Sprint S2-α.1.5.
// L'overlay legacy (modal depuis home/VitrinePermanente) reste disponible
// en parallèle (strangler fig). VitrineChateau distingue les deux via `mode`.
export default function VitrineChateauRoute() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { chateau, loading, error, refetch } = useChateau(slug);

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

  // ── LA PANNE SE DIT, ELLE NE SE CACHE PLUS ──────────────────────────────────
  //
  // Cette ligne renvoyait a l'accueil. Du point de vue du visiteur, c'etait la
  // pire des reponses : il avait clique une demeure, il se retrouvait sur la
  // home SANS UN MOT — rien ne distinguait ce rebond d'un clic rate, et le seul
  // recours qui marchait (recliquer) n'etait suggere nulle part.
  //
  // ⚠ ET IL PERDAIT SON RETOUR. `Navigate` EMPILE une entree : la fleche du
  // navigateur le ramenait a la vitrine en panne, qui le renvoyait a l'accueil.
  // Une boucle, faite d'un repli qui se voulait doux.
  if (error) {
    return (
      <div className="err-plein">
        <EtatErreur
          titre="Cette demeure n'a pas pu être chargée"
          corps="Nous n'avons pas pu joindre ses pages. Cela tient sans doute à votre connexion, ou à une indisponibilité passagère de notre côté."
          onReessayer={refetch}
          onRetour={fermer}
        />
      </div>
    );
  }

  // Slug inconnu, ou château non publié (le service filtre sur statut, donc
  // getChateauBySlug renvoie null) → home. Toute demeure servie a sa vitrine,
  // mise en avant (estLaUne) ou non.
  //
  // ⚠ CE N'EST PAS UNE PANNE, ET LA DISTINCTION TIENT TOUJOURS. `chateau === null`
  // signifie que le fetch a REUSSI et repond « cette demeure n'est pas servie ».
  // Afficher « nous n'avons pas pu joindre » serait faux — c'est le cas `error`
  // juste au-dessus qui porte cela, et lui seul.
  //
  // Ce qui change en PR3, c'est la DESTINATION : cette ligne renvoyait a
  // l'accueil, sans un mot. Le visiteur cliquait une demeure et se retrouvait
  // ailleurs, sans savoir pourquoi. La reponse juste est une page qui le DIT.
  if (!chateau) return <PageIntrouvable />;

  return (
    <VitrineChateau
      chateau={chateau}
      mode="route"
      onClose={fermer}
    />
  );
}
