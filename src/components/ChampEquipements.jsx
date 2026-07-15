import { useState } from "react";
import GrilleEquipements from "./GrilleEquipements";
import "../styles/champ-equipements.css";

// Selection d'equipements (N-N) pour UN service : resume replie (libelles
// coches, nommes) + panneau deplie. `ouvert` est local a chaque instance ->
// plusieurs services peuvent etre deplies en meme temps. `selection` = tableau
// de slugs ; `referentiel` = [{slug,libelle,ordre}] deja trie par ordre
// (getEquipements). onToggle(slug) bascule l'appartenance. Presentationnel : ne
// charge rien, le parent passe le referentiel. La grille elle-meme vit dans
// GrilleEquipements (partagee avec le panneau public "+ Filtres").
export default function ChampEquipements({ referentiel, selection, onToggle }) {
  const [ouvert, setOuvert] = useState(false);
  const coches = new Set(selection);

  // Resume : libelles coches, dans l'ordre du referentiel (lecture stable).
  const resume = referentiel
    .filter((r) => coches.has(r.slug))
    .map((r) => r.libelle)
    .join(", ");

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
          <GrilleEquipements
            referentiel={referentiel}
            selection={selection}
            onToggle={onToggle}
          />
        </div>
      )}
    </div>
  );
}
