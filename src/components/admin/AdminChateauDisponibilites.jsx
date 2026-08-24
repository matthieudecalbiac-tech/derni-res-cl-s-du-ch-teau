import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getChateauAdminById } from "../../services/chateauxService";
import PanneauDisponibilites from "../PanneauDisponibilites";

// ═══════════════════════════════════════════════════════════════════════════
// L'écran admin des disponibilités (étape 3.5b) — la dernière brique
// ═══════════════════════════════════════════════════════════════════════════
//
// Calqué sur AdminChateauApercu, sa route sœur : même useParams, même
// getChateauAdminById, même bandeau de retour. Ce n'est pas une coïncidence —
// les deux écrans font la même chose (prendre le château de l'URL et le
// donner à un composant qui sait l'afficher), et suivre la forme existante
// vaut mieux qu'en inventer une seconde.
//
// ⚠ ÉCRAN À PART, PAS UNE SECTION D'AdminChateauEdition. Ce formulaire est un
// REPLACE : il envoie l'état COMPLET du château à admin_upsert_chateau. Y
// mêler une saisie par plages ferait deux modèles d'écriture dans un même
// écran — l'un tout-ou-rien, l'autre incrémental — et un « Enregistrer »
// pourrait sembler devoir valider des dates déjà écrites.
//
// ⚠ getChateauAdminById SUFFIT, ET C'EST TOUT LE GAIN DE L'ÉTAPE. Il sert
// déjà l'aperçu, il embarque `chambres(*)` que mapChateau trie par `ordre`,
// il expose `dispoGeree` (2.1) et `dispoOuverteJusquA` (3.4a), et il ne filtre
// PAS sur le statut — un brouillon est servi, ce qui est indispensable puisque
// les domaines qu'on prépare n'ont pas encore été publiés. Aucune fonction de
// service, aucune migration, aucune policy n'a été ajoutée pour cet écran.
//
// LA GARDE EST PORTÉE PAR LA ROUTE PARENTE (/admin -> RequireAuth +
// RequireRole admin + AdminLayout). Rien à redéclarer ici.
// ═══════════════════════════════════════════════════════════════════════════

const LIBELLE_STATUT = { brouillon: "brouillon (non publié)", publie: "publié", archive: "archivé" };

export default function AdminChateauDisponibilites() {
  const { id } = useParams();
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

  // ⚠ LES DEUX MOTIFS RENVOIENT VERS LA FICHE, PAS VERS « CONTACTEZ-NOUS ».
  //   Côté châtelain, ce texte l'oriente vers LCC parce qu'il ne peut agir ni
  //   sur le drapeau ni sur l'horizon. L'admin, LUI, EST LCC : lui servir le
  //   même message le laisserait devant une grille grise sans lui dire que le
  //   remède est à un clic — dans la fiche qu'il vient de quitter. C'est ce qui
  //   ferme la boucle ouverte en 3.4a : le trou de l'horizon n'est comblé que
  //   si l'écran qui en souffre dit où le combler.
  const versFiche = `/admin/chateaux/${id}`;

  return (
    <div className="adm-page">
      <div className="adm-page-tete">
        <h1 className="adm-page-titre">Disponibilités — {chateau.nom}</h1>
        <div className="adm-tete-actions">
          <span className={"adm-badge adm-badge--" + chateau.statut}>
            {LIBELLE_STATUT[chateau.statut] || chateau.statut}
          </span>
          <Link to={versFiche} className="adm-lien">← Retour à l&apos;édition</Link>
        </div>
      </div>

      <PanneauDisponibilites
        chateau={chateau}
        // Le château est fixé par l'URL et nommé par le titre ci-dessus : un
        // sélecteur de domaine n'aurait rien à proposer, et répéter le nom
        // juste en dessous serait du bruit.
        selecteurDomaine={null}
        motifHorsGestion={
          <>
            La gestion des disponibilités n&apos;est pas activée pour ce château.{" "}
            <Link to={versFiche}>Activez-la depuis la fiche</Link>.
          </>
        }
        motifHorizonManquant={
          <>
            Aucune date n&apos;est ouverte : l&apos;horizon d&apos;ouverture n&apos;a pas
            encore été posé. <Link to={versFiche}>Posez-le depuis la fiche</Link>.
          </>
        }
        piedHorizon={(jusquA) => (
          <>
            Les dates de ce domaine sont ouvertes jusqu&apos;au <strong>{jusquA}</strong>.
            Au-delà, plus aucune nuit n&apos;est réservable tant que l&apos;horizon n&apos;est
            pas déplacé depuis la fiche.
          </>
        )}
      />
    </div>
  );
}
