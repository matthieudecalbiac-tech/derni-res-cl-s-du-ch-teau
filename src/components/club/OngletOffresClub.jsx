import { useEffect, useState } from "react";
import { getOffresClub } from "../../services/offresService.js";

export default function OngletOffresClub() {
  const [offres, setOffres] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    getOffresClub()
      .then((data) => { if (!annule) { setOffres(data); setChargement(false); } })
      .catch(() => { if (!annule) { setErreur(true); setChargement(false); } });
    return () => { annule = true; };
  }, []);

  return (
    <div className="oc">
      <header className="oc-entete">
        <h2 className="oc-titre">Les offres du Club</h2>
        <p className="oc-sous">Des séjours réservés aux membres, dans chacune de nos demeures.</p>
      </header>

      {chargement && <p className="oc-etat">Chargement des offres…</p>}
      {erreur && <p className="oc-etat oc-etat--erreur">Les offres n'ont pas pu être chargées.</p>}

      {!chargement && !erreur && offres.length === 0 && (
        <div className="oc-vide">
          <p>Les offres du Club arrivent bientôt.</p>
          <p className="oc-vide-sub">Vos châtelains les préparent.</p>
        </div>
      )}

      {!chargement && !erreur && offres.length > 0 && (
        <div className="oc-liste">
          {offres.map((o) => (
            <article key={o.id} className="oc-carte">
              <div className="oc-carte-tete">
                <div>
                  <div className="oc-carte-chateau">{o.chateau?.nom}</div>
                  <div className="oc-carte-region">{o.chateau?.region}</div>
                </div>
                {o.reduction && <span className="oc-carte-reduction">−{o.reduction}%</span>}
              </div>

              <h3 className="oc-carte-titre">{o.titre}</h3>
              {o.dates?.label && <p className="oc-carte-dates">{o.dates.label}</p>}
              {o.description && <p className="oc-carte-desc">{o.description}</p>}

              <div className="oc-carte-pied">
                <div className="oc-carte-prix">
                  {o.prixOriginal && o.prixOriginal !== o.prixOffre && (
                    <span className="oc-carte-prix-barre">{o.prixOriginalAffiche} €</span>
                  )}
                  <span className="oc-carte-prix-offre">{o.prixOffreAffiche} €</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
