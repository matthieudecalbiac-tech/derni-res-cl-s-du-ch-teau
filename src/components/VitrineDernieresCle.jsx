import { useEffect, useState } from "react";
import "../styles/vitrine-derniere-cle.css";

export default function VitrineDernieresCle({ chateau, onClose }) {
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
    : chateau.chambres?.[0]?.prix;

  const classBadge = { "J-7": "vdc-j7", "J-10": "vdc-j10", "J-15": "vdc-j15" }[chateau.urgence] || "vdc-j15";
  const chambre = chateau.chambres?.[chambreActive];

  return (
    <div className={"vdc-overlay " + (visible ? "vdc-visible" : "")}>

      {/* ── HEADER ── */}
      <header className="vdc-header">
        <button className="vdc-retour" onClick={onClose}>
          ← Retour
        </button>
        <div className="vdc-header-centre">
          <span className="vdc-header-eyebrow">Les Dernières Clés de</span>
          <span className="vdc-header-nom">{chateau.nom}</span>
        </div>
        <div className="vdc-header-urgence">
          <span className={"vdc-urgence-badge " + classBadge}>{chateau.urgence}</span>
          <span className="vdc-header-prix">{prixFinal} €<span className="vdc-header-nuit">/nuit</span></span>
        </div>
      </header>

      <div className="vdc-corps">

        {/* ── HERO IMAGE + TITRE ── */}
        <div className="vdc-hero">
          {chateau.videoBackground ? (
            <iframe
              className="vdc-hero-video"
              src={`https://www.youtube.com/embed/${chateau.videoBackground}?autoplay=1&mute=1&loop=1&controls=0&playlist=${chateau.videoBackground}`}
              allow="autoplay; encrypted-media"
              title="video"
            />
          ) : (
            <img src={chateau.images?.[0]} alt={chateau.nom} className="vdc-hero-img" />
          )}
          <div className="vdc-hero-overlay" />
          <div className="vdc-hero-contenu">
            <div className="vdc-hero-orn">
              <span className="vdc-hero-trait" />
              <span className="vdc-hero-lys">&#x269C;</span>
              <span className="vdc-hero-trait" />
            </div>
            <h1 className="vdc-hero-titre">
              <span className="vdc-hero-eyebrow">Les Dernières Clés de</span>
              {chateau.nom}
            </h1>
            <p className="vdc-hero-accroche">{chateau.accroche}</p>
            <div className="vdc-hero-meta">
              <span className="vdc-hero-region">&#x269C; {chateau.region} · {chateau.distanceParis}</span>
              <span className="vdc-hero-siecle">{chateau.siecle}</span>
            </div>
          </div>
        </div>

        {/* ── ALERTE LAST-MINUTE ── */}
        <div className={"vdc-alerte " + classBadge}>
          <div className="vdc-alerte-inner">
            <span className="vdc-alerte-ico">&#x25c6;</span>
            <div>
              <span className="vdc-alerte-titre">Opportunité {chateau.urgence}</span>
              <span className="vdc-alerte-texte">
                Ces chambres sont disponibles en fenêtre courte — un créneau rare
                libéré par le château. Ni braderie, ni promotion permanente.
                {chateau.reduction && ` Réduction exceptionnelle : −${chateau.reduction} %.`}
              </span>
            </div>
            <div className="vdc-alerte-prix">
              {chateau.prixBarre && <span className="vdc-alerte-barre">{chateau.prixBarre} €</span>}
              <span className="vdc-alerte-final">{prixFinal} €</span>
              <span className="vdc-alerte-nuit">/ nuit</span>
            </div>
          </div>
        </div>

        <div className="vdc-deux-colonnes">

          {/* ── COLONNE GAUCHE ── */}
          <div className="vdc-gauche">

            {/* Chambres last-minute */}
            {chateau.chambres && chateau.chambres.length > 0 && (
              <section className="vdc-section vdc-section--chambres">
                <div className="vdc-section-header">
                  <span className="vdc-section-ico">&#x25c6;</span>
                  <h2 className="vdc-section-titre">Chambres disponibles</h2>
                  <span className="vdc-section-nb">{chateau.chambres.length} chambre{chateau.chambres.length > 1 ? "s" : ""}</span>
                </div>
                <div className="vdc-chambres-liste">
                  {chateau.chambres.map((ch, i) => (
                    <div
                      key={i}
                      className={"vdc-chambre-card " + (i === chambreActive ? "actif" : "")}
                      onClick={() => setChambreActive(i)}
                    >
                      <div className="vdc-chambre-card-img">
                        <img src={ch.image} alt={ch.nom} />
                        {i === chambreActive && <div className="vdc-chambre-card-selected">Sélectionnée</div>}
                      </div>
                      <div className="vdc-chambre-card-info">
                        <div className="vdc-chambre-card-nom">{ch.nom}</div>
                        <div className="vdc-chambre-card-meta">
                          {ch.superficie} · {ch.capacite} pers. · {ch.lits || "1 lit"}
                        </div>
                        <div className="vdc-chambre-card-desc">{ch.description}</div>
                        <div className="vdc-chambre-card-equip">
                          {ch.equipements?.slice(0,4).map((eq, j) => (
                            <span key={j} className="vdc-chambre-equip">✦ {eq}</span>
                          ))}
                        </div>
                        <div className="vdc-chambre-card-prix">
                          <span className="vdc-chambre-prix-final">{ch.prix} €</span>
                          <span className="vdc-chambre-prix-nuit">/ nuit</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="vdc-reserver-btn" onClick={() => setReserve(true)}>
                  <span>Réserver {chambre?.nom || "cette chambre"}</span>
                  <span className="vdc-reserver-fleche">→</span>
                </button>
                <p className="vdc-reserver-note">Confirmation sous 2h · Annulation flexible</p>
              </section>
            )}

            {/* Photos galerie */}
            {chateau.images?.length > 1 && !chateau.videoBackground && (
              <section className="vdc-section">
                <h2 className="vdc-section-titre2">Le domaine en images</h2>
                <div className="vdc-galerie-grid">
                  {chateau.images.slice(1, 5).map((img, i) => (
                    <div key={i} className="vdc-galerie-item">
                      <img src={img} alt={chateau.nom} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Histoire */}
            <section className="vdc-section">
              <h2 className="vdc-section-titre2">L’histoire du lieu</h2>
              <p className="vdc-texte">{chateau.histoire}</p>
            </section>

            {/* Famille */}
            {chateau.proprietaires && (
              <section className="vdc-section vdc-section--famille">
                <div className="vdc-famille-header">
                  <div className="vdc-orn"><span className="vdc-orn-trait"/><span className="vdc-orn-lys">&#x269C;</span><span className="vdc-orn-trait"/></div>
                  <h2 className="vdc-section-titre2">Les gardiens du lieu</h2>
                </div>
                <div className="vdc-famille">
                  {chateau.proprietaires.portrait && (
                    <div className="vdc-famille-portrait">
                      <img src={chateau.proprietaires.portrait} alt={chateau.proprietaires.nom} />
                    </div>
                  )}
                  <div className="vdc-famille-texte">
                    <div className="vdc-famille-nom">{chateau.proprietaires.nom}</div>
                    <div className="vdc-famille-depuis">Propriétaires depuis {chateau.proprietaires.depuis}</div>
                    <blockquote className="vdc-famille-citation">"{chateau.proprietaires.citation}"</blockquote>
                    <p className="vdc-texte-sm">{chateau.proprietaires.description}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Région */}
            {chateau.regionNarrative && (
              <section className="vdc-section vdc-section--region">
                <h2 className="vdc-section-titre2">{chateau.region} — le territoire</h2>
                <p className="vdc-texte">{chateau.regionNarrative}</p>
                {chateau.regionHistoire && <p className="vdc-texte" style={{marginTop:"14px"}}>{chateau.regionHistoire}</p>}
              </section>
            )}

            {/* Alentours */}
            {chateau.alentours && (
              <section className="vdc-section">
                <h2 className="vdc-section-titre2">À voir aux alentours</h2>
                <div className="vdc-alentours">
                  {chateau.alentours.map((lieu, i) => (
                    <div key={i} className="vdc-alentour">
                      <div className="vdc-alentour-header">
                        <span className="vdc-alentour-ico">{lieu.icone || "⚜"}</span>
                        <span className="vdc-alentour-nom">{lieu.nom}</span>
                        <span className="vdc-alentour-dist">{lieu.distance}</span>
                      </div>
                      <p className="vdc-alentour-desc">{lieu.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* ── COLONNE DROITE sticky ── */}
          <div className="vdc-droite">

            {/* Bloc réservation sticky */}
            <div className="vdc-resa-sticky">
              <div className="vdc-resa-header">
                <span className="vdc-resa-eyebrow">Offre last-minute</span>
                <div className="vdc-resa-prix-bloc">
                  {chateau.prixBarre && <span className="vdc-resa-barre">{chateau.prixBarre} €</span>}
                  <span className="vdc-resa-final">{prixFinal} €</span>
                  <span className="vdc-resa-nuit">/ nuit</span>
                </div>
                {chateau.reduction && (
                  <span className="vdc-resa-reduction">−{chateau.reduction} % cette semaine</span>
                )}
              </div>

              {chambre && (
                <div className="vdc-resa-chambre-sel">
                  <span className="vdc-resa-chambre-label">Chambre sélectionnée</span>
                  <span className="vdc-resa-chambre-nom">{chambre.nom}</span>
                  <span className="vdc-resa-chambre-meta">{chambre.superficie} · {chambre.capacite} pers.</span>
                </div>
              )}

              <button className="vdc-resa-btn" onClick={() => setReserve(true)}>
                Réserver ce séjour →
              </button>
              <p className="vdc-resa-note">Confirmation sous 2h · Annulation flexible</p>

              {/* Carte */}
              {chateau.coordonnees && (
                <div className="vdc-carte">
                  <iframe
                    title="carte"
                    className="vdc-carte-iframe"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${chateau.coordonnees.lng-0.15},${chateau.coordonnees.lat-0.1},${chateau.coordonnees.lng+0.15},${chateau.coordonnees.lat+0.1}&layer=mapnik&marker=${chateau.coordonnees.lat},${chateau.coordonnees.lng}`}
                  />
                  <p className="vdc-carte-legende">{chateau.nom} · {chateau.departement}</p>
                </div>
              )}

              {/* Activités */}
              {chateau.activites && (
                <div className="vdc-activites">
                  <span className="vdc-activites-titre">Sur place</span>
                  {chateau.activites.slice(0, 5).map((a, i) => (
                    <div key={i} className="vdc-activite">✦ {a}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal réservation */}
      {reserve && (
        <div className="vdc-modal" onClick={() => setReserve(false)}>
          <div className="vdc-modal-inner" onClick={e => e.stopPropagation()}>
            <h3>Demande de réservation</h3>
            <p>{chateau.nom}</p>
            {chambre && <p>{chambre.nom} · {prixFinal} € / nuit</p>}
            <p className="vdc-modal-note">Nous vous mettons en relation avec {chateau.proprietaires?.nom || "le château"} sous 2 heures.</p>
            <button className="vdc-modal-btn" onClick={() => setReserve(false)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
