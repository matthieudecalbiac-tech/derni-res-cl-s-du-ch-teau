import { describe, it, expect } from "vitest";
import { STATUTS_CHATELAIN, libelleStatutChatelain } from "../reservations.js";

describe("STATUTS_CHATELAIN", () => {
  it("expose les 4 statuts de l'enum en { value, label }", () => {
    expect(STATUTS_CHATELAIN.map((s) => s.value)).toEqual([
      "pending",
      "confirmed",
      "cancelled",
      "completed",
    ]);
    // Chaque entrée a un libellé non vide.
    for (const s of STATUTS_CHATELAIN) {
      expect(typeof s.label).toBe("string");
      expect(s.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("libelleStatutChatelain", () => {
  it("mappe un statut connu vers son libellé châtelain", () => {
    expect(libelleStatutChatelain("pending")).toBe("En attente de votre réponse");
    expect(libelleStatutChatelain("confirmed")).toBe("Confirmée");
    expect(libelleStatutChatelain("cancelled")).toBe("Refusée");
    expect(libelleStatutChatelain("completed")).toBe("Séjour passé");
  });

  it("fallback : renvoie le statut brut si inconnu (jamais vide)", () => {
    expect(libelleStatutChatelain("inconnu")).toBe("inconnu");
  });

  it("robuste : null/undefined → chaîne vide (pas de crash)", () => {
    expect(libelleStatutChatelain(null)).toBe("");
    expect(libelleStatutChatelain(undefined)).toBe("");
  });
});
