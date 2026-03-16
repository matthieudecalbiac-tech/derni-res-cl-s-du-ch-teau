import { useEffect } from "react";
import "../styles/modal.css";

export default function ChateauModal({ chateau, onClose }) {
  const classBadge =
    {
      "J-7": "badge-j7",
      "J-10": "badge-j10",
      "J-15": "badge-j15",
    }[chateau.urgence] || "badge-j15";

  // Bloquer le scroll du body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fermer sur Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        {/* Bouton fermer */}
        <div className="modal-fermer">
          <button className="modal-fermer-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Galerie photos */}
        <div className="modal-galerie">
          <div className="modal-galerie-principale">
            <img src={chateau.images[0]} alt={chateau.nom} />
            <div className="modal-galerie-overlay" />
            <div className="modal-badge-urgence">
              <span className={`badge-urgence ${classBadge}`}>
                ◆ {chateau.urgence}
              </span>
            </div>
            <span className="modal-reduction">−{chateau.reduction}%</span>
          </div>
          <div className="modal-galerie-secondaires">
            {chateau.images.slice(1, 3).map((img, i) => (
              <img key={i} src={img} alt={`${chateau.nom} ${i + 2}`} />
            ))}
            {chateau.images.length < 2 && (
              <div style={{ flex: 1, background: "var(--creme-chaud)" }} />
            )}
            {chateau.images.length < 3 && (
              <div style={{ flex: 1, background: "var(--creme)" }} />
            )}
          </div>
        </div>

        {/* Corps */}
        <div className="modal-corps">
          {/* Colonne gauche */}
          <div className="modal-gauche">
            <div className="modal-meta">
              <span className="modal-region">{chateau.region}</span>
              <span className="modal-distance">📍 {chateau.distanceParis}</span>
              <div className="modal-note">
                <span className="modal-note-etoile">★</span>
                <span>
                  {chateau.noteSur5} · {chateau.nbAvis} avis
                </span>
              </div>
            </div>

            <h2 className="modal-nom">{chateau.nom}</h2>
            <p className="modal-style">
              {chateau.style} · {chateau.siecle}
            </p>

            <div className="modal-separateur" />

            <p className="modal-accroche">{chateau.accroche}</p>
            <p className="modal-description">{chateau.description}</p>

            {/* Expériences */}
            <p className="modal-experiences-titre">
              Expériences incluses & à découvrir
            </p>
            <div className="modal-experiences">
              {chateau.experiences.map((exp, i) => (
                <div key={i} className="modal-experience-item">
                  {exp}
                </div>
              ))}
            </div>

            {/* Équipements */}
            <div className="modal-equipements">
              <span
                className={`modal-equipement ${
                  chateau.petitDejeuner ? "inclus" : ""
                }`}
              >
                {chateau.petitDejeuner ? "✓" : "✕"} Petit-déjeuner
              </span>
              <span
                className={`modal-equipement ${
                  chateau.parking ? "inclus" : ""
                }`}
              >
                {chateau.parking ? "✓" : "✕"} Parking
              </span>
              <span
                className={`modal-equipement ${chateau.wifi ? "inclus" : ""}`}
              >
                {chateau.wifi ? "✓" : "✕"} Wifi
              </span>
              <span
                className={`modal-equipement ${
                  chateau.animaux ? "inclus" : ""
                }`}
              >
                {chateau.animaux ? "✓" : "✕"} Animaux acceptés
              </span>
            </div>
          </div>

          {/* Colonne droite — Réservation */}
          <div className="modal-droite">
            <div className="modal-reservation">
              <p className="modal-reservation-titre">Réserver ce séjour</p>

              {/* Alerte urgence */}
              <div className="modal-urgence-alerte">
                <span
                  style={{ color: "var(--rouge-velours)", fontSize: "1rem" }}
                >
                  ⏳
                </span>
                <p className="modal-urgence-alerte-texte">
                  Plus que {chateau.chambresRestantes} chambre
                  {chateau.chambresRestantes > 1 ? "s" : ""} disponible
                  {chateau.chambresRestantes > 1 ? "s" : ""} · Offre valable{" "}
                  {chateau.urgence}
                </p>
              </div>

              {/* Prix */}
              <div className="modal-prix-bloc">
                <span className="modal-prix-barre">
                  {chateau.prixBarre} € / nuit
                </span>
                <span className="modal-prix">{chateau.prix} €</span>
                <span className="modal-prix-nuit">
                  par nuit · taxes incluses
                </span>
                <span className="modal-economie">
                  Vous économisez {chateau.prixBarre - chateau.prix} €
                </span>
              </div>

              {/* Champs */}
              <div className="modal-champs">
                <div className="modal-champ">
                  <label>Arrivée</label>
                  <input type="date" />
                </div>
                <div className="modal-champ">
                  <label>Départ</label>
                  <input type="date" />
                </div>
                <div className="modal-champ">
                  <label>Voyageurs</label>
                  <select>
                    <option>1 voyageur</option>
                    <option>2 voyageurs</option>
                    <option>3 voyageurs</option>
                    <option>4 voyageurs</option>
                  </select>
                </div>
              </div>

              {/* CTAs */}
              <button className="modal-cta-reserver">
                Réserver maintenant
              </button>
              <button className="modal-cta-contact">
                Contacter le château
              </button>

              {/* Garanties */}
              <div className="modal-garanties">
                <span className="modal-garantie">
                  Annulation gratuite sous 48h
                </span>
                <span className="modal-garantie">Confirmation immédiate</span>
                <span className="modal-garantie">Paiement sécurisé</span>
                <span className="modal-garantie">
                  Sélection vérifiée par nos soins
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
