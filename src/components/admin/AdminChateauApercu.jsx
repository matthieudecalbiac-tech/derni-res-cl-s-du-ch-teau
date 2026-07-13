import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getChateauAdminById } from "../../services/chateauxService";
import VitrineChateau from "../VitrineChateau";

// Aperçu admin d'un château (chantier prévisualisation brouillon).
// La vitrine publique /chateau/:slug filtre statut=publie → un brouillon y est
// invisible. Ici on charge via getChateauAdminById (brouillon compris, gardé par
// RequireRole admin) et on rend le MÊME composant VitrineChateau, mode "route".
// Rien n'est publié ; c'est juste un rendu de prévisualisation.

const LIBELLE_STATUT = { brouillon: "brouillon (non publié)", publie: "publié", archive: "archivé" };

export default function AdminChateauApercu() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chateau, setChateau] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getChateauAdminById(id)
      .then((c) => {
        if (!cancelled) setChateau(c);
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

  if (loading) return <div className="adm-page"><p className="adm-page-note">Chargement…</p></div>;
  if (erreur) return <div className="adm-page"><p className="adm-erreur">{erreur}</p></div>;
  if (!chateau) return null;

  return (
    <>
      <div className="adm-apercu-bandeau">
        <span className="adm-apercu-label">
          Aperçu admin — {LIBELLE_STATUT[chateau.statut] || chateau.statut}
        </span>
        <Link to={`/admin/chateaux/${id}`} className="adm-apercu-retour">← Retour à l'édition</Link>
      </div>
      <VitrineChateau
        chateau={chateau}
        mode="route"
        onClose={() => navigate(`/admin/chateaux/${id}`)}
      />
    </>
  );
}
