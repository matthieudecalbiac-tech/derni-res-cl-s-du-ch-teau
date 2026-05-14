import { useEffect, useState, useRef } from "react";
import { getOffresPourChateau } from "../../services/offresService";

export default function ContenuDernieresCles({ chateau, offreCible, onReserver }) {
  const [offres, setOffres] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const cardsRef = useRef({});

  useEffect(() => {
    let cancelled = false;
    getOffresPourChateau(chateau.slug, "dernieresCles").then((data) => {
      if (!cancelled) setOffres(data);
    });
    return () => {
      cancelled = true;
    };
  }, [chateau.slug]);

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
      <section className="vc4-contenu-dc" data-onglet-contenu="dernieresCles">
        <p className="vc4-loading">Chargement des offres…</p>
      </section>
    );
  }

  return (
    <section className="vc4-contenu-dc" data-onglet-contenu="dernieresCles">
      <div className="vc4-dc-titre-wrap">
        <div className="vc4-dc-titre-orn-l" />
        <h2 className="vc4-dc-titre">Les Dernières Clés</h2>
        <div className="vc4-dc-titre-orn-l" />
      </div>

      {offres.length === 0 && (
        <p className="vc4-dc-vide">Aucune offre disponible pour le moment.</p>
      )}

      <div className="vc4-dc-liste">
        {offres.map((o) => (
          <article
            key={o.id}
            id={`offre-${o.id}`}
            ref={(el) => {
              if (el) cardsRef.current[o.id] = el;
            }}
            data-testid={`offre-card-${o.id}`}
            className={
              "vc4-dc-card " + (highlight === o.id ? "vc4-dc-card--highlight" : "")
            }
          >
            <div className="vc4-dc-card-photo">
              <div className="vc4-dc-card-photo-vide">⚜</div>
            </div>

            <div className="vc4-dc-card-corps">
              <header className="vc4-dc-card-head">
                <h3 className="vc4-dc-card-titre">{o.titre}</h3>
                <span className="vc4-dc-card-dates">{o.dates?.label}</span>
              </header>
              <p className="vc4-dc-card-desc">{o.description}</p>

              {o.servicesInclus?.length > 0 && (
                <ul className="vc4-dc-card-services">
                  {o.servicesInclus.slice(0, 5).map((s, i) => (
                    <li key={i} className="vc4-dc-card-service">
                      {s}
                    </li>
                  ))}
                </ul>
              )}

              {o.urgence && <p className="vc4-dc-card-urgence">{o.urgence}</p>}
            </div>

            <div className="vc4-dc-card-prix-col">
              {o.prixOriginal && o.prixOriginal !== o.prixOffre && (
                <span className="vc4-dc-card-prix-barre">{o.prixOriginal} €</span>
              )}
              <span className="vc4-dc-card-prix-offre">{o.prixOffre} €</span>
              <span className="vc4-dc-card-prix-meta">total séjour</span>
              <button
                className="vc4-dc-card-cta"
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
