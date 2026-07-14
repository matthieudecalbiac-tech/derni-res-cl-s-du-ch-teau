import { describe, it, expect } from "vitest";
import { getSieclesDisponibles, siecleCourt } from "../siecles.js";

describe("getSieclesDisponibles", () => {
  it("dérive les valeurs distinctes, triées chronologiquement (romain de tête)", () => {
    const chateaux = [
      { siecle: "XVIIe siècle" },
      { siecle: "XVIIIe siècle" },
      { siecle: "XIIIe siècle" },
      { siecle: "XVIIe siècle" }, // doublon -> dédupliqué
    ];
    expect(getSieclesDisponibles(chateaux)).toEqual([
      "XIIIe siècle",
      "XVIIe siècle",
      "XVIIIe siècle",
    ]);
  });

  it("exclut les démos, les null/vides", () => {
    const chateaux = [
      { siecle: "XVIIe siècle" },
      { siecle: "XVe siècle", isDemoMock: true }, // exclu (démo)
      { siecle: null },
      { siecle: "   " },
      {},
    ];
    expect(getSieclesDisponibles(chateaux)).toEqual(["XVIIe siècle"]);
  });

  it("tableau vide / null → []", () => {
    expect(getSieclesDisponibles([])).toEqual([]);
    expect(getSieclesDisponibles(null)).toEqual([]);
  });

  it("valeur non parsable en romain → reléguée en fin, sans crash", () => {
    const out = getSieclesDisponibles([
      { siecle: "Moderne" },
      { siecle: "XVIIe siècle" },
    ]);
    expect(out[0]).toBe("XVIIe siècle");
    expect(out).toContain("Moderne");
  });
});

describe("siecleCourt", () => {
  it("retire le suffixe « siècle »", () => {
    expect(siecleCourt("XVIIe siècle")).toBe("XVIIe");
    expect(siecleCourt("XIIIe siècle")).toBe("XIIIe");
  });
  it("laisse intact ce qui n'a pas le suffixe + gère non-string", () => {
    expect(siecleCourt("XVIIe")).toBe("XVIIe");
    expect(siecleCourt(null)).toBe("");
  });
});
