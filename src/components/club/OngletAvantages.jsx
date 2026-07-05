// Onglet "Mes avantages" : le programme de fidelite complet.
// 4 paliers empiles verticalement, chacun marque atteint / actuel / a venir
// selon le palier courant du membre. Situe le client dans sa progression.

export default function OngletAvantages({ espace }) {
  const { paliers, palierActuel, nbSejours, progression } = espace;
  const rangActuel = palierActuel?.rang ?? 0;

  function etatPalier(p) {
    if (p.rang < rangActuel) return "atteint";
    if (p.rang === rangActuel) return "actuel";
    return "avenir";
  }

  return (
    <div className="av">
      <header className="av-entete">
        <h2 className="av-titre">Le programme de fidélité</h2>
        <p className="av-sous">Plus vous séjournez, plus vos avantages grandissent.</p>
      </header>

      {/* Situation du client */}
      <div className="av-situation">
        <div className="av-situation-actuel">
          <span className="av-situation-label">Votre niveau actuel</span>
          <span className="av-situation-nom">{palierActuel?.nom || "Hôte"}</span>
          <span className="av-situation-sejours">{nbSejours} séjour{nbSejours > 1 ? "s" : ""} confirmé{nbSejours > 1 ? "s" : ""}</span>
        </div>
        {progression?.palierSuivant && (
          <div className="av-situation-suite">
            Plus que <strong>{progression.sejoursRestants} séjour{progression.sejoursRestants > 1 ? "s" : ""}</strong> pour atteindre le niveau <strong>{progression.palierSuivant.nom}</strong>.
          </div>
        )}
      </div>

      {/* Les 4 paliers empiles */}
      <div className="av-paliers">
        {(paliers || []).map((p) => {
          const etat = etatPalier(p);
          const avantages = Array.isArray(p.avantages) ? p.avantages : [];
          return (
            <div key={p.id} className={"av-palier av-palier--" + etat}>
              <div className="av-palier-gauche">
                <div className="av-palier-badge">
                  {etat === "atteint" && <span className="av-check">✓</span>}
                  {etat === "actuel" && <span className="av-puce-actuel" />}
                </div>
                <div>
                  <div className="av-palier-nom">{p.nom}</div>
                  <div className="av-palier-seuil">
                    {p.seuil_sejours === 0 ? "Dès l'inscription" : `${p.seuil_sejours} séjours confirmés`}
                  </div>
                  {etat === "avenir" && (
                    <div className="av-palier-restant">
                      Encore {Math.max(0, p.seuil_sejours - nbSejours)} séjour{(p.seuil_sejours - nbSejours) > 1 ? "s" : ""}
                    </div>
                  )}
                  {etat === "actuel" && <div className="av-palier-tag">Votre niveau</div>}
                  {etat === "atteint" && <div className="av-palier-tag av-palier-tag--atteint">Acquis</div>}
                </div>
              </div>
              <ul className="av-palier-avantages">
                {avantages.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
