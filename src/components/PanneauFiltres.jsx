import { useState, useEffect } from "react";
import { CATEGORIES } from "../utils/categories";
import { getEquipements } from "../services/chateauxService";
import ChampEquipements from "./ChampEquipements";
import ChampCase from "./ChampCase";
import "../styles/panneau-filtres.css";

// Panneau "+ Filtres" — contenu de la <Modale titre="Filtres"> de BarreRecherche.
// DEUX sources : (1) categories (les 6 de CATEGORIES, cases multi-selection),
// (2) equipements (referentiel charge ici une fois, passe au ChampEquipements
// extrait qui reste presentationnel). `animaux` volontairement HORS perimetre :
// c.animaux est derive par heuristique de nom (flattenAmenities) avec faux negatif
// prouve ("Chiens acceptes") -> un filtre qui masque des chateaux eligibles serait
// pire qu'absent. A traiter en chantier de donnees separe.
//
// Etat de selection LOCAL. Le panneau ne navigue pas et ne construit pas d'URL :
// il expose sa selection au parent via onChange({ categories, equipements }).
// Le passage a l'URL est la brique 3 (cablage BarreRecherche).
export default function PanneauFiltres({ onChange }) {
  const [categories, setCategories] = useState([]); // slugs
  const [equipements, setEquipements] = useState([]); // slugs
  const [referentiel, setReferentiel] = useState([]); // [{slug,libelle,ordre}]

  // Referentiel equipements : chargement unique au montage (comme l'admin).
  useEffect(() => {
    let cancelled = false;
    getEquipements()
      .then((liste) => { if (!cancelled) setReferentiel(liste); })
      .catch((e) => console.error("[PanneauFiltres] getEquipements:", e));
    return () => { cancelled = true; };
  }, []);

  const emettre = (cats, equips) => onChange?.({ categories: cats, equipements: equips });

  const toggleCategorie = (slug) => {
    const next = categories.includes(slug)
      ? categories.filter((s) => s !== slug)
      : [...categories, slug];
    setCategories(next);
    emettre(next, equipements);
  };

  const toggleEquipement = (slug) => {
    const next = equipements.includes(slug)
      ? equipements.filter((s) => s !== slug)
      : [...equipements, slug];
    setEquipements(next);
    emettre(categories, next);
  };

  const toutEffacer = () => {
    setCategories([]);
    setEquipements([]);
    emettre([], []);
  };

  const vide = categories.length === 0 && equipements.length === 0;

  return (
    <div className="pf">
      {/* 1. Categories — multi-selection sur les 6 valeurs fermees. */}
      <div className="pf-section">
        <p className="pf-section-titre">Catégories</p>
        <div className="pf-cases">
          {CATEGORIES.map((c) => (
            <ChampCase
              key={c.value}
              label={c.label}
              checked={categories.includes(c.value)}
              onChange={() => toggleCategorie(c.value)}
            />
          ))}
        </div>
      </div>

      {/* 2. Equipements — le ChampEquipements extrait (il porte son propre label). */}
      <div className="pf-section">
        <ChampEquipements
          referentiel={referentiel}
          selection={equipements}
          onToggle={toggleEquipement}
        />
      </div>

      <div className="pf-actions">
        <button type="button" className="pf-effacer" onClick={toutEffacer} disabled={vide}>
          Tout effacer
        </button>
      </div>
    </div>
  );
}
