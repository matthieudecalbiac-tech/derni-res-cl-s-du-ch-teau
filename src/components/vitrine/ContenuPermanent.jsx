function construirePhraseIntro(chateau) {
  if (chateau.introPermanent) return chateau.introPermanent;
  if (chateau.description && chateau.description.length < 250) {
    return chateau.description;
  }
  const morceaux = [];
  if (chateau.region) morceaux.push(`Au cœur du ${chateau.region}`);
  if (chateau.proprietaires?.nom) {
    const nom = chateau.proprietaires.nom;
    const phrase = /^Famille /.test(nom)
      ? `la ${nom.replace(/^Famille /, "famille ")} vous accueille`
      : `${nom} vous accueillent`;
    morceaux.push(phrase);
  } else {
    morceaux.push("la famille propriétaire vous accueille");
  }
  if (chateau.chambres?.length) {
    morceaux.push(
      `dans ${chateau.chambres.length} chambres d'hôtes meublées avec soin`,
    );
  }
  return morceaux.join(", ") + ".";
}

export default function ContenuPermanent({ chateau, onReserver }) {
  const phraseIntro = construirePhraseIntro(chateau);
  const chambres = chateau.chambres || [];

  return (
    <section className="vc4-contenu-permanent" data-onglet-contenu="permanent">
      <p className="vc4-permanent-intro">{phraseIntro}</p>

      <div className="vc4-permanent-titre-wrap">
        <div className="vc4-permanent-titre-orn-l" />
        <h2 className="vc4-permanent-titre">Les chambres du château</h2>
        <div className="vc4-permanent-titre-orn-l" />
      </div>

      <div className="vc4-permanent-grille">
        {chambres.map((ch, i) => {
          const equipements = (ch.equipements || []).slice(0, 4);
          return (
            <article key={i} className="vc4-permanent-chambre">
              <div
                className="vc4-permanent-chambre-photo"
                style={{ backgroundImage: ch.image ? `url('${ch.image}')` : "none" }}
              >
                <div className="vc4-permanent-chambre-photo-vign" />
                <div className="vc4-permanent-chambre-prix">
                  {ch.prix} €<span className="vc4-permanent-chambre-prix-suf">/nuit</span>
                </div>
              </div>
              <div className="vc4-permanent-chambre-corps">
                <h3 className="vc4-permanent-chambre-nom">{ch.nom}</h3>
                <p className="vc4-permanent-chambre-meta">
                  {ch.superficie} · {ch.capacite} pers.
                </p>
                {ch.description && (
                  <p className="vc4-permanent-chambre-desc">{ch.description}</p>
                )}
                {equipements.length > 0 && (
                  <ul className="vc4-permanent-chambre-pills">
                    {equipements.map((e, j) => (
                      <li key={j} className="vc4-permanent-chambre-pill">
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  className="vc4-permanent-chambre-cta"
                  onClick={() => onReserver && onReserver(i)}
                >
                  Réserver →
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
