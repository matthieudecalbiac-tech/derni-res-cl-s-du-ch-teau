import { chateaux } from "../data/chateaux";
import { derivePrix } from "../utils/derivePrix";
import "../styles/une-semaine.css";

const ROMAINS = ["I", "II", "III", "IV"];

export default function UneDeLaSemaine({ onOuvrirChateau }) {
  const selection = chateaux.filter((c) => c.estLaUne === true).slice(0, 4);
  if (selection.length === 0) return null;

  return (
    <section className="une-semaine">
      {selection.map((chateau, i) => {
        const inverse = i % 2 === 1;
        const prix = derivePrix(chateau);
        const nomPoint = chateau.nom + ".";
        const lettrine = nomPoint.substring(0, 1);
        const reste = nomPoint.substring(1);

        return (
          <div key={chateau.id}>
            <article
              className={`une-semaine-demeure ${inverse ? "une-semaine-demeure--inverse" : ""}`}
            >
              <span
                className={`une-semaine-filigrane ${inverse ? "une-semaine-filigrane--droite" : "une-semaine-filigrane--gauche"}`}
                aria-hidden="true"
              >
                {ROMAINS[i] ?? i + 1}
              </span>

              <div className="une-semaine-photo">
                <img src={chateau.images?.[0]} alt={chateau.nom} loading="lazy" />
              </div>

              <div className="une-semaine-infos">
                <span className="une-semaine-meta">
                  {chateau.region} · {chateau.departement} · {chateau.siecle}
                </span>

                <h2 className="une-semaine-nom">
                  <span className="une-semaine-nom-lettrine">{lettrine}</span>
                  <span className="une-semaine-nom-reste">{reste}</span>
                </h2>

                <p className="une-semaine-accroche">{chateau.accroche}</p>

                {chateau.proprietaires?.citation && (
                  <p className="une-semaine-citation">
                    « {chateau.proprietaires.citation} »
                  </p>
                )}

                <div className="une-semaine-signature">
                  <span className="une-semaine-signature-filet" />
                  <span className="une-semaine-signature-texte">
                    {chateau.proprietaires?.nom?.toUpperCase()}
                  </span>
                </div>

                <div className="une-semaine-pied">
                  <div className="une-semaine-prix">
                    <span className="une-semaine-prix-prefix">À PARTIR DE</span>
                    <span className="une-semaine-prix-val">{prix} €</span>
                    <span className="une-semaine-prix-nuit">la nuit</span>
                  </div>
                  <button
                    type="button"
                    className="une-semaine-cta"
                    onClick={() => onOuvrirChateau?.(chateau)}
                  >
                    — FRANCHIR LE SEUIL
                  </button>
                </div>
              </div>
            </article>

            {i < selection.length - 1 && (
              <div className="une-semaine-liaison">
                <span className="une-semaine-liaison-filet une-semaine-liaison-filet--g" />
                <span className="une-semaine-liaison-centre">
                  ⚜ {ROMAINS[i + 1] ?? i + 2} ⚜
                </span>
                <span className="une-semaine-liaison-filet une-semaine-liaison-filet--d" />
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
