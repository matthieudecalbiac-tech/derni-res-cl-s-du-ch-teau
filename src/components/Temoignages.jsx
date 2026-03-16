import "../styles/editorial.css";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const TEMOIGNAGES = [
  {
    texte:
      "Arriver à Vaux-le-Vicomte un samedi matin, petit-déjeuner dans les appartements d'apparat… c'était proprement irréel.",
    auteur: "Sophie M.",
    detail: "Paris 6e · Weekend de novembre",
    initiales: "SM",
    note: 5,
  },
  {
    texte:
      "J'ai reçu l'alerte un mardi, réservé le mercredi. Ce que j'aurais repoussé à 680€, je l'ai vécu à 450€. Sans compromis sur l'excellence.",
    auteur: "Camille D.",
    detail: "Paris 11e · Weekend d'octobre",
    initiales: "CD",
    note: 5,
  },
  {
    texte:
      "De vrais domaines, avec une histoire, une âme. On sent que quelqu'un a choisi avec goût. La sélection éditoriale est irréprochable.",
    auteur: "Antoine R.",
    detail: "Paris 8e · Weekend de septembre",
    initiales: "AR",
    note: 5,
  },
];

export default function Temoignages() {
  const [refEntete, visibleEntete] = useScrollAnimation();
  const [refGrille, visibleGrille] = useScrollAnimation();

  return (
    <section className="temoignages-section">
      {/* Motif fleurs de lys */}
      <div className="lys-pattern">
        <svg>
          <rect width="100%" height="100%" fill="url(#lys-pattern)" />
        </svg>
      </div>

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
          {[
            <div
              key="t1"
              className="temoignage-carte"
              style={{
                opacity: visibleGrille ? 1 : 0,
                transform: visibleGrille ? "translateY(0)" : "translateY(30px)",
                transition: "opacity 0.7s ease 0s, transform 0.7s ease 0s",
              }}
            >
              <div className="temoignage-etoiles">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="temoignage-etoile">
                    ★
                  </span>
                ))}
              </div>
              <p className="temoignage-texte">« {TEMOIGNAGES[0].texte} »</p>
              <div className="temoignage-auteur">
                <div className="temoignage-avatar">
                  {TEMOIGNAGES[0].initiales}
                </div>
                <div>
                  <span className="temoignage-auteur-nom">
                    {TEMOIGNAGES[0].auteur}
                  </span>
                  <span className="temoignage-auteur-detail">
                    {TEMOIGNAGES[0].detail}
                  </span>
                </div>
              </div>
            </div>,

            <div key="sep1" className="temoignage-separateur" />,

            <div
              key="t2"
              className="temoignage-carte"
              style={{
                opacity: visibleGrille ? 1 : 0,
                transform: visibleGrille ? "translateY(0)" : "translateY(30px)",
                transition:
                  "opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s",
              }}
            >
              <div className="temoignage-etoiles">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="temoignage-etoile">
                    ★
                  </span>
                ))}
              </div>
              <p className="temoignage-texte">« {TEMOIGNAGES[1].texte} »</p>
              <div className="temoignage-auteur">
                <div className="temoignage-avatar">
                  {TEMOIGNAGES[1].initiales}
                </div>
                <div>
                  <span className="temoignage-auteur-nom">
                    {TEMOIGNAGES[1].auteur}
                  </span>
                  <span className="temoignage-auteur-detail">
                    {TEMOIGNAGES[1].detail}
                  </span>
                </div>
              </div>
            </div>,

            <div key="sep2" className="temoignage-separateur" />,

            <div
              key="t3"
              className="temoignage-carte"
              style={{
                opacity: visibleGrille ? 1 : 0,
                transform: visibleGrille ? "translateY(0)" : "translateY(30px)",
                transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
              }}
            >
              <div className="temoignage-etoiles">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className="temoignage-etoile">
                    ★
                  </span>
                ))}
              </div>
              <p className="temoignage-texte">« {TEMOIGNAGES[2].texte} »</p>
              <div className="temoignage-auteur">
                <div className="temoignage-avatar">
                  {TEMOIGNAGES[2].initiales}
                </div>
                <div>
                  <span className="temoignage-auteur-nom">
                    {TEMOIGNAGES[2].auteur}
                  </span>
                  <span className="temoignage-auteur-detail">
                    {TEMOIGNAGES[2].detail}
                  </span>
                </div>
              </div>
            </div>,
          ]}
        </div>
      </div>
    </section>
  );
}
