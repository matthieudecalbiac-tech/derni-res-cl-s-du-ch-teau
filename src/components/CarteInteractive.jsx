import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDate } from "../utils/dates";
import { prixAffiche } from "../utils/derivePrix";
import { capaciteSuffisante } from "../utils/capacite";
import CalendrierPlage from "./CalendrierPlage";
import "../styles/carte-interactive.css";

export default function CarteInteractive({ chateaux, dateArrivee, dateDepart, etapeDate, onSelectDate, onResetDates, invites, setInvites, onVoirChateau }) {
  const conteneurRef = useRef(null);
  const carteRef = useRef(null);
  const [survolId, setSurvolId] = useState(null);
  const [calOuvert, setCalOuvert] = useState(false);
  const [voyOuvert, setVoyOuvert] = useState(false);
  const [apercuChateau, setApercuChateau] = useState(null);
  const [photoZoom, setPhotoZoom] = useState(null);

  // La carte ne montre que les chateaux reels (estLaUne) : seuls routables vers
  // une vraie vitrine. Puis filtre capacite (voyageurs herites de la barre).
  // Un seul tableau alimente la liste ET les marqueurs.
  const totalInvites = invites ? invites.adultes + invites.enfants : 0;
  const reels = (chateaux || [])
    .filter((c) => c.estLaUne === true)
    .filter((c) => capaciteSuffisante(c, totalInvites));

  useEffect(() => {
    if (!conteneurRef.current || carteRef.current) return;

    const carte = L.map(conteneurRef.current, {
      center: [46.7, 2.3],
      zoom: 6,
      scrollWheelZoom: true,
      zoomSnap: 0,
      attributionControl: true,
    });
    carteRef.current = carte;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(carte);

    reels.forEach((c) => {
      const lat = c.coordonnees?.lat;
      const lng = c.coordonnees?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      const prix = prixAffiche(c);
      const label = prix ? `${prix} €` : "Voir";
      const icone = L.divIcon({
        className: "ci-pastille-wrap",
        html: `<button type="button" class="ci-pastille" data-id="${c.id}">${label}</button>`,
        iconSize: null,
      });
      const marqueur = L.marker([lat, lng], { icon: icone }).addTo(carte);
      marqueur.on("click", () => setApercuChateau(c));
      marqueur.on("mouseover", () => setSurvolId(c.id));
      marqueur.on("mouseout", () => setSurvolId(null));
    });

    // Bornes de la France metropolitaine : garantit que le pays entier tient
    // dans le conteneur, quelle que soit sa taille (un zoom fixe ne le peut pas).
    const BORNES_FRANCE = L.latLngBounds([42.3, -5.2], [51.1, 8.3]);
    const t = setTimeout(() => {
      carte.invalidateSize();
      carte.fitBounds(BORNES_FRANCE, { padding: [20, 20] });
    }, 120);

    return () => {
      clearTimeout(t);
      carte.remove();
      carteRef.current = null;
    };
  }, [chateaux, onVoirChateau, apercuChateau]);

  // Sens vignette -> pastille : au survol d'une vignette (survolId), surligne la
  // pastille correspondante. Les pastilles portent data-id ; querySelector no-op
  // si absente (vue apercu). Nettoie l'ancienne a chaque changement.
  useEffect(() => {
    const root = conteneurRef.current?.closest(".ci-conteneur") || document;
    // retire le surlignage de toutes les pastilles
    root.querySelectorAll(".ci-pastille--survol").forEach((el) => el.classList.remove("ci-pastille--survol"));
    if (survolId != null) {
      const el = root.querySelector(`.ci-pastille[data-id="${survolId}"]`);
      if (el) el.classList.add("ci-pastille--survol");
    }
  }, [survolId]);

  const rappelSejour = () => {
    const parts = [];
    if (dateArrivee && dateDepart) parts.push(`${formatDate(dateArrivee)} → ${formatDate(dateDepart)}`);
    if (invites) {
      const a = invites.adultes, e = invites.enfants;
      let s = `${a} adulte${a > 1 ? "s" : ""}`;
      if (e > 0) s += `, ${e} enfant${e > 1 ? "s" : ""}`;
      parts.push(s);
    }
    return parts.join(" · ");
  };

  // Filtres services : illustratifs, desactives. Aucun champ service booleen
  // n'existe encore sur les chateaux (equipements en texte libre uniquement).
  // Actives quand la donnee structuree existera. Affiches pour la vision produit.
  const servicesBientot = ["Spa", "Piscine", "Table d’hôtes", "Parc & jardins", "Animaux bienvenus"];

  const labelDatesFiltre = () => {
    if (dateArrivee && dateDepart) return `${formatDate(dateArrivee)} → ${formatDate(dateDepart)}`;
    if (dateArrivee) return `${formatDate(dateArrivee)} → …`;
    return "Ajouter des dates";
  };

  const prix = apercuChateau ? prixAffiche(apercuChateau) : null;

  return (
    <div className="ci-conteneur">
      {apercuChateau ? (
        <div className="ci-apercu">
          <div className="ci-apercu-barre">
            <button type="button" className="ci-apercu-retour" onClick={() => setApercuChateau(null)}>
              ← Retour à la carte
            </button>
            <button type="button" className="ci-apercu-cta" onClick={() => onVoirChateau(apercuChateau)}>
              Voir la vitrine pour réserver →
            </button>
          </div>

          <div className="ci-apercu-photos">
            {(apercuChateau.images || []).slice(0, 3).map((src, i) => (
              <div key={i} className="ci-apercu-photo" style={{ backgroundImage: `url('${src}')` }}
                onClick={() => setPhotoZoom(src)} />
            ))}
          </div>

          <div className="ci-apercu-tete">
            <div className="ci-apercu-region">{apercuChateau.region} · {apercuChateau.distanceParis}</div>
            <h2 className="ci-apercu-nom">{apercuChateau.nom}</h2>
            <p className="ci-apercu-accroche">{apercuChateau.accroche}</p>
          </div>

          {Array.isArray(apercuChateau.chiffresCles) && apercuChateau.chiffresCles.length > 0 && (
            <div className="ci-apercu-chiffres">
              {apercuChateau.chiffresCles.slice(0, 4).map((c, i) => (
                <div key={i} className="ci-apercu-chiffre">
                  <span className="ci-apercu-chiffre-val">{c.valeur ?? c.val}</span>
                  <span className="ci-apercu-chiffre-lab">{c.label ?? c.lab}</span>
                </div>
              ))}
            </div>
          )}

          {/* LE LIEU */}
          {apercuChateau.description && (
            <div className="ci-apercu-section">
              <h3 className="ci-apercu-titre">Le lieu</h3>
              <p className="ci-apercu-texte">{apercuChateau.description}</p>
              <div className="ci-apercu-localisation">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
                  <path d="M9 16s5-4.4 5-8.5a5 5 0 0 0-10 0C4 11.6 9 16 9 16Z" stroke="#C09840" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="9" cy="7.5" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
                </svg>
                {apercuChateau.ville}, {apercuChateau.departement} · {apercuChateau.distanceParis}
              </div>
            </div>
          )}

          {/* CHAMBRES */}
          {Array.isArray(apercuChateau.chambres) && apercuChateau.chambres.length > 0 && (
            <div className="ci-apercu-section">
              <h3 className="ci-apercu-titre">Aperçu des chambres</h3>
              <div className="ci-apercu-chambres">
                {apercuChateau.chambres.map((ch, i) => (
                  <div key={i} className="ci-apercu-chambre">
                    {ch.image && (
                      <div className="ci-apercu-chambre-photo" style={{ backgroundImage: `url('${ch.image}')` }}
                        onClick={() => setPhotoZoom(ch.image)} />
                    )}
                    <div className="ci-apercu-chambre-corps">
                      <div className="ci-apercu-chambre-nom">{ch.nom}</div>
                      <div className="ci-apercu-chambre-meta">
                        {ch.superficie ? `${ch.superficie} · ` : ""}{ch.capacite} pers.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SERVICES (illustratifs, a completer) */}
          <div className="ci-apercu-section">
            <h3 className="ci-apercu-titre">Services & prestations</h3>
            <div className="ci-apercu-services">
              {["Spa", "Piscine", "Table d’hôtes", "Parc & jardins", "Animaux bienvenus", "Wifi", "Parking"].map((s) => (
                <span key={s} className="ci-apercu-service">{s}</span>
              ))}
            </div>
            <p className="ci-apercu-services-note">Prestations détaillées à venir</p>
          </div>

          <div className="ci-apercu-pied">
            {prix && <span className="ci-apercu-prix">à partir de <strong>{prix} €</strong> / nuit</span>}
          </div>

          {photoZoom && (
            <div className="ci-lightbox" onClick={() => setPhotoZoom(null)}>
              <button className="ci-lightbox-close" onClick={() => setPhotoZoom(null)} aria-label="Fermer">✕</button>
              <img src={photoZoom} alt="" className="ci-lightbox-img" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
        </div>
      ) : (
        <>
      {/* BARRE DE FILTRES */}
      <div className="ci-filtres">
        <img src="/FDL-transparent.png" alt="" className="ci-filtres-logo" />
        <div className="ci-filtre-dates">
          <button
            type="button"
            className="ci-filtre-btn"
            onClick={() => setCalOuvert((o) => !o)}
            aria-expanded={calOuvert}
          >
            <svg className="ci-filtre-ico" width="16" height="16" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="4.5" width="12" height="10.5" rx="1.5" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 7.5h12M6 3v3M12 3v3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {labelDatesFiltre()}
          </button>
          {calOuvert && (
            <div className="ci-cal-pop">
              <CalendrierPlage
                dateArrivee={dateArrivee}
                dateDepart={dateDepart}
                etape={etapeDate}
                onSelectDate={(d) => {
                  onSelectDate(d);
                  // referme quand la plage est complete (depart pose)
                  if (etapeDate === "depart" && dateArrivee && d > dateArrivee) {
                    setCalOuvert(false);
                  }
                }}
                onReset={onResetDates}
              />
            </div>
          )}
        </div>

        <div className="ci-filtre-voyageurs">
          <button
            type="button"
            className="ci-filtre-btn"
            onClick={() => setVoyOuvert((o) => !o)}
            aria-expanded={voyOuvert}
          >
            <svg className="ci-filtre-ico" width="16" height="16" viewBox="0 0 18 18" fill="none">
              <circle cx="6.8" cy="6.5" r="2.3" stroke="#C09840" strokeWidth="1.5"/>
              <circle cx="12.2" cy="7" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 15c0-2.1 1.7-3.4 3.8-3.4S10.6 12.9 10.6 15" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11.2 11.7c1.9 0 3.3 1.2 3.3 3.3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {invites.adultes + invites.enfants} voyageur{invites.adultes + invites.enfants > 1 ? "s" : ""}
          </button>
          {voyOuvert && (
            <div className="ci-voy-pop">
              <div className="ci-voy-ligne">
                <span className="ci-voy-label">Adultes</span>
                <div className="ci-voy-stepper">
                  <button type="button" className="ci-voy-btn" aria-label="Diminuer les adultes"
                    onClick={() => setInvites((v) => ({ ...v, adultes: Math.max(1, v.adultes - 1) }))}
                    disabled={invites.adultes <= 1}>−</button>
                  <span className="ci-voy-val">{invites.adultes}</span>
                  <button type="button" className="ci-voy-btn" aria-label="Augmenter les adultes"
                    onClick={() => setInvites((v) => ({ ...v, adultes: v.adultes + 1 }))}
                    disabled={invites.adultes + invites.enfants >= 20}>+</button>
                </div>
              </div>
              <div className="ci-voy-ligne">
                <span className="ci-voy-label">Enfants</span>
                <div className="ci-voy-stepper">
                  <button type="button" className="ci-voy-btn" aria-label="Diminuer les enfants"
                    onClick={() => setInvites((v) => ({ ...v, enfants: Math.max(0, v.enfants - 1) }))}
                    disabled={invites.enfants <= 0}>−</button>
                  <span className="ci-voy-val">{invites.enfants}</span>
                  <button type="button" className="ci-voy-btn" aria-label="Augmenter les enfants"
                    onClick={() => setInvites((v) => ({ ...v, enfants: v.enfants + 1 }))}
                    disabled={invites.adultes + invites.enfants >= 20}>+</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ci-filtre-services">
          {servicesBientot.map((s) => (
            <button key={s} type="button" className="ci-filtre-service" disabled title="Bientôt disponible">
              {s}
            </button>
          ))}
          <button type="button" className="ci-filtre-service ci-filtre-plus" disabled title="Bientôt disponible">
            Plus de filtres
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* SPLIT liste + carte */}
      <div className="ci-split">
      {/* LISTE DE VIGNETTES */}
      <div className="ci-liste">
        <div className="ci-liste-tete">
          <span className="ci-liste-nb">{reels.length}</span> demeure{reels.length > 1 ? "s" : ""}
          {rappelSejour() && <span className="ci-liste-sejour"> · {rappelSejour()}</span>}
        </div>
        {reels.length === 0 && (
          <div className="ci-liste-vide">
            <span className="ci-liste-vide-lys">⚜</span>
            <p className="ci-liste-vide-txt">
              Aucune demeure ne peut accueillir {totalInvites} voyageurs pour l’instant.
            </p>
            <p className="ci-liste-vide-sous">
              Notre réseau s’agrandit — réduisez le nombre de voyageurs ou revenez bientôt.
            </p>
          </div>
        )}
        {reels.map((c) => {
          const prix = prixAffiche(c);
          return (
            <div
              key={c.id}
              className={"ci-vignette" + (survolId === c.id ? " ci-vignette--survol" : "")}
              role="button"
              tabIndex={0}
              onClick={() => setApercuChateau(c)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setApercuChateau(c); } }}
              onMouseEnter={() => setSurvolId(c.id)}
              onMouseLeave={() => setSurvolId(null)}
            >
              <div className="ci-vignette-photo" style={{ backgroundImage: `url('${c.images?.[0]}')` }} />
              <div className="ci-vignette-corps">
                <div className="ci-vignette-region">{c.region} · {c.distanceParis}</div>
                <h3 className="ci-vignette-nom">{c.nom}</h3>
                <p className="ci-vignette-accroche">{c.accroche}</p>
                <div className="ci-vignette-bas">
                  {prix && (
                    <span className="ci-vignette-prix">
                      dès <strong>{prix} €</strong> / nuit
                    </span>
                  )}
                  <button
                    className="ci-vignette-cta"
                    type="button"
                    tabIndex={-1}
                  >
                    Voir le château →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

        {/* CARTE */}
        <div className="ci-carte" ref={conteneurRef} />
      </div>
        </>
      )}
    </div>
  );
}
