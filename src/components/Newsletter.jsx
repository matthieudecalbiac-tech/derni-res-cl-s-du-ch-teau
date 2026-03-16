import { useState } from "react";
import "../styles/editorial.css";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [inscrit, setInscrit] = useState(false);

  const handleSubmit = () => {
    if (email.includes("@")) {
      setInscrit(true);
    }
  };

  return (
    <section className="newsletter-section" id="newsletter">
      <div className="newsletter-inner">
        <span className="newsletter-ornement">🗝</span>
        <span className="newsletter-sur-titre">Le club · Rejoindre</span>

        <h2 className="newsletter-titre">
          Recevez les clés
          <br />
          avant tout le monde
        </h2>

        <p className="newsletter-sous-titre">
          Chaque semaine, une sélection confidentielle de chambres d'exception
          dans les plus beaux châteaux à moins de 3h de Paris.
        </p>

        <p className="newsletter-detail">
          Réservé aux membres · Gratuit · Sans engagement
        </p>

        <div className="newsletter-avantages">
          <span className="newsletter-avantage">
            Offres J-7 en avant-première
          </span>
          <span className="newsletter-avantage">
            Sélection éditoriale exclusive
          </span>
          <span className="newsletter-avantage">
            Tarifs membres privilégiés
          </span>
        </div>

        {inscrit ? (
          <div
            style={{
              padding: "2rem",
              border: "1px solid rgba(184, 150, 90, 0.3)",
              color: "var(--or-pale)",
              fontFamily: "var(--font-editorial)",
              fontSize: "1.2rem",
              fontStyle: "italic",
            }}
          >
            Bienvenue dans le club. Vos premières clés arrivent bientôt. 🗝
          </div>
        ) : (
          <>
            <div className="newsletter-form">
              <input
                className="newsletter-input"
                type="email"
                placeholder="Votre adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <button className="newsletter-btn" onClick={handleSubmit}>
                Rejoindre le club
              </button>
            </div>
            <p className="newsletter-promesse">
              Aucun spam · Désabonnement en un clic · Vos données restent
              privées
            </p>
          </>
        )}
      </div>
    </section>
  );
}
