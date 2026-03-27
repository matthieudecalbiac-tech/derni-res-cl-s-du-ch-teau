import { useEffect, useState } from "react";
import "../styles/a-propos.css";

const FONDATEURS = [
  {
    prenom: "Dimitri",
    role: "Stratégie & Développement",
    specialite: "Stratégie",
    initiales: "D",
  },
  {
    prenom: "Julien",
    role: "SEO & Go-to-market",
    specialite: "Stratégie",
    initiales: "J",
  },
  {
    prenom: "Matthieu",
    role: "Développement & CRM",
    specialite: "Tech",
    initiales: "M",
  },
  {
    prenom: "Tanguy",
    role: "Direction artistique",
    specialite: "Design",
    initiales: "T",
  },
];

const VALEURS = [
  {
    icone: "⚜",
    titre: "Patrimoine",
    desc: "Chaque lieu référencé porte une histoire, une architecture, une mémoire. Nous ne sélectionnons que des propriétés d'exception, choisies pour leur authenticité autant que pour leur beauté.",
  },
  {
    icone: "◆",
    titre: "Respect",
    desc: "Nous travaillons avec les propriétaires comme partenaires, jamais comme fournisseurs. L'âme des lieux est inviolable — elle guide chaque décision éditoriale.",
  },
  {
    icone: "✦",
    titre: "Transmission",
    desc: "Faire vivre un château, c'est contribuer à sa survie. Chaque séjour, chaque événement organisé dans ces murs participe à leur préservation pour les générations futures.",
  },
  {
    icone: "⚜",
    titre: "Territoire",
    desc: "Un château ne se visite pas seul. Il est inséparable de sa région, de ses paysages, de sa gastronomie et de ses savoir-faire. Nous mettons autant en lumière les lieux que les territoires.",
  },
];

const CHIFFRES = [
  { nombre: "81", label: "Domaines sélectionnés" },
  { nombre: "4", label: "Fondateurs" },
  { nombre: "7", label: "Régions couvertes" },
  { nombre: "<3h", label: "De Paris" },
];

const GARANTIES = [
  {
    icone: "⚖",
    titre: "Un cadre rigoureux",
    desc: "Chaque partenariat est formalisé avec soin. Les conditions sont claires, équilibrées et pensées pour protéger autant les propriétaires que les clients.",
  },
  {
    icone: "◆",
    titre: "Votre image protégée",
    desc: "Nous ne publions rien sans votre accord. Chaque fiche est validée avec vous avant mise en ligne. Vous gardez le contrôle total sur votre présence sur la plateforme.",
  },
  {
    icone: "✦",
    titre: "Plateforme déjà opérationnelle",
    desc: "Le site est construit, testé et prêt. Vous n'attendez pas un projet en cours de développement — vous rejoignez une plateforme qui fonctionne aujourd'hui.",
  },
  {
    icone: "⚜",
    titre: "Sélection exigeante",
    desc: "Nous visitons chaque lieu avant de le référencer. Votre domaine ne sera jamais mis en concurrence avec un hébergement quelconque — uniquement avec des lieux de même niveau d'excellence.",
  },
];

export default function APropos({ onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => setVisible(true), 50);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className={"ap-overlay " + (visible ? "ap-overlay--visible" : "")}>
      {/* Header */}
      <header className="page-header">
        <div className="page-header-gauche">
          <span className="page-header-lys">&#x269C;</span>
          <span className="page-header-titre">À propos</span>
        </div>
        <button className="page-header-fermer" onClick={onClose}>Fermer</button>
      </header>

      {/* ── HERO ── */}
      <div className="ap-hero">
        <div className="ap-hero-bg" />
        <div className="ap-hero-lys">
          <svg width="100%" height="100%">
            <rect width="100%" height="100%" fill="url(#lys-pattern)" />
          </svg>
        </div>
        <div className="ap-hero-cadre">
          <div className="ap-hero-cadre-coin ap-hero-cadre-coin--tg" />
          <div className="ap-hero-cadre-coin ap-hero-cadre-coin--td" />
          <div className="ap-hero-cadre-coin ap-hero-cadre-coin--bg" />
          <div className="ap-hero-cadre-coin ap-hero-cadre-coin--bd" />
        </div>
        <div className="ap-hero-contenu">
          <div className="ap-hero-ornement">
            <div className="ap-hero-ornement-ligne" />
            <span>⚜</span>
            <div className="ap-hero-ornement-ligne" />
          </div>
          <span className="ap-hero-sur-titre">
            Fondé en France · Par quatre passionnés
          </span>
          <h1 className="ap-hero-titre">
            Le patrimoine français
            <br />
            <em>mérite mieux</em>
          </h1>
          <p className="ap-hero-accroche">
            Nous sommes quatre fondateurs unis par une même conviction : le
            patrimoine français est l'une des plus grandes richesses de notre
            pays.
          </p>
          <div className="ap-hero-ornement">
            <div className="ap-hero-ornement-ligne" />
            <span>⚜</span>
            <div className="ap-hero-ornement-ligne" />
          </div>
        </div>

        {/* Chiffres */}
        <div className="ap-hero-chiffres">
          {CHIFFRES.map((c, i) => (
            <div key={i} className="ap-hero-chiffre">
              <span className="ap-chiffre-nombre">{c.nombre}</span>
              <span className="ap-chiffre-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MANIFESTE ── */}
      <section className="ap-section ap-section--creme">
        <div className="ap-section-inner ap-manifeste">
          <div className="ap-manifeste-label">
            <div className="ap-manifeste-label-ligne" />
            <span>⚜ Notre manifeste</span>
            <div className="ap-manifeste-label-ligne" />
          </div>

          <div className="ap-manifeste-texte">
            <p className="ap-paragraphe ap-paragraphe--accroche">
              Nous sommes quatre fondateurs unis par une même conviction : le
              patrimoine français est l'une des plus grandes richesses de notre
              pays, et il mérite d'être découvert, compris et vécu avec respect.
            </p>

            <div className="ap-separateur-or">
              <div className="ap-separateur-ligne" />
              <span>◆</span>
              <div className="ap-separateur-ligne" />
            </div>

            <p className="ap-paragraphe">
              Derrière chaque château, chaque demeure historique et chaque
              domaine de caractère, il y a une histoire, une famille, une
              architecture, un territoire et une mémoire qu'il nous semble
              essentiel de préserver et de transmettre.
            </p>

            <p className="ap-paragraphe">
              C'est dans cet esprit que nous avons imaginé cette plateforme.
              Notre ambition n'est pas seulement de proposer des séjours dans de
              beaux lieux, mais de donner accès aux plus beaux patrimoines de
              France à travers une approche exigeante, élégante et respectueuse
              de l'âme des lieux. Nous voulons contribuer à faire vivre ces
              propriétés, à permettre au plus grand nombre de les apprécier à
              leur juste valeur, et à encourager une relation plus sensible et
              plus consciente à notre héritage historique.
            </p>

            <div className="ap-citation-encadree">
              <span className="ap-citation-guillemet">"</span>
              <p className="ap-citation-texte">
                Un château ou une demeure patrimoniale ne se résume pas à un
                hébergement : c'est une expérience, une immersion dans un art de
                vivre, une rencontre avec une histoire et avec un territoire.
              </p>
              <span className="ap-citation-guillemet ap-citation-guillemet--fermer">
                "
              </span>
            </div>

            <p className="ap-paragraphe">
              C'est pourquoi nous attachons autant d'importance aux lieux
              eux-mêmes qu'aux régions qui les entourent, à leurs paysages, à
              leur culture, à leur gastronomie et à leurs savoir-faire.
            </p>

            <p className="ap-paragraphe">
              Notre plateforme a ainsi vocation à sublimer ce patrimoine, à
              mettre en lumière les domaines qui le portent, mais aussi à
              valoriser les régions qui leur donnent vie. À notre échelle, nous
              souhaitons participer à une dynamique simple : faire découvrir,
              aimer et soutenir ces lieux d'exception, pour qu'ils continuent à
              traverser le temps et à faire rayonner le patrimoine français.
            </p>
          </div>
        </div>
      </section>

      {/* ── NOS VALEURS ── */}
      <section className="ap-section ap-section--bleu">
        <div className="ap-section-inner">
          <div className="ap-section-label">⚜ Ce qui nous guide</div>
          <h2 className="ap-section-titre ap-section-titre--clair">
            Nos valeurs
          </h2>
          <div className="ap-valeurs-grille">
            {VALEURS.map((v, i) => (
              <div key={i} className="ap-valeur">
                <span className="ap-valeur-icone">{v.icone}</span>
                <h3 className="ap-valeur-titre">{v.titre}</h3>
                <p className="ap-valeur-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── FONDATION DU PATRIMOINE ── */}
      <section className="ap-section ap-section--bleu-fonce">
        <div className="ap-section-inner">
          <div className="ap-section-label">⚜ Notre engagement</div>
          <h2 className="ap-section-titre ap-section-titre--clair">
            Notre engagement envers la<br />
            <em>Fondation du Patrimoine</em>
          </h2>
          <div className="ap-fondation-corps">
            <div className="ap-fondation-textes">
              <p className="ap-paragraphe ap-paragraphe--clair">
                Dès le lancement, Les Clés du Château s'est engagé à reverser une partie de nos recettes issues de chaque réservation à la Fondation du Patrimoine, organisme
                reconnu d'utilité publique dont la mission est de sauvegarder,
                restaurer et valoriser le patrimoine bati français.
              </p>
              <p className="ap-paragraphe ap-paragraphe--clair">
                Pour nous, ce n'est pas un geste de communication. C'est une
                cohérence profonde avec ce que nous sommes : une plateforme qui
                tire sa valeur de la beauté et de la richesse du patrimoine
                français se doit de contribuer à sa préservation. Chaque
                séjour réservé via LCC devient ainsi une micro-contribution
                à la sauvegarde de ces lieux d'exception.
              </p>
              <p className="ap-paragraphe ap-paragraphe--clair">
                Concrètement, cela signifie que chaque client qui réserve un
                séjour via notre plateforme participe — sans surcoût — à la
                restauration du patrimoine français. Nous le mentionnons sur
                chaque confirmation de réservation, sur les vitrines de nos
                châteaux partenaires, et dans l'ensemble de nos communications.
              </p>
              <div className="ap-fondation-citation">
                <span className="ap-fondation-guillemet">“</span>
                <p>
                  Réserver dans un château via Les Clés du Château, c'est
                  offrir un séjour d'exception et contribuer à préserver les
                  lieux qui nous font rêver.
                </p>
                <span className="ap-fondation-guillemet ap-fondation-guillemet--fermer">”</span>
              </div>
            </div>
            <div className="ap-fondation-stats">
              <div className="ap-fondation-stat">
                <span className="ap-fondation-stat-nb">⚜</span>
                <span className="ap-fondation-stat-label">Partenaire Fondation du Patrimoine</span>
              </div>
              <div className="ap-fondation-divider" />
              <div className="ap-fondation-stat">
                <span className="ap-fondation-stat-nb">⚜</span>
                <span className="ap-fondation-stat-label">Mentionné sur chaque vitrine partenaire</span>
              </div>
              <div className="ap-fondation-divider" />
              <div className="ap-fondation-stat">
                <span className="ap-fondation-stat-nb">0 €</span>
                <span className="ap-fondation-stat-label">Surcoût pour le client</span>
              </div>
              <div className="ap-fondation-impact">
                <span className="ap-fondation-impact-titre">Pourquoi la Fondation du Patrimoine ?</span>
                <p>Organisme reconnu d'utilité publique depuis 1996, la Fondation du Patrimoine soutient la restauration de milliers de monuments, églises, manoirs et domaines en France. Notre partenariat crée un lien direct entre chaque réservation sur LCC et la sauvegarde du patrimoine français.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LES FONDATEURS ── */}
      <section className="ap-section ap-section--creme">
        <div className="ap-section-inner">
          <div className="ap-section-label ap-section-label--sombre">
            ⚜ L'équipe fondatrice
          </div>
          <h2 className="ap-section-titre ap-section-titre--sombre">
            Quatre fondateurs,
            <br />
            une conviction
          </h2>
          <p className="ap-section-intro">
            Nous sommes quatre amis réunis autour d'un projet commun : offrir un
            accès exceptionnel au patrimoine de France, avec la conviction que
            ces lieux ont besoin d'être vécus pour continuer à exister.
          </p>
          <div className="ap-fondateurs">
            {FONDATEURS.map((f, i) => (
              <div key={i} className="ap-fondateur">
                <div className="ap-fondateur-avatar">
                  <span>{f.initiales}</span>
                  <div className="ap-fondateur-avatar-bordure" />
                </div>
                <h3 className="ap-fondateur-prenom">{f.prenom}</h3>
                <span className="ap-fondateur-role">{f.role}</span>
                <span className="ap-fondateur-specialite">{f.specialite}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── PATRIMOINE EN CHIFFRES ── */}
      <section className="ap-section ap-section--noir">
        <div className="ap-section-inner">
          <div className="ap-section-label">⚜ Le patrimoine en chiffres</div>
          <h2 className="ap-section-titre ap-section-titre--clair">
            La France,
            <br />
            première puissance patrimoniale mondiale
          </h2>
          <div className="ap-patrimoine-grille">
            {[
              {
                nombre: "45 000",
                label: "Châteaux recensés en France",
                detail: "Plus que tout autre pays au monde",
              },
              {
                nombre: "100M+",
                label: "Touristes internationaux en 2024",
                detail: "Première destination mondiale",
              },
              {
                nombre: "43 000",
                label: "Monuments historiques",
                detail: "Classés ou inscrits",
              },
              {
                nombre: "52",
                label: "Sites UNESCO en France",
                detail: "Parmi les plus élevés au monde",
              },
            ].map((p, i) => (
              <div key={i} className="ap-patrimoine-stat">
                <span className="ap-patrimoine-nombre">{p.nombre}</span>
                <span className="ap-patrimoine-label">{p.label}</span>
                <span className="ap-patrimoine-detail">{p.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POURQUOI NOUS FAIRE CONFIANCE ── */}
      <section className="ap-section ap-section--creme">
        <div className="ap-section-inner">
          <div className="ap-section-label ap-section-label--sombre">⚜ Pour les propriétaires</div>
          <h2 className="ap-section-titre ap-section-titre--sombre">
            Pourquoi nous<br />faire confiance
          </h2>
          <div className="ap-valeurs-grille">
            {GARANTIES.map((g, i) => (
              <div key={i} className="ap-valeur ap-valeur--sombre">
                <span className="ap-valeur-icone ap-valeur-icone--or">{g.icone}</span>
                <h3 className="ap-valeur-titre ap-valeur-titre--sombre">{g.titre}</h3>
                <p className="ap-valeur-desc ap-valeur-desc--sombre">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="ap-section ap-section--or-fonce">
        <div className="ap-section-inner ap-cta-final">
          <div className="ap-cta-ornement">
            <div className="ap-hero-ornement-ligne" />
            <span>⚜</span>
            <div className="ap-hero-ornement-ligne" />
          </div>
          <h2 className="ap-cta-titre">Rejoignez l'aventure</h2>
          <p className="ap-cta-desc">
            Découvrez nos châteaux partenaires, rejoignez le Club des
            Châtelains, ou organisez votre prochain événement dans l'un de ces
            lieux d'exception. Chaque réservation contribue à la préservation
            du patrimoine français via notre partenariat avec la Fondation du Patrimoine.
          </p>
          <button className="ap-btn-or" onClick={onClose}>
            Découvrir la plateforme ⚜
          </button>
        </div>
      </section>
    </div>
  );
}
