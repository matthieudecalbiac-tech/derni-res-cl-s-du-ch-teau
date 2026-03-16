import "../styles/services.css";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const SERVICES = [
  {
    icone: "🚗",
    titre: "Transfert Paris — Château",
    description:
      "Votre chauffeur privé vous prend en charge à Paris et vous conduit jusqu'aux portes du château. Arrivez détendu, l'escapade commence dès le départ.",
    details: [
      "Berline ou van de prestige",
      "Prise en charge à domicile ou hôtel",
      "Retour le dimanche inclus",
      "Chauffeur en livrée disponible",
    ],
    prix: "À partir de 180 €",
    prixLabel: "/ aller-retour",
    nouveau: true,
  },
  {
    icone: "🚂",
    titre: "Train & navette château",
    description:
      "Nous organisons votre trajet en première classe jusqu'à la gare la plus proche, avec navette privée pour rejoindre le domaine en toute sérénité.",
    details: [
      "Billets première classe inclus",
      "Navette privée gare — château",
      "Bagages pris en charge",
      "Service concierge à bord",
    ],
    prix: "À partir de 95 €",
    prixLabel: "/ personne",
    nouveau: false,
  },
  {
    icone: "🚁",
    titre: "Transfert en hélicoptère",
    description:
      "Pour une arrivée digne des grands films. Survolez la campagne française et posez-vous directement sur le domaine. Une entrée en scène inoubliable.",
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
    icone: "🍾",
    titre: "Accueil & mise en scène",
    description:
      "Champagne à l'arrivée, pétales de roses, bouquet de fleurs, lettre calligraphiée… Nous orchestrons votre accueil pour que le premier instant soit mémorable.",
    details: [
      "Champagne millésimé à l'arrivée",
      "Décoration florale de la chambre",
      "Message calligraphié personnalisé",
      "Coordination avec le château",
    ],
    prix: "À partir de 120 €",
    prixLabel: "/ séjour",
    nouveau: false,
  },
  {
    icone: "🍽",
    titre: "Table gastronomique privée",
    description:
      "Dîner en tête-à-tête dans une salle d'apparat, menu dégustation élaboré par le chef du château, accord mets et vins. Une soirée hors du monde.",
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
    icone: "🐎",
    titre: "Expériences sur mesure",
    description:
      "Balade équestre à l'aube, cours de tir à l'arc, chasse photographique, initiation à la fauconnerie… Nous composons votre journée comme une partition unique.",
    details: [
      "Programme personnalisé",
      "Guides & moniteurs certifiés",
      "Équipements fournis",
      "Photos professionnelles incluses",
    ],
    prix: "Sur devis",
    prixLabel: "/ expérience",
    nouveau: true,
  },
];

export default function Services() {
  const [refEntete, visibleEntete] = useScrollAnimation();
  const [refGrille, visibleGrille] = useScrollAnimation();
  const [refTransport, visibleTransport] = useScrollAnimation();

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
          <h2>La vie de château, de A à Z</h2>
          <p>
            De votre porte parisienne jusqu'aux appartements du domaine, nous
            orchestrons chaque détail de votre escapade aristocratique
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
              <span className="service-icone">{s.icone}</span>
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

        {/* Bandeau transport */}
        <div
          ref={refTransport}
          className="services-transport"
          style={{
            opacity: visibleTransport ? 1 : 0,
            transform: visibleTransport ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <div className="transport-texte">
            <span className="transport-sur-titre">
              Service conciergerie · Sur mesure
            </span>
            <h3 className="transport-titre">
              Nous gérons tout, vous profitez de tout
            </h3>
            <p className="transport-description">
              Notre équipe de conciergerie prend en charge l'intégralité de
              votre escapade : du transfert depuis Paris jusqu'au bouquet de
              fleurs dans votre chambre. Vous n'avez qu'une chose à faire —
              partir.
            </p>
            <div className="transport-options">
              <span className="transport-option">Disponible 7j/7</span>
              <span className="transport-option">Réponse sous 2h</span>
              <span className="transport-option">
                Paiement à la réservation
              </span>
              <span className="transport-option">Annulation flexible</span>
            </div>
          </div>
          <div className="transport-cta">
            <button className="btn-or">
              <span>Contacter la conciergerie</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
