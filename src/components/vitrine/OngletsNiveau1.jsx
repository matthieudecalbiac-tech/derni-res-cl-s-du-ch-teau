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

export default function OngletsNiveau1({ chateau, actif, isClubMember, onChange }) {
  const [compteursB, setCompteursB] = useState(null);
  const [compteursC, setCompteursC] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (chateau.modules?.dernieresCles) {
      compterOffresPourChateau(chateau.id, "dernieresCles").then((n) => {
        if (!cancelled) setCompteursB(n);
      });
    }
    if (chateau.modules?.club && isClubMember) {
      compterOffresPourChateau(chateau.id, "club").then((n) => {
        if (!cancelled) setCompteursC(n);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [chateau.id, chateau.modules, isClubMember]);

  const onglets = [];
  if (chateau.modules?.permanent !== false) onglets.push("permanent");
  if (chateau.modules?.dernieresCles) onglets.push("dernieresCles");
  if (chateau.modules?.club && isClubMember) onglets.push("club");

  return (
    <div className="vc4-onglets-n1-wrap">
      <nav className="vc4-onglets-n1" role="tablist" aria-label="Modules commerciaux">
        {onglets.map((m) => {
          const compteur =
            m === "dernieresCles" ? compteursB : m === "club" ? compteursC : null;
          return (
            <button
              key={m}
              role="tab"
              aria-selected={actif === m}
              className={"vc4-onglet-n1 " + (actif === m ? "vc4-onglet-n1--actif" : "")}
              onClick={() => onChange(m)}
              data-onglet={m}
            >
              <span className="vc4-onglet-n1-lib">{LIBELLES[m]}</span>
              {compteur !== null && compteur > 0 && (
                <span className="vc4-onglet-n1-compteur">{compteur}</span>
              )}
            </button>
          );
        })}
      </nav>
      <p className="vc4-bandeau-explicatif">{PHRASES_BANDEAU[actif] || PHRASES_BANDEAU.permanent}</p>
    </div>
  );
}
