import { useEffect, useState } from "react";
import "../styles/vitrine-chateau.css";

export default function VitrineChateau({ chateau, onClose }) {
  const [visible, setVisible] = useState(false);
  const [photoActive, setPhotoActive] = useState(0);
  const [reserve, setReserve] = useState(false);
  const [chambreIdx, setChambreIdx] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 40);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const chambre = chateau.chambres?.[chambreIdx];
  const prixFinal = chateau.prixBarre
    ? Math.round(chateau.prixBarre * (1 - (chateau.reduction || 0) / 100))
    : chambre?.prix;

  return (
    <div className={"vc-overlay " + (visible ? "vc-visible" : "vc-hidden")}>

      {/* ── HEADER ── */}
      <header className="vc-header">
        <button className="vc-retour" onClick={onClose}>
          <span className="vc-retour-ico">←</span> Retour
        </button>
        <div className="vc-header-centre">
          <span className="vc-header-lys">⚜</span>
          <span className="vc-header-nom">{chateau.nom}</span>
          <span className="vc-header-region">{chateau.region} · {chateau.distanceParis}</span>
        </div>
        <button className="vc-header-cta" onClick={() => setReserve(true)}>
          Réserver · {prixFinal} €/nuit
        </button>
      </header>

      <div className="vc-corps">

        {/* ── COLONNE GAUCHE ── */}
        <div className="vc-gauche">

          {/* Galerie immersive */}
          <div className="vc-galerie">
            <div className="vc-galerie-principale">
              {chateau.videoBackground ? (
                <iframe
                  src={`https://www.youtube.com/embed/${chateau.videoBackground}?autoplay=1&mute=1&loop=1&controls=0&playlist=${chateau.videoBackground}&showinfo=0&rel=0`}
                  className="vc-video"
                  allow="autoplay; encrypted-media"
                  title="video"
                />
              ) : (
                <img
                  src={chateau.images?.[photoActive]}
                  alt={chateau.nom}
                  className="vc-galerie-img-principale"
                />
              )}
              <div className="vc-galerie-overlay" />
              <div className="vc-galerie-badge">
                <span className="vc-siecle">{chateau.siecle}</span>
                {chateau.urgence && (
                  <span className={"vc-urgence vc-urgence--" + (chateau.urgence === "J-7" ? "j7" : chateau.urgence === "J-10" ? "j10" : "j15")}>
                    {chateau.urgence}
                  </span>
                )}
              </div>
            </div>
            {chateau.images?.length > 1 && !chateau.videoBackground && (
              <div className="vc-galerie-miniatures">
                {chateau.images.map((img, i) => (
                  <button key={i} className={"vc-mini " + (i === photoActive ? "actif" : "")} onClick={() => setPhotoActive(i)}>
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Accroche éditoriale */}
          <div className="vc-accroche-bloc">
            <div className="vc-orn">
              <span className="vc-orn-trait" /><span className="vc-orn-lys">⚜</span><span className="vc-orn-trait" />
            </div>
            <p className="vc-accroche">{chateau.accroche}</p>
          </div>

          {/* Histoire */}
          <section className="vc-section">
            <h2 className="vc-section-titre">Histoire du lieu</h2>
            <p className="vc-texte">{chateau.histoire}</p>
          </section>

          {/* Famille propriétaire */}
          {chateau.proprietaires && (
            <section className="vc-section vc-section--famille">
              <div className="vc-famille-entete">
                <div className="vc-orn">
                  <span className="vc-orn-trait" /><span className="vc-orn-lys">⚜</span><span className="vc-orn-trait" />
                </div>
                <h2 className="vc-section-titre">Les gardiens du lieu</h2>
                <p className="vc-section-sous">La famille qui transmet</p>
              </div>
              <div className="vc-famille">
                {chateau.proprietaires.portrait && (
                  <div className="vc-famille-portrait">
                    <img src={chateau.proprietaires.portrait} alt={chateau.proprietaires.nom} className="vc-portrait-img" />
                    <div className="vc-portrait-cadre" />
                  </div>
                )}
                <div className="vc-famille-texte">
                  <div className="vc-famille-nom">{chateau.proprietaires.nom}</div>
                  <div className="vc-famille-depuis">Propriétaires depuis {chateau.proprietaires.depuis}</div>
                  <blockquote className="vc-famille-citation">
                    <span className="vc-guillemet">"</span>
                    {chateau.proprietaires.citation}
                    <span className="vc-guillemet">"</span>
                  </blockquote>
                  <p className="vc-famille-desc">{chateau.proprietaires.description}</p>
                </div>
              </div>
            </section>
          )}

          {/* Timeline */}
          {chateau.timeline && (
            <section className="vc-section">
              <h2 className="vc-section-titre">Chronologie</h2>
              <div className="vc-timeline">
                {chateau.timeline.map((item, i) => (
                  <div key={i} className="vc-timeline-item">
                    <div className="vc-timeline-annee">{item.annee}</div>
                    <div className="vc-timeline-connector">
                      <div className="vc-timeline-point" />
                      {i < chateau.timeline.length - 1 && <div className="vc-timeline-ligne" />}
                    </div>
                    <div className="vc-timeline-texte">{item.evenement}</div>
                  </div>
                ))}
              </div>
            </section>
          )}



          {/* Carte */}
          {chateau.coordonnees && (
            <section className="vc-section">
              <h2 className="vc-section-titre">Situation</h2>
              <div className="vc-carte">
                <iframe
                  title="carte"
                  className="vc-carte-iframe"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${chateau.coordonnees.lng - 0.15},${chateau.coordonnees.lat - 0.1},${chateau.coordonnees.lng + 0.15},${chateau.coordonnees.lat + 0.1}&layer=mapnik&marker=${chateau.coordonnees.lat},${chateau.coordonnees.lng}`}
                />
              </div>
              <p className="vc-carte-legende">{chateau.nom} · {chateau.departement} · {chateau.distanceParis}</p>
            </section>
          )}

          {/* Région narrative */}
          {chateau.regionHistoire && (
            <section className="vc-section vc-section--region-histoire">
              <div className="vc-region-entete">
                <div className="vc-orn"><span className="vc-orn-trait" /><span className="vc-orn-lys">&#x25c6;</span><span className="vc-orn-trait" /></div>
                <h2 className="vc-section-titre">{chateau.region} — {chateau.departement}</h2>
              </div>
              <p className="vc-texte">{chateau.regionNarrative}</p>
              <p className="vc-texte" style={{marginTop: "16px"}}>{chateau.regionHistoire}</p>
            </section>
          )}

          {/* Alentours enrichis */}
          {chateau.alentours && (
            <section className="vc-section">
              <div className="vc-orn" style={{marginBottom: "20px"}}>
                <span className="vc-orn-trait" /><span className="vc-orn-lys">&#x269C;</span><span className="vc-orn-trait" />
              </div>
              <h2 className="vc-section-titre">À voir & à faire aux alentours</h2>
              <p className="vc-section-intro">
                Le {chateau.departement} est l’un des départements les plus riches de France en patrimoine et en gastronomie.
                Depuis les Briottières, tout s’atteint facilement.
              </p>
              <div className="vc-alentours-grille">
                {chateau.alentours.map((lieu, i) => (
                  <div key={i} className={"vc-alentour-card vc-alentour-card--" + (lieu.type || "patrimoine")}>
                    <div className="vc-alentour-card-header">
                      <span className="vc-alentour-card-ico">{lieu.icone || "⚜"}</span>
                      <div>
                        <div className="vc-alentour-card-nom">{lieu.nom}</div>
                        <div className="vc-alentour-card-distance">{lieu.distance} · {lieu.type}</div>
                      </div>
                    </div>
                    <p className="vc-alentour-card-desc">{lieu.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Activités */}
          {chateau.activites && (
            <section className="vc-section">
              <h2 className="vc-section-titre">Sur place</h2>
              <div className="vc-activites">
                {chateau.activites.map((a, i) => (
                  <div key={i} className="vc-activite">
                    <span className="vc-activite-ico">✦</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* ── COLONNE DROITE sticky ── */}
        <div className="vc-droite">

          {/* Bloc réservation */}
          <div className="vc-reservation">
            <div className="vc-resa-entete">
              <span className="vc-resa-surtitre">Séjour au château</span>
              <div className="vc-resa-prix">
                {chateau.prixBarre && <span className="vc-resa-prix-barre">{chateau.prixBarre} €</span>}
                <span className="vc-resa-prix-final">{prixFinal} €</span>
                <span className="vc-resa-prix-nuit">/ nuit</span>
              </div>
              {chateau.reduction && (
                <span className="vc-resa-reduction">−{chateau.reduction} % cette semaine</span>
              )}
            </div>

            {/* Sélecteur chambres */}
            {chateau.chambres && chateau.chambres.length > 0 && (
              <div className="vc-chambres">
                <div className="vc-chambres-titre">Choisissez votre chambre</div>
                {chateau.chambres.map((ch, i) => (
                  <button
                    key={i}
                    className={"vc-chambre " + (i === chambreIdx ? "actif" : "")}
                    onClick={() => setChambreIdx(i)}
                  >
                    <div className="vc-chambre-img-wrap">
                      <img src={ch.image} alt={ch.nom} className="vc-chambre-img" />
                    </div>
                    <div className="vc-chambre-info">
                      <div className="vc-chambre-nom">{ch.nom}</div>
                      <div className="vc-chambre-meta">{ch.superficie} · {ch.capacite} pers.</div>
                      <div className="vc-chambre-prix">{ch.prix} € / nuit</div>
                    </div>
                  </button>
                ))}

                {chambre && (
                  <div className="vc-chambre-detail">
                    <p className="vc-chambre-desc">{chambre.description}</p>
                    <div className="vc-chambre-equipements">
                      {chambre.equipements?.map((eq, i) => (
                        <span key={i} className="vc-equip">✦ {eq}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button className="vc-resa-btn" onClick={() => setReserve(true)}>
              <span>Réserver ce séjour</span>
              <span className="vc-resa-btn-arrow">→</span>
            </button>
            <p className="vc-resa-note">Confirmation sous 2h · Annulation flexible</p>
          </div>

          {/* Photo supplémentaire latérale */}
          {chateau.images?.[2] && (
            <div className="vc-photo-laterale">
              <img src={chateau.images[2]} alt={chateau.nom} />
              <div className="vc-photo-laterale-overlay" />
            </div>
          )}

          {/* Équipements généraux */}
          <div className="vc-equipements-generaux">
            <div className="vc-equip-gen-titre">Le domaine</div>
            <div className="vc-equip-gen-grille">
              <span className={"vc-equip-gen " + (chateau.parking ? "ok" : "non")}>
                {chateau.parking ? "✓" : "✕"} Parking
              </span>
              <span className={"vc-equip-gen " + (chateau.wifi ? "ok" : "non")}>
                {chateau.wifi ? "✓" : "✕"} Wifi
              </span>
              <span className={"vc-equip-gen " + (chateau.animaux ? "ok" : "non")}>
                {chateau.animaux ? "✓" : "✕"} Animaux
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Modal réservation */}
      {reserve && (
        <div className="vc-modal-resa">
          <div className="vc-modal-resa-inner">
            <h3>Demande de réservation</h3>
            <p>{chateau.nom} · {chambre?.nom || "Chambre au choix"} · {prixFinal} € / nuit</p>
            <p className="vc-modal-resa-note">
              La réservation se fait directement avec le château.
              Nous vous mettons en relation sous 2 heures.
            </p>
            <button className="vc-modal-resa-btn" onClick={() => setReserve(false)}>Fermer</button>
          </div>
        </div>
      )}

    </div>
  );
}
