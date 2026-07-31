import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getModules,
  getChateauxPourCommissions,
  getLiaisonsModules,
  setCommission,
} from "../../services/commissionService";

// Section admin — Commissions (relevé transversal château × module).
//
// POURQUOI CET ÉCRAN EXISTE. Le taux de commission vit dans
// chateau_modules.commission_pct_negociee et n'avait aucune interface : il se
// posait en SQL manuel. Le 1er août, deux châteaux PUBLIÉS — Saint-Paterne et
// Le Boulay-Morin, exactement les deux créés depuis l'admin après le seed —
// avaient leur module A actif avec un taux NULL. Les réservations aboutissaient,
// commission_lcc_cents valait 0, et rien ne le disait : une ligne dans les logs
// de l'Edge Function, rien à l'écran.
//
// D'où la forme : UN relevé, TOUS les châteaux, TOUS les modules. Un écran par
// château aurait obligé à ouvrir onze fiches pour retrouver les deux qui
// fuyaient — en sachant déjà lesquelles chercher.
//
// TROIS ÉTATS, PAS DEUX. « ligne absente » et « actif sans taux » ne sont pas la
// même panne :
//   ligne absente     → demande-reservation sort en 409, le visiteur voit
//                       « indisponible ». Bruyant.
//   actif, taux NULL  → la réservation passe, commission 0. MUET. C'est le piège,
//                       et c'est celui que le badge rouge existe pour montrer.
//
// LES BROUILLONS SONT LÀ AUSSI. Un taux se règle AVANT la mise en ligne, sinon
// on reproduit la panne à chaque publication. Ils sont seulement montrés en
// retrait : moins urgents, pas moins réglables.
//
// Modèle AdminReservations pour les états (data/loading/erreur + useEffect
// cancelled, rechargement après chaque écriture). Registre « relevé », sobre —
// la seule couleur vive de l'écran est celle de l'alerte, et c'est voulu.

// Clé d'une cellule. Le couple (château, module) est l'identité métier — c'est
// aussi la contrainte UNIQUE sur laquelle s'appuie le ON CONFLICT de la RPC.
const cle = (chateauId, moduleId) => `${chateauId}:${moduleId}`;

// Le taux tel qu'on l'affiche. numeric(5,2) arrive de PostgREST en chaîne
// ("13.00") ou en nombre selon le pilote : on normalise, et on retire les
// décimales inutiles — « 13 % » se lit mieux que « 13.00 % ».
function tauxTexte(pct) {
  if (pct === null || pct === undefined || pct === "") return null;
  const n = Number(pct);
  if (!Number.isFinite(n)) return null;
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}

// Valeur de l'input : "" quand il n'y a pas de taux (placeholder visible).
function tauxInput(pct) {
  if (pct === null || pct === undefined || pct === "") return "";
  const n = Number(pct);
  return Number.isFinite(n) ? String(n) : "";
}

const LIBELLE_STATUT = { publie: "Publié", brouillon: "Brouillon", archive: "Archivé" };

export default function AdminCommissions() {
  const [modules, setModules] = useState([]);
  const [chateaux, setChateaux] = useState([]);
  const [liaisons, setLiaisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  // Tampon d'édition, une entrée par cellule TOUCHÉE. Une cellule absente du
  // tampon affiche la base : on ne pré-remplit pas les 44 cellules, seul ce que
  // l'admin a modifié y entre. La comparaison tampon ↔ base donne le « dirty ».
  const [edits, setEdits] = useState({});
  const [enCours, setEnCours] = useState(null);
  const [erreurAction, setErreurAction] = useState(null);

  const recharger = useCallback(async () => {
    // Trois sources indépendantes, donc en parallèle. Les liaisons ne se
    // dérivent ni des châteaux ni des modules : c'est leur ABSENCE qui porte
    // l'information, et une jointure côté PostgREST ne saurait pas la rendre.
    const [mods, chats, liens] = await Promise.all([
      getModules(),
      getChateauxPourCommissions(),
      getLiaisonsModules(),
    ]);
    setModules(mods);
    setChateaux(chats);
    setLiaisons(liens);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErreur(null);
    recharger()
      .catch((e) => {
        if (!cancelled) setErreur(e.message || "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [recharger]);

  // Index des liaisons par couple : le rendu croise 11 châteaux × 4 modules,
  // un .find() par cellule ferait 44 balayages du tableau à chaque frappe.
  const parCouple = useMemo(() => {
    const m = new Map();
    for (const l of liaisons) m.set(cle(l.chateau_id, l.module_id), l);
    return m;
  }, [liaisons]);

  // Publiés d'abord : ce sont les seuls dont une commission à 0 coûte de
  // l'argent aujourd'hui. Les brouillons suivent, dans l'ordre alphabétique.
  const lignes = useMemo(() => {
    const rang = (s) => (s === "publie" ? 0 : s === "brouillon" ? 1 : 2);
    return [...chateaux].sort(
      (a, b) => rang(a.statut) - rang(b.statut) || a.nom.localeCompare(b.nom, "fr"),
    );
  }, [chateaux]);

  // LE CHIFFRE QUI COMPTE : les couples actifs sans taux. On sépare publiés et
  // brouillons parce que les deux ne coûtent pas la même chose — un brouillon
  // qui fuit ne fuit pas encore.
  const alertes = useMemo(() => {
    const statutPar = new Map(chateaux.map((c) => [c.id, c.statut]));
    let publie = 0;
    let autre = 0;
    for (const l of liaisons) {
      if (!l.est_actif) continue;
      if (l.commission_pct_negociee !== null && l.commission_pct_negociee !== undefined) continue;
      if (statutPar.get(l.chateau_id) === "publie") publie += 1;
      else autre += 1;
    }
    return { publie, autre, total: publie + autre };
  }, [liaisons, chateaux]);

  const nbActifs = useMemo(() => liaisons.filter((l) => l.est_actif).length, [liaisons]);

  // L'état d'une cellule = le tampon s'il existe, sinon la base.
  const etatCellule = (chateauId, moduleId) => {
    const k = cle(chateauId, moduleId);
    const base = parCouple.get(k) || null;
    const edit = edits[k];
    return {
      base,
      actif: edit ? edit.actif : base?.est_actif === true,
      taux: edit ? edit.taux : tauxInput(base?.commission_pct_negociee),
      // Une cellule est « sale » dès qu'elle diverge de la base. Une ligne
      // absente est sale au premier geste — c'est ce qui permet de la CRÉER.
      sale: edit
        ? edit.actif !== (base?.est_actif === true) ||
          edit.taux !== tauxInput(base?.commission_pct_negociee)
        : false,
    };
  };

  const modifier = (chateauId, moduleId, champ, valeur) => {
    const k = cle(chateauId, moduleId);
    const courant = etatCellule(chateauId, moduleId);
    setEdits((e) => ({
      ...e,
      [k]: { actif: courant.actif, taux: courant.taux, [champ]: valeur },
    }));
  };

  const annuler = (chateauId, moduleId) => {
    const k = cle(chateauId, moduleId);
    setEdits((e) => {
      const { [k]: _retire, ...reste } = e;
      return reste;
    });
    setErreurAction(null);
  };

  const enregistrer = async (chateauId, moduleId) => {
    const k = cle(chateauId, moduleId);
    const { actif, taux } = etatCellule(chateauId, moduleId);
    // "" → null : c'est la désassignation, pas un zéro. Écrire 0 dirait « ce
    // château ne nous rapporte rien », ce qui est une affirmation, pas un vide.
    const pct = taux.trim() === "" ? null : Number(taux);
    if (pct !== null && !Number.isFinite(pct)) {
      setErreurAction("Le taux doit être un nombre entre 0 et 100.");
      return;
    }

    setEnCours(k);
    setErreurAction(null);
    try {
      await setCommission(chateauId, moduleId, pct, actif);
      // Le tampon disparaît AVANT le rechargement : la cellule repasse sur la
      // base, qui est désormais la vérité.
      setEdits((e) => {
        const { [k]: _retire, ...reste } = e;
        return reste;
      });
      try {
        await recharger();
      } catch {
        // Le service a déjà loggé. L'écriture, elle, a bien eu lieu.
      }
    } catch (e) {
      // Un message clair vient du service (23514). Sinon on reste générique :
      // le détail Postgres porte des noms de fonctions et des ERRCODE.
      setErreurAction(e?.message?.startsWith("Le taux") ? e.message : "L'enregistrement a échoué.");
    } finally {
      setEnCours(null);
    }
  };

  if (loading) return <p className="adm-page-note">Chargement…</p>;
  if (erreur) return <p className="adm-erreur">{erreur}</p>;

  return (
    <div>
      <h1 className="adm-page-titre">Commissions</h1>
      <p className="adm-page-note">
        Le taux négocié par château et par module. Un module actif sans taux encaisse{" "}
        <strong>0 %</strong> — sans rien signaler ailleurs qu'ici.
      </p>

      {/* Les chiffres. L'alerte d'abord : c'est la seule qui demande une action. */}
      <div className="adm-stats">
        <div className={"adm-stat" + (alertes.publie > 0 ? " adm-cm-stat--alerte" : "")}>
          <span className="adm-stat-label">Actifs sans taux · publiés</span>
          <span className="adm-stat-valeur">{alertes.publie}</span>
          <span className="adm-stat-detail">
            {alertes.publie > 0
              ? "commission 0 en production"
              : "aucune fuite en production"}
          </span>
        </div>
        <div className="adm-stat adm-stat--attente">
          <span className="adm-stat-label">Actifs sans taux · brouillons</span>
          <span className="adm-stat-valeur">{alertes.autre}</span>
          <span className="adm-stat-detail">à régler avant publication</span>
        </div>
        <div className="adm-stat">
          <span className="adm-stat-label">Modules actifs</span>
          <span className="adm-stat-valeur">{nbActifs}</span>
          <span className="adm-stat-detail">
            sur {chateaux.length} châteaux · {modules.filter((m) => m.est_actif).length} modules ouverts
          </span>
        </div>
      </div>

      {erreurAction && <p className="adm-erreur">{erreurAction}</p>}

      <table className="adm-table adm-cm-table">
        <thead>
          <tr>
            <th>Château</th>
            {modules.map((m) => (
              <th key={m.id} className={m.est_actif ? "" : "adm-cm-col--ferme"}>
                {m.code} · {m.nom}
                <span className="adm-cm-fourchette">
                  {m.est_actif
                    ? m.commission_min_pct != null && m.commission_max_pct != null
                      ? `indicatif ${m.commission_min_pct}–${m.commission_max_pct} %`
                      : "pas de fourchette"
                    : "non commercialisé"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((c) => (
            <tr
              key={c.id}
              className={c.statut === "publie" ? "" : "adm-cm-ligne--brouillon"}
            >
              <td>
                <span className="adm-client-nom">{c.nom}</span>
                <span className={`adm-badge adm-badge--${c.statut}`}>
                  {LIBELLE_STATUT[c.statut] ?? c.statut}
                </span>
              </td>

              {modules.map((m) => {
                const k = cle(c.id, m.id);
                const { base, actif, taux, sale } = etatCellule(c.id, m.id);
                const busy = enCours === k;

                // Module fermé au référentiel (D) : la RPC le refuserait de
                // toute façon (22023). On le dit ici plutôt que de laisser
                // l'admin découvrir le refus après coup.
                if (!m.est_actif) {
                  return (
                    <td key={m.id} className="adm-cm-cell adm-cm-cell--ferme">
                      <span className="adm-cm-etat">Module non ouvert</span>
                    </td>
                  );
                }

                const alerte =
                  base?.est_actif === true &&
                  (base.commission_pct_negociee === null ||
                    base.commission_pct_negociee === undefined);

                return (
                  <td key={m.id} className="adm-cm-cell">
                    {/* L'état ENREGISTRÉ, pas le tampon : l'admin doit voir ce
                        qui est en base pendant qu'il tape ce qui le remplacera. */}
                    {alerte ? (
                      <span className="adm-cm-alerte">Actif sans taux — commission 0</span>
                    ) : (
                      <span className="adm-cm-etat">
                        {!base
                          ? "Ligne absente"
                          : !base.est_actif
                            ? "Inactif"
                            : tauxTexte(base.commission_pct_negociee)}
                      </span>
                    )}

                    <div className="adm-cm-saisie">
                      <label className="adm-cm-toggle">
                        <input
                          type="checkbox"
                          checked={actif}
                          disabled={busy}
                          onChange={(e) => modifier(c.id, m.id, "actif", e.target.checked)}
                        />
                        <span>Actif</span>
                      </label>
                      <input
                        className="adm-input adm-cm-taux"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="—"
                        aria-label={`Taux ${m.code} — ${c.nom}`}
                        value={taux}
                        disabled={busy}
                        onChange={(e) => modifier(c.id, m.id, "taux", e.target.value)}
                      />
                      <span className="adm-cm-pct">%</span>
                    </div>

                    {/* Rien ne s'écrit sans un geste explicite. Cocher « Actif »
                        sur une ligne absente créerait sinon la ligne à taux NULL
                        — exactement la fuite que cet écran existe pour montrer. */}
                    {sale && (
                      <div className="adm-cm-actions">
                        <button
                          type="button"
                          className="adm-btn adm-btn--primary adm-cm-btn"
                          disabled={busy}
                          onClick={() => enregistrer(c.id, m.id)}
                        >
                          {busy ? "…" : "Enregistrer"}
                        </button>
                        <button
                          type="button"
                          className="adm-btn adm-cm-btn"
                          disabled={busy}
                          onClick={() => annuler(c.id, m.id)}
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
