// Onglet reutilisable pour "Mes reservations" (a venir) et "Mes sejours" (passes).
// Recoit la liste deja filtree + un mode pour adapter les libelles / etat vide.

function formatDateFR(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}

function euros(cents) {
  if (cents == null) return null;
  return Math.round(cents / 100).toLocaleString("fr-FR");
}

function nbNuits(arrivee, depart) {
  try {
    const a = new Date(arrivee), d = new Date(depart);
    const n = Math.round((d - a) / (1000 * 60 * 60 * 24));
    return n > 0 ? n : null;
  } catch { return null; }
}

export default function OngletSejours({ reservations, mode }) {
  // mode: "avenir" | "passes"
  const titre = mode === "avenir" ? "Mes réservations" : "Mes séjours";
  const sous = mode === "avenir"
    ? "Vos séjours à venir."
    : "L'histoire de vos séjours passés.";
  const vide = mode === "avenir"
    ? "Vous n'avez pas encore de séjour à venir."
    : "Vous n'avez pas encore effectué de séjour.";

  return (
    <div className="sej">
      <header className="sej-entete">
        <h2 className="sej-titre">{titre}</h2>
        <p className="sej-sous">{sous}</p>
      </header>

      {(!reservations || reservations.length === 0) ? (
        <div className="sej-vide">
          <p>{vide}</p>
        </div>
      ) : (
        <div className="sej-liste">
          {reservations.map((r) => {
            const chateau = r.chambre?.chateau;
            const nuits = nbNuits(r.date_arrivee, r.date_depart);
            const prix = euros(r.prix_total_cents);
            return (
              <div key={r.id} className="sej-carte">
                <div className="sej-carte-tete">
                  <div>
                    <div className="sej-carte-chateau">{chateau?.nom || "Château"}</div>
                    <div className="sej-carte-region">{chateau?.region}</div>
                  </div>
                  {r.status && (
                    <span className={"sej-statut sej-statut--" + r.status}>
                      {r.status === "confirmed" ? "Confirmé" : r.status === "completed" ? "Terminé" : r.status === "pending" ? "En attente" : r.status === "cancelled" ? "Annulé" : r.status}
                    </span>
                  )}
                </div>
                <div className="sej-carte-corps">
                  {r.chambre?.nom && <div className="sej-ligne"><span className="sej-lab">Chambre</span><span>{r.chambre.nom}</span></div>}
                  <div className="sej-ligne"><span className="sej-lab">Dates</span><span>Du {formatDateFR(r.date_arrivee)} au {formatDateFR(r.date_depart)}</span></div>
                  {nuits && <div className="sej-ligne"><span className="sej-lab">Durée</span><span>{nuits} nuit{nuits > 1 ? "s" : ""}</span></div>}
                  {prix && <div className="sej-ligne"><span className="sej-lab">Montant</span><span className="sej-prix">{prix} €</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
