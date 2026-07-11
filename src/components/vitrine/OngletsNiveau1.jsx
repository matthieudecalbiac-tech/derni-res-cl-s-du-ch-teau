import { useEffect, useState } from "react";
import { getOffresPourChateau } from "../../services/offresService";
import { formaterPrix } from "../../services/_mapping";

const PHRASES_BANDEAU = {
  permanent: "Les chambres du château, disponibles toute l'année.",
  dernieresCles: "Des séjours exceptionnels à dates précises, à prix réduits.",
  club: "Offres confidentielles réservées aux membres du Club Châtelains.",
};

const LIBELLES = {
  permanent: "Permanent",
  dernieresCles: "Dernières Clés",
  club: "Club Châtelains",
};

const ICONES = {
  permanent: "/icon-demeure.png",
  dernieresCles: "/icon-cle.png",
  club: "/icon-couronne.png",
};

export default function OngletsNiveau1({ chateau, actif, isClubMember, onChange, onClubLock, dispoVerifiee, dateArrivee, dateDepart, voyageurs, prixAPartir }) {
  const [compteursB, setCompteursB] = useState(null);
  const [compteursC, setCompteursC] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Filtre dispo : actif uniquement apres "Verifier" ; sinon comptage de base.
    const filtre = dispoVerifiee ? { dateArrivee, dateDepart, voyageurs } : null;
    // Fetchs inconditionnels : on interroge la base pour chaque module, sans
    // consulter un contrat souscrit. Un onglet sans offre affiche l'etat vide
    // parce qu'on a cherche et rien trouve, pas parce qu'on s'est abstenu.
    getOffresPourChateau(chateau.slug, "dernieresCles", filtre).then((offres) => {
      if (!cancelled)
        setCompteursB({
          count: offres.length,
          prixMin: offres.length ? Math.min(...offres.map((o) => o.prixOffre)) : null,
        });
    });
    // Module C : compteur charge meme pour les non-membres — l'onglet est
    // toujours visible (gate via modale au click, pas par masquage).
    getOffresPourChateau(chateau.slug, "club", filtre).then((offres) => {
      if (!cancelled)
        setCompteursC({
          count: offres.length,
          prixMin: offres.length ? Math.min(...offres.map((o) => o.prixOffre)) : null,
        });
    });
    return () => {
      cancelled = true;
    };
  }, [chateau.slug, dispoVerifiee, dateArrivee, dateDepart, voyageurs]);

  // DETTE C5+ : filtrage chambres Permanent par capacite/dates a brancher avec Supabase (logique distincte d'offresService)
  const nbChambres = chateau.chambres?.length || 0;

  // Défense en profondeur : un compteur == 0 cache son suffixe "· N offres"
  // (bouton reste rendu, juste sans le suffix). Évite l'affichage "0 offres".
  const formaterCompteur = (m) => {
    // C4 : suffixe "X disponibles à vos dates" si dispoVerifiee, sinon libelle de base.
    // N reste le compteur actuel — le vrai filtrage par dates viendra en C5.
    const suffixe = (n, mot) =>
      dispoVerifiee
        ? `${n} ${mot}${n === 1 ? "" : "s"} disponible${n === 1 ? "" : "s"} à vos dates`
        : n === 1
          ? `1 ${mot}`
          : `${n} ${mot}s`;

    if (m === "permanent") {
      if (nbChambres === 0) return null;
      return suffixe(nbChambres, "chambre");
    }
    if (m === "dernieresCles" && compteursB !== null) {
      if (compteursB.count === 0) return null;
      return suffixe(compteursB.count, "offre");
    }
    if (m === "club" && compteursC !== null) {
      if (compteursC.count === 0) return null;
      return suffixe(compteursC.count, "offre");
    }
    return null;
  };

  // Piece 1a : les trois onglets sont toujours visibles. Un onglet sans offre
  // s'affiche quand meme — l'etat vide est gere par son contenu. La restriction
  // membre du Club s'applique au click (modale stub d'auth), pas au rendu.
  const onglets = ["permanent", "dernieresCles", "club"];

  const handleClick = (m) => {
    if (m === "club" && !isClubMember) {
      onClubLock?.();
      return;
    }
    onChange(m);
  };

  // Apres "Verifier les disponibilites" : feedback dispo (preserve C4). Sinon : prix d'appel.
  const accrochePourModule = (m) => {
    if (dispoVerifiee) {
      const lib = formaterCompteur(m); // "N chambres/offres disponibles a vos dates"
      if (lib) return lib;
    }
    if (m === "permanent") return `À partir de ${prixAPartir} €`;
    if (m === "dernieresCles")
      return compteursB?.prixMin ? `Dès ${formaterPrix(compteursB.prixMin)} €` : `${compteursB?.count || 0} offres`;
    if (m === "club") return "Découvrir les privilèges";
    return null;
  };

  // Le point s'allume quand le module a au moins une offre reelle. Il reste
  // absent tant que le comptage n'est pas revenu (compteur null) : pas de point
  // pendant le chargement, plutot qu'un point qui apparait puis disparait.
  // Permanent est exclu : il compte des chambres, un point y serait toujours
  // allume et n'apprendrait rien.
  const aOffre = (m) => {
    if (m === "dernieresCles") return compteursB !== null && compteursB.count > 0;
    if (m === "club") return compteursC !== null && compteursC.count > 0;
    return false;
  };

  return (
    <div className="vc4-onglets-n1-wrap">
      <nav className="vc4-onglets-n1" role="tablist" aria-label="Modules commerciaux">
        {onglets.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={actif === m}
            className={"vc4-offre-card " + (actif === m ? "vc4-offre-card--actif" : "")}
            onClick={() => handleClick(m)}
            data-onglet={m}
          >
            <img className="vc4-offre-icone" src={ICONES[m]} alt="" aria-hidden="true" />
            <span className="vc4-offre-corps">
              <span className="vc4-offre-titre">
                {LIBELLES[m]}
                {aOffre(m) && <span className="vc4-offre-point" aria-hidden="true" />}
              </span>
              <span className="vc4-offre-sous">{PHRASES_BANDEAU[m]}</span>
              <span className="vc4-offre-accroche">{accrochePourModule(m)}</span>
            </span>
            <span className="vc4-offre-fleche">→</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
