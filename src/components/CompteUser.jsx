import { useState } from "react";
import "../styles/compte.css";

const NIVEAUX = [
  {
    nom: "Blue",
    dot: "blue",
    reservations: 0,
    avantages: [
      "Accès aux offres J-15 et J-10",
      "Newsletter exclusive membres",
      "Code parrain personnel",
    ],
  },
  {
    nom: "Silver",
    dot: "silver",
    reservations: 3,
    avantages: [
      "Accès prioritaire aux offres J-7",
      "Réduction 5% supplémentaire",
      "Conciergerie dédiée",
    ],
  },
  {
    nom: "Gold",
    dot: "gold",
    reservations: 7,
    avantages: [
      "Accès en avant-première",
      "Réduction 10% supplémentaire",
      "Surclassement si disponible",
      "Invitation événements privés",
    ],
  },
  {
    nom: "Platinum",
    dot: "platinum",
    reservations: 15,
    avantages: [
      "Accès illimité toutes offres",
      "Réduction 15% supplémentaire",
      "Conciergerie 24h/24",
      "Accès sur cooptation uniquement",
    ],
  },
];

function getNiveau(reservations) {
  let niveau = NIVEAUX[0];
  for (const n of NIVEAUX) {
    if (reservations >= n.reservations) niveau = n;
  }
  return niveau;
}

function getProchainNiveau(reservations) {
  for (const n of NIVEAUX) {
    if (reservations < n.reservations) return n;
  }
  return null;
}

function getProgression(reservations) {
  const niveau = getNiveau(reservations);
  const prochain = getProchainNiveau(reservations);
  if (!prochain) return 100;
  const base = niveau.reservations;
  const cible = prochain.reservations;
  return Math.round(((reservations - base) / (cible - base)) * 100);
}

export default function CompteUser({ user, onClose, onDeconnexion }) {
  const [copiee, setCopiee] = useState(false);

  const niveau = getNiveau(user.reservations);
  const prochain = getProchainNiveau(user.reservations);
  const progression = getProgression(user.reservations);

  const copierCode = () => {
    navigator.clipboard?.writeText(user.numero);
    setCopiee(true);
    setTimeout(() => setCopiee(false), 2000);
  };

  return (
    <div className="compte-overlay">
      {/* Header */}
      <header className="compte-header">
        <div className="compte-header-gauche">
          <button className="compte-retour" onClick={onClose}>
            ← Retour
          </button>
          <span className="compte-header-titre">Mon espace membre</span>
        </div>
        <button className="compte-deconnexion" onClick={onDeconnexion}>
          Déconnexion
        </button>
      </header>

      {/* Hero membre */}
      <div className="compte-hero">
        <div className="compte-hero-inner">
          <div className="compte-hero-gauche">
            <span className="compte-hero-numero">{user.numero}</span>
            <div className="compte-hero-nom">
              {user.prenom} {user.nom}
            </div>
            <div className="compte-hero-email">{user.email}</div>
          </div>
          <div className="compte-hero-droite">
            <div className="compte-badge-niveau">
              <div className={`compte-badge-dot ${niveau.dot.toLowerCase()}`} />
              <span className="compte-badge-nom">{niveau.nom}</span>
              <span className="compte-badge-membre">
                Membre depuis {user.dateInscription}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progression */}
      <div className="compte-progression">
        <span className="compte-progression-titre">Votre progression</span>
        <div className="compte-progression-niveaux">
          {NIVEAUX.map((n) => (
            <div
              key={n.nom}
              className={`compte-progression-niveau ${
                user.reservations >= n.reservations ? "actif" : ""
              }`}
            >
              <div className={`compte-prog-dot ${n.dot}`} />
              <span className="compte-prog-nom">{n.nom}</span>
              <span className="compte-prog-seuil">
                {n.reservations === 0
                  ? "Inscription"
                  : `${n.reservations} rés.`}
              </span>
            </div>
          ))}
        </div>
        <div className="compte-barre-progression">
          <div
            className="compte-barre-remplie"
            style={{ width: `${progression}%` }}
          />
        </div>
        <p className="compte-progression-texte">
          {prochain
            ? `${user.reservations} réservation${
                user.reservations > 1 ? "s" : ""
              } · encore ${
                prochain.reservations - user.reservations
              } pour atteindre le niveau ${prochain.nom}`
            : `Félicitations — vous avez atteint le niveau maximum ✦`}
        </p>
      </div>

      {/* Dashboard */}
      <div className="compte-corps">
        {/* Infos membre */}
        <div className="compte-carte">
          <span className="compte-carte-titre">Informations du compte</span>
          <div className="compte-infos-liste">
            <div className="compte-info-item">
              <span className="compte-info-label">Numéro de membre</span>
              <span className="compte-info-valeur or">{user.numero}</span>
            </div>
            <div className="compte-info-item">
              <span className="compte-info-label">Statut</span>
              <span className="compte-info-valeur or">Membre {niveau.nom}</span>
            </div>
            <div className="compte-info-item">
              <span className="compte-info-label">Réservations</span>
              <span className="compte-info-valeur">{user.reservations}</span>
            </div>
            <div className="compte-info-item">
              <span className="compte-info-label">Email</span>
              <span className="compte-info-valeur">{user.email}</span>
            </div>
            <div className="compte-info-item">
              <span className="compte-info-label">Membre depuis</span>
              <span className="compte-info-valeur">{user.dateInscription}</span>
            </div>
            {user.parrain && (
              <div className="compte-info-item">
                <span className="compte-info-label">Parrainé par</span>
                <span className="compte-info-valeur or">{user.parrain}</span>
              </div>
            )}
          </div>
        </div>

        {/* Parrainage */}
        <div className="compte-carte compte-parrainage">
          <span className="compte-carte-titre">Votre code parrain</span>
          <div className="compte-parrainage-code" onClick={copierCode}>
            {user.numero}
          </div>
          <p className="compte-parrainage-desc">
            Partagez votre code à vos proches. Chaque filleul qui réserve vous
            fait progresser vers le niveau supérieur.
          </p>
          {copiee && (
            <p className="compte-parrainage-copie">
              ✓ Code copié dans le presse-papier
            </p>
          )}
        </div>

        {/* Avantages niveau actuel */}
        <div className="compte-carte">
          <span className="compte-carte-titre">Vos avantages {niveau.nom}</span>
          <div className="compte-avantages-liste">
            {niveau.avantages.map((a, i) => (
              <div key={i} className="compte-avantage">
                {a}
              </div>
            ))}
          </div>
        </div>

        {/* Réservations */}
        <div className="compte-carte">
          <span className="compte-carte-titre">Mes réservations</span>
          {user.reservations === 0 ? (
            <div className="compte-reservations-vide">
              Vous n'avez pas encore effectué de réservation.
              <br />
              Découvrez nos châteaux disponibles ce week-end.
              <button className="compte-reserver-btn" onClick={onClose}>
                Voir les offres
              </button>
            </div>
          ) : (
            <div className="compte-reservations-vide">
              {user.reservations} réservation{user.reservations > 1 ? "s" : ""}{" "}
              effectuée{user.reservations > 1 ? "s" : ""}.
              <br />
              L'historique détaillé sera disponible prochainement.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
