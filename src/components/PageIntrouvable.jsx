import { useNavigate } from "react-router-dom";
import EtatErreur from "./EtatErreur";

// La page servie quand l'adresse ne mene nulle part.
//
// ── CE QU'ELLE REMPLACE ──────────────────────────────────────────────────────
//
// La route `*` d'`App.jsx` servait L'ACCUEIL COMPLET pour n'importe quelle URL.
// Mesure du 21 aout, sur le build de production :
//
//   /cette-page-nexiste-pas   ->  l'accueil entier, URL inchangee, titre normal
//   /chateau/                 ->  idem
//   /admin/nimporte-quoi      ->  idem
//
// Le visiteur ne savait donc pas qu'il s'etait trompe : il voyait un site qui
// marche, a une adresse qui n'existe pas.
//
// ── « N'EXISTE PAS » N'EST PAS « MOMENTANEMENT CLOSE » ───────────────────────
//
// ⚠ LE TITRE FAIT ECHO A L'ECRAN DE PANNE, ET C'EST DELIBERE — pour dire son
// CONTRAIRE. « Les portes sont momentanement closes » annonce un empechement
// passager, qu'un reessai peut lever. « Cette porte n'existe pas » est definitif :
// aucun reessai n'y changera rien, et c'est pourquoi cette page n'en propose
// aucun. Deux etats, deux phrases, et un visiteur qui verrait les deux
// comprendrait la difference sans qu'on la lui explique.
//
// ── LE STATUT HTTP RESTE 200, ET C'EST UNE DETTE ASSUMEE ────────────────────
//
// ⚠ CETTE PAGE REGLE CE QUE LE VISITEUR VOIT, PAS CE QUE GOOGLE COMPREND.
// `vercel.json` reecrit `/(.*)` vers `index.html` — necessaire au routage d'une
// SPA, sans quoi un rechargement direct de `/vitrines` casserait. Toute URL
// repond donc 200, verifie en production le 21 aout. Un vrai 404 HTTP demande
// une liste de routes valides ou une fonction Edge : chantier separe, coordonne
// avec Julien (SEO), trace dans CLAUDE.md.
export default function PageIntrouvable() {
  const navigate = useNavigate();

  return (
    <div className="err-plein">
      <EtatErreur
        titre="Cette porte n’existe pas"
        corps="L’adresse que vous avez suivie ne mène à aucune page de notre domaine. Le lien est peut-être ancien, ou comporte une erreur de frappe."
        onReessayer={() => navigate("/")}
        libelleAction="Retour à l’accueil"
        onRetour={() => navigate("/vitrines")}
        libelleRetour="Parcourir les demeures →"
      />
    </div>
  );
}
