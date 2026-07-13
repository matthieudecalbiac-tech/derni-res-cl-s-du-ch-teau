import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getChateauxAdmin } from "../../services/chateauxService";

// Section admin — Châteaux (chantier admin, brique châteaux 2a : lecture seule).
// Liste TOUS les châteaux, brouillons compris, via getChateauxAdmin() (sans
// filtre statut, sans cache — cf. service). L'édition arrive en brique 2c.

const LIBELLE_STATUT = {
  brouillon: "Brouillon",
  publie: "Publié",
  archive: "Archivé",
};

export default function AdminChateaux() {
  const [chateaux, setChateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getChateauxAdmin()
      .then((data) => {
        if (!cancelled) setChateaux(data);
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
  }, []);

  return (
    <div className="adm-page">
      <div className="adm-page-tete">
        <h1 className="adm-page-titre">Châteaux</h1>
        <Link to="/admin/chateaux/nouveau" className="adm-btn adm-btn--primary">+ Nouveau château</Link>
      </div>

      {loading && <p className="adm-page-note">Chargement…</p>}

      {!loading && erreur && (
        <p className="adm-erreur">Impossible de charger les châteaux : {erreur}</p>
      )}

      {!loading && !erreur && chateaux.length === 0 && (
        <p className="adm-page-note">Aucun château.</p>
      )}

      {!loading && !erreur && chateaux.length > 0 && (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Région</th>
              <th>Statut</th>
              <th>Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {chateaux.map((c) => (
              <tr key={c.id}>
                <td>{c.nom}</td>
                <td>{c.region || "—"}</td>
                <td>
                  <span className={"adm-badge adm-badge--" + c.statut}>
                    {LIBELLE_STATUT[c.statut] || c.statut}
                  </span>
                </td>
                <td>{c.is_demo_mock ? "Démo" : "Réel"}</td>
                <td>
                  <Link to={`/admin/chateaux/${c.id}`} className="adm-lien">Éditer</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
