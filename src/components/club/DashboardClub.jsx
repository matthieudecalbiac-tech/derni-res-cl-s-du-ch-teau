// Dashboard de l'onglet "Club des Châtelains". Recoit l'objet espace de
// getEspaceClub + le profile. Purement presentation.

function formatDateFR(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

export default function DashboardClub({ espace, profile }) {
  const { palierActuel, nbSejours, progression, reservations, paliers } = espace;

  const nom = (() => {
    const f = (profile?.first_name || "").trim();
    const l = (profile?.last_name || "").trim();
    if (f || l) return `${f} ${l}`.trim();
    return profile?.full_name || profile?.email || "Membre";
  })();

  const membreDepuis = profile?.created_at ? formatDateFR(profile.created_at) : null;

  // Tri a-venir / passe sur date_depart
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const aVenir = (reservations || []).filter((r) => r.date_depart >= aujourdhui)
    .sort((a, b) => a.date_arrivee.localeCompare(b.date_arrivee));
  const passes = (reservations || []).filter((r) => r.date_depart < aujourdhui)
    .sort((a, b) => b.date_arrivee.localeCompare(a.date_arrivee));
  const prochaine = aVenir[0] || null;

  const avantages = Array.isArray(palierActuel?.avantages) ? palierActuel.avantages : [];

  return (
    <div className="dash">
      {/* RANGEE 1 : carte membre | progression | prochain avantage */}
      <div className="dash-rangee">
        {/* Carte membre */}
        <section className="dash-carte dash-membre">
          <div className="dash-membre-tete">
            <div className="dash-membre-avatar">
              {((profile?.first_name?.[0] || "") + (profile?.last_name?.[0] || "")).toUpperCase() || (profile?.email?.[0] || "?").toUpperCase()}
            </div>
            <div>
              <h2 className="dash-membre-nom">{nom}</h2>
              {membreDepuis && <p className="dash-membre-depuis">Membre depuis le {membreDepuis}</p>}
            </div>
          </div>
          <div className="dash-membre-statut">
            <span className="dash-membre-statut-label">Statut actuel</span>
            <span className="dash-membre-statut-valeur">{palierActuel?.nom || "Hote"}</span>
            <span className="dash-membre-sejours">{nbSejours} séjour{nbSejours > 1 ? "s" : ""} confirmé{nbSejours > 1 ? "s" : ""}</span>
          </div>
        </section>

        {/* Progression */}
        <section className="dash-carte dash-progression">
          <h3 className="dash-carte-titre">Votre progression</h3>
          {progression?.palierSuivant ? (
            <>
              <p className="dash-prog-niveau">Prochain niveau : <strong>{progression.palierSuivant.nom}</strong></p>
              <p className="dash-prog-texte">
                Effectuez {progression.sejoursRestants} séjour{progression.sejoursRestants > 1 ? "s" : ""} confirmé{progression.sejoursRestants > 1 ? "s" : ""} supplémentaire{progression.sejoursRestants > 1 ? "s" : ""} pour atteindre le niveau {progression.palierSuivant.nom}.
              </p>
              <div className="dash-prog-barre">
                <div className="dash-prog-remplissage" style={{ width: progression.progressionPct + "%" }} />
              </div>
              <div className="dash-prog-legende">
                <span>{nbSejours} / {progression.palierSuivant.seuil_sejours} séjours confirmés</span>
                <span className="dash-prog-restants">{progression.sejoursRestants} restant{progression.sejoursRestants > 1 ? "s" : ""}</span>
              </div>
            </>
          ) : (
            <p className="dash-prog-texte">Vous avez atteint le plus haut niveau du Club. Merci de votre fidelite.</p>
          )}
        </section>

        {/* Prochain avantage */}
        <section className="dash-carte dash-avantage-suivant">
          <h3 className="dash-carte-titre">Votre prochain avantage</h3>
          {progression?.palierSuivant ? (
            <>
              <p className="dash-av-decl">Au niveau {progression.palierSuivant.nom}</p>
              <p className="dash-av-pct">{progression.palierSuivant.reduction_pct}%</p>
              <p className="dash-av-plus">+ avantages {palierActuel?.nom}</p>
            </>
          ) : (
            <p className="dash-av-decl">Tous les avantages du Club vous sont acquis.</p>
          )}
        </section>
      </div>

      {/* RANGEE 2 : prochaine reservation | séjours passes | avantages inclus */}
      <div className="dash-rangee">
        {/* Prochaine reservation */}
        <section className="dash-carte dash-prochaine">
          <h3 className="dash-carte-titre">Prochaine reservation</h3>
          {prochaine ? (
            <div className="dash-resa">
              <div className="dash-resa-nom">{prochaine.chambre?.chateau?.nom || "Château"}</div>
              <div className="dash-resa-region">{prochaine.chambre?.chateau?.region}</div>
              <div className="dash-resa-dates">Du {formatDateFR(prochaine.date_arrivee)} au {formatDateFR(prochaine.date_depart)}</div>
            </div>
          ) : (
            <p className="dash-vide">Aucun séjour à venir pour le moment.</p>
          )}
        </section>

        {/* Séjours passés */}
        <section className="dash-carte dash-passes">
          <h3 className="dash-carte-titre">Séjours passés</h3>
          {passes.length > 0 ? (
            <ul className="dash-passes-liste">
              {passes.map((r) => (
                <li key={r.id} className="dash-passe">
                  <div className="dash-passe-nom">{r.chambre?.chateau?.nom || "Château"}</div>
                  <div className="dash-passe-region">{r.chambre?.chateau?.region}</div>
                  <div className="dash-passe-dates">Du {formatDateFR(r.date_arrivee)} au {formatDateFR(r.date_depart)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dash-vide">Aucun séjour pour le moment.</p>
          )}
        </section>

        {/* Avantages inclus */}
        <section className="dash-carte dash-inclus">
          <h3 className="dash-carte-titre">Vos avantages inclus</h3>
          {avantages.length > 0 ? (
            <ul className="dash-inclus-liste">
              {avantages.map((a, i) => (
                <li key={i} className="dash-inclus-item">{a}</li>
              ))}
            </ul>
          ) : (
            <p className="dash-vide">Vos avantages apparaîtront ici.</p>
          )}
        </section>
      </div>
    </div>
  );
}
