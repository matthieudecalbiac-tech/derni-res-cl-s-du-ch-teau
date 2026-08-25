// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — prixService (P2 du chantier prix nuit par nuit)
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠ CE QUI EST TESTÉ ICI : le CONTRAT D'APPEL, rien d'autre. La règle de prix
// vit en SQL et elle est prouvée là-bas — `2026-08-25-prix-sejour.sql`, huit
// tests en base réelle, dont la parité au centime entre la fonction et une
// somme recalculée à la main. La rejouer avec un client mocké ne prouverait
// que la qualité du mock.
//
// ⚠⚠ ET C'EST PRÉCISÉMENT LE POINT DU CHANTIER : si ce service recalculait
// quoi que ce soit, il faudrait le tester — et deux calculs testés séparément
// divergent tôt ou tard. Il n'y a qu'une source, donc qu'un seul endroit à
// prouver juste. Ces tests gardent le TUYAU, pas la règle.
//
// ⚠ LE VERROU DE FUSEAU EST LE TEST QUI COMPTE. Envoyer un objet `Date` à la
// RPC laisserait PostgREST le sérialiser en ISO UTC, et le cast `::date`
// pourrait décaler d'un jour — donc facturer une NUIT DE PLUS OU DE MOINS.
// Un tel défaut ne casse rien visiblement : il décale un montant, parfois,
// pour certains fuseaux.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/supabase.js", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../lib/supabase.js";
import { prixSejourCents, estPlageInvalide, ERREUR_PLAGE } from "../prixService.js";

const CHAMBRE = "11111111-2222-3333-4444-555555555555";

function mockRpc(data) {
  supabase.rpc.mockResolvedValue({ data, error: null, status: 200 });
}
function mockRpcErreur(code, message, status = 400) {
  supabase.rpc.mockResolvedValue({ data: null, error: { code, message }, status });
}
const dernierAppel = () => supabase.rpc.mock.calls.at(-1);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("prixSejourCents — le contrat d'appel", () => {
  it("appelle la RPC prix_sejour avec les trois paramètres nommés", async () => {
    mockRpc(250000);
    await prixSejourCents(CHAMBRE, "2026-09-12", "2026-09-15");

    expect(dernierAppel()[0]).toBe("prix_sejour");
    expect(dernierAppel()[1]).toEqual({
      p_chambre_id: CHAMBRE,
      p_arrivee: "2026-09-12",
      p_depart: "2026-09-15",
    });
  });

  it("rend le total EN CENTS, tel que la base le donne", async () => {
    mockRpc(250000);
    await expect(prixSejourCents(CHAMBRE, "2026-09-12", "2026-09-15")).resolves.toBe(250000);
  });

  // ⚠ LE TEST DU CHANTIER. Le service ne doit RIEN calculer : quel que soit le
  //   nombre de nuits demandé, il rend ce que la base a dit. S'il se mettait un
  //   jour à multiplier, diviser ou arrondir, ce test le verrait.
  it("⚠ ne recalcule RIEN — le total rendu est celui de la base, à l'identique", async () => {
    mockRpc(999999);
    await expect(prixSejourCents(CHAMBRE, "2026-09-01", "2026-09-30")).resolves.toBe(999999);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("⚠ le verrou de fuseau — jamais un objet Date à la RPC", () => {
  it("convertit une Date sur ses composantes LOCALES", async () => {
    mockRpc(100000);
    // 1er septembre 2026, 00 h 30 heure locale.
    await prixSejourCents(CHAMBRE, new Date(2026, 8, 1, 0, 30), new Date(2026, 8, 2, 0, 30));

    expect(dernierAppel()[1].p_arrivee).toBe("2026-09-01");
    expect(dernierAppel()[1].p_depart).toBe("2026-09-02");
  });

  // ⚠ LE CONTRE-EXEMPLE, ÉCRIT NOIR SUR BLANC : voilà ce que la voie interdite
  //   aurait produit pour la même date, dans un fuseau à l'est de Greenwich.
  it("⚠ toISOString aurait rendu LE JOUR PRÉCÉDENT — d'où l'interdiction", () => {
    const minuitTrente = new Date(2026, 8, 1, 0, 30);
    const parUTC = minuitTrente.toISOString().slice(0, 10);
    // Selon le fuseau de la machine : à l'est de Greenwich, on obtient le 31/08.
    if (minuitTrente.getTimezoneOffset() < 0) {
      expect(parUTC).toBe("2026-08-31");
    }
    // La conversion locale, elle, ne dépend d'aucun fuseau.
    expect(
      `${minuitTrente.getFullYear()}-09-${String(minuitTrente.getDate()).padStart(2, "0")}`,
    ).toBe("2026-09-01");
  });

  it("laisse passer une chaîne déjà au bon format (cas d'un <input type=\"date\">)", async () => {
    mockRpc(100000);
    await prixSejourCents(CHAMBRE, "2026-09-01", "2026-09-02");
    expect(dernierAppel()[1].p_arrivee).toBe("2026-09-01");
  });
});

describe("⚠ les erreurs ne sont JAMAIS avalées — c'est un montant", () => {
  it("propage l'erreur de la RPC", async () => {
    mockRpcErreur(ERREUR_PLAGE, "prix_sejour : depart doit suivre arrivee");
    await expect(prixSejourCents(CHAMBRE, "2026-09-15", "2026-09-12")).rejects.toMatchObject({
      code: ERREUR_PLAGE,
    });
  });

  // ⚠ Un montant qu'on ne sait pas calculer ne doit jamais devenir 0 : un
  //   « séjour à 0 € » s'afficherait comme une offre, pas comme une panne.
  it("⚠ ne transforme pas un échec en 0", async () => {
    mockRpcErreur("PGRST301", "panne", 500);
    await expect(prixSejourCents(CHAMBRE, "2026-09-12", "2026-09-15")).rejects.toBeTruthy();
  });

  it("rejette un total non entier ou <= 0, même sans erreur RPC", async () => {
    mockRpc(0);
    await expect(prixSejourCents(CHAMBRE, "2026-09-12", "2026-09-15")).rejects.toThrow(/total inattendu/);
    mockRpc(12.5);
    await expect(prixSejourCents(CHAMBRE, "2026-09-12", "2026-09-15")).rejects.toThrow(/total inattendu/);
  });

  // ⚠ PostgREST rend aujourd'hui un nombre, mais ce détail de sérialisation a
  //   déjà varié ailleurs dans ce dépôt. Une chaîne passerait `> 0` et
  //   casserait les additions en aval.
  it("normalise un entier arrivé en chaîne", async () => {
    mockRpc("250000");
    await expect(prixSejourCents(CHAMBRE, "2026-09-12", "2026-09-15")).resolves.toBe(250000);
  });
});

describe("estPlageInvalide — distinguer une saisie d'une panne", () => {
  it("reconnaît le 22023", () => {
    expect(estPlageInvalide({ code: ERREUR_PLAGE })).toBe(true);
  });
  it("écarte tout le reste", () => {
    expect(estPlageInvalide({ code: "PGRST301" })).toBe(false);
    expect(estPlageInvalide(null)).toBe(false);
    expect(estPlageInvalide(undefined)).toBe(false);
  });
});
