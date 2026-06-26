import { useMemo } from "react";
import { useChateaux } from "../hooks/useChateaux";
import "../styles/heure-aux-demeures.css";

const SLUGS = [
  "les-briottieres",
  "blanc-buisson",
  "pierrefonds",
  "chantilly",
  "ferte-saint-aubin",
  "vaux-le-vicomte",
  "pierreclos",
];

export default function HeureAuxDemeures({ onOuvrirChateau, onOuvrirDernieres }) {
  const { chateaux } = useChateaux();
  const demeures = useMemo(
    () => SLUGS.map((s) => chateaux.find((c) => c.slug === s)).filter(Boolean),
    [chateaux]
  );
  if (demeures.length === 0) return null;

  const renderMedaillon = (c, n) => (
    <article
      key={c.id}
      className="da-medaillon"
      onClick={() => onOuvrirChateau?.(c)}
    >
      <div className="da-photo">
        <img src={c.images?.[0]} alt={c.nom} loading="lazy" />
      </div>
      <div className="da-texte">
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
    <section className="journal-demeures">
      <div className="da-wrap">
        <img className="da-fleur da-fleur--g" src="/fleur-gauche.png" alt="" aria-hidden="true" />
        <img className="da-fleur da-fleur--d" src="/fleur-droite.png" alt="" aria-hidden="true" />

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
