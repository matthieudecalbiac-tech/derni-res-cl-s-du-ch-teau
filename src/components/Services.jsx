import "../styles/services.css";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const SERVICES = [
  {
    titre: "Transfert en berline de prestige",
    description:
      "Votre chauffeur privé en livrée vous prend en charge à Paris et vous conduit jusqu'aux portes du château. L'escapade commence dès le départ.",
    details: [
      "Berline Mercedes Classe S ou équivalent",
      "Prise en charge à domicile ou palace",
      "Retour le dimanche inclus",
      "Eau, presse et rafraîchissements à bord",
    ],
    prix: "À partir de 180 €",
    prixLabel: "/ aller-retour",
    nouveau: true,
  },
  {
    titre: "Transfert en hélicoptère",
    description:
      "Survolez la campagne française et posez-vous directement sur le domaine. Une entrée en scène inoubliable, digne des plus grands films.",
    details: [
      "Vol depuis Paris-Le Bourget",
      "Jusqu'à 5 passagers",
      "Durée : 20 à 45 min selon château",
      "Champagne à bord sur demande",
    ],
    prix: "À partir de 1 200 €",
    prixLabel: "/ vol",
    nouveau: false,
  },
  {
    titre: "Accueil & mise en scène",
    description:
      "Champagne millésimé à l'arrivée, pétales de roses, lettre calligraphiée… Nous orchestrons chaque détail pour que le premier instant soit mémorable.",
    details: [
      "Champagne grand cru à l'arrivée",
      "Décoration florale de la chambre",
      "Message calligraphié personnalisé",
      "Coordination directe avec le château",
    ],
    prix: "À partir de 120 €",
    prixLabel: "/ séjour",
    nouveau: false,
  },
  {
    titre: "Table gastronomique privée",
    description:
      "Dîner en tête-à-tête dans une salle d'apparat, menu dégustation élaboré par le chef du château, accord mets et vins grands crus.",
    details: [
      "Salle privative au château",
      "Menu 5 services avec accord vins",
      "Chef dédié pour la soirée",
      "Service en gants blancs",
    ],
    prix: "À partir de 220 €",
    prixLabel: "/ personne",
    nouveau: false,
  },
  {
    titre: "Rituel spa & soins d'exception",
    description:
      "Massage aux huiles précieuses, bain thermal, soin visage prestige… Notre équipe sélectionne les meilleurs soins du domaine pour vous.",
    details: [
      "Soins sur mesure selon le château",
      "Produits de maisons d'exception",
      "Cabine privative garantie",
      "Accès piscine & balnéo inclus",
    ],
    prix: "À partir de 150 €",
    prixLabel: "/ personne",
    nouveau: false,
  },
];

const LosangeSvg = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 1L19 10L10 19L1 10L10 1Z"
      stroke="#c8973e"
      strokeWidth="0.8"
      fill="none"
    />
    <path
      d="M10 5.5L14.5 10L10 14.5L5.5 10L10 5.5Z"
      fill="#c8973e"
      opacity="0.35"
    />
  </svg>
);

export default function Services() {
  const [refEntete, visibleEntete] = useScrollAnimation();
  const [refGrille, visibleGrille] = useScrollAnimation();
  const [refBandeau, visibleBandeau] = useScrollAnimation();

  return (
    <section className="services-section" id="services">
      <div className="services-inner">
        {/* En-tête */}
        <div
          ref={refEntete}
          className="services-entete"
          style={{
            opacity: visibleEntete ? 1 : 0,
            transform: visibleEntete ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <span className="sur-titre">
            L'art de vivre · Prestations exclusives
          </span>
          <h2>Pour sublimer votre séjour</h2>
          <p>
            Des prestations à la carte pour transformer votre escapade en
            expérience inoubliable
          </p>
        </div>

        {/* Grille services */}
        <div ref={refGrille} className="services-grille">
          {SERVICES.map((s, i) => (
            <div
              key={i}
              className="service-carte"
              style={{
                opacity: visibleGrille ? 1 : 0,
                transform: visibleGrille ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.7s ease ${
                  i * 0.1
                }s, transform 0.7s ease ${i * 0.1}s`,
              }}
            >
              {s.nouveau && (
                <span className="service-badge-nouveau">Nouveau</span>
              )}
              <span className="service-icone">
                <LosangeSvg />
              </span>
              <h3 className="service-titre">{s.titre}</h3>
              <p className="service-description">{s.description}</p>
              <div className="service-details">
                {s.details.map((d, j) => (
                  <span key={j} className="service-detail-item">
                    {d}
                  </span>
                ))}
              </div>
              <div className="service-prix">
                <span className="service-prix-montant">{s.prix}</span>
                <span className="service-prix-label">{s.prixLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bandeau contact */}
        <div
          ref={refBandeau}
          className="services-transport"
          style={{
            opacity: visibleBandeau ? 1 : 0,
            transform: visibleBandeau ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <div className="transport-texte">
            <span className="transport-sur-titre">
              Prestations · Sur mesure
            </span>
            <h3 className="transport-titre">Composez votre séjour idéal</h3>
            <p className="transport-description">
              Chaque prestation est disponible à la réservation, en complément
              de votre séjour dans l'un de nos châteaux partenaires. Notre
              équipe coordonne tout avec le domaine pour que votre arrivée soit
              parfaite.
            </p>
            <div className="transport-options">
              <span className="transport-option">Réservation à la carte</span>
              <span className="transport-option">
                Coordonné avec le château
              </span>
              <span className="transport-option">
                Paiement à la réservation
              </span>
              <span className="transport-option">Annulation flexible</span>
            </div>
          </div>
          <div className="transport-cta">
            <button className="btn-or">
              <span>Nous contacter</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
