import { useState, useRef, useEffect } from "react";
import { slugify } from "../utils/slug";
import "../styles/champ-personnage.css";

// Sélecteur de personnage AVEC RECHERCHE (combobox) — sous-formulaire "Histoire
// des lieux". PAS un champ texte libre : le slug étant recalculé depuis le nom
// (personnageToRow), retaper un nom crée un AUTRE personnage. Le sélecteur force
// à réutiliser le référentiel (choisir "Jean Gabin" existant) ou à créer
// EXPLICITEMENT. La saisie non validée ne devient JAMAIS la valeur : à la
// fermeture sans choix, elle est jetée et on revient au nom courant.
//
// Présentationnel : le parent charge le référentiel (getPersonnages, une fois)
// et reçoit le nom choisi via onChoisir(nom). Seul le NOM circule — pas d'id :
// "Créer" est un garde-fou UX, pas un chemin d'écriture (la RPC get-or-create
// par slug réutilise ou crée côté base). Filtrage accent/casse-insensible via
// slugify (même normalisation que celle qui produit le slug persisté).
export default function ChampPersonnage({ referentiel, valeur, onChoisir }) {
  const [query, setQuery] = useState(valeur ?? "");
  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef(null);

  // Le nom courant change côté parent (chargement, reset) → refléter dans l'input.
  useEffect(() => {
    setQuery(valeur ?? "");
  }, [valeur]);

  // Fermeture au clic-hors : jette la saisie non validée, revient au nom courant.
  useEffect(() => {
    if (!ouvert) return;
    const onDocMouseDown = (e) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
        setQuery(valeur ?? "");
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [ouvert, valeur]);

  const q = slugify(query);
  const matches = q === "" ? referentiel : referentiel.filter((r) => slugify(r.nom).includes(q));
  const saisie = query.trim();
  // "Créer" proposé quand la saisie est non vide ET sans correspondance EXACTE
  // (sinon l'utilisateur doit choisir la ligne existante, pas la recréer).
  const matchExact = q !== "" && referentiel.some((r) => slugify(r.nom) === q);
  const proposerCreation = saisie !== "" && !matchExact;

  const choisir = (nom) => {
    onChoisir(nom);
    setQuery(nom);
    setOuvert(false);
  };

  return (
    <div className="champ-perso" ref={conteneurRef}>
      <span className="champ-perso-label">Personnage ou événement</span>
      <input
        className="champ-perso-input"
        type="text"
        value={query}
        placeholder="Rechercher ou créer…"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={ouvert}
        onChange={(e) => { setQuery(e.target.value); setOuvert(true); }}
        onFocus={() => setOuvert(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOuvert(false); setQuery(valeur ?? ""); }
        }}
      />
      {ouvert && (
        <ul className="champ-perso-liste" role="listbox">
          {matches.map((r) => (
            <li key={r.id} role="option">
              <button type="button" className="champ-perso-option" onClick={() => choisir(r.nom)}>
                {r.nom}
              </button>
            </li>
          ))}
          {matches.length === 0 && !proposerCreation && (
            <li className="champ-perso-vide">Aucun personnage</li>
          )}
          {proposerCreation && (
            <li role="option">
              <button
                type="button"
                className="champ-perso-option champ-perso-creer"
                onClick={() => choisir(saisie)}
              >
                ＋ Créer «&nbsp;{saisie}&nbsp;»
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
