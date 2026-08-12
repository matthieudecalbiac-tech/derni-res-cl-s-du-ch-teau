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

export const MODULES = ["permanent", "dernieresCles", "club"];

// Comptes et prix d'appel des modules B et C.
// Fetchs inconditionnels : on interroge la base pour chaque module. Un module
// sans offre affiche son etat parce qu'on a cherche et rien trouve, pas parce
// qu'on s'est abstenu.
export function useCompteursOffres(slug) {
  const [nbB, setNbB] = useState(null);
  const [nbC, setNbC] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getOffresPourChateau(slug, "dernieresCles", null).then((o) => {
      if (!cancelled) setNbB({ n: o.length, min: o.length ? Math.min(...o.map((x) => x.prixOffre)) : null });
    });
    getOffresPourChateau(slug, "club", null).then((o) => {
      if (!cancelled) setNbC({ n: o.length, min: o.length ? Math.min(...o.map((x) => x.prixOffre)) : null });
    });
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
    if (nbB === null) return null;
    if (nbB.n === 0) return "Aucune offre en cours";
    return nbB.min ? `Dès ${formaterPrix(nbB.min)} €` : `${nbB.n} offre${nbB.n > 1 ? "s" : ""}`;
  }
  if (m === "club") {
    if (!isClubMember) return "Découvrir les privilèges";
    if (nbC === null) return null;
    return nbC.n === 0 ? "Aucune offre en cours" : `${nbC.n} offre${nbC.n > 1 ? "s" : ""}`;
  }
  return null;
}
