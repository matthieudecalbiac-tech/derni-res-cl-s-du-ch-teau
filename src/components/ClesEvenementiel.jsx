import { useEffect, useState } from "react";
import "../styles/evenementiel.css";

const TYPES_EVENEMENTS = [
  {
    icone: "\u2726",
    titre: "Mariages",
    description: "Dites oui dans un cadre inoubliable. Nos ch\u00e2teaux partenaires accueillent vos c\u00e9r\u00e9monies, cocktails et d\u00eeners de r\u00e9ception dans des lieux class\u00e9s au patrimoine.",
    capacite: "Jusqu\u2019\u00e0 400 convives",
    detail: "C\u00e9r\u00e9monie la\u00efque ou religieuse \u00b7 Cocktail \u00b7 D\u00eener \u00b7 H\u00e9bergement des invit\u00e9s",
  },
  {
    icone: "\u25c6",
    titre: "S\u00e9minaires & MICE",
    description: "Sortez vos \u00e9quipes de l\u2019ordinaire. Salles de conf\u00e9rence en pierre taill\u00e9e, parcs pour les activit\u00e9s de team building, h\u00e9bergement sur place.",
    capacite: "20 \u00e0 200 participants",
    detail: "Pl\u00e9ni\u00e8res \u00b7 Ateliers \u00b7 D\u00eeners de gala \u00b7 Nuits sur place",
  },
  {
    icone: "\u2665",
    titre: "Galas & r\u00e9ceptions priv\u00e9es",
    description: "Anniversaires, lancements de produit, soir\u00e9es de prestige. La pierre ancienne comme d\u00e9cor naturel, un service sur mesure.",
    capacite: "50 \u00e0 300 invit\u00e9s",
    detail: "D\u00eener de gala \u00b7 Cocktail \u00b7 Concert priv\u00e9 \u00b7 Photographie",
  },
  {
    icone: "\u269c",
    titre: "Week-ends th\u00e9matiques",
    description: "Chasses \u00e0 courre, week-ends viticoles, retraites bien-\u00eatre au ch\u00e2teau. Des exp\u00e9riences immersives con\u00e7ues par les propri\u00e9taires.",
    capacite: "8 \u00e0 50 personnes",
    detail: "H\u00e9bergement \u00b7 Repas \u00b7 Activit\u00e9s \u00b7 Acc\u00e8s privatif",
  },
];

const CHATEAUX_EVENEMENTIEL = [
  { nom: "Ch\u00e2teau de Villiers-le-Mahieu", region: "Yvelines \u00b7 45 min de Paris", capacite: "300 convives", specialite: "Mariages & s\u00e9minaires", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80" },
  { nom: "Ch\u00e2teau de Fère", region: "Aisne \u00b7 1h30 de Paris", capacite: "200 convives", specialite: "Galas & r\u00e9ceptions", image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80" },
  { nom: "Ch\u00e2teau d\u2019Artigny", region: "Indre-et-Loire \u00b7 2h30 de Paris", capacite: "400 convives", specialite: "Mariages & MICE", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80" },
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

      {/* Header */}
      <header className="ev-header">
        <button className="ev-retour" onClick={onClose}>\u2190 Retour</button>
        <div className="ev-header-centre">
          <span className="ev-header-eyebrow">\u269c Les Cl\u00e9s du Ch\u00e2teau</span>
          <span className="ev-header-titre">L\u2019\u00c9v\u00e9nementiel</span>
        </div>
        <button className="ev-contact-btn" onClick={() => setFormOuvert(true)}>Nous contacter</button>
      </header>

      <div className="ev-corps">

        {/* Hero */}
        <div className="ev-hero">
          <div className="ev-hero-overlay" />
          <div className="ev-hero-contenu">
            <div className="ev-orn"><span className="ev-trait"/><span className="ev-lys">\u269c</span><span className="ev-trait"/></div>
            <h1 className="ev-hero-titre">Votre \u00e9v\u00e9nement<br/>dans un ch\u00e2teau d\u2019exception</h1>
            <p className="ev-hero-accroche">
              Mariages, s\u00e9minaires, galas \u2014 nous mettons en relation les organisateurs d\u2019\u00e9v\u00e9nements
              avec les plus beaux ch\u00e2teaux priv\u00e9s de France.
            </p>
            <button className="ev-hero-cta" onClick={() => setFormOuvert(true)}>
              Soumettre votre projet \u2192
            </button>
          </div>
        </div>

        {/* Types d'événements */}
        <section className="ev-section">
          <div className="ev-section-inner">
            <div className="ev-section-header">
              <div className="ev-orn"><span className="ev-trait"/><span className="ev-lys">\u269c</span><span className="ev-trait"/></div>
              <h2 className="ev-section-titre">Quels \u00e9v\u00e9nements accueillons-nous ?</h2>
            </div>
            <div className="ev-types-grille">
              {TYPES_EVENEMENTS.map((t, i) => (
                <div key={i} className={"ev-type " + (typeSelectionne === i ? "ev-type--actif" : "")}
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

        {/* Châteaux partenaires */}
        <section className="ev-section ev-section--sombre">
          <div className="ev-section-inner">
            <div className="ev-section-header">
              <div className="ev-orn"><span className="ev-trait"/><span className="ev-lys">\u269c</span><span className="ev-trait"/></div>
              <h2 className="ev-section-titre">Quelques lieux partenaires</h2>
              <p className="ev-section-sous">Une s\u00e9lection de nos ch\u00e2teaux disponibles pour l\u2019\u00e9v\u00e9nementiel.</p>
            </div>
            <div className="ev-chateaux">
              {CHATEAUX_EVENEMENTIEL.map((c, i) => (
                <div key={i} className="ev-chateau">
                  <div className="ev-chateau-img" style={{backgroundImage: `url(${c.image})`}}>
                    <div className="ev-chateau-img-overlay"/>
                    <span className="ev-chateau-specialite">{c.specialite}</span>
                  </div>
                  <div className="ev-chateau-info">
                    <span className="ev-chateau-region">{c.region}</span>
                    <h3 className="ev-chateau-nom">{c.nom}</h3>
                    <span className="ev-chateau-capacite">\u25c6 {c.capacite}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pourquoi LCC */}
        <section className="ev-section">
          <div className="ev-section-inner ev-pourquoi">
            <div className="ev-pourquoi-texte">
              <div className="ev-orn ev-orn--gauche"><span className="ev-trait"/><span className="ev-lys">\u269c</span></div>
              <h2 className="ev-section-titre ev-titre--gauche">Pourquoi passer par Les Cl\u00e9s du Ch\u00e2teau ?</h2>
              <div className="ev-avantages">
                <div className="ev-avantage">
                  <span className="ev-av-ico">\u25c6</span>
                  <div>
                    <strong>Un acc\u00e8s direct aux propri\u00e9taires</strong>
                    <p>Pas d\u2019interm\u00e9diaire suppl\u00e9mentaire. Vous \u00eates mis en relation directement avec la famille propri\u00e9taire.</p>
                  </div>
                </div>
                <div className="ev-avantage">
                  <span className="ev-av-ico">\u25c6</span>
                  <div>
                    <strong>Une s\u00e9lection curatée</strong>
                    <p>Chaque lieu a \u00e9t\u00e9 visit\u00e9 et qualifi\u00e9 par notre \u00e9quipe. Vous n\u2019\u00e9tudiez que des lieux vraiment disponibles et adapt\u00e9s.</p>
                  </div>
                </div>
                <div className="ev-avantage">
                  <span className="ev-av-ico">\u25c6</span>
                  <div>
                    <strong>Des tarifs transparents</strong>
                    <p>Notre commission est prise en charge par le ch\u00e2teau partenaire. Pour vous, le service est gratuit.</p>
                  </div>
                </div>
                <div className="ev-avantage">
                  <span className="ev-av-ico">\u25c6</span>
                  <div>
                    <strong>Un accompagnement de A \u00e0 Z</strong>
                    <p>De la premi\u00e8re visite \u00e0 la signature du contrat, nous vous guidons \u00e0 chaque \u00e9tape.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="ev-pourquoi-cta-bloc">
              <div className="ev-pourquoi-encadre">
                <span className="ev-pe-lys">\u269c</span>
                <h3>Votre projet en 48h</h3>
                <p>Soumettez votre demande ce soir. Nous vous revenons avec une s\u00e9lection de ch\u00e2teaux sous 48 heures.</p>
                <button className="ev-pe-btn" onClick={() => setFormOuvert(true)}>
                  Soumettre votre projet
                </button>
                <span className="ev-pe-note">Service gratuit pour les organisateurs</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Formulaire de contact */}
      {formOuvert && (
        <div className="ev-form-overlay" onClick={() => setFormOuvert(false)}>
          <div className="ev-form" onClick={e => e.stopPropagation()}>
            <button className="ev-form-close" onClick={() => setFormOuvert(false)}>\u00d7</button>
            <span className="ev-form-lys">\u269c</span>
            <h3 className="ev-form-titre">Votre projet \u00e9v\u00e9nementiel</h3>
            <p className="ev-form-sous">D\u00e9crivez-nous votre \u00e9v\u00e9nement et nous vous proposons une s\u00e9lection sous 48h.</p>
            <div className="ev-form-champs">
              <input className="ev-input" type="text" placeholder="Votre nom" />
              <input className="ev-input" type="email" placeholder="Votre email" />
              <select className="ev-input ev-select">
                <option value="">Type d\u2019\u00e9v\u00e9nement</option>
                <option>Mariage</option>
                <option>S\u00e9minaire d\u2019entreprise</option>
                <option>Gala & r\u00e9ception priv\u00e9e</option>
                <option>Week-end th\u00e9matique</option>
                <option>Autre</option>
              </select>
              <input className="ev-input" type="text" placeholder="Nombre de personnes" />
              <input className="ev-input" type="text" placeholder="Date envisag\u00e9e" />
              <textarea className="ev-input ev-textarea" placeholder="D\u00e9crivez votre projet..." rows={4} />
            </div>
            <button className="ev-form-btn">Envoyer ma demande \u2192</button>
            <p className="ev-form-note">R\u00e9ponse garantie sous 48h \u00b7 Service gratuit</p>
          </div>
        </div>
      )}
    </div>
  );
}
