import { useEffect, useState, useRef } from "react";
import { getOffresPourChateau } from "../../services/offresService";

export default function ContenuClub({ chateau, offreCible, onReserver }) {
  const [offres, setOffres] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const cardsRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    getOffresPourChateau(chateau.id, "club").then((data) => {
      if (!cancelled) setOffres(data);
    });
    return () => {
      cancelled = true;
    };
  }, [chateau.id]);

  useEffect(() => {
    if (!offreCible || !offres) return;
    const el = cardsRef.current[offreCible];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(offreCible);
    const t = setTimeout(() => setHighlight(null), 3000);
    return () => clearTimeout(t);
  }, [offreCible, offres]);

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
        <p className="vc4-dc-vide">Aucune offre Club disponible pour le moment.</p>
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
              <span className="vc4-club-card-prix-offre">{o.prixOffre} €</span>
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
