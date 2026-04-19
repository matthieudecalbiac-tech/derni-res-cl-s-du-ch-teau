import "../styles/bandeau-offres.css";

const OFFRES = [
  {
    num: "— OFFRE I —",
    icone: "◈",
    titre: "Les Dernières Clés",
    desc: "Les chambres ouvertes cette semaine, à court terme.",
    lien: "8 chambres disponibles →",
    action: "dernieres",
  },
  {
    num: "— OFFRE II —",
    icone: "⚜",
    titre: "Les Vitrines Permanentes",
    desc: "Les demeures à réserver toute l'année, en direct avec les familles.",
    lien: "31 demeures →",
    action: "vitrines",
  },
  {
    num: "— OFFRE III —",
    icone: "✦",
    titre: "Le Club des Châtelains",
    desc: "Les séjours confidentiels, réservés aux membres.",
    lien: "Devenir membre →",
    action: "club",
  },
];

export default function BandeauOffres({ onOuvrirDernieres, onOuvrirVitrines, onOuvrirClub }) {
  const gererClic = (action) => {
    if (action === "dernieres") onOuvrirDernieres?.();
    else if (action === "vitrines") onOuvrirVitrines?.();
    else if (action === "club") onOuvrirClub?.();
  };

  return (
    <section className="bandeau-offres">
      <div className="bandeau-offres-orne">
        <span className="bandeau-offres-orne-ligne bandeau-offres-orne-ligne--g" />
        <span className="bandeau-offres-orne-texte">
          TROIS FAÇONS DE FRANCHIR LE SEUIL
        </span>
        <span className="bandeau-offres-orne-ligne bandeau-offres-orne-ligne--d" />
      </div>

      <div className="bandeau-offres-grille">
        {OFFRES.map((o, i) => (
          <button
            key={o.num}
            type="button"
            className={`bandeau-offres-cellule ${i === 1 ? "bandeau-offres-cellule--centre" : ""}`}
            onClick={() => gererClic(o.action)}
          >
            <span className="bandeau-offres-icone">{o.icone}</span>
            <span className="bandeau-offres-eyebrow">{o.num}</span>
            <h3 className="bandeau-offres-titre">{o.titre}</h3>
            <p className="bandeau-offres-desc">{o.desc}</p>
            <span className="bandeau-offres-lien">{o.lien}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
