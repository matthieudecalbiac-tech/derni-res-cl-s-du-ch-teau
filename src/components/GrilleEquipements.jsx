import ChampCase from "./ChampCase";
import "../styles/champ-equipements.css";

// FAMILLES groupe les equipements par famille (index = Math.floor(ordre/100) du seed).
// A ne PAS deriver de CATEGORIES : ce sont deux taxonomies distinctes. CATEGORIES
// porte des libelles editoriaux destines au voyageur ("Bien-etre & detente", affiche
// dans le recap des resultats) ; FAMILLES porte des intertitres de saisie. Elles
// coincident sur 5 valeurs sur 6 par construction historique, pas par nature.
// L'ordre de ce tableau est couple a la convention ordre/100 du seed equipements :
// le reordonner casse le groupement en silence.
export const FAMILLES = [
  "Bien-être",
  "Gastronomie",
  "Sport & plein air",
  "Nature",
  "Culture & patrimoine",
  "Famille",
];

// Grille des equipements groupee par famille (fieldsets + cases). Toujours
// visible : c'est la brique nue, sans chrome. Consommee telle quelle par
// PanneauFiltres (public) et enveloppee du repli par ChampEquipements (admin).
// Presentationnel : ne charge rien. `referentiel` = [{slug,libelle,ordre}] deja
// trie par ordre (getEquipements) ; `selection` = tableau de slugs ; onToggle(slug).
export default function GrilleEquipements({ referentiel, selection, onToggle }) {
  const coches = new Set(selection);

  // Groupes par famille (tranche d'ordre). Groupe vide (aucun equipement dans
  // cette tranche) masque.
  const groupes = FAMILLES
    .map((nom, i) => ({
      nom,
      items: referentiel.filter((r) => Math.floor((r.ordre ?? 0) / 100) === i),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {groupes.map((g) => (
        <fieldset className="champ-equip-groupe" key={g.nom}>
          <legend className="champ-equip-groupe-titre">{g.nom}</legend>
          <div className="champ-equip-grille">
            {g.items.map((r) => (
              <ChampCase
                key={r.slug}
                label={r.libelle}
                checked={coches.has(r.slug)}
                onChange={() => onToggle(r.slug)}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
