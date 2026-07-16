import { describe, it, expect } from "vitest";
import { NATURES, libelleNature } from "../personnages.js";

describe("NATURES", () => {
  it("expose les 4 natures fermées en { value, label }", () => {
    expect(NATURES.map((n) => n.value)).toEqual([
      "fait_histoire",
      "a_habite",
      "evenement",
      "histoire_famille",
    ]);
    // Chaque entrée a un libellé non vide.
    for (const n of NATURES) {
      expect(typeof n.label).toBe("string");
      expect(n.label.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("libelleNature", () => {
  it("mappe un slug connu vers son libellé lisible", () => {
    expect(libelleNature("fait_histoire")).toBe("A fait l'histoire du lieu");
    expect(libelleNature("a_habite")).toBe("A habité les lieux");
    expect(libelleNature("evenement")).toBe("Événement");
    expect(libelleNature("histoire_famille")).toBe("Histoire de famille");
  });

  it("fallback : renvoie le slug brut si inconnu (jamais vide)", () => {
    expect(libelleNature("inconnu")).toBe("inconnu");
  });

  it("robuste : null/undefined → chaîne vide (pas de crash)", () => {
    expect(libelleNature(null)).toBe("");
    expect(libelleNature(undefined)).toBe("");
  });
});
