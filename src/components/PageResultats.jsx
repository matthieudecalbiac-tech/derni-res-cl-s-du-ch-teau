import { useSearchParams, useNavigate } from "react-router-dom";
import { useChateaux } from "../hooks/useChateaux";
import Header from "./Header";
import "../styles/page-resultats.css";

export default function PageResultats() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { chateaux, loading } = useChateaux();

  const region = params.get("region");
  const chateauSlug = params.get("chateau");
  const invites = params.get("invites");
  const nbInvites = invites ? parseInt(invites, 10) : null;

  const arrivee = params.get("arrivee");
  const depart = params.get("depart");

  // "YYYY-MM-DD" -> "9 juil." pour le recap. Parse manuel (pas new Date("...")
  // qui interprete l'ISO en UTC et peut afficher la veille selon le fuseau).
  const formatJourMois = (iso) => {
    if (!iso) return null;
    const [a, m, j] = iso.split("-").map(Number);
    if (!a || !m || !j) return null;
    const d = new Date(a, m - 1, j);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };
  const labelDates =
    arrivee && depart
      ? `${formatJourMois(arrivee)} → ${formatJourMois(depart)}`
      : null;

  // Capacite totale du chateau = somme des capacites de ses chambres.
  // Un chateau se loue souvent en plusieurs chambres / en entier, donc on
  // raisonne en capacite d'accueil globale, pas chambre par chambre.
  const capaciteSuffisante = (c) => {
    if (!nbInvites || Number.isNaN(nbInvites)) return true; // pas de critere invites
    if (!c.chambres || c.chambres.length === 0) return true; // pas de donnee -> on n'exclut pas
    const total = c.chambres.reduce((acc, ch) => acc + (ch.capacite || 0), 0);
    return total >= nbInvites;
  };

  // Decision (B): la page resultats ne montre que les chateaux reels (estLaUne).
  // Les mocks (id 1-6) peuplent la home pour la demo mais n'ont pas de vitrine
  // routable, donc on les exclut du tunnel de recherche pour eviter tout cul-de-sac.
  const reels = chateaux.filter((c) => c.estLaUne === true);

  // Filtrage : par chateau precis si fourni, sinon par region, sinon tous les reels.
  // Puis on applique TOUJOURS le filtre invites (capacite).
  let resultats = reels;
  if (chateauSlug) {
    resultats = reels.filter((c) => c.slug === chateauSlug);
  } else if (region) {
    resultats = reels.filter((c) => c.region === region);
  }
  resultats = resultats.filter(capaciteSuffisante);

  // Sous-titre recapitulatif de la selection
  const recap = [
    region ? region : null,
    chateauSlug && resultats[0] ? resultats[0].nom : null,
    labelDates,
    invites ? `${invites} invites` : null,
  ].filter(Boolean).join(" · ");

  // Header : depuis /resultats, les boutons d'overlay ramenent a la home.
  const versHome = () => navigate("/");

  const prixAffiche = (c) => {
    if (c.prixBarre && c.reduction) {
      return Math.round(c.prixBarre * (1 - c.reduction / 100));
    }
    return c.prixBarre || c.chambres?.[0]?.prix || null;
  };

  return (
    <div className="app">
      <Header
        onOuvrirEvenementiel={versHome}
        onOuvrirConciergerie={versHome}
        onOuvrirAPropos={versHome}
        onOuvrirVitrines={versHome}
        onOuvrirProprietaires={versHome}
        onOuvrirDernieresClefs={versHome}
      />
      <main className="pr-main">
        <div className="pr-entete">
          <div className="pr-orn">
            <span className="pr-orn-l" />
            <span className="pr-orn-lys">⚜</span>
            <span className="pr-orn-l" />
          </div>
          <h1 className="pr-titre">Vos dates, nos châteaux</h1>
          {recap && <p className="pr-recap">{recap}</p>}
        </div>

        {loading && <p className="pr-message">Recherche en cours…</p>}

        {!loading && resultats.length === 0 && (
          <p className="pr-message">
            Aucun château ne correspond à cette recherche pour le moment.
          </p>
        )}

        {!loading && resultats.length > 0 && (
          <div className="pr-grille">
            {resultats.map((c) => (
              <article
                className="pr-carte pr-carte--cliquable"
                key={c.id}
                onClick={() => navigate(`/chateau/${c.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`/chateau/${c.slug}`); }}
              >
                <div className="pr-carte-photo">
                  <img src={c.image || c.images?.[0]} alt={c.nom} />
                </div>
                <div className="pr-carte-infos">
                  <span className="pr-carte-region">{c.region}</span>
                  <h2 className="pr-carte-nom">{c.nom}</h2>
                  <p className="pr-carte-accroche">{c.accroche}</p>
                  {prixAffiche(c) && (
                    <p className="pr-carte-prix">
                      À partir de <strong>{prixAffiche(c)} €</strong> / nuit
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="pr-retour">
          <button className="pr-retour-btn" onClick={versHome}>← Retour à l'accueil</button>
        </div>
      </main>
    </div>
  );
}
