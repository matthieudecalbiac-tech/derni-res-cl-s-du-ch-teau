import { useMemo } from "react";
import { useChateaux } from "../hooks/useChateaux";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import "../styles/heure-aux-demeures.css";

export default function HeureAuxDemeures({ onOuvrirChateau, onOuvrirDernieres }) {
  const { chateaux } = useChateaux();
  const [ref, visible] = useScrollAnimation(0.15);
  // Débranché de la liste SLUGS codée en dur : les publiés non-démo, triés par
  // ordreHome ascendant (null/undefined à la fin), puis par nom.
  const demeures = useMemo(
    () =>
      chateaux
        .filter((c) => !c.isDemoMock)
        .slice()
        .sort((a, b) => {
          const oa = a.ordreHome ?? Infinity;
          const ob = b.ordreHome ?? Infinity;
          if (oa !== ob) return oa - ob;
          return a.nom.localeCompare(b.nom);
        }),
    [chateaux]
  );
  if (demeures.length === 0) return null;

  const renderMedaillon = (c, n) => (
    <article
      key={c.id}
      data-slug={c.slug}
      className="da-medaillon"
      onClick={() => onOuvrirChateau?.(c)}
    >
      <div className="da-photo" style={{ transitionDelay: `${0.2 + (n - 1) * 0.08}s` }}>
        <img src={c.images?.[0]} alt={c.nom} loading="lazy" />
      </div>
      <div className="da-texte" style={{ transitionDelay: `${0.2 + (n - 1) * 0.08}s` }}>
        <span className="da-num">{String(n).padStart(2, "0")}</span>
        <h3 className="da-nom">{c.nom}</h3>
        <p className="da-desc">{c.accroche}</p>
      </div>
    </article>
  );

  const gauche = demeures.slice(0, 3);
  const droite = demeures.slice(3, 6);
  const bas = demeures[6];

  return (
    <section className={"journal-demeures" + (visible ? " journal-demeures--visible" : "")} ref={ref}>
      <div className="da-wrap">

        <header className="da-tete">
          <h2 className="da-titre">Découvrez aussi</h2>
          <p className="da-intro">
            D'autres demeures d'exception à explorer, chacune porteuse d'une histoire unique.
          </p>
        </header>

        <div className="da-grille">
          <div className="da-col da-col--g">
            {gauche.map((c, i) => renderMedaillon(c, i + 1))}
          </div>
          <div className="da-centre">
            <img className="da-embleme" src="/embleme-horloge.png" alt="" aria-hidden="true" />
          </div>
          <div className="da-col da-col--d">
            {droite.map((c, i) => renderMedaillon(c, i + 4))}
          </div>
        </div>

        {bas && <div className="da-bas">{renderMedaillon(bas, 7)}</div>}

        <div className="da-cta-wrap">
          <button
            type="button"
            className="da-cta"
            onClick={() => onOuvrirDernieres?.()}
          >
            Voir toutes les demeures →
          </button>
        </div>
      </div>
    </section>
  );
}
