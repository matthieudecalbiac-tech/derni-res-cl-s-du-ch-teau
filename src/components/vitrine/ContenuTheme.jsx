import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { construireGalerie } from "../../services/galerieService";
import { libelleNature } from "../../utils/personnages";
import Modale from "../Modale";

function tronquer(texte, max) {
  if (!texte) return "";
  if (texte.length <= max) return texte;
  return texte.slice(0, max).trim() + "…";
}

function ThemeHeader({ eyebrow, titre }) {
  return (
    <div className="vc4-theme-header">
      <p className="vc4-theme-eyebrow">{eyebrow}</p>
      <h3 className="vc4-theme-titre vc4-theme-titre--xl">{titre}</h3>
      <div className="vc4-theme-orn"><span className="vc4-theme-orn-l"></span><span className="vc4-theme-orn-lys">⚜</span><span className="vc4-theme-orn-l"></span></div>
    </div>
  );
}

function ThemeApercu({ chateau, onChange }) {
  // Apercu : 3 tuiles. Si moins de 3 photos "domaine" (chateau.images), on
  // complete avec les photos de chambres — sans toucher chateau.images (la
  // galerie "Le domaine" reste sur les seules images domaine). Dedup via Set.
  const imgs = chateau.images || [];
  const complement = (chateau.chambres || []).map((c) => c.image).filter(Boolean);
  const tuiles = [...new Set([...imgs, ...complement].filter(Boolean))].slice(0, 3);
  return (
    <div className="vc4-theme-apercu">
      <div className="vc4-theme-apercu-grid">
        <div className="vc4-theme-apercu-texte">
          <p className="vc4-theme-eyebrow">L'essentiel</p>
          <h3 className="vc4-theme-titre vc4-theme-titre--xl">{chateau.nom}</h3>
          <div className="vc4-theme-orn"><span className="vc4-theme-orn-l"></span><span className="vc4-theme-orn-lys">⚜</span><span className="vc4-theme-orn-l"></span></div>
          <p className="vc4-theme-paragraphe">{chateau.accroche || chateau.description}</p>
          <button className="vc4-theme-btn" onClick={() => onChange?.("histoire")}>
            Découvrir le château <span className="vc4-theme-btn-fleche">→</span>
          </button>
        </div>
        <div className="vc4-theme-apercu-photos">
          {tuiles.map((img, i) => (
            <div key={i} className={"vc4-theme-apercu-photo vc4-theme-apercu-photo--" + i}
              style={{ backgroundImage: `url('${img}')` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeHistoire({ chateau }) {
  return (
    <>
    <ThemeHeader eyebrow="Histoire" titre="Sept siècles" />
    <div className="vc4-theme-histoire">
      {chateau.histoire && (
        <p className="vc4-theme-paragraphe vc4-theme-histoire-intro">
          {chateau.histoire}
        </p>
      )}
      {chateau.timeline?.length > 0 && (
        <div className="vc4-theme-timeline">
          {chateau.timeline.map((item, i) => (
            <div key={i} className="vc4-theme-tl-item">
              <span className="vc4-theme-tl-dot" />
              <span className="vc4-theme-tl-annee">{item.annee}</span>
              <p className="vc4-theme-tl-evt">{item.evenement}</p>
            </div>
          ))}
        </div>
      )}
      {/* Histoire des lieux : ceux qui ont marqué ce château. Nom = lien vers
          la fiche /personnage/:slug. À plat, dans l'ordre de saisie. Masqué si
          vide (comme la timeline). key = id+nature (un personnage peut être lié
          2× avec des natures différentes). */}
      {chateau.personnages?.length > 0 && (
        <div className="vc4-theme-personnages">
          {chateau.personnages.map((p) => (
            <div key={`${p.id}-${p.nature}`} className="vc4-theme-perso">
              <div className="vc4-theme-perso-head">
                <Link className="vc4-theme-perso-nom" to={`/personnage/${p.slug}`}>{p.nom}</Link>
                <span className="vc4-theme-perso-nature">{libelleNature(p.nature)}</span>
              </div>
              {p.texte && <p className="vc4-theme-perso-texte">{p.texte}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

function ThemeFamille({ chateau }) {
  const p = chateau.proprietaires;
  if (!p) {
    return <p className="vc4-theme-vide">Famille propriétaire à présenter prochainement.</p>;
  }
  return (
    <>
    <ThemeHeader eyebrow="Les propriétaires" titre={p.nom || "La famille"} />
    <div className="vc4-theme-famille">
      <div className="vc4-theme-famille-grid">
        {p.portrait && (
          <div
            className="vc4-theme-famille-portrait"
            style={{ backgroundImage: `url('${p.portrait}')` }}
          />
        )}
        <div className="vc4-theme-famille-texte">
          {p.citation && (
            <blockquote className="vc4-theme-famille-citation">
              <span className="vc4-theme-famille-qmark">"</span>
              <p>{p.citation}</p>
            </blockquote>
          )}
          <p className="vc4-theme-famille-auteur">— {p.nom}</p>
          {p.depuis && <p className="vc4-theme-famille-depuis">Propriétaires depuis {p.depuis}</p>}
          {p.description && <p className="vc4-theme-famille-bio">{p.description}</p>}
        </div>
      </div>
    </div>
    </>
  );
}

function ThemeLieu({ chateau }) {
  return (
    <>
    <ThemeHeader eyebrow="Le territoire" titre={chateau.region} />
    <div className="vc4-theme-lieu">
      <div className="vc4-theme-lieu-grid">
        <div className="vc4-theme-lieu-narrative">
          {chateau.regionNarrative && (
            <p className="vc4-theme-paragraphe">{chateau.regionNarrative}</p>
          )}
          {chateau.regionHistoire && (
            <p className="vc4-theme-paragraphe" style={{ marginTop: 16 }}>
              {chateau.regionHistoire}
            </p>
          )}
          {!chateau.regionNarrative && !chateau.regionHistoire && (
            <p className="vc4-theme-paragraphe">Région à présenter prochainement.</p>
          )}
        </div>
        {chateau.alentours?.length > 0 && (
          <div className="vc4-theme-lieu-alentours">
            {chateau.alentours.slice(0, 6).map((a, i) => (
              <div key={i} className="vc4-theme-alentour">
                <div className="vc4-theme-alentour-head">
                  {a.icone && <span className="vc4-theme-alentour-ico">{a.icone}</span>}
                  <span className="vc4-theme-alentour-nom">{a.nom}</span>
                  {a.distance && <span className="vc4-theme-alentour-dist">{a.distance}</span>}
                </div>
                {a.description && (
                  <p className="vc4-theme-alentour-desc">{tronquer(a.description, 110)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// Badge d'état d'un amenity : « Inclus » (or léger) ou « + X € » (or plein),
// plus la durée en discret le cas échéant. Palette navy/or/crème uniquement.
function AmenityBadges({ inclus, prixSupplement, dureeMinutes }) {
  return (
    <div className="vc4-theme-amenity-badges">
      {inclus ? (
        <span className="vc4-theme-amenity-badge vc4-theme-amenity-badge--inclus">Inclus</span>
      ) : prixSupplement != null ? (
        <span className="vc4-theme-amenity-badge vc4-theme-amenity-badge--sup">+ {prixSupplement} €</span>
      ) : null}
      {dureeMinutes != null && (
        <span className="vc4-theme-amenity-duree">{dureeMinutes} min</span>
      )}
    </div>
  );
}

const LIBELLE_TYPE = { service: "Service", activite: "Activité" };

// Tuile de la mosaïque. Deux formes, jamais une principale et une dégradée :
//
//   PHOTO — 18 amenities sur 83 en ont une. Ce sont les ACCENTS de la grille :
//     la première occupe deux colonnes sur deux rangs, les suivantes deux
//     colonnes sur un rang. Photo en fond, dégradé navy pour la lisibilité.
//
//   TEXTE — les 78 % restants, donc la forme PAR DÉFAUT. Elle est composée pour
//     elle-même : glyphe or (icone est rempli 83/83, ⚜ en dernier recours),
//     filet, nom en Playfair, description en Crimson Pro. Une tuile sur trois
//     passe en encre navy — c'est ce qui donne du rythme à une mosaïque SANS
//     aucune photo, cas réel de Saint-Paterne (1 image pour 12).
//
// Le mécanisme est inchangé : <button> pour le clavier, onOpen ouvre
// AmenityModale, description tronquée par le même helper.
function AmenityTuile({ a, onOpen, variante, encre }) {
  const avecPhoto = Boolean(a.image);
  const classes = [
    "vc4-mosa-tuile",
    avecPhoto ? "vc4-mosa-tuile--photo" : "vc4-mosa-tuile--texte",
    variante === "dominante" ? "vc4-mosa-tuile--dominante" : "",
    variante === "large" ? "vc4-mosa-tuile--large" : "",
    !avecPhoto && encre ? "vc4-mosa-tuile--encre" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      style={avecPhoto ? { backgroundImage: `url(${a.image})` } : undefined}
      onClick={() => onOpen(a)}
      aria-label={`${a.nom} — voir le détail`}
    >
      {!avecPhoto && (
        <span className="vc4-mosa-glyphe" aria-hidden="true">{a.icone || "⚜"}</span>
      )}
      <span className="vc4-mosa-corps">
        {/* Le type reste LISIBLE sans découper la grille en deux : la
            séparation stricte laissait une colonne vide aux châteaux qui n'ont
            que des activités (Briottières, Blanc Buisson : 0 service / 6). */}
        <span className="vc4-mosa-type">{LIBELLE_TYPE[a.type] || ""}</span>
        <span className="vc4-mosa-nom">{a.nom}</span>
        {a.description && (
          <span className="vc4-mosa-desc">
            {tronquer(a.description, avecPhoto && variante === "dominante" ? 140 : 70)}
          </span>
        )}
      </span>
    </button>
  );
}

// Modale de détail (réutilise le primitif Modale : portal, scroll-lock, Échap,
// clic-fond, focus-trap, role=dialog/aria-modal). Sans titre → pas d'en-tête logo.
function AmenityModale({ amenity, onClose }) {
  return (
    <Modale ouvert={Boolean(amenity)} onClose={onClose} largeur={520}>
      {amenity && (
        <div className="vc4-theme-amenity-modale">
          {amenity.image && (
            <div
              className="vc4-theme-amenity-modale-photo"
              style={{ backgroundImage: `url(${amenity.image})` }}
            />
          )}
          <h3 className="vc4-theme-amenity-modale-nom">
            {amenity.icone && <span className="vc4-theme-amenity-modale-ico">{amenity.icone}</span>}
            {amenity.nom}
          </h3>
          <AmenityBadges
            inclus={amenity.inclus}
            prixSupplement={amenity.prixSupplement}
            dureeMinutes={amenity.dureeMinutes}
          />
          {amenity.description && (
            <p className="vc4-theme-amenity-modale-desc">{amenity.description}</p>
          )}
        </div>
      )}
    </Modale>
  );
}

function ThemeServices({ chateau }) {
  // Consomme chateau.amenities (exposé par mapChateau), déjà trié par ordre.
  // Les 4 booléens flatten (petitDejeuner/parking/wifi/animaux) ne sont plus
  // affichés ici : l'info détaillée vit désormais dans amenities.
  const amenities = chateau.amenities || [];
  const [selection, setSelection] = useState(null);

  // MOSAÏQUE UNIFIÉE, et non deux colonnes Services / Activités.
  // La séparation stricte pénalisait deux châteaux sur cinq : Briottières et
  // Blanc Buisson n'ont AUCUN service et six activités, donc une colonne vide.
  // Le type reste lisible — il est écrit sur chaque tuile — mais il ne découpe
  // plus la page. L'ordre éditorial de la base (`ordre`) est conservé.
  //
  // Le calibre de chaque tuile se décide ICI, pas dans le CSS : seule une passe
  // sur la liste sait quelle est la PREMIÈRE tuile photo (la dominante) et
  // quelle tuile texte reçoit l'encre. Le CSS ne fait qu'appliquer les spans.
  const tuiles = useMemo(() => {
    let photoVue = 0;
    let texteVu = 0;
    return amenities.map((a) => {
      if (a.image) {
        photoVue += 1;
        // La première photo domine (2 colonnes × 2 rangs), les suivantes sont
        // larges (2 × 1). Sans cette hiérarchie, six photos donneraient six
        // blocs égaux — une planche-contact, pas une mise en page.
        return { a, variante: photoVue === 1 ? "dominante" : "large", encre: false };
      }
      texteVu += 1;
      // Une tuile texte sur trois en encre navy : le seul rythme disponible
      // quand il n'y a aucune photo, et il tient tout seul.
      return { a, variante: "texte", encre: texteVu % 3 === 0 };
    });
  }, [amenities]);

  if (amenities.length === 0) {
    return <p className="vc4-theme-vide">Services à présenter prochainement.</p>;
  }

  return (
    <>
      <ThemeHeader eyebrow="L'art de recevoir" titre="Services & activités" />
      <div className="vc4-mosa">
        {tuiles.map(({ a, variante, encre }, i) => (
          <AmenityTuile key={i} a={a} onOpen={setSelection} variante={variante} encre={encre} />
        ))}
      </div>
      <AmenityModale amenity={selection} onClose={() => setSelection(null)} />
    </>
  );
}

function ThemeChambres({ chateau }) {
  const chambres = chateau.chambres || [];
  if (!chambres.length) {
    return <p className="vc4-theme-vide">Chambres à présenter prochainement.</p>;
  }
  return (
    <>
    <ThemeHeader eyebrow="Séjourner" titre="Les chambres" />
    <div className="vc4-theme-chambres">
      {chambres.map((ch, i) => (
        <article key={i} className="vc4-theme-chambre">
          <div
            className="vc4-theme-chambre-photo"
            style={{ backgroundImage: ch.image ? `url('${ch.image}')` : "none" }}
          />
          <div className="vc4-theme-chambre-corps">
            <h3 className="vc4-theme-chambre-nom">{ch.nom}</h3>
            <p className="vc4-theme-chambre-meta">
              {ch.superficie} · {ch.capacite} pers.
            </p>
            {ch.description && (
              <p className="vc4-theme-chambre-desc">{ch.description}</p>
            )}
            {ch.equipements?.length > 0 && (
              <p className="vc4-theme-chambre-equipements">
                {ch.equipements.join(" · ")}
              </p>
            )}
          </div>
          <div className="vc4-theme-chambre-prix">
            <span className="vc4-theme-chambre-prix-val">{ch.prix} €</span>
            <span className="vc4-theme-chambre-prix-lab">/nuit</span>
          </div>
        </article>
      ))}
    </div>
    </>
  );
}

function ThemeGalerie({ chateau }) {
  const sections = construireGalerie(chateau);
  // Hooks appeles inconditionnellement AVANT tout early-return (regles des hooks).
  const [lightbox, setLightbox] = useState(null); // { url, legende } ou null
  // Escape ferme la lightbox. Deps [lightbox] : listener actif seulement quand
  // ouverte ; setLightbox(null) ne lit pas lightbox -> pas de stale closure.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!sections.length) {
    return <p className="vc4-theme-vide">Galerie a venir.</p>;
  }
  return (
    <>
    <ThemeHeader eyebrow="Galerie" titre="Photographies" />
    {sections.map((sec, si) => (
      <div key={si} className="vc4-galerie-section">
        <p className="vc4-galerie-section-titre">{sec.titre}</p>
        <div className="vc4-galerie-grille">
          {sec.photos.map((photo, pi) => (
            <div key={pi} className="vc4-galerie-item"
              onClick={() => setLightbox(photo)}
              style={{ backgroundImage: `url('${photo.url}')` }}>
              {photo.legende && <span className="vc4-galerie-legende">{photo.legende}</span>}
            </div>
          ))}
        </div>
      </div>
    ))}
    {lightbox && (
      <div className="vc4-lightbox" onClick={() => setLightbox(null)}>
        <button className="vc4-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        <img className="vc4-lightbox-img" src={lightbox.url} alt={lightbox.legende || ""} onClick={(e) => e.stopPropagation()} />
        {lightbox.legende && <p className="vc4-lightbox-legende">{lightbox.legende}</p>}
      </div>
    )}
    </>
  );
}

export default function ContenuTheme({ chateau, theme, onChange }) {
  return (
    <section className="vc4-contenu-theme" data-theme-contenu={theme}>
      {theme === "apercu" && <ThemeApercu chateau={chateau} onChange={onChange} />}
      {theme === "histoire" && <ThemeHistoire chateau={chateau} />}
      {theme === "famille" && <ThemeFamille chateau={chateau} />}
      {theme === "lieu" && <ThemeLieu chateau={chateau} />}
      {theme === "services" && <ThemeServices chateau={chateau} />}
      {theme === "chambres" && <ThemeChambres chateau={chateau} />}
      {theme === "photos" && <ThemeGalerie chateau={chateau} />}
    </section>
  );
}
