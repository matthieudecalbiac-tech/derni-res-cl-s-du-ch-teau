import "../styles/editorial.css";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const TEMOIGNAGES = [
  {
    texte:
      "Nous avons réservé le Château de Vaux-le-Vicomte un jeudi soir pour le week-end suivant. Arriver dans ce domaine un samedi matin, petit-déjeuner dans les appartements d'apparat… c'était irréel.",
    auteur: "Sophie M.",
    detail: "Paris 6e · Weekend de novembre",
    initiales: "SM",
    note: 5,
  },
  {
    texte:
      "J'avais offert ce séjour à mon mari pour son anniversaire. Le prix affiché habituellement nous aurait découragés. Là, j'ai reçu l'alerte un mardi, j'ai réservé le mercredi. Parfait.",
    auteur: "Camille D.",
    detail: "Paris 11e · Weekend d'octobre",
    initiales: "CD",
    note: 5,
  },
  {
    texte:
      "Ce que j'ai apprécié, c'est la qualité éditoriale de la sélection. Pas n'importe quel 'château-hôtel'. De vrais domaines, avec une histoire, une âme. On sent que quelqu'un a choisi avec goût.",
    auteur: "Antoine R.",
    detail: "Paris 8e · Weekend de septembre",
    initiales: "AR",
    note: 5,
  },
];

const CHIFFRES = [
  { nombre: "24", label: "Châteaux partenaires" },
  { nombre: "4,8★", label: "Note moyenne clients" },
  { nombre: "−36%", label: "Économie moyenne" },
  { nombre: "< 3h", label: "De Paris en voiture" },
];

export default function Temoignages() {
  const [refEntete, visibleEntete] = useScrollAnimation();
  const [refGrille, visibleGrille] = useScrollAnimation();
  const [refChiffres, visibleChiffres] = useScrollAnimation();

  return (
    <section className="temoignages-section">
      <div className="temoignages-inner">
        <div
          ref={refEntete}
          className="temoignages-entete"
          style={{
            opacity: visibleEntete ? 1 : 0,
            transform: visibleEntete ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <span className="sur-titre">Ils sont partis · Ils en parlent</span>
          <h2>L'avis de nos membres</h2>
        </div>

        <div ref={refGrille} className="temoignages-grille">
          {TEMOIGNAGES.map((t, i) => (
            <div
              key={i}
              className="temoignage-carte"
              style={{
                opacity: visibleGrille ? 1 : 0,
                transform: visibleGrille ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.7s ease ${
                  i * 0.15
                }s, transform 0.7s ease ${i * 0.15}s`,
              }}
            >
              <div className="temoignage-etoiles">
                {Array.from({ length: t.note }).map((_, j) => (
                  <span key={j} className="temoignage-etoile">
                    ★
                  </span>
                ))}
              </div>
              <p className="temoignage-texte">{t.texte}</p>
              <div className="temoignage-auteur">
                <div className="temoignage-avatar">{t.initiales}</div>
                <div className="temoignage-auteur-info">
                  <span className="temoignage-auteur-nom">{t.auteur}</span>
                  <span className="temoignage-auteur-detail">{t.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          ref={refChiffres}
          className="temoignages-chiffres"
          style={{
            opacity: visibleChiffres ? 1 : 0,
            transform: visibleChiffres ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          {CHIFFRES.map((c, i) => (
            <div key={i} className="chiffre-item">
              <span className="chiffre-nombre">{c.nombre}</span>
              <span className="chiffre-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
