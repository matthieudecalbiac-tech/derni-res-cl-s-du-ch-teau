// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — chatelainService.getMesChateaux() (étape 3.2)
// ═══════════════════════════════════════════════════════════════════════════
// Fichier séparé de chatelainService.test.js : celui-ci mocke `supabase.rpc`,
// celui-là `supabase.from().select()`. Deux chaînages différents dans un même
// fichier obligeraient à remonter le mock entre chaque test.
//
// ⚠ CE QUE CE FICHIER TESTE : le CONTRAT DE REQUÊTE et la NORMALISATION.
// ⚠ CE QU'IL NE PEUT PAS TESTER : que la RLS filtre. C'est pourtant tout le
// mécanisme — la fonction n'a AUCUN filtre applicatif, elle demande la table
// entière et laisse Postgres décider. Un mock rendrait ce qu'on lui dit de
// rendre : il prouverait la qualité du mock, rien d'autre.
// C'est `supabase/tests-mes-chateaux.sql` qui le prouve, en base, sous
// l'identité d'un vrai châtelain.
//
// ⚠ D'OÙ L'IMPORTANCE DU TEST DE LA CHAÎNE `select` : c'est la seule chose que
// ce fichier peut garder du côté serveur. Le `!inner` et les deux colonnes
// d'horizon sont vérifiés littéralement — les perdre ne casserait rien de
// visible ici, mais produirait des lignes fantômes `chateaux: null` et un
// aller-retour de plus dans l'écran de saisie.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";

// IMPORTANT : vi.mock() est hoisted, le mock doit être déclaré AVANT les imports.
vi.mock("../../lib/supabase.js", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../lib/supabase.js";
import { getMesChateaux } from "../chatelainService.js";

/** Chaînage .from(...).select(...) — le select est terminal ici (pas d'order). */
function mockSelect(data, error = null, status = 200) {
  const select = vi.fn().mockResolvedValue({ data, error, status });
  supabase.from.mockReturnValue({ select });
  return select;
}

/** Une ligne chateau_owners telle que PostgREST la rend, château embarqué. */
function lien(chateau) {
  return { chateau_id: chateau.id, chateaux: chateau };
}

const RIVIERE = {
  id: "c1", nom: "Château de la Rivière", slug: "chateau-de-la-riviere",
  statut: "publie", dispo_geree: false, dispo_ouverte_jusqu_a: null,
  chambres: [
    { id: "r3", nom: "Zéphyr",  ordre: 2 },
    { id: "r1", nom: "Aurore",  ordre: 0 },
    { id: "r2", nom: "Bruyère", ordre: 1 },
  ],
};

const CHANTILLY = {
  id: "c2", nom: "Chantilly", slug: "chantilly",
  statut: "brouillon", dispo_geree: true, dispo_ouverte_jusqu_a: "2027-12-31",
  chambres: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});


describe("contrat de requête", () => {
  it("interroge chateau_owners, et AUCUN filtre applicatif n'est posé", async () => {
    const select = mockSelect([]);
    await getMesChateaux();

    expect(supabase.from).toHaveBeenCalledWith("chateau_owners");
    // ⚠ Un seul argument : la chaîne de select. Pas de .eq("user_id", …) —
    //   ce n'est pas l'application qui filtre, c'est la RLS. Un filtre ici
    //   masquerait un défaut de policy au lieu de le révéler.
    expect(select).toHaveBeenCalledTimes(1);
    expect(select.mock.calls[0]).toHaveLength(1);
  });

  it("embarque les châteaux en !inner et leurs chambres", async () => {
    const select = mockSelect([]);
    await getMesChateaux();

    const requete = select.mock.calls[0][0].replace(/\s+/g, " ");
    // ⚠ Le `!inner` évite la ligne fantôme `chateaux: null` quand la RLS masque
    //   le château. Le perdre ne casse rien de visible — d'où ce test.
    expect(requete).toContain("chateaux!inner");
    expect(requete).toContain("chambres");
  });

  it("demande les deux colonnes d'horizon, dont l'écran de saisie aura besoin", async () => {
    const select = mockSelect([]);
    await getMesChateaux();

    const requete = select.mock.calls[0][0];
    expect(requete).toContain("dispo_geree");
    expect(requete).toContain("dispo_ouverte_jusqu_a");
    expect(requete).toContain("statut");
  });
});


describe("normalisation", () => {
  it("aplatit le lien en château, en camelCase", async () => {
    mockSelect([lien(CHANTILLY)]);
    const res = await getMesChateaux();

    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      id: "c2",
      nom: "Chantilly",
      slug: "chantilly",
      statut: "brouillon",
      dispoGeree: true,
      dispoOuverteJusquA: "2027-12-31",
    });
    // Le lien lui-même ne doit pas fuir dans le résultat.
    expect(res[0]).not.toHaveProperty("chateaux");
    expect(res[0]).not.toHaveProperty("chateau_id");
  });

  it("dispoGeree est un vrai booléen, dispoOuverteJusquA vaut null si absent", async () => {
    mockSelect([lien({ ...RIVIERE, dispo_geree: null, dispo_ouverte_jusqu_a: undefined })]);
    const res = await getMesChateaux();

    expect(res[0].dispoGeree).toBe(false);
    expect(res[0].dispoOuverteJusquA).toBeNull();
  });

  it("⚠ TRIE LES CHAMBRES par ordre — le mock les rend en désordre", async () => {
    mockSelect([lien(RIVIERE)]);
    const res = await getMesChateaux();

    expect(res[0].chambres.map((c) => c.nom)).toEqual(["Aurore", "Bruyère", "Zéphyr"]);
  });

  it("⚠ une chambre sans ordre finit EN DERNIER, pas en tête", async () => {
    // Sans le repli sur Infinity, `null` se compare comme 0 et passerait devant.
    mockSelect([lien({
      ...RIVIERE,
      chambres: [
        { id: "x", nom: "Sans ordre", ordre: null },
        { id: "y", nom: "Première",   ordre: 1 },
      ],
    })]);
    const res = await getMesChateaux();

    expect(res[0].chambres.map((c) => c.nom)).toEqual(["Première", "Sans ordre"]);
  });

  it("trie les châteaux par nom, en collation FRANÇAISE", async () => {
    mockSelect([lien(RIVIERE), lien(CHANTILLY)]);
    const res = await getMesChateaux();

    // ⚠ « Chantilly » AVANT « Château de la Rivière », et ce n'est pas une
    //   coquille : en collation fr, `â` se compare comme `a`, la décision se
    //   joue donc au 3e caractère — `n` avant `t`. Un tri ASCII brut aurait
    //   rendu l'inverse (â = 0xE2, après toutes les lettres non accentuées).
    //   C'est précisément ce que `localeCompare(…, "fr")` corrige, et ce test
    //   le garde : un retour à une comparaison naïve le ferait rougir.
    expect(res.map((c) => c.nom)).toEqual(["Chantilly", "Château de la Rivière"]);
  });

  it("un château sans chambre rend un tableau vide, pas undefined", async () => {
    mockSelect([lien({ ...CHANTILLY, chambres: null })]);
    const res = await getMesChateaux();

    expect(res[0].chambres).toEqual([]);
  });

  it("⚠ aucun lien -> [] et non une erreur : la RLS ne refuse pas, elle ne rend rien", async () => {
    // C'est ce que verra un CLIENT connecté. Un écran qui lirait « pas
    // d'erreur » comme « accès accordé » afficherait une page vide plutôt
    // qu'un refus — à traiter en 3.4.
    mockSelect([]);
    await expect(getMesChateaux()).resolves.toEqual([]);

    mockSelect(null);
    await expect(getMesChateaux()).resolves.toEqual([]);
  });

  it("un lien sans château embarqué est écarté (ceinture du !inner)", async () => {
    mockSelect([{ chateau_id: "c9", chateaux: null }, lien(CHANTILLY)]);
    const res = await getMesChateaux();

    expect(res).toHaveLength(1);
    expect(res[0].slug).toBe("chantilly");
  });
});


describe("propagation de l'erreur", () => {
  it("une erreur est relancée BRUTE, sans transformation", async () => {
    mockSelect(null, { code: "42501", message: "permission denied" }, 403);
    await expect(getMesChateaux()).rejects.toMatchObject({ code: "42501" });
  });
});
