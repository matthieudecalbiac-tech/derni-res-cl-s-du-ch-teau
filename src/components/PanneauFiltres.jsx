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
// presentationnel). Etat de selection LOCAL. Le panneau ne navigue PAS et ne lance
// PAS la recherche : il expose sa selection via onChange({ equipements }) et
// "Valider" ne fait que FERMER la modale (onFermer). La recherche part du bouton
// "Trouver votre chateau" de la barre, qui embarque dates + invites + destination
// + filtres en une fois.
export default function PanneauFiltres({ onChange, onFermer }) {
  const [equipements, setEquipements] = useState([]); // slugs
  const [referentiel, setReferentiel] = useState([]); // [{slug,libelle,ordre}]

  // Referentiel equipements : chargement unique au montage.
  useEffect(() => {
    let cancelled = false;
    getEquipements()
      .then((liste) => { if (!cancelled) setReferentiel(liste); })
      .catch((e) => console.error("[PanneauFiltres] getEquipements:", e));
    return () => { cancelled = true; };
  }, []);

  const toggleEquipement = (slug) => {
    const next = equipements.includes(slug)
      ? equipements.filter((s) => s !== slug)
      : [...equipements, slug];
    setEquipements(next);
    onChange?.({ equipements: next });
  };

  const toutEffacer = () => {
    setEquipements([]);
    onChange?.({ equipements: [] });
  };

  return (
    <div className="pf">
      <div className="pf-section">
        <p className="pf-section-titre">Sur place</p>
        <GrilleEquipements
          referentiel={referentiel}
          selection={equipements}
          onToggle={toggleEquipement}
        />
      </div>

      <div className="pf-actions">
        <button
          type="button"
          className="pf-effacer"
          onClick={toutEffacer}
          disabled={equipements.length === 0}
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
