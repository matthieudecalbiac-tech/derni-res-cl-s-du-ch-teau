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
          {(chateau.images || []).slice(0, 3).map((img, i) => (
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

function ThemeServices({ chateau }) {
  const services = [];
  (chateau.activites || []).forEach((a) => {
    if (typeof a === "string") {
      services.push({ ico: "⚜", nom: a });
    } else if (a && a.nom) {
      services.push({ ico: a.icone || "⚜", nom: a.nom });
    }
  });
  if (chateau.petitDejeuner) services.push({ ico: "◆", nom: "Petit-déjeuner" });
  if (chateau.parking) services.push({ ico: "◆", nom: "Parking privé" });
  if (chateau.wifi) services.push({ ico: "◆", nom: "Wi-Fi" });
  if (chateau.animaux) services.push({ ico: "◆", nom: "Animaux bienvenus" });

  // Déduplication par nom
  const vus = new Set();
  const uniques = services.filter((s) => {
    if (vus.has(s.nom)) return false;
    vus.add(s.nom);
    return true;
  });

  if (uniques.length === 0) {
    return <p className="vc4-theme-vide">Services à présenter prochainement.</p>;
  }

  return (
    <>
    <ThemeHeader eyebrow="L'art de recevoir" titre="Services & expériences" />
    <div className="vc4-theme-services">
      {uniques.map((s, i) => (
        <div key={i} className="vc4-theme-service">
          <span className="vc4-theme-service-ico">{s.ico}</span>
          <span className="vc4-theme-service-nom">{s.nom}</span>
        </div>
      ))}
    </div>
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

export default function ContenuTheme({ chateau, theme, onChange }) {
  return (
    <section className="vc4-contenu-theme" data-theme-contenu={theme}>
      {theme === "apercu" && <ThemeApercu chateau={chateau} onChange={onChange} />}
      {theme === "histoire" && <ThemeHistoire chateau={chateau} />}
      {theme === "famille" && <ThemeFamille chateau={chateau} />}
      {theme === "lieu" && <ThemeLieu chateau={chateau} />}
      {theme === "services" && <ThemeServices chateau={chateau} />}
      {theme === "chambres" && <ThemeChambres chateau={chateau} />}
    </section>
  );
}
