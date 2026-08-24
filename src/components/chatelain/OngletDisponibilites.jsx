import { useState, useEffect, useMemo } from "react";
import PanneauDisponibilites from "../PanneauDisponibilites";
import { getMesChateaux } from "../../services/chatelainService";

// ═══════════════════════════════════════════════════════════════════════════
// L'onglet « Disponibilités » de l'espace châtelain (3.4c, allégé en 3.5a)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠ CE FICHIER A PERDU LES DEUX TIERS DE SON CORPS, ET N'A RIEN PERDU D'AUTRE.
// Tout ce qui touchait aux dates — le mois, les lignes, l'écriture, la
// navigation, le garde, la grille — a migré dans PanneauDisponibilites, sans
// changer d'un caractère. Il ne reste ici que ce qui est PROPRE AU CHÂTELAIN :
// « quels sont MES domaines », et ce qu'on lui dit quand il n'en a aucun.
//
// LA FRONTIÈRE : cet écran sait QUI regarde, le panneau sait QUOI afficher.
// C'est ce qui permet à l'écran admin (3.5b) de réutiliser le second sans
// emporter le premier — l'admin ne lit pas « ses » châteaux, il lit celui de
// l'URL.
// ═══════════════════════════════════════════════════════════════════════════

export default function OngletDisponibilites() {
  const [chateaux, setChateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [chateauId, setChateauId] = useState(null);

  // ── Les domaines du châtelain ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getMesChateaux()
      .then((liste) => {
        if (cancelled) return;
        setChateaux(liste);
        // Auto-sélection : un châtelain n'a le plus souvent qu'un domaine, et
        // lui demander de le choisir serait une étape pour rien.
        setChateauId(liste[0]?.id ?? null);
      })
      .catch((e) => {
        if (!cancelled) setErreur(e?.message || "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chateau = useMemo(
    () => chateaux.find((c) => c.id === chateauId) ?? null,
    [chateaux, chateauId],
  );

  if (loading) {
    return <p className="che-note">Chargement de vos domaines…</p>;
  }

  if (erreur) {
    return <p className="che-erreur">Impossible de charger vos domaines : {erreur}</p>;
  }

  if (chateaux.length === 0) {
    // ⚠ PAS UNE ERREUR, ET PAS RARE. Mesuré le 24 août : douze châteaux sur
    //   treize n'ont aucun propriétaire. La RLS ne refuse pas, elle ne rend
    //   rien — un écran qui lirait « pas d'erreur » comme « accès accordé »
    //   afficherait une page vide au lieu d'une explication.
    return (
      <p className="che-note">
        Aucun domaine ne vous est rattaché pour le moment. Contactez Les Clés du Château.
      </p>
    );
  }

  // ⚠ UNE FONCTION, PAS UN NŒUD. Le `disabled` vient du panneau, seul à savoir
  //   qu'une écriture est en vol : on ne change pas de domaine au milieu d'un
  //   poser_disponibilites. Cf. la JSDoc de PanneauDisponibilites.
  const selecteurDomaine = (verrouille) =>
    chateaux.length > 1 ? (
      <label className="pdi-champ">
        <span className="pdi-label">Domaine</span>
        <select
          className="pdi-select"
          value={chateauId ?? ""}
          onChange={(e) => setChateauId(e.target.value)}
          disabled={verrouille}
        >
          {chateaux.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </label>
    ) : (
      // Un seul domaine : on le NOMME plutôt que d'offrir un choix qui n'en
      // est pas un. Sans ce titre, le châtelain ne saurait plus ce qu'il édite.
      <p className="pdi-domaine">{chateau.nom}</p>
    );

  return (
    <PanneauDisponibilites
      chateau={chateau}
      selecteurDomaine={selecteurDomaine}
      motifHorsGestion="La gestion des disponibilités n'est pas activée pour ce domaine. Contactez Les Clés du Château pour l'ouvrir."
      // ⚠ Le châtelain ne peut PAS poser l'horizon — il se saisit depuis
      //   l'espace admin (3.4a). Le message dit donc qui peut l'ouvrir, pas
      //   seulement ce qui manque. Côté admin (3.5b), ce même emplacement
      //   portera un lien vers la fiche : l'admin, lui, peut agir.
      motifHorizonManquant="Aucune date n'est ouverte pour ce domaine : l'horizon d'ouverture n'a pas encore été posé. Contactez Les Clés du Château pour l'ouvrir."
    />
  );
}
