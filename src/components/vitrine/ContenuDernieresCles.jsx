import { useEffect, useState, useRef } from "react";
import { getOffresPourChateau } from "../../services/offresService";

export default function ContenuDernieresCles({ chateau, offreCible, onReserver }) {
  const [offres, setOffres] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [tentative, setTentative] = useState(0);
  const [highlight, setHighlight] = useState(null);
  const cardsRef = useRef({});

  // ── TROIS ETATS, PAS DEUX ───────────────────────────────────────────────────
  //
  // `getOffresPourChateau` JETTE (`offresService.js:59`), et ce `.then` n'avait
  // pas de `.catch` : `offres` restait a `null`, et RIEN ne l'en sortait. Mesure
  // du 20 aout, table `offres` coupee et catalogue intact — la section affichait
  // « Chargement des offres… » DEFINITIVEMENT.
  //
  //   chargement  offres === null && !erreur   la requete est en vol
  //   vide        offres.length === 0          elle a REUSSI, rien a montrer
  //   erreur      erreur === true              elle a ECHOUE
  //
  // ⚠ LE VIDE ET L'ERREUR NE PARTAGENT PAS LEUR PHRASE. « Aucune offre » est une
  // constatation ; on ne constate rien quand on n'a pas pu demander.
  //
  // ⚠ REMISE A ZERO EN TETE D'EFFET. Sans elle, une demeure en panne laisserait
  // son erreur a la suivante — l'effet se rejoue au changement de slug, l'etat
  // ne se reinitialise pas tout seul.
  //
  // ⚠ LE DRAPEAU `cancelled` VAUT AUSSI POUR LE REJET. StrictMode monte deux
  // fois en dev, et un changement de demeure peut arriver avant la reponse :
  // sans lui, un rejet tardif poserait une erreur sur une section deja demontee.
  useEffect(() => {
    let cancelled = false;
    setErreur(false);
    setOffres(null);
    getOffresPourChateau(chateau.slug, "dernieresCles")
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

  // L'erreur passe AVANT le chargement : `offres` vaut encore `null` quand la
  // requete a echoue, et l'ordre inverse rendrait le spinner pour toujours.
  if (erreur) {
    return (
      <section className="vc4-contenu-dc" data-onglet-contenu="dernieresCles">
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
                <span className="vc4-dc-card-prix-barre">{o.prixOriginalAffiche} €</span>
              )}
              <span className="vc4-dc-card-prix-offre">{o.prixOffreAffiche} €</span>
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
