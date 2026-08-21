import { Component } from "react";
import EtatErreur from "./EtatErreur";

// ═══════════════════════════════════════════════════════════════════════════
// LCC — LE FILET DE DERNIER RECOURS (PR3)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠ SEUL COMPOSANT DE CLASSE DU DEPOT, ET IL N'Y A PAS D'ALTERNATIVE. Tout le
// reste est fonctionnel. React n'offre AUCUN equivalent en hook : attraper une
// exception de rendu exige `getDerivedStateFromError` ou `componentDidCatch`,
// qui n'existent que sur une classe. Ce n'est donc pas une preference de style,
// c'est le seul moyen — et cela evite une neuvieme dependance runtime pour
// trente lignes, dans un bundle deja au-dessus du seuil d'alerte.
//
// ── CE QUE CE FILET FAIT, ET CE QU'IL NE FAIT PAS ───────────────────────────
//
// C'est une ASSURANCE, pas une reparation : aucune erreur de rendu n'est connue
// dans le projet. Sans lui, une exception au rendu demonte l'arbre entier et
// laisse `<div id="root">` VIDE — un ecran blanc, sans un mot, sans issue. Le
// meme symptome que l'auth bloquee de PR2b, par un tout autre chemin.
//
// Il n'attrape PAS : les rejets de promesse (c'est le travail des `.catch`, cf.
// PR2a/PR2b), les erreurs dans les gestionnaires d'evenement, ni celles des
// minuteurs. React ne les lui donne pas.
//
// ── OU IL EST MONTE, ET POURQUOI ────────────────────────────────────────────
//
//   StrictMode > BrowserRouter > FiletErreur > AuthProvider > App
//
// SOUS le routeur : il reste vivant, donc le repli pourrait naviguer. AU-DESSUS
// d'`AuthProvider` : le provider le plus charge en effets du depot est couvert
// lui aussi.
//
// ⚠ UN SEUL, GLOBAL — et ce n'est pas un renoncement. Un filet par route se
// justifierait s'il preservait un chrome persistant ; il n'y en a AUCUN. Verifie
// le 21 aout : `<Header />` vit DANS `homeEtOverlays` (`App.jsx:173`),
// `PageResultats` monte le sien, `/vitrines` et `/dernieres-cles` ont leurs
// propres topbars. Chaque route porte son chrome DEDANS. Un filet par route ne
// sauverait donc rien de visible. Le jour ou un chrome persistant existera, la
// question meritera d'etre rouverte.
//
// ── LE REPLI RECHARGE, IL NE NAVIGUE PAS ────────────────────────────────────
//
// ⚠ UN `ErrorBoundary` NE SE REINITIALISE PAS TOUT SEUL. `getDerivedStateFromError`
// pose un etat, et seul un remontage l'efface. Un repli qui naviguerait par le
// routeur changerait l'URL en RESTANT AFFICHE : le visiteur verrait le message
// d'erreur coller a l'accueil, et croirait le site mort.
// `window.location.assign("/")` recharge le document entier — l'application
// repart de zero, l'etat d'erreur avec elle. Rustique, sans angle mort.
//
// ── EN DEVELOPPEMENT, LA CONSOLE CRIE QUAND MEME ────────────────────────────
//
// ⚠ React RELANCE l'erreur dans la console meme quand ce filet l'attrape. C'est
// le comportement du mode developpement, et il n'indique PAS que le filet est
// casse : si le repli s'affiche, il a fait son travail. En production, la
// console reste muette.
// ═══════════════════════════════════════════════════════════════════════════

export default class FiletErreur extends Component {
  constructor(props) {
    super(props);
    this.state = { enPanne: false };
  }

  static getDerivedStateFromError() {
    // On ne conserve pas l'objet d'erreur dans l'etat : rien a l'ecran ne
    // l'affiche, et un message technique n'a rien a faire dans cette copie.
    return { enPanne: true };
  }

  componentDidCatch(erreur, infos) {
    // La seule trace. Elle sert au diagnostic, jamais au visiteur.
    console.error("[FiletErreur] rendu interrompu :", erreur, infos?.componentStack);
  }

  render() {
    if (this.state.enPanne) {
      return (
        <div className="err-plein">
          <EtatErreur
            titre="Quelque chose s’est interrompu"
            corps="Un incident nous a empêchés d’afficher cette page. Recharger suffit le plus souvent ; si cela se reproduit, écrivez-nous."
            onReessayer={() => window.location.assign("/")}
            libelleAction="Recharger la page"
          />
        </div>
      );
    }
    return this.props.children;
  }
}
