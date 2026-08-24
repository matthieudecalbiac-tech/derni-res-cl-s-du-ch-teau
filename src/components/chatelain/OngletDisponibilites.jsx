import { useState, useEffect, useMemo, useRef } from "react";
import CalendrierSaisie from "../CalendrierSaisie";
import { jourISO } from "../../utils/dates";
import { getMesChateaux } from "../../services/chatelainService";
import {
  calendrierEditionChambre,
  poserDisponibilites,
  retirerDisponibilites,
} from "../../services/disponibilitesService";

// ═══════════════════════════════════════════════════════════════════════════
// L'onglet « Disponibilités » de l'espace châtelain (étape 3.4c)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠ UN FICHIER NEUF, ET C'EST DÉLIBÉRÉ. Inliner ce flux dans
// ChatelainDashboard l'aurait porté de 330 à ~500 lignes, et aurait fait de
// 3.4c un SECOND gros commit sur un écran en service. Ici, le dashboard ne
// gagne qu'un import et une ligne — c'est la même logique qui a rendu 3.4b sûr,
// poussée d'un cran.
//
// ⚠ TOUTE LA RÈGLE VIT AILLEURS. Ce composant orchestre : il lit
// (getMesChateaux, calendrierEditionChambre), il écrit (poser/retirer), il
// passe un état par jour à CalendrierSaisie. Il ne DÉCIDE rien — ni ce qu'est
// une nuit ouverte, ni ce que « Ouvrir » veut dire. Le contrat de découplage de
// disponibilitesService l'interdit, et c'est ce qui permet à la logique d'être
// testée sans DOM (utils/calendrierSaisie.js).
//
// LE FLUX
//   montage                 getMesChateaux -> auto-sélection 1er château/chambre
//   [chambre, mois]         calendrierEditionChambre(1er du mois, dernier)
//   onBloquer / onOuvrir    poser / retirer  PUIS RE-LIRE le mois
// ═══════════════════════════════════════════════════════════════════════════

/** Le 1er et le dernier jour du mois affiché, en "YYYY-MM-DD". */
function bornesDuMois(mois) {
  const premier = new Date(mois.getFullYear(), mois.getMonth(), 1);
  // Le jour 0 du mois SUIVANT est le dernier du mois courant — y compris en
  // février bissextile, sans avoir à le savoir.
  const dernier = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
  return { du: jourISO(premier), au: jourISO(dernier) };
}

export default function OngletDisponibilites() {
  const [chateaux, setChateaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [chateauId, setChateauId] = useState(null);
  const [chambreId, setChambreId] = useState(null);

  const [moisAffiche, setMoisAffiche] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const [lignes, setLignes] = useState(null);        // null = pas encore chargé
  const [chargementMois, setChargementMois] = useState(false);
  const [selection, setSelection] = useState(null);
  const [traitement, setTraitement] = useState(false);
  const [avis, setAvis] = useState(null);

  // Toujours monté ? Même motif que ChatelainDashboard : on garde les setState
  // d'après-await sans annuler l'appel en vol.
  const monte = useRef(true);
  useEffect(() => {
    monte.current = true;
    return () => {
      monte.current = false;
    };
  }, []);

  // ── 1. Les domaines du châtelain ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    getMesChateaux()
      .then((liste) => {
        if (cancelled) return;
        setChateaux(liste);
        // Auto-sélection : un châtelain n'a le plus souvent qu'un domaine, et
        // lui demander de le choisir serait une étape pour rien.
        const premier = liste[0] ?? null;
        setChateauId(premier?.id ?? null);
        setChambreId(premier?.chambres?.[0]?.id ?? null);
      })
      .catch((e) => {
        if (!cancelled) setErreur(e?.message || "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chateau = useMemo(
    () => chateaux.find((c) => c.id === chateauId) ?? null,
    [chateaux, chateauId],
  );
  const chambres = chateau?.chambres ?? [];

  // ── 2. Le mois affiché, pour la chambre choisie ───────────────────────────
  //
  // ⚠ LA FENÊTRE EST LE MOIS, PAS LA GRILLE. genererGrilleMois rend 42 cases,
  //   dont celles des mois voisins — que CalendrierSaisie NE PEINT PAS. Demander
  //   les bornes de la grille ferait lire deux mois de plus pour rien, et
  //   pourrait dépasser la fenêtre de 366 jours sur un aller-retour rapide.
  useEffect(() => {
    if (!chambreId) {
      setLignes(null);
      return undefined;
    }
    let cancelled = false;
    const { du, au } = bornesDuMois(moisAffiche);
    setChargementMois(true);
    calendrierEditionChambre(chambreId, du, au)
      .then((rows) => {
        if (!cancelled) setLignes(rows);
      })
      .catch((e) => {
        if (!cancelled) {
          setLignes([]);
          setAvis(e?.message || "Le calendrier n'a pas pu être chargé.");
        }
      })
      .finally(() => {
        if (!cancelled) setChargementMois(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chambreId, moisAffiche]);

  // Changer de chambre ou de mois annule la sélection en cours : elle portait
  // sur autre chose.
  useEffect(() => {
    setSelection(null);
  }, [chambreId, moisAffiche]);

  // ── L'état par jour, tel que CalendrierSaisie l'attend ────────────────────
  const parJour = useMemo(() => {
    const m = new Map();
    (lignes ?? []).forEach((l) => m.set(l.nuit, l.etat));
    return m;
  }, [lignes]);

  // ⚠ Le repli est `hors_gestion`, qui s'aplatit en `hors_horizon` : gris, non
  //   cliquable. Une nuit que la base n'a pas renvoyée est une nuit dont on ne
  //   sait rien — on ne l'ouvre pas.
  const etatDuJour = (jour) => parJour.get(jour) ?? "hors_gestion";

  // ── Écrire ────────────────────────────────────────────────────────────────
  async function ecrire(action, plage) {
    if (!chambreId || !plage || traitement) return;
    setTraitement(true);
    setAvis(null);
    try {
      if (action === "bloquer") {
        await poserDisponibilites(chambreId, plage.du, plage.au, false);
      } else {
        // ⚠ « Ouvrir » EFFACE le blocage, il n'écrit pas de ligne. Cf.
        //   actionPourSelection : poser une ligne `true` produirait des nuits
        //   IMMUNES à l'horizon.
        await retirerDisponibilites(chambreId, plage.du, plage.au);
      }
      // ⚠ RE-LIRE, JAMAIS DE MUTATION OPTIMISTE. Même discipline que
      //   confirmer() -> rafraichir() dans le dashboard : c'est la BASE qui
      //   dicte ce qui s'affiche.
      const { du, au } = bornesDuMois(moisAffiche);
      const rows = await calendrierEditionChambre(chambreId, du, au);
      if (monte.current) {
        setLignes(rows);
        setSelection(null);
      }
    } catch (e) {
      if (monte.current) {
        setAvis("La modification n'a pas pu être enregistrée. Réessayez dans un instant.");
        console.error("[OngletDisponibilites] ecrire:", e);
      }
    } finally {
      if (monte.current) setTraitement(false);
    }
  }

  // ── Navigation de mois ────────────────────────────────────────────────────
  const maintenant = new Date();
  const moisCourant = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  // ⚠ On ne recule pas avant le mois courant. Ni calendrier_edition_chambre ni
  //   poser_disponibilites ne refusent le passé — un châtelain pourrait donc
  //   bloquer une nuit révolue. Sans effet, mais absurde : autant ne pas le
  //   proposer. Même garde que CalendrierPlage.
  const peutReculer = moisAffiche > moisCourant;

  const moisPrecedent = () => {
    if (!peutReculer) return;
    setMoisAffiche((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const moisSuivant = () =>
    setMoisAffiche((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  // ── Les états d'écran, dans l'ordre ───────────────────────────────────────

  if (loading) {
    return <p className="che-note">Chargement de vos domaines…</p>;
  }

  if (erreur) {
    return <p className="che-erreur">Impossible de charger vos domaines : {erreur}</p>;
  }

  if (chateaux.length === 0) {
    // ⚠ PAS UNE ERREUR, ET PAS RARE. Mesuré le 24 août : douze châteaux sur
    //   treize n'ont aucun propriétaire. La RLS ne refuse pas, elle ne rend
    //   rien — un écran qui lirait « pas d'erreur » comme « accès accordé »
    //   afficherait une page vide au lieu d'une explication.
    return (
      <p className="che-note">
        Aucun domaine ne vous est rattaché pour le moment. Contactez Les Clés du Château.
      </p>
    );
  }

  if (chambres.length === 0) {
    return <p className="che-note">Ce domaine n'a pas encore de chambre.</p>;
  }

  // ⚠ LE CAS QUI RESSEMBLE À UNE PANNE, ET QUI N'EN EST PAS. Gestion activée
  //   mais horizon absent : chaque nuit sans ligne vaut « non renseignée »,
  //   donc tout le mois est gris et rien n'est cliquable. C'est ce que la règle
  //   prescrit — mais le châtelain ne peut RIEN y faire, l'horizon se pose
  //   depuis l'espace admin. Le message doit donc dire QUI peut l'ouvrir, pas
  //   seulement quoi.
  const horizonManquant = chateau.dispoGeree && !chateau.dispoOuverteJusquA;

  // Le garde : hors gestion, on montre le calendrier en lecture seule plutôt
  // que de le cacher — voir n'est pas modifier, et le châtelain comprend mieux
  // son état en le voyant. `traitement` verrouille aussi, le temps d'un appel.
  const editable = chateau.dispoGeree && !horizonManquant && !traitement;

  const motifNonEditable = !chateau.dispoGeree
    ? "La gestion des disponibilités n'est pas activée pour ce domaine. Contactez Les Clés du Château pour l'ouvrir."
    : horizonManquant
      ? "Aucune date n'est ouverte pour ce domaine : l'horizon d'ouverture n'a pas encore été posé. Contactez Les Clés du Château pour l'ouvrir."
      : null;

  return (
    <div className="che-dispo">
      {/* ⚠ LES SÉLECTEURS SONT AU-DESSUS, LA BARRE D'ACTIONS EN DESSOUS, et ce
          n'est pas qu'une question de lecture : la grille porte
          `touch-action: none` en permanence (impossible de le poser au moment
          du geste, le navigateur décide au touchstart). On ne peut donc PAS
          faire défiler la page en posant le doigt dessus — ce sont ces zones
          qui donnent la surface pour l'attraper. La grille ne doit jamais
          occuper toute la hauteur de l'écran. */}
      <div className="che-dispo-tete">
        {chateaux.length > 1 ? (
          <label className="che-dispo-champ">
            <span className="che-dispo-label">Domaine</span>
            <select
              className="che-dispo-select"
              value={chateauId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                setChateauId(id);
                const c = chateaux.find((x) => x.id === id);
                setChambreId(c?.chambres?.[0]?.id ?? null);
              }}
              disabled={traitement}
            >
              {chateaux.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </label>
        ) : (
          // Un seul domaine : on le NOMME plutôt que d'offrir un choix qui n'en
          // est pas un. Sans ce titre, le châtelain ne saurait plus ce qu'il
          // édite.
          <p className="che-dispo-domaine">{chateau.nom}</p>
        )}

        <label className="che-dispo-champ">
          <span className="che-dispo-label">Chambre</span>
          <select
            className="che-dispo-select"
            value={chambreId ?? ""}
            onChange={(e) => setChambreId(e.target.value)}
            disabled={traitement}
          >
            {chambres.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.nom}</option>
            ))}
          </select>
        </label>
      </div>

      {avis && <p className="che-avis">{avis}</p>}

      {chargementMois || lignes === null ? (
        // ⚠ UN BLOC DE MÊME HAUTEUR, pas une disparition. Les deux autres
        //   options étaient pires : garder l'ancienne grille peindrait les
        //   NOUVEAUX jours avec les ANCIENS états (faux), et tout griser
        //   ressemblerait à « tout fermé » (trompeur).
        <div className="che-dispo-attente" aria-busy="true">
          <p className="che-note">Chargement du mois…</p>
        </div>
      ) : (
        <CalendrierSaisie
          moisAffiche={moisAffiche}
          etatDuJour={etatDuJour}
          selection={selection}
          onSelection={setSelection}
          onBloquer={(plage) => ecrire("bloquer", plage)}
          onOuvrir={(plage) => ecrire("ouvrir", plage)}
          onMoisPrecedent={peutReculer ? moisPrecedent : () => {}}
          onMoisSuivant={moisSuivant}
          editable={editable}
          motifNonEditable={motifNonEditable}
        />
      )}

      {chateau.dispoGeree && chateau.dispoOuverteJusquA && (
        <p className="che-dispo-pied">
          Vos dates sont ouvertes jusqu'au{" "}
          <strong>{chateau.dispoOuverteJusquA}</strong>. Bloquez les périodes que vous ne
          louez pas — tout le reste reste réservable.
        </p>
      )}
    </div>
  );
}
