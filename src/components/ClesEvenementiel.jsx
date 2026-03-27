import { useEffect, useState } from "react";
import "../styles/evenementiel.css";

const TYPES_EVENEMENTS = [
  {
    icone: "✦",
    titre: "Mariages",
    description: "Dites oui dans un cadre inoubliable. Nos châteaux partenaires accueillent vos cérémonies, cocktails et dîners de réception dans des lieux classés au patrimoine.",
    capacite: "Jusqu’à 400 convives",
    detail: "Cérémonie laïque ou religieuse · Cocktail · Dîner · Hébergement des invités",
  },
  {
    icone: "◆",
    titre: "Séminaires & MICE",
    description: "Sortez vos équipes de l’ordinaire. Salles de conférence en pierre taillée, parcs pour le team building, hébergement sur place.",
    capacite: "20 à 200 participants",
    detail: "Plénières · Ateliers · Dîners de gala · Nuits sur place",
  },
  {
    icone: "♥",
    titre: "Galas & réceptions privées",
    description: "Anniversaires, lancements de produit, soirées de prestige. La pierre ancienne comme décor naturel, un service sur mesure.",
    capacite: "50 à 300 invités",
    detail: "Dîner de gala · Cocktail · Concert privé · Photographie",
  },
  {
    icone: "⚜",
    titre: "Week-ends thématiques",
    description: "Chasses, week-ends viticoles, retraites bien-être. Des expériences immersives conçues par les propriétaires.",
    capacite: "8 à 50 personnes",
    detail: "Hébergement · Repas · Activités · Accès privatif",
  },
];

const CHATEAUX_EVENEMENTIEL = [
  { nom: "Château de Villiers-le-Mahieu", region: "Yvelines · 45 min de Paris", capacite: "300 convives", specialite: "Mariages & séminaires", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80" },
  { nom: "Château de Fère", region: "Aisne · 1h30 de Paris", capacite: "200 convives", specialite: "Galas & réceptions", image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80" },
  { nom: "Château d’Artigny", region: "Indre-et-Loire · 2h30 de Paris", capacite: "400 convives", specialite: "Mariages & MICE", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80" },
];

export default function ClesEvenementiel({ onClose }) {
  const [visible, setVisible] = useState(false);
  const [formOuvert, setFormOuvert] = useState(false);
  const [typeSelectionne, setTypeSelectionne] = useState(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 40);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className={"ev-overlay " + (visible ? "ev-visible" : "")}>

      <header className="ev-header">
        <button className="ev-retour" onClick={onClose}>← Retour</button>
        <div className="ev-header-centre">
          <span className="ev-header-eyebrow">⚜ Les Clés du Château</span>
          <span className="ev-header-titre">L’Événementiel</span>
        </div>
        <button className="ev-contact-btn" onClick={() => setFormOuvert(true)}>Nous contacter</button>
      </header>

      <div className="ev-corps">

        <div className="ev-hero">
          <div className="ev-hero-overlay" />
          <div className="ev-hero-contenu">
            <div className="ev-orn"><span className="ev-trait"/><span className="ev-lys">⚜</span><span className="ev-trait"/></div>
            <h1 className="ev-hero-titre">Votre événement<br/>dans un château d’exception</h1>
            <p className="ev-hero-accroche">
              Mariages, séminaires, galas — nous mettons en relation les organisateurs
              avec les plus beaux châteaux privés de France.
            </p>
            <button className="ev-hero-cta" onClick={() => setFormOuvert(true)}>
              Soumettre votre projet →
            </button>
          </div>
        </div>

        <section className="ev-section">
          <div className="ev-section-inner">
            <div className="ev-section-header">
              <div className="ev-orn"><span className="ev-trait"/><span className="ev-lys">⚜</span><span className="ev-trait"/></div>
              <h2 className="ev-section-titre">Quels événements accueillons-nous ?</h2>
            </div>
            <div className="ev-types-grille">
              {TYPES_EVENEMENTS.map((t, i) => (
                <div key={i}
                  className={"ev-type " + (typeSelectionne === i ? "ev-type--actif" : "")}
                  onClick={() => setTypeSelectionne(typeSelectionne === i ? null : i)}>
                  <span className="ev-type-icone">{t.icone}</span>
                  <h3 className="ev-type-titre">{t.titre}</h3>
                  <p className="ev-type-desc">{t.description}</p>
                  <div className="ev-type-meta">
                    <span className="ev-type-capacite">{t.capacite}</span>
                    <span className="ev-type-detail">{t.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ev-section ev-section--sombre">
          <div className="ev-section-inner">
            <div className="ev-section-header">
              <div className="ev-orn"><span className="ev-trait"/><span className="ev-lys">⚜</span><span className="ev-trait"/></div>
              <h2 className="ev-section-titre">Quelques lieux partenaires</h2>
              <p className="ev-section-sous">Une sélection de nos châteaux disponibles pour l’événementiel.</p>
            </div>
            <div className="ev-chateaux">
              {CHATEAUX_EVENEMENTIEL.map((c, i) => (
                <div key={i} className="ev-chateau">
                  <div className="ev-chateau-img" style={{backgroundImage: "url(" + c.image + ")"}}>
                    <div className="ev-chateau-img-overlay"/>
                    <span className="ev-chateau-specialite">{c.specialite}</span>
                  </div>
                  <div className="ev-chateau-info">
                    <span className="ev-chateau-region">{c.region}</span>
                    <h3 className="ev-chateau-nom">{c.nom}</h3>
                    <span className="ev-chateau-capacite">◆ {c.capacite}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ev-section">
          <div className="ev-section-inner ev-pourquoi">
            <div className="ev-pourquoi-texte">
              <div className="ev-orn ev-orn--gauche"><span className="ev-trait"/><span className="ev-lys">⚜</span></div>
              <h2 className="ev-section-titre ev-titre--gauche">Pourquoi passer par Les Clés du Château ?</h2>
              <div className="ev-avantages">
                <div className="ev-avantage">
                  <span className="ev-av-ico">◆</span>
                  <div>
                    <strong>Un accès direct aux propriétaires</strong>
                    <p>Pas d’intermédiaire supplémentaire. Vous êtes mis en relation directement avec la famille propriétaire.</p>
                  </div>
                </div>
                <div className="ev-avantage">
                  <span className="ev-av-ico">◆</span>
                  <div>
                    <strong>Une sélection curatée</strong>
                    <p>Chaque lieu a été visité et qualifié par notre équipe. Vous n’étudiez que des lieux vraiment disponibles.</p>
                  </div>
                </div>
                <div className="ev-avantage">
                  <span className="ev-av-ico">◆</span>
                  <div>
                    <strong>Des tarifs transparents</strong>
                    <p>Notre commission est prise en charge par le château partenaire. Pour vous, le service est gratuit.</p>
                  </div>
                </div>
                <div className="ev-avantage">
                  <span className="ev-av-ico">◆</span>
                  <div>
                    <strong>Un accompagnement de A à Z</strong>
                    <p>De la première visite à la signature du contrat, nous vous guidons à chaque étape.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="ev-pourquoi-cta-bloc">
              <div className="ev-pourquoi-encadre">
                <span className="ev-pe-lys">⚜</span>
                <h3>Votre projet en 48h</h3>
                <p>Soumettez votre demande ce soir. Nous vous revenons avec une sélection de châteaux sous 48 heures.</p>
                <button className="ev-pe-btn" onClick={() => setFormOuvert(true)}>Soumettre votre projet</button>
                <span className="ev-pe-note">Service gratuit pour les organisateurs</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {formOuvert && (
        <div className="ev-form-overlay" onClick={() => setFormOuvert(false)}>
          <div className="ev-form" onClick={e => e.stopPropagation()}>
            <button className="ev-form-close" onClick={() => setFormOuvert(false)}>×</button>
            <span className="ev-form-lys">⚜</span>
            <h3 className="ev-form-titre">Votre projet événementiel</h3>
            <p className="ev-form-sous">Décrivez-nous votre événement et nous vous proposons une sélection sous 48h.</p>
            <div className="ev-form-champs">
              <input className="ev-input" type="text" placeholder="Votre nom" />
              <input className="ev-input" type="email" placeholder="Votre email" />
              <select className="ev-input ev-select">
                <option value="">Type d’événement</option>
                <option>Mariage</option>
                <option>Séminaire d’entreprise</option>
                <option>Gala &amp; réception privée</option>
                <option>Week-end thématique</option>
                <option>Autre</option>
              </select>
              <input className="ev-input" type="text" placeholder="Nombre de personnes" />
              <input className="ev-input" type="text" placeholder="Date envisagée" />
              <textarea className="ev-input ev-textarea" placeholder="Décrivez votre projet..." rows={4} />
            </div>
            <button className="ev-form-btn">Envoyer ma demande →</button>
            <p className="ev-form-note">Réponse garantie sous 48h · Service gratuit</p>
          </div>
        </div>
      )}
    </div>
  );
}
