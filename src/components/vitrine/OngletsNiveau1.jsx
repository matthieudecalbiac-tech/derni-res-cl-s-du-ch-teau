import { useEffect, useState } from "react";
import { compterOffresPourChateau } from "../../services/offresService";

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

export default function OngletsNiveau1({ chateau, actif, isClubMember, onChange, onClubLock }) {
  const [compteursB, setCompteursB] = useState(null);
  const [compteursC, setCompteursC] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (chateau.modules?.dernieresCles) {
      compterOffresPourChateau(chateau.slug, "dernieresCles").then((n) => {
        if (!cancelled) setCompteursB(n);
      });
    }
    // Module C : on charge le compteur même pour les non-membres — l'onglet
    // est désormais toujours visible (gate via modale au click, pas par masquage).
    if (chateau.modules?.club) {
      compterOffresPourChateau(chateau.slug, "club").then((n) => {
        if (!cancelled) setCompteursC(n);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [chateau.slug, chateau.modules]);

  const nbChambres = chateau.chambres?.length || 0;

  // Défense en profondeur : un compteur == 0 cache son suffixe "· N offres"
  // (bouton reste rendu, juste sans le suffix). Évite l'affichage "0 offres".
  const formaterCompteur = (m) => {
    if (m === "permanent") {
      if (nbChambres === 0) return null;
      return nbChambres === 1 ? "1 chambre" : `${nbChambres} chambres`;
    }
    if (m === "dernieresCles" && compteursB !== null) {
      if (compteursB === 0) return null;
      return compteursB === 1 ? "1 offre" : `${compteursB} offres`;
    }
    if (m === "club" && compteursC !== null) {
      if (compteursC === 0) return null;
      return compteursC === 1 ? "1 offre" : `${compteursC} offres`;
    }
    return null;
  };

  const onglets = [];
  if (chateau.modules?.permanent !== false) onglets.push("permanent");
  if (chateau.modules?.dernieresCles) onglets.push("dernieresCles");
  // Club toujours visible si activé sur le château — la restriction membre
  // s'applique au click (modale stub d'auth), pas au rendu (effet de découverte).
  if (chateau.modules?.club) onglets.push("club");

  const handleClick = (m) => {
    if (m === "club" && !isClubMember) {
      onClubLock?.();
      return;
    }
    onChange(m);
  };

  return (
    <div className="vc4-onglets-n1-wrap">
      <nav className="vc4-onglets-n1" role="tablist" aria-label="Modules commerciaux">
        {onglets.map((m) => {
          const compteurLib = formaterCompteur(m);
          return (
            <button
              key={m}
              role="tab"
              aria-selected={actif === m}
              className={"vc4-onglet-n1 " + (actif === m ? "vc4-onglet-n1--actif" : "")}
              onClick={() => handleClick(m)}
              data-onglet={m}
            >
              <span className="vc4-onglet-n1-lib">{LIBELLES[m]}</span>
              {compteurLib && (
                <span className="vc4-onglet-n1-compteur">· {compteurLib}</span>
              )}
            </button>
          );
        })}
      </nav>
      <p className="vc4-bandeau-explicatif">{PHRASES_BANDEAU[actif] || PHRASES_BANDEAU.permanent}</p>
    </div>
  );
}
