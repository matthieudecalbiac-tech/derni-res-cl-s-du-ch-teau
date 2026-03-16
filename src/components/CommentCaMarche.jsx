import "../styles/editorial.css";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const ETAPES = [
  {
    numero: "01",
    icone: "🏰",
    titre: "Nos châteaux signalent",
    texte:
      "Chaque semaine, nos châteaux partenaires nous confient leurs dernières disponibilités à J-15, J-10 ou J-7.",
  },
  {
    numero: "02",
    icone: "✦",
    titre: "Nous sélectionnons",
    texte:
      "Notre équipe valide chaque offre : cadre, qualité, expérience. Seul l'exceptionnel intègre la plateforme.",
  },
  {
    numero: "03",
    icone: "📩",
    titre: "Vous êtes alertés",
    texte:
      "Les membres du club reçoivent une invitation discrète : une sélection, une durée limitée, une décision à prendre.",
  },
  {
    numero: "04",
    icone: "🗝",
    titre: "Vous vivez le château",
    texte:
      "Vous arrivez. Le domaine vous appartient le temps d'un week-end. C'est tout ce qui compte.",
  },
];

export default function CommentCaMarche() {
  const [refEntete, visibleEntete] = useScrollAnimation();
  const [refEtapes, visibleEtapes] = useScrollAnimation();
  const [refPromesse, visiblePromesse] = useScrollAnimation();

  return (
    <section className="comment-section" id="comment">
      <div className="comment-inner">
        <div
          ref={refEntete}
          className="comment-entete"
          style={{
            opacity: visibleEntete ? 1 : 0,
            transform: visibleEntete ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <span className="sur-titre">Le club · Fonctionnement</span>
          <h2>Comment ça marche</h2>
          <p>
            Un accès privilégié, une sélection exigeante, une expérience rare
          </p>
        </div>

        <div ref={refEtapes} className="comment-etapes">
          {ETAPES.map((etape, i) => (
            <div
              key={etape.numero}
              className="comment-etape"
              style={{
                opacity: visibleEtapes ? 1 : 0,
                transform: visibleEtapes ? "translateY(0)" : "translateY(40px)",
                transition: `opacity 0.7s ease ${
                  i * 0.15
                }s, transform 0.7s ease ${i * 0.15}s`,
              }}
            >
              <div className="comment-etape-numero">{etape.numero}</div>
              <span className="comment-etape-icone">{etape.icone}</span>
              <h3 className="comment-etape-titre">{etape.titre}</h3>
              <p className="comment-etape-texte">{etape.texte}</p>
            </div>
          ))}
        </div>

        <div
          ref={refPromesse}
          className="comment-promesse"
          style={{
            opacity: visiblePromesse ? 1 : 0,
            transform: visiblePromesse ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.9s ease, transform 0.9s ease",
          }}
        >
          <p className="comment-promesse-texte">
            « Ce n'est pas du discount. C'est un accès privilégié à une
            expérience rare — rendue accessible parce que le moment est là, et
            que vous savez le saisir. »
          </p>
        </div>
      </div>
    </section>
  );
}
