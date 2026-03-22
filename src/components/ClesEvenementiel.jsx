import { useEffect, useState } from "react";
import "../styles/cles-evenementiel.css";

const TYPES_EVENEMENTS = [
  {
    id: "mariage",
    icone: "⚜",
    titre: "Mariages",
    sous_titre: "Le jour le plus beau, dans le plus beau des écrins",
    description:
      "Célébrez votre union dans un château d'exception. Jardins à la française, salons d'apparat, chapelles privées — chaque domaine compose un décor de conte pour votre jour J.",
    capacite: "De 20 à 500 invités",
    details: [
      "Cérémonie civile ou religieuse",
      "Cocktail & dîner de gala",
      "Hébergement des proches sur place",
      "Nuit de noces en suite d'honneur",
    ],
  },
  {
    id: "seminaire",
    icone: "◆",
    titre: "Séminaires d'entreprise",
    sous_titre: "Inspirer, cohérer, décider — hors des murs du bureau",
    description:
      "Un cadre exceptionnel pour des décisions exceptionnelles. Salles de réunion dans les appartements d'apparat, team building dans les domaines, dîner de gala au château.",
    capacite: "De 10 à 200 participants",
    details: [
      "Salles équipées & privatisées",
      "Team building & expériences",
      "Restauration gastronomique",
      "Hébergement sur place disponible",
    ],
  },
  {
    id: "soiree",
    icone: "✦",
    titre: "Soirées privées",
    sous_titre: "Une soirée que vos invités n'oublieront jamais",
    description:
      "Anniversaires, fêtes de famille, soirées de prestige — un château privatisé pour une nuit, avec votre équipe, votre DJ, votre chef. Le faste à votre service.",
    capacite: "De 30 à 300 invités",
    details: [
      "Privatisation complète du domaine",
      "Traiteur & chef privé",
      "Animation & scénographie",
      "Transferts & logistique",
    ],
  },
  {
    id: "shooting",
    icone: "◆",
    titre: "Shootings & tournages",
    sous_titre: "Des décors uniques pour des créations exceptionnelles",
    description:
      "Mode, publicité, clips, films — les châteaux partenaires ouvrent leurs portes aux créatifs. Chaque pièce, chaque jardin est un décor naturel de prestige.",
    capacite: "Équipes de 5 à 50 personnes",
    details: [
      "Accès aux appartements & jardins",
      "Lumière naturelle exceptionnelle",
      "Loge & espace préparation",
      "Possibilité d'hébergement équipe",
    ],
  },
  {
    id: "anniversaire",
    icone: "⚜",
    titre: "Anniversaires & célébrations",
    sous_titre: "Marquer les grandes étapes avec une élégance rare",
    description:
      "18 ans, 40 ans, 50 ans, retraite, PACS — chaque étape mérite un cadre à la hauteur. De l'intime au grandiose, nos châteaux s'adaptent à votre vision.",
    capacite: "De 10 à 200 invités",
    details: [
      "Formule sur mesure",
      "Décoration & fleuriste",
      "Dîner gastronomique",
      "Animation & musique live",
    ],
  },
];

const CHATEAUX_EVENTS = [
  {
    nom: "Château de Vaux-le-Vicomte",
    region: "Île-de-France · 55 km de Paris",
    capaciteMax: 500,
    types: ["Mariages", "Soirées", "Séminaires"],
    accroche:
      "Le château qui inspira Versailles — pour des événements dignes des plus grands rois.",
    image:
      "https://images.unsplash.com/photo-1548267245-9c5f2e2c28b2?w=800&q=80",
    superficie: "500 hectares",
    hebergement: true,
  },
  {
    nom: "Château de Chantilly",
    region: "Hauts-de-France · 48 km de Paris",
    capaciteMax: 300,
    types: ["Mariages", "Séminaires", "Shootings"],
    accroche: "Le domaine des Condé, entre forêt royale et musée d'exception.",
    image:
      "https://images.unsplash.com/photo-1585116938354-3f0f70744573?w=800&q=80",
    superficie: "115 hectares",
    hebergement: true,
  },
  {
    nom: "Château de Fontainebleau",
    region: "Île-de-France · 65 km de Paris",
    capaciteMax: 400,
    types: ["Séminaires", "Soirées", "Shootings"],
    accroche:
      "La demeure de trente rois, pour des séminaires de prestige absolu.",
    image:
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    superficie: "130 hectares",
    hebergement: true,
  },
  {
    nom: "Château de Pierrefonds",
    region: "Hauts-de-France · 85 km de Paris",
    capaciteMax: 200,
    types: ["Mariages", "Soirées", "Shootings"],
    accroche:
      "La forteresse médiévale — pour des mariages de conte et des tournages d'époque.",
    image:
      "https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?w=800&q=80",
    superficie: "20 hectares",
    hebergement: true,
  },
];

export default function ClesEvenementiel({ onClose }) {
  const [typeActif, setTypeActif] = useState("mariage");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    type: "",
    date: "",
    invites: "",
    message: "",
  });
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const typeActuel = TYPES_EVENEMENTS.find((t) => t.id === typeActif);

  const envoyer = () => {
    setTimeout(() => setEnvoye(true), 800);
  };

  return (
    <div className="ev-overlay">
      {/* Header */}
      <header className="ev-header">
        <div className="ev-header-gauche">
          <button className="ev-retour" onClick={onClose}>
            ← Retour
          </button>
          <span className="ev-header-titre">Clés de l'Événementiel</span>
        </div>
        <button
          className="ev-header-cta"
          onClick={() => setFormulaireOuvert(true)}
        >
          Demander un devis
        </button>
      </header>

      {/* Hero */}
      <div className="ev-hero">
        <div className="ev-hero-overlay" />
        <div className="ev-hero-lys">
          <svg width="100%" height="100%">
            <rect width="100%" height="100%" fill="url(#lys-pattern)" />
          </svg>
        </div>
        <div className="ev-hero-contenu">
          <span className="ev-hero-sur-titre">
            ⚜ Événementiel · Châteaux de France
          </span>
          <h1 className="ev-hero-titre">Clés de l'Événementiel</h1>
          <p className="ev-hero-accroche">
            Des demeures d'exception pour vos événements les plus importants.
            Mariages, séminaires, soirées privées — chaque château devient votre
            scène.
          </p>
          <div className="ev-hero-actions">
            <button
              className="ev-btn-or"
              onClick={() => setFormulaireOuvert(true)}
            >
              Demander un devis gratuit
            </button>
            <button
              className="ev-btn-contour"
              onClick={() =>
                document
                  .getElementById("ev-chateaux")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Voir les châteaux disponibles
            </button>
          </div>
          <div className="ev-hero-chiffres">
            <div className="ev-chiffre">
              <span className="ev-chiffre-nombre">24</span>
              <span className="ev-chiffre-label">Châteaux partenaires</span>
            </div>
            <div className="ev-chiffre-sep" />
            <div className="ev-chiffre">
              <span className="ev-chiffre-nombre">500</span>
              <span className="ev-chiffre-label">Invités max.</span>
            </div>
            <div className="ev-chiffre-sep" />
            <div className="ev-chiffre">
              <span className="ev-chiffre-nombre">5</span>
              <span className="ev-chiffre-label">Types d'événements</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ev-corps">
        {/* Types d'événements */}
        <section className="ev-section ev-section--bleu">
          <div className="ev-section-inner">
            <div className="ev-section-label">⚜ Nos spécialités</div>
            <h2 className="ev-section-titre ev-section-titre--clair">
              Quel événement organisez-vous ?
            </h2>

            {/* Tabs */}
            <div className="ev-tabs">
              {TYPES_EVENEMENTS.map((t) => (
                <button
                  key={t.id}
                  className={"ev-tab " + (typeActif === t.id ? "actif" : "")}
                  onClick={() => setTypeActif(t.id)}
                >
                  {t.icone} {t.titre}
                </button>
              ))}
            </div>

            {/* Contenu tab actif */}
            {typeActuel && (
              <div className="ev-tab-contenu">
                <div className="ev-tab-gauche">
                  <h3 className="ev-tab-titre">{typeActuel.titre}</h3>
                  <p className="ev-tab-sous-titre">{typeActuel.sous_titre}</p>
                  <div className="ev-tab-separateur" />
                  <p className="ev-tab-desc">{typeActuel.description}</p>
                  <div className="ev-tab-capacite">
                    <span className="ev-tab-capacite-label">Capacité</span>
                    <span className="ev-tab-capacite-val">
                      {typeActuel.capacite}
                    </span>
                  </div>
                </div>
                <div className="ev-tab-droite">
                  <div className="ev-tab-details-titre">Ce qui est inclus</div>
                  {typeActuel.details.map((d, i) => (
                    <div key={i} className="ev-tab-detail">
                      <span className="ev-tab-detail-puce">✦</span>
                      <span>{d}</span>
                    </div>
                  ))}
                  <button
                    className="ev-btn-or ev-btn-or--sm"
                    onClick={() => setFormulaireOuvert(true)}
                  >
                    Demander un devis →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Châteaux disponibles */}
        <section className="ev-section ev-section--creme" id="ev-chateaux">
          <div className="ev-section-inner">
            <div className="ev-section-label ev-section-label--sombre">
              ⚜ Nos domaines partenaires
            </div>
            <h2 className="ev-section-titre ev-section-titre--sombre">
              Châteaux disponibles pour vos événements
            </h2>
            <div className="ev-chateaux-grille">
              {CHATEAUX_EVENTS.map((c, i) => (
                <div key={i} className="ev-chateau-carte">
                  <div className="ev-chateau-photo-wrapper">
                    <img
                      src={c.image}
                      alt={c.nom}
                      className="ev-chateau-photo"
                      loading="lazy"
                    />
                    <div className="ev-chateau-photo-overlay" />
                    <div className="ev-chateau-types">
                      {c.types.map((t, j) => (
                        <span key={j} className="ev-chateau-type-badge">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ev-chateau-contenu">
                    <div className="ev-chateau-region">{c.region}</div>
                    <h3 className="ev-chateau-nom">{c.nom}</h3>
                    <p className="ev-chateau-accroche">{c.accroche}</p>
                    <div className="ev-chateau-infos">
                      <span className="ev-chateau-info">
                        <span className="ev-chateau-info-label">
                          Capacité max.
                        </span>
                        <span className="ev-chateau-info-val">
                          {c.capaciteMax} pers.
                        </span>
                      </span>
                      <span className="ev-chateau-info">
                        <span className="ev-chateau-info-label">Domaine</span>
                        <span className="ev-chateau-info-val">
                          {c.superficie}
                        </span>
                      </span>
                      <span className="ev-chateau-info">
                        <span className="ev-chateau-info-label">
                          Hébergement
                        </span>
                        <span className="ev-chateau-info-val">
                          {c.hebergement ? "✓ Sur place" : "Non"}
                        </span>
                      </span>
                    </div>
                    <button
                      className="ev-chateau-cta"
                      onClick={() => setFormulaireOuvert(true)}
                    >
                      Demander un devis pour ce château →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pourquoi nous */}
        <section className="ev-section ev-section--bleu-nuit">
          <div className="ev-section-inner">
            <div className="ev-section-label">⚜ Notre promesse</div>
            <h2 className="ev-section-titre ev-section-titre--clair">
              Pourquoi organiser votre événement avec nous ?
            </h2>
            <div className="ev-promesses-grille">
              {[
                {
                  icone: "⚜",
                  titre: "Sélection exclusive",
                  desc: "Seuls les châteaux visités et validés par notre équipe intègrent notre réseau événementiel. Aucun compromis sur la qualité.",
                },
                {
                  icone: "✦",
                  titre: "Un interlocuteur unique",
                  desc: "De la première visite à la dernière valse, un coordinateur dédié gère la relation avec le château et tous les prestataires.",
                },
                {
                  icone: "◆",
                  titre: "Tarifs négociés",
                  desc: "Notre volume et nos partenariats avec les châteaux nous permettent de vous proposer des tarifs inaccessibles en direct.",
                },
                {
                  icone: "⚜",
                  titre: "Sur mesure",
                  desc: "Chaque événement est unique. Nous ne proposons pas de packages — nous construisons votre événement avec vous, pour vous.",
                },
              ].map((p, i) => (
                <div key={i} className="ev-promesse">
                  <span className="ev-promesse-icone">{p.icone}</span>
                  <h3 className="ev-promesse-titre">{p.titre}</h3>
                  <p className="ev-promesse-desc">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="ev-section ev-section--or">
          <div className="ev-section-inner ev-cta-final">
            <div className="ev-section-label ev-section-label--sombre">
              ⚜ Premier contact
            </div>
            <h2 className="ev-cta-titre">Parlons de votre projet</h2>
            <p className="ev-cta-desc">
              Un échange de 20 minutes suffit pour identifier le château idéal
              et vous proposer une première estimation. C'est gratuit, sans
              engagement.
            </p>
            <button
              className="ev-btn-sombre"
              onClick={() => setFormulaireOuvert(true)}
            >
              Demander un devis gratuit ⚜
            </button>
          </div>
        </section>
      </div>

      {/* Formulaire devis */}
      {formulaireOuvert && (
        <div
          className="ev-form-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setFormulaireOuvert(false)
          }
        >
          <div className="ev-form-modal">
            <button
              className="ev-form-fermer"
              onClick={() => setFormulaireOuvert(false)}
            >
              ✕
            </button>

            {envoye ? (
              <div className="ev-form-succes">
                <span className="ev-form-succes-icon">⚜</span>
                <h3 className="ev-form-succes-titre">Demande envoyée !</h3>
                <p className="ev-form-succes-texte">
                  Notre équipe événementielle vous contacte sous 24h pour
                  discuter de votre projet.
                </p>
                <button
                  className="ev-btn-or"
                  onClick={() => {
                    setFormulaireOuvert(false);
                    setEnvoye(false);
                  }}
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                <div className="ev-form-header">
                  <span className="ev-form-sur-titre">⚜ Demande de devis</span>
                  <h3 className="ev-form-titre">Votre projet événementiel</h3>
                  <p className="ev-form-sous-titre">
                    Réponse sous 24h · Gratuit · Sans engagement
                  </p>
                </div>

                <div className="ev-form-champs">
                  <div className="ev-form-ligne">
                    <div className="ev-form-champ">
                      <label>Nom & prénom</label>
                      <input
                        type="text"
                        placeholder="Marie Dupont"
                        value={formData.nom}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, nom: e.target.value }))
                        }
                      />
                    </div>
                    <div className="ev-form-champ">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="marie@exemple.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="ev-form-ligne">
                    <div className="ev-form-champ">
                      <label>Type d'événement</label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, type: e.target.value }))
                        }
                      >
                        <option value="">Choisir...</option>
                        <option>Mariage</option>
                        <option>Séminaire d'entreprise</option>
                        <option>Soirée privée</option>
                        <option>Shooting / Tournage</option>
                        <option>Anniversaire & célébration</option>
                      </select>
                    </div>
                    <div className="ev-form-champ">
                      <label>Date envisagée</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, date: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="ev-form-champ">
                    <label>Nombre d'invités / participants</label>
                    <select
                      value={formData.invites}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, invites: e.target.value }))
                      }
                    >
                      <option value="">Estimation...</option>
                      <option>Moins de 30</option>
                      <option>30 à 80</option>
                      <option>80 à 150</option>
                      <option>150 à 300</option>
                      <option>Plus de 300</option>
                    </select>
                  </div>
                  <div className="ev-form-champ">
                    <label>Votre projet en quelques mots</label>
                    <textarea
                      placeholder="Décrivez votre événement, vos souhaits, le château que vous avez repéré..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, message: e.target.value }))
                      }
                      rows={4}
                    />
                  </div>
                </div>

                <button className="ev-form-submit" onClick={envoyer}>
                  Envoyer ma demande →
                </button>
                <p className="ev-form-note">
                  Réponse garantie sous 24h · Devis gratuit · Sans engagement
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
