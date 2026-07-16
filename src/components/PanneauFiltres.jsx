import { useState, useEffect } from "react";
import { getEquipements } from "../services/chateauxService";
import GrilleEquipements from "./GrilleEquipements";
import "../styles/panneau-filtres.css";

// Panneau "+ Filtres" — contenu de la <Modale titre="Filtres"> de BarreRecherche.
// UNE seule source : les equipements ("Sur place"), affiches TOUT DEPLIE, groupes
// par famille (les intertitres font le travail de la categorie sans la demander).
// Les categories ne sont PAS proposees ici : exposer "Bien-etre & detente" ET les
// equipements Piscine/Sauna/... qui SONT le bien-etre laissait l'utilisateur sans
// savoir lequel choisir. Le filtre par categorie reste la pastille "Espace detente"
// (entree d'inspiration, autre usage, autre endroit).
//
// Le referentiel est charge ici une fois et passe a GrilleEquipements (qui reste
// presentationnel). Composant CONTROLE : la selection courante arrive en prop
// `selection` (source unique = l'etat de BarreRecherche), PAS un etat local qui
// repartirait de zero a chaque ouverture de la modale. Le panneau ne navigue PAS
// et ne lance PAS la recherche : il remonte les changements via onChange({ equipements })
// et "Valider" ne fait que FERMER la modale (onFermer). La recherche part du bouton
// "Trouver votre chateau" de la barre, qui embarque dates + invites + destination
// + filtres en une fois.
export default function PanneauFiltres({ selection = [], onChange, onFermer }) {
  const [referentiel, setReferentiel] = useState([]); // [{slug,libelle,ordre}]

  // Referentiel equipements : chargement unique au montage.
  useEffect(() => {
    let cancelled = false;
    getEquipements()
      .then((liste) => { if (!cancelled) setReferentiel(liste); })
      .catch((e) => console.error("[PanneauFiltres] getEquipements:", e));
    return () => { cancelled = true; };
  }, []);

  // Toggle a partir de la selection RECUE (pas d'etat local) : on calcule le
  // prochain jeu et on le remonte. Le parent le persiste et le redescend en prop.
  const toggleEquipement = (slug) => {
    const next = selection.includes(slug)
      ? selection.filter((s) => s !== slug)
      : [...selection, slug];
    onChange?.({ equipements: next });
  };

  const toutEffacer = () => onChange?.({ equipements: [] });

  return (
    <div className="pf">
      <div className="pf-section">
        <p className="pf-section-titre">Sur place</p>
        <GrilleEquipements
          referentiel={referentiel}
          selection={selection}
          onToggle={toggleEquipement}
        />
      </div>

      <div className="pf-actions">
        <button
          type="button"
          className="pf-effacer"
          onClick={toutEffacer}
          disabled={selection.length === 0}
        >
          Tout effacer
        </button>
        <button type="button" className="pf-valider" onClick={onFermer}>
          Valider
        </button>
      </div>
    </div>
  );
}
