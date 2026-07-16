import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useChateaux } from "../hooks/useChateaux";
import { prixAffiche } from "../utils/derivePrix";
import { capaciteSuffisante } from "../utils/capacite";
import { libelleCategorie } from "../utils/categories";
import { chateauPorteEquipements } from "../utils/equipements";
import { getEquipements } from "../services/chateauxService";
import Header from "./Header";
import "../styles/page-resultats.css";

export default function PageResultats() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { chateaux, loading } = useChateaux();

  const region = params.get("region");
  const departement = params.get("departement");
  const chateauSlug = params.get("chateau");
  const siecle = params.get("siecle");
  const invites = params.get("invites");
  const nbInvites = invites ? parseInt(invites, 10) : null;

  // Filtres multi-valeurs (panneau "+ Filtres") : 1 param par source, valeurs
  // separees par virgule. Liste d'un element -> retrocompatible (?categorie=bien_etre).
  const parseListe = (v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
  const categories = parseListe(params.get("categorie"));
  const equipements = parseListe(params.get("equipement"));

  // Referentiel equipements : UNIQUEMENT pour afficher les libelles ("Sauna" et
  // non "sauna") dans le recap. Le FILTRE travaille sur les slugs des services
  // (c.amenities), independamment de ce chargement.
  const [equipRef, setEquipRef] = useState([]);
  useEffect(() => {
    let cancelled = false;
    getEquipements()
      .then((liste) => { if (!cancelled) setEquipRef(liste); })
      .catch((e) => console.error("[PageResultats] getEquipements:", e));
    return () => { cancelled = true; };
  }, []);
  const libelleEquipement = (slug) => equipRef.find((e) => e.slug === slug)?.libelle ?? slug;

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


  // Decision (B): la page resultats ne montre que les chateaux reels (!isDemoMock).
  // Les mocks (stubs de demonstration) peuplent la home pour la demo mais n'ont pas
  // de vitrine routable, donc on les exclut du tunnel de recherche pour eviter tout
  // cul-de-sac.
  const reels = chateaux.filter((c) => !c.isDemoMock);

  // Filtrage : par chateau precis si fourni, sinon par departement, sinon par
  // region, sinon tous les reels. Puis on applique TOUJOURS le filtre invites.
  let resultats = reels;
  if (chateauSlug) {
    resultats = reels.filter((c) => c.slug === chateauSlug);
  } else if (departement) {
    resultats = reels.filter((c) => c.departement === departement);
  } else if (region) {
    resultats = reels.filter((c) => c.region === region);
  }
  // Filtre siecle EN PLUS des autres criteres (valeur brute, ex "XVIIe siecle").
  if (siecle) {
    resultats = resultats.filter((c) => c.siecle === siecle);
  }
  // Categories = OU : le chateau matche s'il porte au moins un service dont la
  // categorie est parmi celles cochees (cocher bien-etre + gastronomie ELARGIT
  // l'inspiration). Liste d'un element -> equivaut a l'egalite stricte d'avant.
  if (categories.length > 0) {
    resultats = resultats.filter((c) =>
      (c.amenities ?? []).some((a) => categories.includes(a.categorie))
    );
  }
  // Equipements = ET : le chateau doit porter TOUS les equipements coches (cocher
  // piscine + sauna EXIGE les deux), via un ou plusieurs de ses services. Predicat
  // partage avec la carte (utils/equipements) -> une seule source de verite.
  if (equipements.length > 0) {
    resultats = resultats.filter((c) => chateauPorteEquipements(c, equipements));
  }
  resultats = resultats.filter((c) => capaciteSuffisante(c, nbInvites));

  // Sous-titre recapitulatif de la selection
  const recap = [
    departement ? departement : null,
    region ? region : null,
    chateauSlug && resultats[0] ? resultats[0].nom : null,
    siecle ? siecle : null,
    categories.length ? categories.map(libelleCategorie).join(", ") : null,
    equipements.length ? equipements.map(libelleEquipement).join(", ") : null,
    labelDates,
    invites ? `${invites} invites` : null,
  ].filter(Boolean).join(" · ");

  // Header : depuis /resultats, les boutons d'overlay ramenent a la home.
  const versHome = () => navigate("/");

  return (
    <div className="app">
      <Header
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
