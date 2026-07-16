import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPersonnagesAdmin } from "../../services/chateauxService";

// Section admin — Personnages (écran de référentiel "Histoire des lieux").
// Décalque AdminChateaux : liste seule via getPersonnagesAdmin() (nom, slug,
// nombre de châteaux rattachés), édition sur /admin/personnages/:id.
// Pas de création ici : un personnage se crée depuis la fiche d'un château
// (ChampPersonnage) ; cet écran sert à corriger nom/biographie et à supprimer.

export default function AdminPersonnages() {
  const [personnages, setPersonnages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getPersonnagesAdmin()
      .then((data) => {
        if (!cancelled) setPersonnages(data);
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
        <h1 className="adm-page-titre">Personnages</h1>
      </div>

      {loading && <p className="adm-page-note">Chargement…</p>}

      {!loading && erreur && (
        <p className="adm-erreur">Impossible de charger les personnages : {erreur}</p>
      )}

      {!loading && !erreur && personnages.length === 0 && (
        <p className="adm-page-note">
          Aucun personnage. Ils se créent depuis la fiche d'un château (section « Histoire des lieux »).
        </p>
      )}

      {!loading && !erreur && personnages.length > 0 && (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Slug</th>
              <th>Châteaux</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {personnages.map((p) => (
              <tr key={p.id}>
                <td>{p.nom}</td>
                <td>{p.slug}</td>
                <td>{p.nbChateaux}</td>
                <td>
                  <Link to={`/admin/personnages/${p.id}`} className="adm-lien">Éditer</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
