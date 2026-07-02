import { useChateaux } from "../hooks/useChateaux";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import { derivePrix } from "../utils/derivePrix";
import "../styles/une-semaine.css";

export default function UneDeLaSemaine({ onOuvrirChateau }) {
  const { chateaux, loading, error } = useChateaux();
  const [ref, visible] = useScrollAnimation(0.2);
  const selection = chateaux.filter((c) => c.estLaUne === true).slice(0, 4);
  if (selection.length === 0) return null;

  return (
    <section className={"une-semaine" + (visible ? " une-semaine--visible" : "")} ref={ref}>
      <div className="une-semaine-wrap">
        <aside className="une-semaine-intro">
          <img className="une-semaine-embleme" src="/embleme-horloge.png" alt="" aria-hidden="true" />
          <span className="une-semaine-eyebrow">Sélection d'exception</span>
          <h2 className="une-semaine-titre">Les clés<br />à la une</h2>
          <div className="une-semaine-intro-sep" />
          <p className="une-semaine-intro-txt">Des demeures d'exception, chacune porteuse d'une histoire, d'un art de vivre et d'émotions à partager.</p>
          <p className="une-semaine-intro-txt">Des lieux où le temps suspend son cours, pour des séjours et des expériences inoubliables.</p>
        </aside>

        <div className="une-semaine-liste">
          {selection.map((chateau, i) => {
            const prix = derivePrix(chateau);
            return (
              <article key={chateau.id} className="une-semaine-carte" style={{ transitionDelay: `${0.35 + i * 0.12}s` }}>
                <div className="une-semaine-photo">
                  <img src={chateau.images?.[0]} alt={chateau.nom} loading="lazy" />
                </div>
                <div className="une-semaine-infos">
                  <span className="une-semaine-meta">
                    {chateau.region} · {chateau.departement} · {chateau.siecle}
                  </span>
                  <h3 className="une-semaine-nom">{chateau.nom}</h3>
                  <p className="une-semaine-accroche">{chateau.accroche}</p>
                  <div className="une-semaine-filet" />
                  <div className="une-semaine-pied">
                    <div className="une-semaine-prix">
                      <span className="une-semaine-prix-prefix">À partir de</span>
                      <span className="une-semaine-prix-val">{prix} €</span>
                      <span className="une-semaine-prix-nuit">la nuit</span>
                    </div>
                    <button
                      type="button"
                      className="une-semaine-cta"
                      onClick={() => onOuvrirChateau?.(chateau)}
                    >
                      Découvrir la demeure →
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
