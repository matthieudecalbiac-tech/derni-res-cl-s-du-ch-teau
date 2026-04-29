import { useEffect, useState } from "react";
import "../styles/club-chatelains.css";

const AVANTAGES = [
  {
    icone: "⚜",
    titre: "Vitrines permanentes",
    desc: "Accès aux pages dédiées de chaque château partenaire avec toutes leurs disponibilités, pas uniquement les invendus.",
  },
  {
    icone: "✦",
    titre: "Packages exclusifs",
    desc: "Offres conçues spécialement pour les membres du club : week-ends thématiques, tables d'hôtes privées, expériences sur mesure.",
  },
  {
    icone: "◆",
    titre: "Tarifs préférentiels",
    desc: "Accès aux meilleurs tarifs négociés directement avec les propriétaires, hors canaux grand public.",
  },
  {
    icone: "⚜",
    titre: "Priorité Last Minute",
    desc: "Les membres sont alertés en avant-première des disponibilités last-minute avant leur mise en ligne publique.",
  },
  {
    icone: "✦",
    titre: "Conciergerie dédiée",
    desc: "Un interlocuteur unique pour organiser transferts, expériences et demandes spéciales dans chaque château.",
  },
  {
    icone: "◆",
    titre: "Parrainage & progression",
    desc: "Parrainez vos proches et progressez vers les niveaux Silver, Gold et Platinum pour des avantages toujours plus exclusifs.",
  },
];

const CHATEAUX_CLUB = [
  {
    nom: "Château de Vaux-le-Vicomte",
    region: "Île-de-France",
    offre: "Suite Le Brun · 480 € / nuit",
    type: "Offre permanente",
  },
  {
    nom: "Château de Chantilly",
    region: "Hauts-de-France",
    offre: "Appartement Aumale · 890 € / nuit",
    type: "Package exclusif",
  },
  {
    nom: "Château de Fontainebleau",
    region: "Île-de-France",
    offre: "Appartement Royal · 980 € / nuit",
    type: "Offre permanente",
  },
  {
    nom: "Château de Pierreclos",
    region: "Bourgogne",
    offre: "Suite du Donjon · 280 € / nuit",
    type: "Package exclusif",
  },
];

const NIVEAUX = [
  {
    nom: "Blue",
    dot: "#4a90d9",
    seuil: "Dès l'inscription",
    avantage: "Accès vitrines + last-minute en avant-première",
  },
  {
    nom: "Silver",
    dot: "#a8b8c8",
    seuil: "3 réservations",
    avantage: "Packages exclusifs + −5% supplémentaires",
  },
  {
    nom: "Gold",
    dot: "#c8973e",
    seuil: "7 réservations",
    avantage: "Accès illimité + surclassement prioritaire",
  },
  {
    nom: "Platinum",
    dot: "#e8d5b0",
    seuil: "15 réservations",
    avantage: "Accès sur cooptation · Conciergerie 24h/24",
  },
];

export default function ClubChatelains({ onClose, onOuvrirAuth, user, ongletInitial }) {
  const [onglet, setOnglet] = useState(ongletInitial || "presentation");

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

  return (
    <div className="club-overlay">
      {/* Header */}
      <header className="club-header">
        <div className="club-header-gauche">
          <button className="club-retour" onClick={onClose}>
            ← Retour
          </button>
          <span className="club-header-titre">Club des Châtelains</span>
        </div>
        <button
          className="club-header-cta"
          onClick={() => onOuvrirAuth("inscription")}
        >
          Rejoindre le Club ⚜
        </button>
      </header>

      {/* Hero */}
      <div className="club-hero">
        <div className="club-hero-lys">
          <svg width="100%" height="100%">
            <rect width="100%" height="100%" fill="url(#lys-pattern)" />
          </svg>
        </div>
        <div className="club-hero-contenu">
          <span className="club-hero-sur-titre">
            ⚜ Accès privilégié · Sur inscription
          </span>
          <h1 className="club-hero-titre">Club des Châtelains</h1>
          <p className="club-hero-accroche">
            L'accès aux vitrines permanentes et packages exclusifs des châteaux
            partenaires, réservé aux membres du club.
          </p>
          <div className="club-hero-actions">
            <button
              className="club-btn-or"
              onClick={() => onOuvrirAuth("inscription")}
            >
              Devenir membre gratuitement
            </button>
            <button
              className="club-btn-contour"
              onClick={() => onOuvrirAuth("connexion")}
            >
              J'ai déjà un compte
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="club-onglets">
        {[
          { id: "presentation", label: "Le concept" },
          { id: "avantages", label: "Avantages membres" },
          { id: "niveaux", label: "Niveaux & progression" },
          { id: "apercus", label: "Aperçu des offres" },
        ].map((o) => (
          <button
            key={o.id}
            className={"club-onglet " + (onglet === o.id ? "actif" : "")}
            onClick={() => setOnglet(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="club-contenu">
        {/* ── PRÉSENTATION ── */}
        {onglet === "presentation" && (
          <div className="club-section">
            <div className="club-deux-colonnes">
              <div>
                <div className="club-section-label">
                  ⚜ Deux accès, deux expériences
                </div>
                <h2 className="club-section-titre">Pourquoi créer un Club ?</h2>
                <p className="club-texte">
                  Les Dernières Clés du Château propose deux façons d'accéder
                  aux plus beaux domaines de France. L'accès public — les{" "}
                  <strong>Dernières Clés</strong> — donne accès aux
                  disponibilités last-minute de nos châteaux partenaires,
                  jusqu'à −40% sur les 15 prochains jours. C'est gratuit, sans
                  inscription, accessible à tous.
                </p>
                <p className="club-texte">
                  Le <strong>Club des Châtelains</strong> va plus loin. En
                  rejoignant le club — gratuitement — vous accédez aux vitrines
                  permanentes de chaque château, à leurs packages exclusifs
                  conçus pour les membres, et aux offres que les propriétaires
                  ne publient nulle part ailleurs.
                </p>
                <p className="club-texte">
                  Certains châteaux ne proposent leurs chambres qu'aux membres
                  du club. D'autres combinent les deux. C'est le propriétaire
                  qui choisit — et c'est ce choix qui garantit l'exclusivité de
                  ce que vous trouvez ici.
                </p>
              </div>
              <div className="club-diff-tableau">
                <div className="club-diff-header">
                  <span></span>
                  <span className="club-diff-col club-diff-col--bleu">
                    Dernières Clés
                  </span>
                  <span className="club-diff-col club-diff-col--or">
                    Club des Châtelains
                  </span>
                </div>
                {[
                  ["Accès", "Libre", "Inscription gratuite"],
                  ["Offres last-minute", "✓", "✓ + avant-première"],
                  ["Vitrines permanentes", "✕", "✓"],
                  ["Packages exclusifs", "✕", "✓"],
                  ["Tarifs membres", "✕", "✓"],
                  ["Conciergerie dédiée", "✕", "✓"],
                  ["Parrainage", "✕", "✓"],
                ].map(([label, val1, val2], i) => (
                  <div key={i} className="club-diff-ligne">
                    <span className="club-diff-label">{label}</span>
                    <span
                      className={
                        "club-diff-val " + (val1 === "✕" ? "non" : "oui")
                      }
                    >
                      {val1}
                    </span>
                    <span
                      className={
                        "club-diff-val club-diff-val--or " +
                        (val2 === "✕" ? "non" : "oui")
                      }
                    >
                      {val2}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── AVANTAGES ── */}
        {onglet === "avantages" && (
          <div className="club-section">
            <div className="club-section-label">⚜ Ce que vous obtenez</div>
            <h2 className="club-section-titre">Avantages membres</h2>
            <div className="club-avantages-grille">
              {AVANTAGES.map((a, i) => (
                <div key={i} className="club-avantage">
                  <span className="club-avantage-icone">{a.icone}</span>
                  <h3 className="club-avantage-titre">{a.titre}</h3>
                  <p className="club-avantage-desc">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NIVEAUX ── */}
        {onglet === "niveaux" && (
          <div className="club-section">
            <div className="club-section-label">⚜ Progression & fidélité</div>
            <h2 className="club-section-titre">Quatre niveaux d'accès</h2>
            <p className="club-texte" style={{ marginBottom: "2.5rem" }}>
              Plus vous réservez — ou plus vous parrainez — plus votre niveau
              progresse et plus vos avantages s'enrichissent.
            </p>
            <div className="club-niveaux">
              {NIVEAUX.map((n, i) => (
                <div key={i} className="club-niveau">
                  <div
                    className="club-niveau-dot"
                    style={{ background: n.dot }}
                  />
                  <h3 className="club-niveau-nom">{n.nom}</h3>
                  <span className="club-niveau-seuil">{n.seuil}</span>
                  <p className="club-niveau-avantage">{n.avantage}</p>
                </div>
              ))}
            </div>
            <div className="club-parrainage-bloc">
              <span className="club-section-label">⚜ Parrainage</span>
              <p className="club-texte">
                Chaque membre reçoit un code parrain personnel au format{" "}
                <strong>LDCC-XXXX</strong>. Partagez-le — chaque filleul qui
                réserve vous fait progresser vers le niveau supérieur, même sans
                réservation de votre part.
              </p>
            </div>
          </div>
        )}

        {/* ── APERÇUS ── */}
        {onglet === "apercus" && (
          <div className="club-section">
            <div className="club-section-label">⚜ Aperçu exclusif</div>
            <h2 className="club-section-titre">Ce qui vous attend</h2>
            <p className="club-texte" style={{ marginBottom: "2rem" }}>
              Voici un aperçu des offres actuellement disponibles pour les
              membres. Rejoignez le club pour y accéder.
            </p>
            <div className="club-apercus-grille">
              {CHATEAUX_CLUB.map((c, i) => (
                <div key={i} className="club-apercu-carte">
                  <div className="club-apercu-flou">
                    <div className="club-apercu-badge">{c.type}</div>
                    <div className="club-apercu-contenu">
                      <span className="club-apercu-region">{c.region}</span>
                      <span className="club-apercu-nom">{c.nom}</span>
                      <span className="club-apercu-offre">{c.offre}</span>
                    </div>
                    <div className="club-apercu-lock">
                      <span>🔒</span>
                      <span>Réservé aux membres</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="club-cta-final">
              <p className="club-cta-texte">
                L'inscription est gratuite et prend 30 secondes.
              </p>
              <button
                className="club-btn-or"
                onClick={() => onOuvrirAuth("inscription")}
              >
                Rejoindre le Club des Châtelains ⚜
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
