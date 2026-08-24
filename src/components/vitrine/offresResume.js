import { useEffect, useState } from "react";
import { getOffresPourChateau } from "../../services/offresService";
import { formaterPrix } from "../../services/_mapping";

// ═══════════════════════════════════════════════════════════════════════════
// LCC — Resume des trois modules : comptage et libelle de detail.
// ═══════════════════════════════════════════════════════════════════════════
// EXTRAIT DE BarreLaterale, PAS RECOPIE. La barre laterale (desktop) et la
// feuille « Explorer le chateau » (mobile) affichent le meme resume ; la
// doctrine du dossier est explicite : les constantes et la logique de donnees
// se partagent, elles ne se dupliquent pas.
//
// Deux consommateurs, UN SEUL aller-retour reseau : `getOffresPourChateau`
// memorise ses reponses (Map, TTL 5 min, offresService.js:12). Il n'y avait
// donc rien a remonter dans VitrineChateau — le cache fait le travail, et les
// deux composants restent autonomes.
// ═══════════════════════════════════════════════════════════════════════════

// ⚠ « dernieresCles » retire : la barre laterale « LES OFFRES » en faisait une
//   CARTE cliquable de chaque vitrine — un septieme chemin public, que la seule
//   lecture des ecrans ne montrait pas. Le reste du module (phraseCarte,
//   detailModule, le comptage) est conserve et fonctionne : restaurer cette
//   entree suffit a rendre la carte.
export const MODULES = ["permanent", "club"];

// ── TROIS ETATS DANS UN SEUL EMPLACEMENT ────────────────────────────────────
//
// Cette ligne n'a qu'une place : un libelle en petites capitales, sous le nom du
// module. Elle doit pourtant distinguer TROIS choses —
//
//   « DES 237,80 € »               une offre existe, voici son prix d'appel
//   « Aucune offre en cours »      on a cherche, il n'y a rien
//   « Momentanement indisponible » on n'a PAS PU chercher
//
// Le troisieme manquait. `detailModule` rendait `null` sur echec comme pendant
// l'attente, et `BarreLaterale:111` ne rend le `<span>` que si le detail est
// verite : la ligne DISPARAISSAIT. Mesure du 20 aout, table `offres` coupee —
//
//   servies   « Dernieres Cles … DES 237,80 € »
//   coupees   « Dernieres Cles … »          ← plus rien, comme s'il n'y avait rien
//
// Une panne rendue identique a une absence : la faute que PR1 a fermee ailleurs.
//
// ⚠ « MOMENTANEMENT » PORTE TOUT LE SENS. Sans lui, « indisponible » se lirait
// comme « aucune offre » — et on n'aurait fait que deplacer la confusion.
//
// SENTINELLE plutot qu'un troisieme etat : `nbB`/`nbC` ont deja deux valeurs
// signifiantes (`null` = en vol, objet = compte). Un booleen d'erreur en
// parallele aurait fait quatre combinaisons dont deux impossibles.
const ERREUR = { erreur: true };
const LIBELLE_ERREUR = "Momentanément indisponible";

// Comptes et prix d'appel des modules B et C.
// Fetchs inconditionnels : on interroge la base pour chaque module. Un module
// sans offre affiche son etat parce qu'on a cherche et rien trouve, pas parce
// qu'on s'est abstenu.
export function useCompteursOffres(slug) {
  const [nbB, setNbB] = useState(null);
  const [nbC, setNbC] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setNbB(null);
    setNbC(null);
    getOffresPourChateau(slug, "dernieresCles", null)
      .then((o) => {
        if (!cancelled) setNbB({ n: o.length, min: o.length ? Math.min(...o.map((x) => x.prixOffre)) : null });
      })
      .catch(() => { if (!cancelled) setNbB(ERREUR); });
    getOffresPourChateau(slug, "club", null)
      .then((o) => {
        if (!cancelled) setNbC({ n: o.length, min: o.length ? Math.min(...o.map((x) => x.prixOffre)) : null });
      })
      .catch(() => { if (!cancelled) setNbC(ERREUR); });
    return () => { cancelled = true; };
  }, [slug]);

  return { nbB, nbC };
}

// Le detail distinctif d'un module : prix d'appel, compte, ou invitation.
// Rien tant que le comptage n'est pas revenu — un « 0 offre » qui apparait puis
// se corrige serait pire que le silence.
export function detailModule(m, { chateau, prixAPartir, isClubMember, nbB, nbC }) {
  if (m === "permanent") {
    const n = chateau?.chambres?.length || 0;
    if (!n) return null;
    return prixAPartir ? `À partir de ${prixAPartir} €` : `${n} chambre${n > 1 ? "s" : ""}`;
  }
  if (m === "dernieresCles") {
    if (nbB?.erreur) return LIBELLE_ERREUR;
    if (nbB === null) return null;
    if (nbB.n === 0) return "Aucune offre en cours";
    return nbB.min ? `Dès ${formaterPrix(nbB.min)} €` : `${nbB.n} offre${nbB.n > 1 ? "s" : ""}`;
  }
  if (m === "club") {
    // ⚠ L'ORDRE COMPTE. Le non-membre voit son invitation AVANT tout etat de
    // chargement : son libelle ne depend d'aucun comptage, et une panne des
    // offres ne doit pas lui retirer la porte d'entree du Club.
    if (!isClubMember) return "Découvrir les privilèges";
    if (nbC?.erreur) return LIBELLE_ERREUR;
    if (nbC === null) return null;
    return nbC.n === 0 ? "Aucune offre en cours" : `${nbC.n} offre${nbC.n > 1 ? "s" : ""}`;
  }
  return null;
}
