import "../styles/patrimoine.css";

export default function PatrimoineSection() {
  return (
    <section className="pat-section">
      <div className="pat-inner">
        <div className="pat-ornement">
          <span className="pat-trait" />
          <span className="pat-lys">&#x269C;</span>
          <span className="pat-trait" />
        </div>
        <span className="pat-surtitre">France · Patrimoine · Histoire</span>
        <h2 className="pat-titre">
          Quarante-cinq mille châteaux.<br/>
          <em>Quelques dizaines d’exception.</em>
        </h2>
        <p className="pat-texte">
          La France est le pays le plus riche d’Europe en patrimoine bâti. Châteaux, abbayes,
          manoirs, grandes demeures — chaque pierre raconte une histoire, chaque famille
          une transmission. Nous avons visité, étudié et éditorialisé les lieux qui méritaient
          d’être connus autrement qu’à travers une fiche hôtelière standardisée.
        </p>
        <p className="pat-texte">
          Notre conviction : un château n’est pas un hôtel. C’est un lieu vivant, habité,
          transmis. Dormir dans un château de famille, c’est entrer dans une histoire
          qui vous dépasse — et c’est précisément ce que la France offre mieux que
          n’importe quel autre pays au monde.
        </p>
        <div className="pat-chiffres">
          <div className="pat-chiffre">
            <span className="pat-chiffre-nb">45 000</span>
            <span className="pat-chiffre-label">Châteaux en France</span>
          </div>
          <div className="pat-sep" />
          <div className="pat-chiffre">
            <span className="pat-chiffre-nb">81</span>
            <span className="pat-chiffre-label">Domaines sélectionnés</span>
          </div>
          <div className="pat-sep" />
          <div className="pat-chiffre">
            <span className="pat-chiffre-nb">7</span>
            <span className="pat-chiffre-label">Régions couvertes</span>
          </div>
          <div className="pat-sep" />
          <div className="pat-chiffre">
            <span className="pat-chiffre-nb">&lt;3h</span>
            <span className="pat-chiffre-label">De Paris</span>
          </div>
        </div>
      </div>
    </section>
  );
}
