import { useState } from "react";
import ChampCase from "./ChampCase";
import "../styles/champ-equipements.css";

// FAMILLES groupe les equipements par famille (index = Math.floor(ordre/100) du seed).
// A ne PAS deriver de CATEGORIES : ce sont deux taxonomies distinctes. CATEGORIES
// porte des libelles editoriaux destines au voyageur ("Bien-etre & detente", affiche
// dans le recap des resultats) ; FAMILLES porte des intertitres de saisie. Elles
// coincident sur 5 valeurs sur 6 par construction historique, pas par nature.
// L'ordre de ce tableau est couple a la convention ordre/100 du seed equipements :
// le reordonner casse le groupement en silence.
const FAMILLES = [
  "Bien-être",
  "Gastronomie",
  "Sport & plein air",
  "Nature",
  "Culture & patrimoine",
  "Famille",
];

// Selection d'equipements (N-N) pour UN service : resume replie (libelles
// coches, nommes) + panneau deplie des 6 groupes en grille compacte. `ouvert`
// est local a chaque instance -> plusieurs services peuvent etre deplies en meme
// temps. `selection` = tableau de slugs ; `referentiel` = [{slug,libelle,ordre}]
// deja trie par ordre (getEquipements). onToggle(slug) bascule l'appartenance.
// Presentationnel : ne charge rien, le parent passe le referentiel.
export default function ChampEquipements({ referentiel, selection, onToggle }) {
  const [ouvert, setOuvert] = useState(false);
  const coches = new Set(selection);

  // Resume : libelles coches, dans l'ordre du referentiel (lecture stable).
  const resume = referentiel
    .filter((r) => coches.has(r.slug))
    .map((r) => r.libelle)
    .join(", ");

  // Groupes par famille (tranche d'ordre). Groupe vide (aucun equipement dans
  // cette tranche) masque.
  const groupes = FAMILLES
    .map((nom, i) => ({
      nom,
      items: referentiel.filter((r) => Math.floor((r.ordre ?? 0) / 100) === i),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="champ-equip">
      <span className="champ-equip-label">Équipements</span>
      <button
        type="button"
        className="champ-equip-resume"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
      >
        <span className={resume ? "champ-equip-liste" : "champ-equip-vide"}>
          {resume || "Aucun équipement"}
        </span>
        <span className="champ-equip-chevron" aria-hidden="true">{ouvert ? "▾" : "▸"}</span>
      </button>
      {ouvert && (
        <div className="champ-equip-panneau">
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
        </div>
      )}
    </div>
  );
}
