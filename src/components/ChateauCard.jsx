import "../styles/offres.css";

export default function ChateauCard({ chateau, onClick }) {
  const classBadge =
    {
      "J-7": "badge-j7",
      "J-10": "badge-j10",
      "J-15": "badge-j15",
    }[chateau.urgence] || "badge-j15";

  const classeBande =
    {
      "J-7": "j7",
      "J-10": "j10",
      "J-15": "j15",
    }[chateau.urgence] || "j15";

  return (
    <article className="carte-chateau" onClick={onClick}>
      <div className={`carte-urgence-bande ${classeBande}`} />

      <div className="carte-image-wrapper">
        <img
          className="carte-image"
          src={chateau.image || chateau.images?.[0]}
          alt={chateau.nom}
          loading="lazy"
        />
        <div className="carte-image-overlay" />
        <div className="carte-badges">
          <span className={`badge-urgence ${classBadge}`}>
            ◆ {chateau.urgence}
          </span>
        </div>
        <span className="carte-reduction">−{chateau.reduction}%</span>
        <span className="carte-chambres">
          {chateau.chambresRestantes} chambre
          {chateau.chambresRestantes > 1 ? "s" : ""} restante
          {chateau.chambresRestantes > 1 ? "s" : ""}
        </span>
      </div>

      <div className="carte-contenu">
        <div className="carte-meta">
          <span className="carte-region">{chateau.region}</span>
          <span className="carte-distance">📍 {chateau.distanceParis}</span>
        </div>

        <h3 className="carte-nom">{chateau.nom}</h3>
        <p className="carte-style">
          {chateau.style} · {chateau.siecle}
        </p>
        <p className="carte-accroche">{chateau.accroche}</p>

        <div className="carte-tags">
          {chateau.tags.map((tag) => (
            <span key={tag} className="carte-tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="carte-separateur" />

        <div className="carte-pied">
          <div className="carte-prix-bloc">
            <span className="carte-prix-barre">{chateau.prixBarre} €</span>
            <span className="carte-prix">{chateau.prix} €</span>
            <span className="carte-prix-nuit">/ nuit</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "0.4rem",
            }}
          >
            <div className="carte-note">
              <span className="carte-note-etoile">★</span>
              <span>
                {chateau.noteSur5} ({chateau.nbAvis})
              </span>
            </div>
            <button className="carte-cta">Découvrir</button>
          </div>
        </div>
      </div>
    </article>
  );
}
