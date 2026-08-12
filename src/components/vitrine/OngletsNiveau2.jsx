// `sous` — sous-titre éditorial, ajouté pour la feuille « Explorer le château »
// du mobile, qui donne une ligne de contexte sous chaque thème. Champ OPTIONNEL
// et ignoré partout ailleurs : ni la barre latérale ni ce composant ne le
// rendent, donc le desktop est inchangé. Il vit ici, avec les libellés, plutôt
// que dans une seconde liste qu'il faudrait garder en phase.
export const THEMES = [
  { code: "apercu", label: "Aperçu", sous: "Le domaine en un regard" },
  { code: "histoire", label: "Histoire", sous: "Des origines à aujourd'hui" },
  { code: "famille", label: "Famille & propriétaires", sous: "Ceux qui font vivre les lieux" },
  { code: "lieu", label: "Lieu & région", sous: "Le territoire alentour" },
  { code: "services", label: "Services", sous: "La table et les attentions" },
  { code: "chambres", label: "Chambres", sous: "Les chambres et leurs tarifs" },
  { code: "photos", label: "Photos", sous: "La demeure en images" },
];

export default function OngletsNiveau2({ actif, onChange }) {
  return (
    <div className="vc4-onglets-n2-wrap">
      <p className="vc4-onglets-n2-eyebrow">⚜ Découvrir le château en détail</p>
      <nav className="vc4-onglets-n2" role="tablist" aria-label="Découverte éditoriale">
        {THEMES.map((t) => (
          <button
            key={t.code}
            role="tab"
            aria-selected={actif === t.code}
            className={"vc4-onglet-n2 " + (actif === t.code ? "vc4-onglet-n2--actif" : "")}
            onClick={() => onChange(t.code)}
            data-theme={t.code}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
