import { useEffect, useState, useRef } from "react";
import { getOffresPourChateau } from "../../services/offresService";

export default function ContenuClub({ chateau, offreCible, onReserver }) {
  const [offres, setOffres] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [highlight, setHighlight] = useState(null);
  const cardsRef = useRef({});

  // Meme regle qu'a `ContenuDernieresCles`, et pour la meme raison : trois etats
  // (chargement / vide / erreur) la ou il n'y en avait que deux, un `.catch` qui
  // sort du `null`, et la remise a zero en tete d'effet pour qu'une demeure en
  // panne ne legue pas son erreur a la suivante. Le drapeau `cancelled` couvre
  // le rejet comme il couvrait la reponse.
  //
  // ⚠ CETTE SECTION EST MOINS EXPOSEE : `VitrineChateau:388` ne la monte que
  // pour les membres du Club. Le defaut y est donc plus rare — pas moins reel.
  useEffect(() => {
    let cancelled = false;
    setErreur(false);
    setOffres(null);
    getOffresPourChateau(chateau.slug, "club")
      .then((data) => {
        if (!cancelled) setOffres(data);
      })
      .catch(() => {
        if (!cancelled) setErreur(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chateau.slug, tentative]);

  useEffect(() => {
    if (!offreCible || !offres) return;
    const el = cardsRef.current[offreCible];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(offreCible);
    const t = setTimeout(() => setHighlight(null), 3000);
    return () => clearTimeout(t);
  }, [offreCible, offres]);

  // L'erreur passe AVANT le chargement — `offres` vaut encore `null` a l'echec.
  if (erreur) {
    return (
      <section className="vc4-contenu-club" data-onglet-contenu="club">
        <p className="vc4-dc-erreur">
          Les offres n&rsquo;ont pas pu être chargées.{" "}
          <button
            type="button"
            className="vc4-dc-erreur-lien"
            onClick={() => setTentative((n) => n + 1)}
          >
            Réessayer
          </button>
        </p>
      </section>
    );
  }

  if (offres === null) {
    return (
      <section className="vc4-contenu-club" data-onglet-contenu="club">
        <p className="vc4-loading">Chargement des offres…</p>
      </section>
    );
  }

  return (
    <section className="vc4-contenu-club" data-onglet-contenu="club">
      <div className="vc4-club-banniere">
        <span className="vc4-club-banniere-lys">⚜</span>
        <h2 className="vc4-club-banniere-titre">Bienvenue au Club Châtelains</h2>
        <p className="vc4-club-banniere-sous">
          Des moments confidentiels, partagés avec les propriétaires du château.
        </p>
      </div>

      {offres.length === 0 && (
        <p className="vc4-dc-vide">Aucune offre pour cette demeure en ce moment.</p>
      )}

      <div className="vc4-club-liste">
        {offres.map((o) => (
          <article
            key={o.id}
            id={`offre-${o.id}`}
            ref={(el) => {
              if (el) cardsRef.current[o.id] = el;
            }}
            data-testid={`offre-card-${o.id}`}
            className={
              "vc4-club-card " + (highlight === o.id ? "vc4-club-card--highlight" : "")
            }
          >
            <div className="vc4-club-card-badge">⚜ Club Châtelains</div>

            <div className="vc4-club-card-photo">
              <div className="vc4-club-card-photo-vide">⚜</div>
            </div>

            <div className="vc4-club-card-corps">
              <header className="vc4-club-card-head">
                <h3 className="vc4-club-card-titre">{o.titre}</h3>
                <span className="vc4-club-card-dates">{o.dates?.label}</span>
              </header>
              <p className="vc4-club-card-desc">{o.description}</p>

              {o.servicesInclus?.length > 0 && (
                <ul className="vc4-club-card-services">
                  {o.servicesInclus.slice(0, 5).map((s, i) => (
                    <li key={i} className="vc4-club-card-service">
                      {s}
                    </li>
                  ))}
                </ul>
              )}

              {o.urgence && <p className="vc4-club-card-urgence">{o.urgence}</p>}
            </div>

            <div className="vc4-club-card-prix-col">
              <span className="vc4-club-card-prix-offre">{o.prixOffreAffiche} €</span>
              <span className="vc4-club-card-prix-meta">total séjour</span>
              <button
                className="vc4-club-card-cta"
                onClick={() => onReserver && onReserver(o.id)}
              >
                Réserver →
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
