import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPersonnageAdminById, updatePersonnage, deletePersonnage } from "../../services/chateauxService";
import { slugify } from "../../utils/slug";

// Édition d'un personnage du référentiel (nom + biographie). Le slug se recalcule
// depuis le nom via slugify (source unique) — jamais saisi. L'aide sous le champ
// montre le slug en direct, car le changer change l'URL publique /personnage/:slug.
// Suppression : impossible si rattaché à des châteaux (FK RESTRICT) — bouton grisé
// + message, jamais une erreur Postgres à l'écran.

export default function AdminPersonnageEdition() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [perso, setPerso] = useState(null);
  const [nom, setNom] = useState("");
  const [biographie, setBiographie] = useState("");
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { ok, texte }
  const [confirmSuppr, setConfirmSuppr] = useState(false);
  const [suppr, setSuppr] = useState(false);
  const [supprErreur, setSupprErreur] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getPersonnageAdminById(id)
      .then((p) => {
        if (cancelled) return;
        setPerso(p);
        setNom(p.nom ?? "");
        setBiographie(p.biographie ?? "");
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

  const slugPreview = slugify(nom);
  const rattache = perso && perso.nbChateaux > 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveMsg(null);
    if (nom.trim() === "") {
      setSaveMsg({ ok: false, texte: "Le nom est requis." });
      return;
    }
    if (slugPreview === "") {
      setSaveMsg({ ok: false, texte: "Ce nom ne produit aucun slug (aucun caractère alphanumérique)." });
      return;
    }
    setSaving(true);
    try {
      await updatePersonnage(id, { nom, biographie });
      setSaveMsg({ ok: true, texte: "Modifications enregistrées." });
    } catch (err) {
      setSaveMsg({ ok: false, texte: err.message || "Échec de l'enregistrement." });
    } finally {
      setSaving(false);
    }
  };

  const handleSupprimer = async () => {
    setSuppr(true);
    setSupprErreur(null);
    try {
      await deletePersonnage(id);
      navigate("/admin/personnages");
    } catch (err) {
      setSupprErreur(err.message || "Échec de la suppression.");
      setSuppr(false); // on reste sur place pour montrer l'erreur
    }
  };

  if (loading) return <div className="adm-page"><p className="adm-page-note">Chargement…</p></div>;
  if (erreur) return <div className="adm-page"><p className="adm-erreur">{erreur}</p></div>;
  if (!perso) return null;

  return (
    <div className="adm-page">
      <div className="adm-page-tete">
        <h1 className="adm-page-titre">Éditer — {perso.nom}</h1>
        <Link to="/admin/personnages" className="adm-lien">← Retour à la liste</Link>
      </div>

      <form className="adm-form" onSubmit={handleSave}>
        <section className="adm-section">
          <label className="adm-champ">
            <span className="adm-champ-label">Nom</span>
            <input className="adm-input" type="text" value={nom} onChange={(e) => setNom(e.target.value)} />
            <span className="adm-champ-aide">
              Slug (recalculé) : <code>{slugPreview || "—"}</code>. Changer le nom change l'URL publique /personnage/:slug.
            </span>
          </label>
          <label className="adm-champ">
            <span className="adm-champ-label">Biographie</span>
            <textarea className="adm-textarea" rows={6} value={biographie} onChange={(e) => setBiographie(e.target.value)} />
            <span className="adm-champ-aide">
              Appartient au personnage — vraie partout. Le lien avec un château donné se saisit sur la fiche du château.
            </span>
          </label>
        </section>

        {saveMsg && (
          <p className={"adm-msg " + (saveMsg.ok ? "adm-msg--ok" : "adm-msg--erreur")}>{saveMsg.texte}</p>
        )}

        <div className="adm-boutons">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link to="/admin/personnages" className="adm-btn">Annuler</Link>
        </div>
      </form>

      <section className="adm-danger">
        <h2 className="adm-danger-titre">Zone dangereuse</h2>
        {rattache ? (
          <>
            <button type="button" className="adm-btn-danger" disabled>Supprimer ce personnage</button>
            <p className="adm-danger-note">
              Rattaché à {perso.nbChateaux} château{perso.nbChateaux > 1 ? "x" : ""} — retire-le d'abord de
              leurs fiches (section « Histoire des lieux ») pour pouvoir le supprimer.
            </p>
          </>
        ) : !confirmSuppr ? (
          <button
            type="button"
            className="adm-btn-danger"
            onClick={() => { setConfirmSuppr(true); setSupprErreur(null); }}
          >
            Supprimer ce personnage
          </button>
        ) : (
          <div className="adm-danger-confirm">
            <p className="adm-danger-note">Action irréversible.</p>
            {supprErreur && <p className="adm-msg adm-msg--erreur">{supprErreur}</p>}
            <div className="adm-boutons">
              <button type="button" className="adm-btn-danger" onClick={handleSupprimer} disabled={suppr}>
                {suppr ? "Suppression…" : "Confirmer la suppression"}
              </button>
              <button type="button" className="adm-btn" onClick={() => setConfirmSuppr(false)} disabled={suppr}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
