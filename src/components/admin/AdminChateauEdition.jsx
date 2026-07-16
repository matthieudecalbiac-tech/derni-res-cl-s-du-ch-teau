import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getChateauAdminById, saveChateauComplet, updateStatut, deleteChateau, getEquipements, getPersonnages } from "../../services/chateauxService";
import { validerPublication } from "../../utils/validerPublication";
import { CATEGORIES as AMENITY_CATEGORIES } from "../../utils/categories";
import { NATURES } from "../../utils/personnages";
import BoutonTeleverser from "./BoutonTeleverser";
import ChampCase from "../ChampCase";
import ChampEquipements from "../ChampEquipements";
import ChampPersonnage from "../ChampPersonnage";

const LIBELLE_STATUT = { brouillon: "Brouillon", publie: "Publié", archive: "Archivé" };

// Édition d'un château (chantier admin, brique 4b : base + 4 tables filles).
// Les filles (chambres/timeline/alentours/amenities) sont chargées en forme
// React via getChateauAdminById, éditées ici comme des listes dynamiques, et
// renvoyées à saveChateauComplet (contrat REPLACE : le form est la source).

// Valeurs fermées des enums Postgres (cf. schema.sql).
const ALENTOUR_TYPES = ["patrimoine", "gastronomie", "nature", "spirituel", "sport", "village", "culture", "histoire"];
const AMENITY_TYPES = ["service", "activite"];
// Categorie editoriale (liste fermee, nullable) : le referentiel vit desormais
// dans src/utils/categories.js (source unique admin + front). Importe ci-dessus
// et aliase AMENITY_CATEGORIES pour le select ChampSelect ({value,label}).

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

// options : soit un tableau de chaines (value === label, retrocompat), soit un
// tableau de paires { value, label } (libelles lisibles). optionVide : ajoute
// une option vide en tete (value "") — true => libelle "— Aucune —", ou passer
// une chaine pour un libelle custom. Sert aux champs nullable (categorie).
function ChampSelect({ label, value, onChange, options, optionVide }) {
  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  const labelVide = typeof optionVide === "string" ? optionVide : "— Aucune —";
  return (
    <label className="adm-champ">
      <span className="adm-champ-label">{label}</span>
      <select className="adm-input" value={value} onChange={onChange}>
        {optionVide && <option value="">{labelVide}</option>}
        {items.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
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
    // equipements : normalise en SLUGS des le chargement (mapAmenity donne des
    // objets {slug,libelle}) -> le form manipule des slugs, le referentiel fournit
    // les libelles a l'affichage. Toggle et amenityToRow travaillent sur des slugs.
    amenities: (c.amenities ?? []).map((x) => ({
      ...x,
      equipements: (x.equipements ?? [])
        .map((e) => (typeof e === "string" ? e : e?.slug))
        .filter(Boolean),
    })),
    // Histoire des lieux : on ne garde que ce que le form édite (nom/nature/texte).
    // id/slug/ordre viennent de la lecture mais ne repartent pas (slug recalculé,
    // ordre = index à l'envoi via personnageToRow).
    personnages: (c.personnages ?? []).map((x) => ({
      nom: x.nom ?? "",
      nature: x.nature ?? NATURES[0].value,
      texte: x.texte ?? "",
    })),
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
// texte : vide -> null (colonne nullable) ; nom/nature validés en amont.
const preparerPersonnage = (p) => ({
  nom: p.nom,
  nature: p.nature,
  texte: videOuNull(p.texte),
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
  for (const [i, p] of form.personnages.entries()) {
    if (estVide(p.nom)) return `Histoire des lieux ${i + 1} : choisis ou crée un personnage.`;
    if (estVide(p.nature)) return `Histoire des lieux ${i + 1} : la nature du lien est requise.`;
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
  // Referentiel d'equipements (slug, libelle, ordre), charge UNE fois au montage
  // (pas par amenity) et partage a toutes les cases ChampEquipements.
  const [equipementsRef, setEquipementsRef] = useState([]);
  // Referentiel des personnages (id, nom, slug), charge UNE fois au montage,
  // partage au sélecteur avec recherche de chaque rangee "Histoire des lieux".
  const [personnagesRef, setPersonnagesRef] = useState([]);
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

  // Referentiel equipements : chargement unique au montage (independant de l'id).
  useEffect(() => {
    let cancelled = false;
    getEquipements()
      .then((liste) => { if (!cancelled) setEquipementsRef(liste); })
      .catch((e) => console.error("[AdminChateauEdition] getEquipements:", e));
    return () => { cancelled = true; };
  }, []);

  // Referentiel personnages : chargement unique au montage (independant de l'id).
  useEffect(() => {
    let cancelled = false;
    getPersonnages()
      .then((liste) => { if (!cancelled) setPersonnagesRef(liste); })
      .catch((e) => console.error("[AdminChateauEdition] getPersonnages:", e));
    return () => { cancelled = true; };
  }, []);

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
  // Déplace une rangée d'une position (delta -1 = ↑, +1 = ↓) en l'échangeant
  // avec sa voisine. Générique comme les autres handlers filles : timeline et
  // alentours ont le même besoin latent — brancher les flèches ailleurs ne
  // demandera pas de réécrire ce helper. No-op si la cible sort des bornes
  // (garde en plus des boutons désactivés). L'ordre en base = l'index du tableau
  // (personnageToRow pose ordre = index, la RPC REPLACE réinsère dans cet ordre)
  // → réordonner le state suffit, rien à changer côté service ni RPC.
  const deplacerFille = (section, index, delta) =>
    setForm((f) => {
      const arr = f[section];
      const cible = index + delta;
      if (cible < 0 || cible >= arr.length) return f;
      const copie = [...arr];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return { ...f, [section]: copie };
    });

  // Bascule un equipement (slug) sur l'amenity d'index i : ajoute s'il manque,
  // retire sinon. Le form stocke des slugs (cf. formFromChateau normalisation).
  const toggleEquipement = (index, slug) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.map((a, i) => {
        if (i !== index) return a;
        const cur = a.equipements ?? [];
        const equipements = cur.includes(slug)
          ? cur.filter((s) => s !== slug)
          : [...cur, slug];
        return { ...a, equipements };
      }),
    }));

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
        personnages: form.personnages.map(preparerPersonnage),
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
              <ChampSelect label="Catégorie" value={a.categorie ?? ""} options={AMENITY_CATEGORIES} optionVide onChange={(e) => majFille("amenities", i, "categorie", e.target.value)} />
              <Champ label="Nom" value={a.nom} onChange={(e) => majFille("amenities", i, "nom", e.target.value)} />
              <ChampZone label="Description" value={a.description} onChange={(e) => majFille("amenities", i, "description", e.target.value)} rows={2} />
              <Champ label="Icône" value={a.icone} onChange={(e) => majFille("amenities", i, "icone", e.target.value)} />
              <Champ label="Image (URL)" value={a.image ?? ""} onChange={(e) => majFille("amenities", i, "image", e.target.value)} />
              <BoutonTeleverser valeur={a.image} onUpload={(url) => majFille("amenities", i, "image", url)} />
              <ChampCase label="Inclus dans le prix" checked={a.inclus === true} onChange={(e) => majFille("amenities", i, "inclus", e.target.checked)} />
              <Champ label="Supplément (€, optionnel)" type="number" value={a.prixSupplement} onChange={(e) => majFille("amenities", i, "prixSupplement", e.target.value)} />
              <Champ label="Durée (minutes, optionnel)" type="number" value={a.dureeMinutes} onChange={(e) => majFille("amenities", i, "dureeMinutes", e.target.value)} />
              <ChampEquipements referentiel={equipementsRef} selection={a.equipements ?? []} onToggle={(slug) => toggleEquipement(i, slug)} />
            </div>
          ))}
          <button type="button" className="adm-btn-ajouter" onClick={() => ajouterFille("amenities", { type: "service", categorie: "", nom: "", description: "", icone: "", image: "", inclus: true, prixSupplement: null, dureeMinutes: null, equipements: [] })}>+ Ajouter un équipement</button>
        </section>

        {/* ── Histoire des lieux (personnages & événements) ── */}
        <section className="adm-section">
          <h2 className="adm-section-titre">Histoire des lieux</h2>
          {form.personnages.map((p, i) => (
            <div className="adm-fille" key={i}>
              <div className="adm-fille-tete">
                <span className="adm-fille-num">Personnage {i + 1}</span>
                <div className="adm-fille-actions">
                  <button type="button" className="adm-btn-ordre" disabled={i === 0} aria-label="Monter d'un rang" onClick={() => deplacerFille("personnages", i, -1)}>↑</button>
                  <button type="button" className="adm-btn-ordre" disabled={i === form.personnages.length - 1} aria-label="Descendre d'un rang" onClick={() => deplacerFille("personnages", i, +1)}>↓</button>
                  <button type="button" className="adm-btn-suppr" onClick={() => supprimerFille("personnages", i)}>Supprimer</button>
                </div>
              </div>
              <ChampPersonnage
                referentiel={personnagesRef}
                valeur={p.nom}
                onChoisir={(nom) => majFille("personnages", i, "nom", nom)}
              />
              <ChampSelect label="Nature du lien" value={p.nature} options={NATURES} onChange={(e) => majFille("personnages", i, "nature", e.target.value)} />
              <ChampZone label="Lien éditorial (optionnel)" value={p.texte} onChange={(e) => majFille("personnages", i, "texte", e.target.value)} rows={3} />
            </div>
          ))}
          <button type="button" className="adm-btn-ajouter" onClick={() => ajouterFille("personnages", { nom: "", nature: NATURES[0].value, texte: "" })}>+ Ajouter un personnage</button>
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
