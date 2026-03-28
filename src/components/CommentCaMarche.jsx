import "../styles/editorial.css";
import "../styles/comment.css";
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
      <div className="comment-lys-fond" aria-hidden="true">
        {"⚜ ".repeat(200)}
      </div>
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

        {/* 3 modules grands */}
        <div className="comment-modules-grands">

          <button className="cmg-carte cmg-carte--vitrines" onClick={onOuvrirVitrines}>
            <div className="cmg-ornement">
              <span className="cmg-trait" /><span className="cmg-ico">&#x269C;</span><span className="cmg-trait" />
            </div>
            <div className="cmg-badge cmg-badge--vitrines">Accès libre</div>
            <h3 className="cmg-titre">Vitrines permanentes</h3>
            <p className="cmg-desc">
              Chaque château bénéficie d’une page éditoriale construite comme un article de fond —
              histoire du lieu, famille propriétaire, architecture, territoire.
              Un univers singulier, pas une fiche hôtelière.
            </p>
            <ul className="cmg-points">
              <li><span>&#x2726;</span> 81 domaines sélectionnés, visités et éditorialisés</li>
              <li><span>&#x2726;</span> Histoire, famille, patrimoine · chaque lieu traité comme unique</li>
              <li><span>&#x2726;</span> Chambres permanentes disponibles à la réservation</li>
            </ul>
            <div className="cmg-separateur" />
            <div className="cmg-cta">Explorer les vitrines <span>&#x2192;</span></div>
          </button>

          <button className="cmg-carte cmg-carte--dernieres" onClick={onOuvrirDernieresClefs}>
            <div className="cmg-ornement">
              <span className="cmg-trait" /><span className="cmg-ico cmg-ico--carre">&#x25c6;</span><span className="cmg-trait" />
            </div>
            <div className="cmg-badge cmg-badge--dernieres">Last-minute</div>
            <h3 className="cmg-titre">Les Dernières Clés du Château</h3>
            <p className="cmg-desc">
              Des créneaux rares, libérés par les châteaux partenaires sur leurs dates difficiles.
              Ni braderie, ni promotion de masse — des opportunités confidentielles
              proposées en avant-première aux membres du Club.
            </p>
            <ul className="cmg-points">
              <li><span>&#x2726;</span> Fenêtres J-7, J-10 ou J-15 selon le château</li>
              <li><span>&#x2726;</span> Avant-première réservée aux membres Club</li>
              <li><span>&#x2726;</span> Canal de rendement — jamais une remise permanente</li>
            </ul>
            <div className="cmg-separateur" />
            <div className="cmg-cta">Voir les dernières clés <span>&#x2192;</span></div>
          </button>

          <button className="cmg-carte cmg-carte--club" onClick={onOuvrirClub}>
            <div className="cmg-ornement">
              <span className="cmg-trait" /><span className="cmg-ico cmg-ico--or">&#x269C;</span><span className="cmg-trait" />
            </div>
            <div className="cmg-badge cmg-badge--club">Sur inscription</div>
            <h3 className="cmg-titre cmg-titre--or">Club des Châtelains</h3>
            <p className="cmg-desc">
              Espace réservé aux membres inscrits, dédié aux offres et packages exclusifs
              hors last-minute. Les offres Club ne sont jamais visibles du grand public —
              elles restent confidentielles, accessibles uniquement après inscription.
            </p>
            <ul className="cmg-points cmg-points--or">
              <li><span>&#x269C;</span> Offres &amp; packages exclusifs hors last-minute</li>
              <li><span>&#x269C;</span> Accès confidentiel · membres inscrits uniquement</li>
              <li><span>&#x269C;</span> Avant-premières sur les Dernières Clés</li>
            </ul>
            <div className="cmg-separateur" />
            <div className="cmg-cta cmg-cta--or">Rejoindre le Club <span>&#x2192;</span></div>
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
