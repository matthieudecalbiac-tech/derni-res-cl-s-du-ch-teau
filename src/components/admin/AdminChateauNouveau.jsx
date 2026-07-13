import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createChateau } from "../../services/chateauxService";

// Création d'une coquille de château (chantier admin, brique createChateau).
// Deux champs : nom + slug. Le slug s'auto-génère depuis le nom TANT QUE l'admin
// ne l'a pas modifié à la main (flag `slugTouche`). createChateau insère la
// ligne, puis on redirige vers le formulaire d'édition existant pour le reste.

// Slugifie une chaîne française : décompose les accents (é→e, ç→c…), retire les
// diacritiques via la propriété Unicode \p{Diacritic}, apostrophes et
// caractères spéciaux → tirets, minuscules.
function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")    // retire les accents combinants
    .toLowerCase()
    .replace(/['’]/g, " ")             // apostrophes → séparateur
    .replace(/[^a-z0-9]+/g, "-")       // espaces, ponctuation, reste → tiret
    .replace(/^-+|-+$/g, "");          // pas de tiret en tête / fin
}

export default function AdminChateauNouveau() {
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouche, setSlugTouche] = useState(false); // true dès que l'admin édite le slug
  const [creating, setCreating] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Le nom pilote le slug tant que ce dernier n'a pas été touché à la main.
  const onNomChange = (e) => {
    const v = e.target.value;
    setNom(v);
    if (!slugTouche) setSlug(slugify(v));
  };

  // Dès que l'admin modifie le slug, on cesse de l'auto-remplir.
  const onSlugChange = (e) => {
    setSlug(e.target.value);
    setSlugTouche(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setErreur(null);
    if (nom.trim() === "") { setErreur("Le nom est requis."); return; }
    if (slug.trim() === "") { setErreur("Le slug est requis."); return; }
    setCreating(true);
    try {
      const data = await createChateau(nom, slug);
      // Le formulaire d'édition existant prend le relais sur la coquille.
      navigate("/admin/chateaux/" + data.id);
    } catch (err) {
      setErreur(err.message || "Échec de la création.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-tete">
        <h1 className="adm-page-titre">Nouveau château</h1>
        <Link to="/admin/chateaux" className="adm-lien">← Retour à la liste</Link>
      </div>

      <form className="adm-form" onSubmit={handleCreate}>
        <section className="adm-section">
          <label className="adm-champ">
            <span className="adm-champ-label">Nom</span>
            <input className="adm-input" type="text" value={nom} onChange={onNomChange} />
          </label>
          <label className="adm-champ">
            <span className="adm-champ-label">Slug (URL)</span>
            <input className="adm-input" type="text" value={slug} onChange={onSlugChange} />
            <span className="adm-champ-aide">
              Généré depuis le nom, modifiable. Minuscules, tirets, sans accents. Doit être unique.
            </span>
          </label>
        </section>

        {erreur && <p className="adm-msg adm-msg--erreur">{erreur}</p>}

        <div className="adm-boutons">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={creating}>
            {creating ? "Création…" : "Créer"}
          </button>
          <Link to="/admin/chateaux" className="adm-btn">Annuler</Link>
        </div>
      </form>
    </div>
  );
}
