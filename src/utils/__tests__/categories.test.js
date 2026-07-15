import { describe, it, expect } from "vitest";
import { CATEGORIES, libelleCategorie } from "../categories.js";

describe("CATEGORIES", () => {
  it("expose les 6 catégories fermées en { value, label }", () => {
    expect(CATEGORIES.map((c) => c.value)).toEqual([
      "bien_etre",
      "gastronomie",
      "sport",
      "nature",
      "culture",
      "famille",
    ]);
    // Chaque entrée a un libellé non vide.
    for (const c of CATEGORIES) {
      expect(typeof c.label).toBe("string");
      expect(c.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("libelleCategorie", () => {
  it("mappe un slug connu vers son libellé lisible", () => {
    expect(libelleCategorie("bien_etre")).toBe("Bien-être & détente");
    expect(libelleCategorie("gastronomie")).toBe("Gastronomie");
    expect(libelleCategorie("famille")).toBe("Famille");
  });

  it("fallback : renvoie le slug brut si inconnu (jamais vide)", () => {
    expect(libelleCategorie("inconnu")).toBe("inconnu");
  });

  it("robuste : null/undefined → chaîne vide (pas de crash)", () => {
    expect(libelleCategorie(null)).toBe("");
    expect(libelleCategorie(undefined)).toBe("");
  });
});
