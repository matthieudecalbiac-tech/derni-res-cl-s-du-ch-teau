const THEMES = [
  { code: "apercu", label: "Aperçu" },
  { code: "histoire", label: "Histoire" },
  { code: "famille", label: "Famille & propriétaires" },
  { code: "lieu", label: "Lieu & région" },
  { code: "services", label: "Services" },
  { code: "chambres", label: "Chambres" },
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
