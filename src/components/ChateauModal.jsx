import { useEffect, useState, useRef } from "react";
import "../styles/chateau-page.css";

export default function ChateauModal({ chateau, onClose }) {
  const [imageActive, setImageActive] = useState(0);
  const [reserve, setReserve] = useState(false);
  const [chambreSelectionnee, setChambreSelectionnee] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    setTimeout(() => setVisible(true), 30);
    const t = setTimeout(() => setMapReady(true), 400);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setImageActive((i) => (i + 1) % chateau.images.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [chateau.images.length]);

  const prevImage = () => {
    clearInterval(intervalRef.current);
    setImageActive(
      (i) => (i - 1 + chateau.images.length) % chateau.images.length
    );
  };
  const nextImage = () => {
    clearInterval(intervalRef.current);
    setImageActive((i) => (i + 1) % chateau.images.length);
  };

  const classBadge =
    { "J-7": "badge-j7", "J-10": "badge-j10", "J-15": "badge-j15" }[
      chateau.urgence
    ] || "badge-j15";
  const chambre = chateau.chambres?.[chambreSelectionnee];

  return (
    <div className={"cp-overlay " + (visible ? "cp-visible" : "cp-hidden")}>
      {/* ── HEADER STICKY ── */}
      <header className="cp-header">
        <div className="cp-header-gauche">
          <button className="cp-retour" onClick={onClose}>
            ← Retour
          </button>
          <span className="cp-header-nom">{chateau.nom}</span>
        </div>
        <div className="cp-header-droite">
          <span className="cp-header-prix">
            {chambre ? chambre.prix : chateau.prix} € <span>/ nuit</span>
          </span>
          <button
            className="cp-header-cta"
            onClick={() =>
              document
                .getElementById("cp-resa")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            Réserver
          </button>
        </div>
      </header>

      {/* ── GALERIE HERO ── */}
      <div className="cp-galerie">
        {chateau.videoBackground ? (
          <div className="cp-video-seule">
            <iframe
              src={`https://www.youtube.com/embed/${chateau.videoBackground}?autoplay=1&mute=1&loop=1&controls=0&playlist=${chateau.videoBackground}&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`}
              className="cp-video-iframe"
              allow="autoplay; encrypted-media"
              title="video"
            />
            <div className="cp-video-overlay" />
          </div>
        ) : null}
        {!chateau.videoBackground && chateau.images.map((img, i) => (
          <img
            key={i}
            src={img}
            alt={chateau.nom}
            className={
              "cp-galerie-img " + (i === imageActive ? "actif" : "inactif")
            }
          />
        ))}
        <div className="cp-galerie-overlay" />

        <div className="cp-galerie-info">
          <div className="cp-galerie-meta">
            <span className="cp-galerie-region">
              ⚜ {chateau.region} · {chateau.distanceParis}
            </span>
            <span className={`badge-urgence ${classBadge}`}>
              ◆ {chateau.urgence}
            </span>
          </div>
          <h1 className="cp-galerie-titre">{chateau.nom}</h1>
          <p className="cp-galerie-style">
            {chateau.style} · {chateau.siecle}
          </p>
        </div>

        {!chateau.videoBackground && <button className="cp-galerie-prev" onClick={prevImage}>
          ‹
        </button>}
        {!chateau.videoBackground && <button className="cp-galerie-next" onClick={nextImage}>
          ›
        </button>}
        {!chateau.videoBackground && <div className="cp-galerie-dots">
          {chateau.images.map((_, i) => (
            <button
              key={i}
              className={"cp-dot " + (i === imageActive ? "actif" : "")}
              onClick={() => {
                clearInterval(intervalRef.current);
                setImageActive(i);
              }}
            />
          ))}
        </div>
      </div>

      {/* ── CORPS ── */}
      <div className="cp-corps">
        <div className="cp-gauche">
          {/* ── DESCRIPTION ── */}
          <section className="cp-section cp-section--creme">
            <div className="cp-section-inner">
              <div className="cp-section-label">⚜ Le domaine</div>
              <p className="cp-accroche">{chateau.accroche}</p>
              <p className="cp-description">{chateau.description}</p>
            </div>
          </section>

          {/* ── TIMELINE ── */}
          {chateau.timeline && (
            <section className="cp-section cp-section--blanc">
              <div className="cp-section-inner">
                <div className="cp-section-label">⚜ Histoire</div>
                <h2 className="cp-section-titre">Cinq siècles d'histoire</h2>
                <div className="cp-timeline">
                  {chateau.timeline.map((item, i) => (
                    <div key={i} className="cp-timeline-item">
                      <div className="cp-timeline-annee">{item.annee}</div>
                      <div className="cp-timeline-ligne">
                        <div className="cp-timeline-point" />
                        {i < chateau.timeline.length - 1 && (
                          <div className="cp-timeline-trait" />
                        )}
                      </div>
                      <div className="cp-timeline-texte">{item.evenement}</div>
                    </div>
                  ))}
                </div>
                <div className="cp-histoire-long">
                  <p>{chateau.histoire}</p>
                </div>
              </div>
            </section>
          )}

          {/* ── PROPRIÉTAIRES ── */}
          {chateau.proprietaires && (
            <section className="cp-section cp-section--creme">
              <div className="cp-section-inner">
                <div className="cp-section-label">⚜ Les propriétaires</div>
                <h2 className="cp-section-titre">Gardiens du lieu</h2>
                <div className="cp-proprietaires">
                  <div className="cp-proprietaires-portrait">
                    <img
                      src={chateau.proprietaires.portrait}
                      alt={chateau.proprietaires.nom}
                      className="cp-portrait-img"
                    />
                    <div className="cp-portrait-meta">
                      <span className="cp-portrait-nom">
                        {chateau.proprietaires.nom}
                      </span>
                      <span className="cp-portrait-depuis">
                        Propriétaires depuis {chateau.proprietaires.depuis}
                      </span>
                    </div>
                  </div>
                  <div className="cp-proprietaires-texte">
                    <blockquote className="cp-citation">
                      <span className="cp-citation-guillemet">"</span>
                      {chateau.proprietaires.citation}
                      <span className="cp-citation-guillemet">"</span>
                    </blockquote>
                    <p className="cp-proprietaires-desc">
                      {chateau.proprietaires.description}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── CHAMBRES ── */}
          {chateau.chambres && (
            <section className="cp-section cp-section--blanc">
              <div className="cp-section-inner">
                <div className="cp-section-label">⚜ Hébergement</div>
                <h2 className="cp-section-titre">Nos chambres & suites</h2>
                <div className="cp-chambres-grille">
                  {chateau.chambres.map((ch, i) => (
                    <div
                      key={i}
                      className={
                        "cp-chambre-carte " +
                        (chambreSelectionnee === i ? "selectionnee" : "")
                      }
                      onClick={() => setChambreSelectionnee(i)}
                    >
                      <div className="cp-chambre-photo-wrapper">
                        <img
                          src={ch.image}
                          alt={ch.nom}
                          className="cp-chambre-photo"
                          loading="lazy"
                        />
                        <div className="cp-chambre-photo-overlay" />
                        {chambreSelectionnee === i && (
                          <div className="cp-chambre-selectionnee-badge">
                            Sélectionnée
                          </div>
                        )}
                      </div>
                      <div className="cp-chambre-contenu">
                        <div className="cp-chambre-header">
                          <h3 className="cp-chambre-nom">{ch.nom}</h3>
                          <span className="cp-chambre-prix">
                            {ch.prix} €<span>/nuit</span>
                          </span>
                        </div>
                        <p className="cp-chambre-desc">{ch.description}</p>
                        <div className="cp-chambre-meta">
                          <span className="cp-chambre-info">
                            {ch.superficie}
                          </span>
                          <span className="cp-chambre-sep">·</span>
                          <span className="cp-chambre-info">
                            {ch.capacite} personne{ch.capacite > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="cp-chambre-equip">
                          {ch.equipements.map((eq, j) => (
                            <span key={j} className="cp-equip-item">
                              ✦ {eq}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── ACTIVITÉS ── */}
          <section className="cp-section cp-section--bleu">
            <div className="cp-section-inner">
              <div className="cp-section-label cp-section-label--or">
                ⚜ Expériences
              </div>
              <h2 className="cp-section-titre cp-section-titre--clair">
                Activités & expériences
              </h2>
              <div className="cp-activites-grille">
                {chateau.activites?.map((a, i) => (
                  <div key={i} className="cp-activite">
                    <div className="cp-activite-lys">✦</div>
                    <div className="cp-activite-nom">{a.nom}</div>
                    <div className="cp-activite-desc">{a.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CARTE & ALENTOURS ── */}
          <section className="cp-section cp-section--creme">
            <div className="cp-section-inner">
              <div className="cp-section-label">⚜ Localisation</div>
              <h2 className="cp-section-titre">Situation & alentours</h2>

              <div className="cp-carte-wrapper">
                {mapReady && chateau.coordonnees && (
                  <iframe
                    title="carte"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={
                      "https://www.openstreetmap.org/export/embed.html?bbox=" +
                      (chateau.coordonnees.lng - 0.05) +
                      "%2C" +
                      (chateau.coordonnees.lat - 0.03) +
                      "%2C" +
                      (chateau.coordonnees.lng + 0.05) +
                      "%2C" +
                      (chateau.coordonnees.lat + 0.03) +
                      "&layer=mapnik&marker=" +
                      chateau.coordonnees.lat +
                      "%2C" +
                      chateau.coordonnees.lng
                    }
                    allowFullScreen
                  />
                )}
              </div>

              <p className="cp-localisation-info">
                📍 {chateau.departement} · {chateau.distanceParis} depuis Paris
              </p>

              <div className="cp-alentours">
                {chateau.alentours?.map((lieu, i) => (
                  <div key={i} className="cp-alentour">
                    <div className="cp-alentour-point" />
                    <span className="cp-alentour-nom">{lieu.nom}</span>
                    <span className="cp-alentour-distance">
                      {lieu.distance}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ── RÉSERVATION STICKY ── */}
        <div className="cp-droite" id="cp-resa">
          <div className="cp-resa-card">
            <div className="cp-resa-titre">Réserver ce séjour</div>

            <div className="cp-resa-urgence">
              <span>⏳</span>
              <span>
                Plus que {chateau.chambresRestantes} chambre
                {chateau.chambresRestantes > 1 ? "s" : ""} · {chateau.urgence}
              </span>
            </div>

            {!reserve ? (
              <>
                {/* Sélecteur chambre */}
                {chateau.chambres && (
                  <div className="cp-resa-chambres">
                    <div className="cp-resa-label">Chambre sélectionnée</div>
                    <div className="cp-resa-chambre-select">
                      {chateau.chambres.map((ch, i) => (
                        <button
                          key={i}
                          className={
                            "cp-resa-ch-btn " +
                            (chambreSelectionnee === i ? "actif" : "")
                          }
                          onClick={() => setChambreSelectionnee(i)}
                        >
                          <span className="cp-resa-ch-nom">{ch.nom}</span>
                          <span className="cp-resa-ch-prix">{ch.prix} €</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="cp-resa-prix-bloc">
                  <span className="cp-resa-prix-barre">
                    {chateau.prixBarre} € / nuit
                  </span>
                  <span className="cp-resa-prix">
                    {chambre ? chambre.prix : chateau.prix} €
                  </span>
                  <span className="cp-resa-prix-nuit">
                    par nuit · taxes incluses
                  </span>
                  <span className="cp-resa-economie">
                    Économie de{" "}
                    {chateau.prixBarre -
                      (chambre ? chambre.prix : chateau.prix)}{" "}
                    €
                  </span>
                </div>

                <div className="cp-resa-champs">
                  <div className="cp-resa-champ">
                    <label>Arrivée</label>
                    <input type="date" />
                  </div>
                  <div className="cp-resa-champ">
                    <label>Départ</label>
                    <input type="date" />
                  </div>
                  <div className="cp-resa-champ">
                    <label>Voyageurs</label>
                    <select>
                      <option>1 voyageur</option>
                      <option>2 voyageurs</option>
                      <option>3 voyageurs</option>
                      <option>4 voyageurs</option>
                    </select>
                  </div>
                </div>

                <button
                  className="cp-resa-btn"
                  onClick={() => setReserve(true)}
                >
                  Réserver maintenant
                </button>
                <button className="cp-contact-btn">Contacter le château</button>

                <div className="cp-garanties">
                  <span className="cp-garantie">
                    ✓ Annulation gratuite sous 48h
                  </span>
                  <span className="cp-garantie">✓ Confirmation immédiate</span>
                  <span className="cp-garantie">✓ Paiement sécurisé</span>
                  <span className="cp-garantie">✓ Sélection vérifiée</span>
                </div>
              </>
            ) : (
              <div className="cp-succes">
                <span className="cp-succes-icon">🗝</span>
                <p className="cp-succes-titre">Demande envoyée !</p>
                <p className="cp-succes-texte">
                  Le château vous contacte sous 2 heures. Préparez vos valises.
                </p>
              </div>
            )}
          </div>

          {/* Équipements */}
          <div className="cp-equip-card">
            <div className="cp-equip-titre">Équipements</div>
            <div className="cp-equip-liste">
              <span
                className={
                  "cp-equip " + (chateau.petitDejeuner ? "inclus" : "non")
                }
              >
                {chateau.petitDejeuner ? "✓" : "✕"} Petit-déjeuner
              </span>
              <span
                className={"cp-equip " + (chateau.parking ? "inclus" : "non")}
              >
                {chateau.parking ? "✓" : "✕"} Parking privé
              </span>
              <span className={"cp-equip " + (chateau.wifi ? "inclus" : "non")}>
                {chateau.wifi ? "✓" : "✕"} Wifi
              </span>
              <span
                className={"cp-equip " + (chateau.animaux ? "inclus" : "non")}
              >
                {chateau.animaux ? "✓" : "✕"} Animaux
              </span>
              <span className="cp-equip inclus">✓ Conciergerie 24h</span>
              <span className="cp-equip inclus">✓ Transfert dispo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
