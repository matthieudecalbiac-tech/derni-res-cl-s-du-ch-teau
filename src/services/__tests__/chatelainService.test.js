// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — chatelainService.js (réponse du châtelain à une demande)
// ═══════════════════════════════════════════════════════════════════════════
// Mock du client Supabase via vi.mock(). Ici pas de chaining .from() : la
// réponse passe par supabase.rpc(), qu'on mocke directement.
// Modèle : chateauxService.test.js.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";

// IMPORTANT : vi.mock() est hoisted, le mock doit être déclaré AVANT les imports.
vi.mock("../../lib/supabase.js", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../lib/supabase.js";
import { repondreDemande, ERR_DEJA_TRAITEE } from "../chatelainService.js";

const RESA_ID = "11111111-2222-3333-4444-555555555555";

// Erreur telle que PostgREST la remonte : un objet { code, message }, pas un throw.
function mockRpcError(code, message) {
  supabase.rpc.mockResolvedValue({ data: null, error: { code, message } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("repondreDemande", () => {
  it("cas nominal : renvoie la ligne et appelle la RPC avec les bons paramètres", async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ reservation_id: RESA_ID, nouveau_statut: "confirmed" }],
      error: null,
    });

    const res = await repondreDemande(RESA_ID, "accepter");

    expect(res).toEqual({ reservation_id: RESA_ID, nouveau_statut: "confirmed" });
    // Le contrat d'appel : nom de la RPC + noms des paramètres. Un renommage
    // côté SQL doit casser ICI, pas en preview.
    expect(supabase.rpc).toHaveBeenCalledWith("repondre_demande", {
      p_reservation_id: RESA_ID,
      p_decision: "accepter",
    });
  });

  it("RETURNS TABLE : normalise une réponse objet comme une réponse tableau", async () => {
    supabase.rpc.mockResolvedValue({
      data: { reservation_id: RESA_ID, nouveau_statut: "cancelled" },
      error: null,
    });

    await expect(repondreDemande(RESA_ID, "refuser")).resolves.toEqual({
      reservation_id: RESA_ID,
      nouveau_statut: "cancelled",
    });
  });

  it("P0001 (garde pending) : erreur marquée ERR_DEJA_TRAITEE, message SQL non propagé", async () => {
    mockRpcError("P0001", "repondre_demande: demande deja traitee (statut confirmed)");

    const err = await repondreDemande(RESA_ID, "accepter").catch((e) => e);

    expect(err.code).toBe(ERR_DEJA_TRAITEE);
    // Le libellé écran appartient à l'UI : le message brut de la RPC ne doit
    // pas transiter par l'Error levée.
    expect(err.message).not.toMatch(/repondre_demande|statut confirmed/);
  });

  it("42501 (pas le châtelain) : erreur relayée telle quelle, PAS mappée en déjà traitée", async () => {
    mockRpcError("42501", "repondre_demande: acces refuse (pas le chatelain de ce chateau)");

    const err = await repondreDemande(RESA_ID, "accepter").catch((e) => e);

    // Seul P0001 porte la garde pending : les trois autres ERRCODE de la RPC
    // (P0002, 42501, 22023) restent des erreurs génériques côté UI.
    expect(err.code).toBe("42501");
    expect(err.code).not.toBe(ERR_DEJA_TRAITEE);
  });
});
