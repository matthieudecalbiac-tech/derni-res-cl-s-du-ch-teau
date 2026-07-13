import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getChateauAdminById, saveChateauComplet, updateStatut, deleteChateau } from "../../services/chateauxService";
import { validerPublication } from "../../utils/validerPublication";
import BoutonTeleverser from "./BoutonTeleverser";

const LIBELLE_STATUT = { brouillon: "Brouillon", publie: "Publié", archive: "Archivé" };

// Édition d'un château (chantier admin, brique 4b : base + 4 tables filles).
// Les filles (chambres/timeline/alentours/amenities) sont chargées en forme
// React via getChateauAdminById, éditées ici comme des listes dynamiques, et
// renvoyées à saveChateauComplet (contrat REPLACE : le form est la source).

// Valeurs fermées des enums Postgres (cf. schema.sql).
const ALENTOUR_TYPES = ["patrimoine", "gastronomie", "nature", "spirituel", "sport", "village", "culture", "histoire"];
const AMENITY_TYPES = ["service", "activite"];

// ── Helpers de normalisation (module-level, réutilisés base + filles) ──
const estVide = (v) => typeof v === "string" && v.trim() === "";
const videOuNull = (v) => (estVide(v) ? null : v);
const nbOuNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const entierOuNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isInteger(n) ? n : null;
};

// ── Petits champs réutilisables ──
function Champ({ label, value, onChange, type = "text" }) {
  return (
    <label className="adm-champ">
      <span className="adm-champ-label">{label}</span>
      <input className="adm-input" type={type} value={value ?? ""} onChange={onChange} />
    </label>
  );
}

function ChampZone({ label, value, onChange, rows = 4 }) {
  return (
    <label className="adm-champ">
      <span className="adm-champ-label">{label}</span>
      <textarea className="adm-textarea" value={value ?? ""} onChange={onChange} rows={rows} />
    </label>
  );
}

function ChampCase({ label, checked, onChange }) {
  return (
    <label className="adm-case">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function ChampSelect({ label, value, onChange, options }) {
  return (
    <label className="adm-champ">
      <span className="adm-champ-label">{label}</span>
      <select className="adm-input" value={value} onChange={onChange}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

// ── Initialise le state depuis le château chargé (base + filles) ──
function formFromChateau(c) {
  return {
    // Base
    nom: c.nom ?? "",
    slug: c.slug ?? "",
    region: c.region ?? "",
    departement: c.departement ?? "",
    ville: c.ville ?? "",
    accroche: c.accroche ?? "",
    siecle: c.siecle ?? "",
    style: c.style ?? "",
    urgence: c.urgence ?? "",
    histoire: c.histoire ?? "",
    description: c.description ?? "",
    regionNarrative: c.regionNarrative ?? "",
    regionHistoire: c.regionHistoire ?? "",
    distanceParis: c.distanceParis ?? "",
    distanceParisMinutes: c.distanceParisMinutes ?? "",
    videoBackground: c.videoBackground ?? "",
    couleurTheme: c.couleurTheme ?? "",
    accentTheme: c.accentTheme ?? "",
    estLaUne: c.estLaUne === true,
    isDemoMock: c.isDemoMock === true,
    heroNightStars: c.heroNightStars === true,
    uneDeLaSemaine: c.uneDeLaSemaine === true,
    ordreHome: c.ordreHome ?? null,
    coordonnees: {
      lat: c.coordonnees?.lat ?? "",
      lng: c.coordonnees?.lng ?? "",
    },
    proprietaires: {
      nom: c.proprietaires?.nom ?? "",
      depuis: c.proprietaires?.depuis ?? "",
      initiale: c.proprietaires?.initiale ?? "",
      nomAffiche: c.proprietaires?.nomAffiche ?? "",
      portrait: c.proprietaires?.portrait ?? "",
      citation: c.proprietaires?.citation ?? "",
      description: c.proprietaires?.description ?? "",
    },
    images: c.images ?? [],
    chiffresCles: c.chiffresCles ?? null,
    // Filles — copiées pour ne pas muter le château chargé.
    chambres: (c.chambres ?? []).map((x) => ({ ...x, equipements: [...(x.equipements ?? [])] })),
    timeline: (c.timeline ?? []).map((x) => ({ ...x })),
    alentours: (c.alentours ?? []).map((x) => ({ ...x })),
    amenities: (c.amenities ?? []).map((x) => ({ ...x })),
  };
}

// ── Prépare le base-row : vide -> null, numériques castés (le cast RPC refuse "") ──
function preparerBase(form) {
  return {
    nom: form.nom,   // requis — chateauToRow validera
    slug: form.slug, // requis
    region: videOuNull(form.region),
    departement: videOuNull(form.departement),
    ville: videOuNull(form.ville),
    accroche: videOuNull(form.accroche),
    siecle: videOuNull(form.siecle),
    style: videOuNull(form.style),
    urgence: videOuNull(form.urgence),
    histoire: videOuNull(form.histoire),
    description: videOuNull(form.description),
    regionNarrative: videOuNull(form.regionNarrative),
    regionHistoire: videOuNull(form.regionHistoire),
    distanceParis: videOuNull(form.distanceParis),
    distanceParisMinutes: entierOuNull(form.distanceParisMinutes),
    videoBackground: videOuNull(form.videoBackground),
    couleurTheme: videOuNull(form.couleurTheme),
    accentTheme: videOuNull(form.accentTheme),
    estLaUne: form.estLaUne === true,
    isDemoMock: form.isDemoMock === true,
    heroNightStars: form.heroNightStars === true,
    uneDeLaSemaine: form.uneDeLaSemaine === true,
    ordreHome: entierOuNull(form.ordreHome),
    coordonnees: {
      lat: nbOuNull(form.coordonnees.lat),
      lng: nbOuNull(form.coordonnees.lng),
    },
    proprietaires: {
      nom: videOuNull(form.proprietaires.nom),
      depuis: videOuNull(form.proprietaires.depuis),
      initiale: videOuNull(form.proprietaires.initiale),
      nomAffiche: videOuNull(form.proprietaires.nomAffiche),
      portrait: videOuNull(form.proprietaires.portrait),
      citation: videOuNull(form.proprietaires.citation),
      description: videOuNull(form.proprietaires.description),
    },
    images: form.images.filter((im) => typeof im === "string" && im.trim() !== ""),
    chiffresCles: form.chiffresCles,
  };
}

// ── Normalisation des filles avant envoi ──
const preparerChambre = (c) => ({
  ...c,
  prix: nbOuNull(c.prix),
  capacite: entierOuNull(c.capacite),
  equipements: (c.equipements ?? []).map((e) => e.trim()).filter((e) => e !== ""),
});
const preparerAmenity = (a) => ({
  ...a,
  prixSupplement: nbOuNull(a.prixSupplement),
  dureeMinutes: entierOuNull(a.dureeMinutes),
});

// ── Validation form (message clair avant que la RPC ne rejette) ──
function validerForm(form) {
  if (estVide(form.nom)) return "Le nom du château est requis.";
  if (estVide(form.slug)) return "Le slug est requis.";
  for (const [i, c] of form.chambres.entries()) {
    if (estVide(c.nom)) return `Chambre ${i + 1} : le nom est requis.`;
    const prix = nbOuNull(c.prix);
    if (!(prix !== null && prix > 0)) return `Chambre ${i + 1} : le prix doit être un nombre > 0.`;
    const cap = entierOuNull(c.capacite);
    if (!(cap !== null && cap >= 1 && cap <= 20)) return `Chambre ${i + 1} : la capacité doit être un entier entre 1 et 20.`;
  }
  for (const [i, t] of form.timeline.entries()) {
    if (estVide(t.annee)) return `Timeline ${i + 1} : l'année est requise.`;
    if (estVide(t.evenement)) return `Timeline ${i + 1} : l'événement est requis.`;
  }
  for (const [i, a] of form.alentours.entries()) {
    if (estVide(a.nom)) return `Alentour ${i + 1} : le nom est requis.`;
    if (estVide(a.type)) return `Alentour ${i + 1} : le type est requis.`;
  }
  for (const [i, a] of form.amenities.entries()) {
    if (estVide(a.type)) return `Équipement ${i + 1} : le type est requis.`;
    if (estVide(a.nom)) return `Équipement ${i + 1} : le nom est requis.`;
    if (a.prixSupplement !== "" && a.prixSupplement !== null && a.prixSupplement !== undefined) {
      const ps = nbOuNull(a.prixSupplement);
      if (!(ps !== null && ps >= 0)) return `Équipement ${i + 1} : le supplément doit être un nombre ≥ 0.`;
    }
    if (a.dureeMinutes !== "" && a.dureeMinutes !== null && a.dureeMinutes !== undefined) {
      const dm = entierOuNull(a.dureeMinutes);
      if (!(dm !== null && dm > 0)) return `Équipement ${i + 1} : la durée doit être un entier > 0.`;
    }
  }
  return null;
}

export default function AdminChateauEdition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chateau, setChateau] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { ok, texte }
  const [statut, setStatut] = useState(null); // 'brouillon' | 'publie' | 'archive'
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState(null); // { type: 'manques'|'ok'|'erreur', bloquants?, avertissements?, texte? }
  const [confirmSuppr, setConfirmSuppr] = useState(false);
  const [nomConfirm, setNomConfirm] = useState("");
  const [suppr, setSuppr] = useState(false);
  const [supprErreur, setSupprErreur] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getChateauAdminById(id)
      .then((c) => {
        if (cancelled) return;
        setChateau(c);
        setForm(formFromChateau(c));
        setStatut(c.statut);
      })
      .catch((e) => {
        if (!cancelled) setErreur(e.message || "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Handlers base
  const setChamp = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setCheck = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.checked }));
  const setCoord = (key) => (e) =>
    setForm((f) => ({ ...f, coordonnees: { ...f.coordonnees, [key]: e.target.value } }));
  const setProp = (key) => (e) =>
    setForm((f) => ({ ...f, proprietaires: { ...f.proprietaires, [key]: e.target.value } }));

  // Handlers filles (liste dynamique)
  const majFille = (section, index, key, value) =>
    setForm((f) => ({
      ...f,
      [section]: f[section].map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  const supprimerFille = (section, index) =>
    setForm((f) => ({ ...f, [section]: f[section].filter((_, i) => i !== index) }));
  const ajouterFille = (section, vierge) =>
    setForm((f) => ({ ...f, [section]: [...f[section], vierge] }));

  // Handlers galerie images[] (tableau de chaînes)
  const majImage = (index, value) =>
    setForm((f) => ({ ...f, images: f.images.map((im, i) => (i === index ? value : im)) }));
  const supprimerImage = (index) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  const ajouterImage = () => setForm((f) => ({ ...f, images: [...f.images, ""] }));

  const handleSave = async (e) => {
    e.preventDefault();
    const err = validerForm(form);
    if (err) {
      setSaveMsg({ ok: false, texte: err });
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveChateauComplet(id, {
        base: preparerBase(form),
        chambres: form.chambres.map(preparerChambre),
        timeline: form.timeline,
        alentours: form.alentours,
        amenities: form.amenities.map(preparerAmenity),
      });
      setSaveMsg({ ok: true, texte: "Modifications enregistrées." });
    } catch (err) {
      setSaveMsg({ ok: false, texte: err.message || "Échec de l'enregistrement." });
    } finally {
      setSaving(false);
    }
  };

  // Publier : valide la complétude côté client, refuse si bloquants, confirme
  // si avertissements, puis passe le statut à 'publie'.
  const handlePublier = async () => {
    const { bloquants, avertissements } = validerPublication(form);
    if (bloquants.length > 0) {
      setPublishMsg({ type: "manques", bloquants, avertissements });
      return;
    }
    if (avertissements.length > 0) {
      const ok = window.confirm(
        `${avertissements.length} avertissement(s) :\n\n` +
        avertissements.join("\n") +
        "\n\nPublier malgré ces avertissements ?"
      );
      if (!ok) {
        setPublishMsg({ type: "manques", bloquants: [], avertissements });
        return;
      }
    }
    setPublishing(true);
    setPublishMsg(null);
    try {
      await updateStatut(id, "publie");
      setStatut("publie");
      setPublishMsg({ type: "ok", texte: "Château publié." });
    } catch (err) {
      setPublishMsg({ type: "erreur", texte: err.message || "Échec de la publication." });
    } finally {
      setPublishing(false);
    }
  };

  const handleDepublier = async () => {
    setPublishing(true);
    setPublishMsg(null);
    try {
      await updateStatut(id, "brouillon");
      setStatut("brouillon");
      setPublishMsg({ type: "ok", texte: "Château repassé en brouillon." });
    } catch (err) {
      setPublishMsg({ type: "erreur", texte: err.message || "Échec de la dépublication." });
    } finally {
      setPublishing(false);
    }
  };

  const handleSupprimer = async () => {
    setSuppr(true);
    setSupprErreur(null);
    try {
      await deleteChateau(id);
      navigate("/admin/chateaux");
    } catch (err) {
      setSupprErreur(err.message || "Échec de la suppression.");
      setSuppr(false); // on reste sur place pour montrer l'erreur
    }
  };

  if (loading) return <div className="adm-page"><p className="adm-page-note">Chargement…</p></div>;
  if (erreur) return <div className="adm-page"><p className="adm-erreur">{erreur}</p></div>;
  if (!form) return null;

  return (
    <div className="adm-page">
      <div className="adm-page-tete">
        <h1 className="adm-page-titre">Éditer — {chateau.nom}</h1>
        <div className="adm-tete-actions">
          <span className={"adm-badge adm-badge--" + statut}>{LIBELLE_STATUT[statut] || statut}</span>
          {statut === "brouillon" && (
            <button type="button" className="adm-btn adm-btn--primary" onClick={handlePublier} disabled={publishing}>
              {publishing ? "Publication…" : "Publier"}
            </button>
          )}
          {statut === "publie" && (
            <button type="button" className="adm-btn" onClick={handleDepublier} disabled={publishing}>
              {publishing ? "…" : "Dépublier"}
            </button>
          )}
          <Link to={`/admin/chateaux/${id}/apercu`} className="adm-btn">Prévisualiser</Link>
          <Link to="/admin/chateaux" className="adm-lien">← Retour à la liste</Link>
        </div>
      </div>

      {publishMsg && publishMsg.type === "manques" && (
        <div className="adm-manques">
          {publishMsg.bloquants.length > 0 && (
            <>
              <p className="adm-manques-titre adm-manques-titre--bloquant">
                Publication impossible — à corriger :
              </p>
              <ul className="adm-manques-liste">
                {publishMsg.bloquants.map((m, i) => (
                  <li key={i} className="adm-manque--bloquant">{m}</li>
                ))}
              </ul>
            </>
          )}
          {publishMsg.avertissements.length > 0 && (
            <>
              <p className="adm-manques-titre adm-manques-titre--avert">Avertissements :</p>
              <ul className="adm-manques-liste">
                {publishMsg.avertissements.map((m, i) => (
                  <li key={i} className="adm-manque--avert">{m}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {publishMsg && publishMsg.type === "ok" && (
        <p className="adm-msg adm-msg--ok">{publishMsg.texte}</p>
      )}
      {publishMsg && publishMsg.type === "erreur" && (
        <p className="adm-msg adm-msg--erreur">{publishMsg.texte}</p>
      )}

      <form className="adm-form" onSubmit={handleSave}>
        <section className="adm-section">
          <h2 className="adm-section-titre">Identité</h2>
          <Champ label="Nom" value={form.nom} onChange={setChamp("nom")} />
          <Champ label="Slug" value={form.slug} onChange={setChamp("slug")} />
          <Champ label="Accroche" value={form.accroche} onChange={setChamp("accroche")} />
          <Champ label="Siècle" value={form.siecle} onChange={setChamp("siecle")} />
          <Champ label="Style" value={form.style} onChange={setChamp("style")} />
          <Champ label="Urgence" value={form.urgence} onChange={setChamp("urgence")} />
        </section>

        <section className="adm-section">
          <h2 className="adm-section-titre">Localisation</h2>
          <Champ label="Région" value={form.region} onChange={setChamp("region")} />
          <Champ label="Département" value={form.departement} onChange={setChamp("departement")} />
          <Champ label="Ville" value={form.ville} onChange={setChamp("ville")} />
          <Champ label="Distance Paris (label)" value={form.distanceParis} onChange={setChamp("distanceParis")} />
          <Champ label="Distance Paris (minutes)" type="number" value={form.distanceParisMinutes} onChange={setChamp("distanceParisMinutes")} />
          <Champ label="Latitude" type="number" value={form.coordonnees.lat} onChange={setCoord("lat")} />
          <Champ label="Longitude" type="number" value={form.coordonnees.lng} onChange={setCoord("lng")} />
        </section>

        <section className="adm-section">
          <h2 className="adm-section-titre">Éditorial</h2>
          <ChampZone label="Histoire" value={form.histoire} onChange={setChamp("histoire")} rows={6} />
          <ChampZone label="Description" value={form.description} onChange={setChamp("description")} rows={4} />
          <ChampZone label="Région — narratif" value={form.regionNarrative} onChange={setChamp("regionNarrative")} rows={4} />
          <ChampZone label="Région — histoire" value={form.regionHistoire} onChange={setChamp("regionHistoire")} rows={4} />
        </section>

        <section className="adm-section">
          <h2 className="adm-section-titre">Propriétaires</h2>
          <Champ label="Nom" value={form.proprietaires.nom} onChange={setProp("nom")} />
          <Champ label="Depuis" value={form.proprietaires.depuis} onChange={setProp("depuis")} />
          <Champ label="Initiale" value={form.proprietaires.initiale} onChange={setProp("initiale")} />
          <Champ label="Nom affiché" value={form.proprietaires.nomAffiche} onChange={setProp("nomAffiche")} />
          <Champ label="Portrait (chemin)" value={form.proprietaires.portrait} onChange={setProp("portrait")} />
          <BoutonTeleverser
            valeur={form.proprietaires.portrait}
            onUpload={(url) => setForm((f) => ({ ...f, proprietaires: { ...f.proprietaires, portrait: url } }))}
          />
          <ChampZone label="Citation" value={form.proprietaires.citation} onChange={setProp("citation")} rows={2} />
          <ChampZone label="Description" value={form.proprietaires.description} onChange={setProp("description")} rows={3} />
        </section>

        <section className="adm-section">
          <h2 className="adm-section-titre">Média & thème</h2>
          <Champ label="Vidéo YouTube (ID)" value={form.videoBackground} onChange={setChamp("videoBackground")} />
          <Champ label="Couleur thème" value={form.couleurTheme} onChange={setChamp("couleurTheme")} />
          <Champ label="Accent thème" value={form.accentTheme} onChange={setChamp("accentTheme")} />
        </section>

        <section className="adm-section">
          <h2 className="adm-section-titre">Mise en avant</h2>
          <ChampCase label="À la une (vitrine premium)" checked={form.estLaUne} onChange={setCheck("estLaUne")} />
          <ChampCase label="Une de la semaine (vedette)" checked={form.uneDeLaSemaine} onChange={setCheck("uneDeLaSemaine")} />
          <ChampCase label="Château de démonstration" checked={form.isDemoMock} onChange={setCheck("isDemoMock")} />
          <ChampCase label="Étoiles overlay nuit" checked={form.heroNightStars} onChange={setCheck("heroNightStars")} />
          <label className="adm-champ">
            <span className="adm-champ-label">Ordre d'affichage (home)</span>
            <input className="adm-input" type="number" value={form.ordreHome ?? ""} onChange={setChamp("ordreHome")} />
            <span className="adm-champ-aide">Section « Découvrez aussi » : plus petit = affiché en premier ; vide = à la fin.</span>
          </label>
        </section>

        {/* ── Chambres ── */}
        <section className="adm-section">
          <h2 className="adm-section-titre">Chambres</h2>
          {form.chambres.map((c, i) => (
            <div className="adm-fille" key={i}>
              <div className="adm-fille-tete">
                <span className="adm-fille-num">Chambre {i + 1}</span>
                <button type="button" className="adm-btn-suppr" onClick={() => supprimerFille("chambres", i)}>Supprimer</button>
              </div>
              <Champ label="Nom" value={c.nom} onChange={(e) => majFille("chambres", i, "nom", e.target.value)} />
              <Champ label="Prix (€/nuit)" type="number" value={c.prix} onChange={(e) => majFille("chambres", i, "prix", e.target.value)} />
              <Champ label="Capacité (1-20)" type="number" value={c.capacite} onChange={(e) => majFille("chambres", i, "capacite", e.target.value)} />
              <Champ label="Superficie" value={c.superficie} onChange={(e) => majFille("chambres", i, "superficie", e.target.value)} />
              <Champ label="Image (URL)" value={c.image} onChange={(e) => majFille("chambres", i, "image", e.target.value)} />
              <BoutonTeleverser valeur={c.image} onUpload={(url) => majFille("chambres", i, "image", url)} />
              <ChampZone label="Description" value={c.description} onChange={(e) => majFille("chambres", i, "description", e.target.value)} rows={2} />
              <label className="adm-champ">
                <span className="adm-champ-label">Équipements (un par ligne)</span>
                <textarea className="adm-textarea" rows={3} value={(c.equipements ?? []).join("\n")} onChange={(e) => majFille("chambres", i, "equipements", e.target.value.split("\n"))} />
              </label>
            </div>
          ))}
          <button type="button" className="adm-btn-ajouter" onClick={() => ajouterFille("chambres", { nom: "", prix: null, capacite: 1, description: "", superficie: "", image: "", equipements: [] })}>+ Ajouter une chambre</button>
        </section>

        {/* ── Timeline ── */}
        <section className="adm-section">
          <h2 className="adm-section-titre">Chronologie</h2>
          {form.timeline.map((t, i) => (
            <div className="adm-fille" key={i}>
              <div className="adm-fille-tete">
                <span className="adm-fille-num">Événement {i + 1}</span>
                <button type="button" className="adm-btn-suppr" onClick={() => supprimerFille("timeline", i)}>Supprimer</button>
              </div>
              <Champ label="Année" value={t.annee} onChange={(e) => majFille("timeline", i, "annee", e.target.value)} />
              <ChampZone label="Événement" value={t.evenement} onChange={(e) => majFille("timeline", i, "evenement", e.target.value)} rows={2} />
            </div>
          ))}
          <button type="button" className="adm-btn-ajouter" onClick={() => ajouterFille("timeline", { annee: "", evenement: "" })}>+ Ajouter un événement</button>
        </section>

        {/* ── Alentours ── */}
        <section className="adm-section">
          <h2 className="adm-section-titre">Alentours</h2>
          {form.alentours.map((a, i) => (
            <div className="adm-fille" key={i}>
              <div className="adm-fille-tete">
                <span className="adm-fille-num">Alentour {i + 1}</span>
                <button type="button" className="adm-btn-suppr" onClick={() => supprimerFille("alentours", i)}>Supprimer</button>
              </div>
              <Champ label="Nom" value={a.nom} onChange={(e) => majFille("alentours", i, "nom", e.target.value)} />
              <ChampSelect label="Type" value={a.type} onChange={(e) => majFille("alentours", i, "type", e.target.value)} options={ALENTOUR_TYPES} />
              <Champ label="Distance" value={a.distance} onChange={(e) => majFille("alentours", i, "distance", e.target.value)} />
              <Champ label="Icône" value={a.icone} onChange={(e) => majFille("alentours", i, "icone", e.target.value)} />
              <ChampZone label="Description" value={a.description} onChange={(e) => majFille("alentours", i, "description", e.target.value)} rows={2} />
            </div>
          ))}
          <button type="button" className="adm-btn-ajouter" onClick={() => ajouterFille("alentours", { nom: "", type: "patrimoine", distance: "", icone: "", description: "" })}>+ Ajouter un alentour</button>
        </section>

        {/* ── Amenities ── */}
        <section className="adm-section">
          <h2 className="adm-section-titre">Équipements & activités</h2>
          {form.amenities.map((a, i) => (
            <div className="adm-fille" key={i}>
              <div className="adm-fille-tete">
                <span className="adm-fille-num">Équipement {i + 1}</span>
                <button type="button" className="adm-btn-suppr" onClick={() => supprimerFille("amenities", i)}>Supprimer</button>
              </div>
              <ChampSelect label="Type" value={a.type} onChange={(e) => majFille("amenities", i, "type", e.target.value)} options={AMENITY_TYPES} />
              <Champ label="Nom" value={a.nom} onChange={(e) => majFille("amenities", i, "nom", e.target.value)} />
              <ChampZone label="Description" value={a.description} onChange={(e) => majFille("amenities", i, "description", e.target.value)} rows={2} />
              <Champ label="Icône" value={a.icone} onChange={(e) => majFille("amenities", i, "icone", e.target.value)} />
              <ChampCase label="Inclus dans le prix" checked={a.inclus === true} onChange={(e) => majFille("amenities", i, "inclus", e.target.checked)} />
              <Champ label="Supplément (€, optionnel)" type="number" value={a.prixSupplement} onChange={(e) => majFille("amenities", i, "prixSupplement", e.target.value)} />
              <Champ label="Durée (minutes, optionnel)" type="number" value={a.dureeMinutes} onChange={(e) => majFille("amenities", i, "dureeMinutes", e.target.value)} />
            </div>
          ))}
          <button type="button" className="adm-btn-ajouter" onClick={() => ajouterFille("amenities", { type: "service", nom: "", description: "", icone: "", inclus: true, prixSupplement: null, dureeMinutes: null })}>+ Ajouter un équipement</button>
        </section>

        {/* ── Galerie images (éditable, avec téléversement) ── */}
        <section className="adm-section">
          <h2 className="adm-section-titre">Images (galerie)</h2>
          {form.images.map((im, i) => (
            <div className="adm-fille" key={i}>
              <div className="adm-fille-tete">
                <span className="adm-fille-num">Image {i + 1}</span>
                <button type="button" className="adm-btn-suppr" onClick={() => supprimerImage(i)}>Supprimer</button>
              </div>
              <Champ label="URL / chemin" value={im} onChange={(e) => majImage(i, e.target.value)} />
              <BoutonTeleverser valeur={im} onUpload={(url) => majImage(i, url)} />
            </div>
          ))}
          <button type="button" className="adm-btn-ajouter" onClick={ajouterImage}>+ Ajouter une image</button>
        </section>

        {/* ── Chiffres clés (lecture seule) ── */}
        <section className="adm-section">
          <h2 className="adm-section-titre">Chiffres clés <span className="adm-section-note">(lecture seule)</span></h2>
          <label className="adm-champ">
            <span className="adm-champ-label">Chiffres clés</span>
            <textarea className="adm-textarea adm-lecture-seule" readOnly rows={3} value={JSON.stringify(form.chiffresCles, null, 2)} />
          </label>
        </section>

        {saveMsg && (
          <p className={"adm-msg " + (saveMsg.ok ? "adm-msg--ok" : "adm-msg--erreur")}>
            {saveMsg.texte}
          </p>
        )}

        <div className="adm-boutons">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link to="/admin/chateaux" className="adm-btn">Annuler</Link>
        </div>
      </form>

      <section className="adm-danger">
        <h2 className="adm-danger-titre">Zone dangereuse</h2>
        {!confirmSuppr ? (
          <button
            type="button"
            className="adm-btn-danger"
            onClick={() => { setConfirmSuppr(true); setNomConfirm(""); setSupprErreur(null); }}
          >
            Supprimer ce château
          </button>
        ) : (
          <div className="adm-danger-confirm">
            <p className="adm-danger-note">
              Action irréversible. Les chambres, la chronologie, les alentours et les
              équipements seront supprimés, et les images téléversées retirées du stockage.
            </p>
            <label className="adm-champ">
              <span className="adm-champ-label">
                Retape le nom exact pour confirmer : <strong>{chateau.nom}</strong>
              </span>
              <input
                className="adm-input"
                type="text"
                value={nomConfirm}
                onChange={(e) => setNomConfirm(e.target.value)}
              />
            </label>
            {supprErreur && <p className="adm-msg adm-msg--erreur">{supprErreur}</p>}
            <div className="adm-boutons">
              <button
                type="button"
                className="adm-btn-danger"
                onClick={handleSupprimer}
                disabled={suppr || nomConfirm !== chateau.nom}
              >
                {suppr ? "Suppression…" : "Confirmer la suppression"}
              </button>
              <button
                type="button"
                className="adm-btn"
                onClick={() => setConfirmSuppr(false)}
                disabled={suppr}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
