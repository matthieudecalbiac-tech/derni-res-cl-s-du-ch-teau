// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — chateauxService.js (S1-δ Phase 4.4)
// ═══════════════════════════════════════════════════════════════════════════
// Mock du client Supabase via vi.mock(). Helpers mockSupabaseSuccess /
// Error pour éviter la verbosité du chaining
// .from().select().eq().order().order().
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";

// IMPORTANT : vi.mock() est hoisted, le mock doit être déclaré AVANT les imports.
vi.mock("../../lib/supabase.js", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "../../lib/supabase.js";
import {
  getChateaux,
  getChateauById,
  getChateauBySlug,
  getPersonnageBySlug,
  getCompteurs,
  invalidateCache,
} from "../chateauxService.js";
import {
  FIXTURE_BRIOTTIERES,
  FIXTURE_VAUX,
  FIXTURE_PERSONNAGE_FICHE,
} from "../__fixtures__/chateaux.fixtures.js";


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — mock du chaining Supabase
// ─────────────────────────────────────────────────────────────────────────────

// Exposé pour assérer les arguments du filtre de statut : le maillon `.eq()`
// est ce qui tient les brouillons hors du cache public.
let eqMock;

function mockSupabaseSuccess(rows) {
  eqMock = vi.fn().mockReturnValue({
    order: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue({
        data: rows,
        error: null,
      }),
    }),
  });
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({ eq: eqMock }),
  });
}

function mockSupabaseError(message) {
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message, code: "TEST_ERROR" },
          }),
        }),
      }),
    }),
  });
}

// Chaîne .select().eq().maybeSingle() de getPersonnageBySlug (lecture directe,
// pas de cache). `data` null modélise un slug inconnu.
function mockPersonnageQuery(row, error = null) {
  supabase.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
      }),
    }),
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getChateaux", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  it("1er appel : round-trip Supabase, retourne mapped Chateaux", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES, FIXTURE_VAUX]);
    const chateaux = await getChateaux();

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("chateaux");
    expect(chateaux).toHaveLength(2);
    // Format mappé (camelCase + nested objects)
    expect(chateaux[0].slug).toBe("les-briottieres");
    expect(chateaux[0].estLaUne).toBe(true);
    expect(chateaux[0].coordonnees).toEqual({ lat: 47.6833, lng: -0.5333 });
    expect(chateaux[1].slug).toBe("vaux-le-vicomte");
  });

  it("2e appel < 5 min : retourne le cache (pas de round-trip)", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES]);

    await getChateaux();
    await getChateaux();
    await getChateaux();

    expect(supabase.from).toHaveBeenCalledTimes(1); // 1 seul round-trip
  });

  it("Erreur Supabase : throw avec message", async () => {
    mockSupabaseError("Connection refused");
    await expect(getChateaux()).rejects.toThrow("Failed to fetch chateaux: Connection refused");
  });

  it("Tableau vide Supabase : retourne []", async () => {
    mockSupabaseSuccess([]);
    const chateaux = await getChateaux();
    expect(chateaux).toEqual([]);
  });

  it("excludeMocks=true : exclut les chateaux de demonstration", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES, FIXTURE_VAUX]);
    const chateaux = await getChateaux({ excludeMocks: true });
    expect(chateaux).toHaveLength(1);
    expect(chateaux[0].slug).toBe("les-briottieres");
    expect(chateaux[0].estLaUne).toBe(true);
  });

  it("excludeMocks=false (défaut) : retourne tout", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES, FIXTURE_VAUX]);
    const chateaux = await getChateaux();
    expect(chateaux).toHaveLength(2);
  });

  it("ne demande que les chateaux publies (les brouillons ne doivent jamais entrer dans le cache)", async () => {
    mockSupabaseSuccess([]);
    await getChateaux();
    expect(eqMock).toHaveBeenCalledWith("statut", "publie");
  });
});


describe("getChateauById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  it("id existant : retourne le chateau", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES, FIXTURE_VAUX]);
    const chateau = await getChateauById(FIXTURE_BRIOTTIERES.id);
    expect(chateau).not.toBeNull();
    expect(chateau.slug).toBe("les-briottieres");
  });

  it("id inexistant : retourne null", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES]);
    const chateau = await getChateauById("00000000-0000-0000-0000-999999999999");
    expect(chateau).toBeNull();
  });

  it("id null/undefined : retourne null sans round-trip Supabase", async () => {
    expect(await getChateauById(null)).toBeNull();
    expect(await getChateauById(undefined)).toBeNull();
    expect(await getChateauById("")).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});


describe("getChateauBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  it("slug existant : retourne le chateau", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES, FIXTURE_VAUX]);
    const chateau = await getChateauBySlug("vaux-le-vicomte");
    expect(chateau).not.toBeNull();
    expect(chateau.nom).toBe("Château de Vaux-le-Vicomte");
  });

  it("slug inexistant : retourne null", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES]);
    const chateau = await getChateauBySlug("inexistant");
    expect(chateau).toBeNull();
  });
});


describe("getPersonnageBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  it("slug existant : retourne le personnage + châteaux mappés (mock exclu)", async () => {
    mockPersonnageQuery(FIXTURE_PERSONNAGE_FICHE);
    const p = await getPersonnageBySlug("george-sand");

    expect(supabase.from).toHaveBeenCalledWith("personnages");
    expect(p).not.toBeNull();
    expect(p.nom).toBe("George Sand");
    // 2 châteaux réels, triés par ordre, mock filtré.
    expect(p.chateaux.map((c) => c.slug)).toEqual(["les-briottieres", "blanc-buisson"]);
  });

  it("slug inconnu (maybeSingle → data null) : retourne null (pas de throw)", async () => {
    mockPersonnageQuery(null);
    expect(await getPersonnageBySlug("inexistant")).toBeNull();
  });

  it("slug null/undefined : retourne null sans round-trip Supabase", async () => {
    expect(await getPersonnageBySlug(null)).toBeNull();
    expect(await getPersonnageBySlug(undefined)).toBeNull();
    expect(await getPersonnageBySlug("")).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("erreur Supabase : throw avec message", async () => {
    mockPersonnageQuery(null, { message: "Connection refused", code: "TEST_ERROR" });
    await expect(getPersonnageBySlug("george-sand")).rejects.toThrow(
      "Failed to fetch personnage george-sand: Connection refused"
    );
  });
});


describe("getCompteurs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  it("nbChateaux et nbVitrinesPremium corrects", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES, FIXTURE_VAUX]);
    const c = await getCompteurs();
    expect(c.nbChateaux).toBe(2);
    expect(c.nbVitrinesPremium).toBe(1); // seulement Briottières estLaUne
    // chambresUrgentes retiré en Phase 4.5 (option C slogan fixe)
    expect(c.chambresUrgentes).toBeUndefined();
  });

  it("chambresRestantes = 0 (dette Phase 4.4)", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES, FIXTURE_VAUX]);
    const c = await getCompteurs();
    // Le mapper retourne chambresRestantes: null pour chaque château
    // → somme des nulls = 0. Sera réparé en S2 via RPC.
    expect(c.chambresRestantes).toBe(0);
  });
});


describe("invalidateCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateCache();
  });

  it("après invalidation, prochain getChateaux() refetch Supabase", async () => {
    mockSupabaseSuccess([FIXTURE_BRIOTTIERES]);

    await getChateaux();
    expect(supabase.from).toHaveBeenCalledTimes(1);

    invalidateCache();

    await getChateaux();
    expect(supabase.from).toHaveBeenCalledTimes(2); // refetch après invalidation
  });
});
