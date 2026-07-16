import { describe, it, expect } from "vitest";
import { chateauPorteEquipements } from "../equipements.js";

// Fabrique un chateau minimal : chaque service porte une liste de slugs.
const ch = (...servicesSlugs) => ({
  amenities: servicesSlugs.map((slugs) => ({
    equipements: slugs.map((slug) => ({ slug, libelle: slug })),
  })),
});

describe("chateauPorteEquipements (ET, union des services)", () => {
  it("ET satisfait via UN seul service portant tous les slugs", () => {
    const c = ch(["piscine", "sauna"]); // un service porte les deux
    expect(chateauPorteEquipements(c, ["piscine", "sauna"])).toBe(true);
  });

  it("ET satisfait via PLUSIEURS services (union) : piscine sur l'un, sauna sur l'autre", () => {
    const c = ch(["piscine"], ["sauna"]);
    expect(chateauPorteEquipements(c, ["piscine", "sauna"])).toBe(true);
  });

  it("un slug manquant -> false", () => {
    const c = ch(["piscine"]); // pas de sauna
    expect(chateauPorteEquipements(c, ["piscine", "sauna"])).toBe(false);
  });

  it("un seul slug demande, present -> true ; absent -> false", () => {
    const c = ch(["tennis", "velos"]);
    expect(chateauPorteEquipements(c, ["velos"])).toBe(true);
    expect(chateauPorteEquipements(c, ["equitation"])).toBe(false);
  });

  it("liste vide -> true (aucune contrainte)", () => {
    expect(chateauPorteEquipements(ch(["piscine"]), [])).toBe(true);
    expect(chateauPorteEquipements(ch(), [])).toBe(true);
  });

  it("robuste : chateau sans amenities / null -> false si des slugs sont demandes", () => {
    expect(chateauPorteEquipements({ amenities: [] }, ["piscine"])).toBe(false);
    expect(chateauPorteEquipements({}, ["piscine"])).toBe(false);
    expect(chateauPorteEquipements(null, ["piscine"])).toBe(false);
  });

  it("robuste : slugs non-tableau -> traite comme vide -> true", () => {
    expect(chateauPorteEquipements(ch(["piscine"]), null)).toBe(true);
    expect(chateauPorteEquipements(ch(["piscine"]), undefined)).toBe(true);
  });

  it("service sans equipements ne casse pas l'union", () => {
    const c = ch([], ["piscine"], []); // services vides + un avec piscine
    expect(chateauPorteEquipements(c, ["piscine"])).toBe(true);
    expect(chateauPorteEquipements(c, ["sauna"])).toBe(false);
  });
});
