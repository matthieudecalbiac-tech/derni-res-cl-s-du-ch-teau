import { useEffect, useState } from "react";
import { derivePrix } from "../utils/derivePrix";
import "../styles/vitrine-club.css";

export default function VitrineClub({ chateau, user, onClose }) {
  const [visible, setVisible] = useState(false);
  const [chambreActive, setChambreActive] = useState(0);
  const [reserve, setReserve] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 40);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const prixFinal = chateau.prixBarre
    ? Math.round(chateau.prixBarre * (1 - (chateau.reduction || 0) / 100))
    : derivePrix(chateau);
  const chambre = chateau.chambres?.[chambreActive];

  return (
    <div className={"vcl-overlay " + (visible ? "vcl-visible" : "")}>

      <header className="vcl-header">
        <button className="vcl-retour" onClick={onClose}>← Retour aux offres</button>
        <div className="vcl-header-centre">
          <span className="vcl-header-badge">&#x269C; Offre Club exclusif</span>
          <span className="vcl-header-nom">{chateau.nom}</span>
        </div>
        <div className="vcl-header-prix">
          {chateau.prixBarre && <span className="vcl-prix-barre">{chateau.prixBarre} €</span>}
          <span className="vcl-prix-final">{prixFinal} €</span>
          <span className="vcl-prix-nuit">/nuit</span>
        </div>
      </header>

      <div className="vcl-corps">

        {/* Hero */}
        <div className="vcl-hero">
          {chateau.videoBackground ? (
            <iframe className="vcl-video"
              src={`https://www.youtube.com/embed/${chateau.videoBackground}?autoplay=1&mute=1&loop=1&controls=0&playlist=${chateau.videoBackground}`}
              allow="autoplay; encrypted-media" title="video" />
          ) : (
            <img src={chateau.images?.[0]} alt={chateau.nom} className="vcl-hero-img" />
          )}
          <div className="vcl-hero-overlay" />
          <div className="vcl-hero-contenu">
            <div className="vcl-orn"><span className="vcl-trait"/><span className="vcl-lys">&#x269C;</span><span className="vcl-trait"/></div>
            <span className="vcl-hero-eyebrow">Offre exclusive · Club des Châtelains</span>
            <h1 className="vcl-hero-titre">{chateau.nom}</h1>
            <p className="vcl-hero-accroche">{chateau.accroche}</p>
            <div className="vcl-hero-meta">
              <span>{chateau.region} · {chateau.distanceParis}</span>
              <span>{chateau.siecle}</span>
            </div>
          </div>
        </div>

        {/* Offre promo exclusive */}
        <div className="vcl-offre-bloc">
          <div className="vcl-offre-inner">
            <div className="vcl-offre-gauche">
              <span className="vcl-offre-label">&#x269C; Package membres exclusif</span>
              <div className="vcl-offre-prix">
                {chateau.prixBarre && <span className="vcl-offre-barre">{chateau.prixBarre} €</span>}
                <span className="vcl-offre-final">{prixFinal} €</span>
                <span className="vcl-offre-nuit">/ nuit</span>
              </div>
              {chateau.reduction && (
                <span className="vcl-offre-reduction">−{chateau.reduction} % réservé aux membres</span>
              )}
              <p className="vcl-offre-texte">
                Cette offre est confidentielle — il n’est visible que par les membres du Club
                des Châtelains et ne sera jamais publié sur Booking ou Airbnb.
              </p>
            </div>
            <div className="vcl-offre-droite">
              <button className="vcl-offre-btn" onClick={() => setReserve(true)}>
                Réserver ce séjour →
              </button>
              <p className="vcl-offre-note">Confirmé sous 2h · Annulation flexible</p>
            </div>
          </div>
        </div>

        <div className="vcl-deux-col">

          {/* Gauche */}
          <div className="vcl-gauche">

            {/* Chambres */}
            {chateau.chambres?.length > 0 && (
              <section className="vcl-section vcl-section--offres">
                <h2 className="vcl-section-titre">
                  <span className="vcl-section-ico">&#x25c6;</span>
                  Offres & packages exclusifs membres
                </h2>
                <div className="vcl-chambres">
                  {chateau.chambres.map((ch, i) => (
                    <div key={i} className={"vcl-chambre " + (i === chambreActive ? "actif" : "")}
                      onClick={() => setChambreActive(i)}>
                      <div className="vcl-chambre-img">
                        <img src={ch.image} alt={ch.nom} />
                        {i === chambreActive && <div className="vcl-chambre-sel">Sélectionnée</div>}
                      </div>
                      <div className="vcl-chambre-info">
                        <div className="vcl-chambre-nom">{ch.nom}</div>
                        <div className="vcl-chambre-meta">{ch.superficie} · {ch.capacite} pers.</div>
                        <div className="vcl-chambre-desc">{ch.description}</div>
                        <div className="vcl-chambre-prix">{ch.prix} € / nuit</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Histoire */}
            <section className="vcl-section">
              <h2 className="vcl-section-titre2">L’histoire du lieu</h2>
              <p className="vcl-texte">{chateau.histoire}</p>
            </section>

            {/* Famille */}
            {chateau.proprietaires && (
              <section className="vcl-section vcl-section--famille">
                <div className="vcl-orn-centre"><span className="vcl-trait"/><span className="vcl-lys">&#x269C;</span><span className="vcl-trait"/></div>
                <h2 className="vcl-section-titre2">Les gardiens du lieu</h2>
                <div className="vcl-famille">
                  {chateau.proprietaires.portrait && (
                    <div className="vcl-famille-portrait">
                      <img src={chateau.proprietaires.portrait} alt="" />
                    </div>
                  )}
                  <div className="vcl-famille-texte">
                    <div className="vcl-famille-nom">{chateau.proprietaires.nom}</div>
                    <div className="vcl-famille-depuis">Depuis {chateau.proprietaires.depuis}</div>
                    <blockquote className="vcl-famille-citation">"{chateau.proprietaires.citation}"</blockquote>
                    <p className="vcl-texte-sm">{chateau.proprietaires.description}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Région */}
            {chateau.regionNarrative && (
              <section className="vcl-section vcl-section--region">
                <h2 className="vcl-section-titre2">{chateau.region} — le territoire</h2>
                <p className="vcl-texte">{chateau.regionNarrative}</p>
                {chateau.regionHistoire && <p className="vcl-texte" style={{marginTop:"12px"}}>{chateau.regionHistoire}</p>}
              </section>
            )}

            {/* Alentours */}
            {chateau.alentours && (
              <section className="vcl-section">
                <h2 className="vcl-section-titre2">À voir aux alentours</h2>
                <div className="vcl-alentours">
                  {chateau.alentours.map((lieu, i) => (
                    <div key={i} className="vcl-alentour">
                      <div className="vcl-alentour-header">
                        <span className="vcl-alentour-ico">{lieu.icone || "⚜"}</span>
                        <span className="vcl-alentour-nom">{lieu.nom}</span>
                        <span className="vcl-alentour-dist">{lieu.distance}</span>
                      </div>
                      {lieu.description && <p className="vcl-alentour-desc">{lieu.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Droite sticky */}
          <div className="vcl-droite">
            <div className="vcl-sticky">
              <div className="vcl-sticky-header">
                <span className="vcl-sticky-eyebrow">&#x269C; Offre Club exclusive</span>
                <div className="vcl-sticky-prix">
                  {chateau.prixBarre && <span className="vcl-sticky-barre">{chateau.prixBarre} €</span>}
                  <span className="vcl-sticky-final">{prixFinal} €</span>
                  <span className="vcl-sticky-nuit">/ nuit</span>
                </div>
                {chateau.reduction && <span className="vcl-sticky-reduction">−{chateau.reduction} % membres</span>}
              </div>
              {chambre && (
                <div className="vcl-sticky-chambre">
                  <span className="vcl-sticky-ch-label">Chambre sélectionnée</span>
                  <span className="vcl-sticky-ch-nom">{chambre.nom}</span>
                </div>
              )}
              <button className="vcl-sticky-btn" onClick={() => setReserve(true)}>
                Réserver →
              </button>
              <p className="vcl-sticky-note">Confirmé sous 2h · Annulation flexible</p>

              {chateau.coordonnees && (
                <div className="vcl-carte">
                  <iframe title="carte" className="vcl-carte-iframe"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${chateau.coordonnees.lng-0.15},${chateau.coordonnees.lat-0.1},${chateau.coordonnees.lng+0.15},${chateau.coordonnees.lat+0.1}&layer=mapnik&marker=${chateau.coordonnees.lat},${chateau.coordonnees.lng}`}
                  />
                  <p className="vcl-carte-leg">{chateau.departement}</p>
                </div>
              )}

              {chateau.activites && (
                <div className="vcl-activites">
                  <span className="vcl-activites-titre">Sur place</span>
                  {chateau.activites.slice(0,5).map((a,i) => (
                    <div key={i} className="vcl-activite">✦ {a}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {reserve && (
        <div className="vcl-modal" onClick={() => setReserve(false)}>
          <div className="vcl-modal-inner" onClick={e => e.stopPropagation()}>
            <span className="vcl-modal-lys">&#x269C;</span>
            <h3>Demande de réservation</h3>
            <p>{chateau.nom}</p>
            {chambre && <p>{chambre.nom} · {prixFinal} € / nuit</p>}
            <p className="vcl-modal-note">Nous vous mettons en relation avec le château sous 2 heures.</p>
            <button className="vcl-modal-btn" onClick={() => setReserve(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
