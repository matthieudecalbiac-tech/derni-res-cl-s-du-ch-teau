import "../styles/editorial.css";
import { useScrollAnimation } from "../hooks/useScrollAnimation";

const ACCES = [
  {
    type: "dernières-clés",
    label: "Accès libre",
    icone: "⏳",
    titre: "Dernières Clés du Château",
    sous_titre: "Pour saisir l'instant",
    description:
      "Sans inscription, sans engagement. Chaque semaine, nos châteaux partenaires nous confient leurs disponibilités last-minute — J-7, J-10 ou J-15. Jusqu'à −40% sur des séjours d'exception.",
    points: [
      "Offres publiées chaque semaine",
      "Disponibles 7 à 15 jours à l'avance",
      "Jusqu'à −40% sur le tarif habituel",
      "Accessible à tous, sans inscription",
    ],
    cta: "Voir les offres du moment",
  },
  {
    type: "club",
    label: "Sur inscription · Gratuit",
    icone: "⚜",
    titre: "Club des Châtelains",
    sous_titre: "Pour aller plus loin",
    description:
      "Rejoignez le club pour accéder aux vitrines permanentes de chaque château, aux packages exclusifs réservés aux membres, et aux offres que les propriétaires ne publient nulle part ailleurs.",
    points: [
      "Vitrines permanentes de chaque château",
      "Packages exclusifs hors last-minute",
      "Alertes avant-première sur les offres",
      "Progression Blue → Silver → Gold → Platinum",
    ],
    cta: "Rejoindre le Club",
  },
];

const ETAPES = [
  {
    numero: "01",
    titre: "Les châteaux nous confient leurs clés",
    texte:
      "Chaque château partenaire choisit son mode de distribution — last-minute, vitrine permanente ou les deux. Notre équipe valide chaque offre : cadre, qualité, authenticité.",
  },
  {
    numero: "02",
    titre: "Nous sélectionnons l'exceptionnel",
    texte:
      "Seuls les domaines qui répondent à nos critères éditoriaux intègrent la plateforme. Nous visitons chaque lieu avant de le référencer.",
  },
  {
    numero: "03",
    titre: "Vous accédez selon votre choix",
    texte:
      "En accès libre pour les offres last-minute, ou via le Club pour les vitrines permanentes et packages exclusifs. À vous de choisir votre porte d'entrée.",
  },
  {
    numero: "04",
    titre: "Vous vivez le château",
    texte:
      "Vous arrivez. Le domaine vous appartient le temps d'un week-end. Les propriétaires vous accueillent. C'est tout ce qui compte.",
  },
];

export default function CommentCaMarche({ onOuvrirClub, onOuvrirVitrines, onOuvrirDernieresClefs }) {
  const [refEntete, visibleEntete] = useScrollAnimation();
  const [refEtapes, visibleEtapes] = useScrollAnimation();
  const [refPromesse, visiblePromesse] = useScrollAnimation();

  return (
    <section className="comment-section" id="comment">
      <div className="comment-inner">
        {/* En-tête */}
        <div
          ref={refEntete}
          className="comment-entete"
          style={{
            opacity: visibleEntete ? 1 : 0,
            transform: visibleEntete ? "translateY(0)" : "translateY(30px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <span className="sur-titre">La plateforme · Comment ça marche</span>
          <h2>La vie de château de A à Z</h2>
          <p>
            Trois portes d’entrée vers les plus beaux domaines de France, à moins de 3h de Paris
          </p>
        </div>

        {/* 3 modules cliquables */}
        <div className="comment-modules">
          <button className="comment-module comment-module--vitrines" onClick={onOuvrirVitrines}>
            <span className="comment-module-ico">&#x269C;</span>
            <span className="comment-module-titre">Vitrines permanentes</span>
            <span className="comment-module-desc">81 domaines sélectionnés · Histoire · Famille · Territoire</span>
            <span className="comment-module-cta">Explorer →</span>
          </button>
          <button className="comment-module comment-module--dernieres" onClick={onOuvrirDernieresClefs}>
            <span className="comment-module-ico">&#x25c6;</span>
            <span className="comment-module-titre">Les Dernières Clés</span>
            <span className="comment-module-desc">Offres last-minute · J-7 à J-15 · Jusqu’à −40 %</span>
            <span className="comment-module-cta">Voir les offres →</span>
          </button>
          <button className="comment-module comment-module--club" onClick={onOuvrirClub}>
            <span className="comment-module-ico">&#x269C;</span>
            <span className="comment-module-titre">Club des Châtelains</span>
            <span className="comment-module-desc">Packages exclusifs · Offres privées · Accès sur inscription</span>
            <span className="comment-module-cta">Rejoindre →</span>
          </button>
        </div>



        {/* Séparateur */}
        <div className="comment-separateur">
          <div className="comment-separateur-ligne" />
          <span className="comment-separateur-lys">⚜</span>
          <div className="comment-separateur-ligne" />
        </div>

        {/* Étapes */}
        <div className="comment-etapes-titre">
          <span className="sur-titre">Le processus</span>
          <h3>De la sélection à votre arrivée</h3>
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
              <h3 className="comment-etape-titre">{etape.titre}</h3>
              <p className="comment-etape-texte">{etape.texte}</p>
            </div>
          ))}
        </div>

        {/* Promesse */}
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
