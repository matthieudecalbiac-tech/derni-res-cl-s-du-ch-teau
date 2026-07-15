import { describe, it, expect } from "vitest";
import { getRegionsAvecChateaux } from "../regions.js";

describe("getRegionsAvecChateaux", () => {
  it("expose les departements distincts par region, tries alpha FR, sans doublon", () => {
    const chateaux = [
      { id: 1, nom: "Vaux", slug: "vaux", region: "Île-de-France", departement: "Seine-et-Marne" },
      { id: 2, nom: "Autre IDF", slug: "autre-idf", region: "Île-de-France", departement: "Seine-et-Marne" }, // doublon dept
      { id: 3, nom: "Blanc Buisson", slug: "blanc-buisson", region: "Normandie", departement: "Eure" },
    ];
    const res = getRegionsAvecChateaux(chateaux);
    // Regions triees alpha : Île-de-France avant Normandie
    expect(res.map((r) => r.region)).toEqual(["Île-de-France", "Normandie"]);
    // Departements distincts, dedupliques
    expect(res[0].departements).toEqual(["Seine-et-Marne"]);
    expect(res[1].departements).toEqual(["Eure"]);
  });

  it("trie plusieurs departements d'une meme region alpha FR", () => {
    const chateaux = [
      { id: 1, nom: "A", slug: "a", region: "R", departement: "Oise" },
      { id: 2, nom: "B", slug: "b", region: "R", departement: "Aisne" },
      { id: 3, nom: "C", slug: "c", region: "R", departement: "Nord" },
    ];
    const res = getRegionsAvecChateaux(chateaux);
    expect(res[0].departements).toEqual(["Aisne", "Nord", "Oise"]);
  });

  it("reste robuste si un chateau n'a pas de departement (null / absent)", () => {
    const chateaux = [
      { id: 1, nom: "A", slug: "a", region: "R", departement: null },
      { id: 2, nom: "B", slug: "b", region: "R" }, // departement absent
      { id: 3, nom: "C", slug: "c", region: "R", departement: "Eure" },
    ];
    const res = getRegionsAvecChateaux(chateaux);
    // Les entrees sans departement ne polluent pas la liste
    expect(res[0].departements).toEqual(["Eure"]);
    // Mais le chateau reste bien present dans la region
    expect(res[0].chateaux).toHaveLength(3);
  });

  it("conserve les chateaux tries alpha FR dans la sortie", () => {
    const chateaux = [
      { id: 1, nom: "Zoo", slug: "zoo", region: "R", departement: "Eure" },
      { id: 2, nom: "Alpha", slug: "alpha", region: "R", departement: "Eure" },
    ];
    const res = getRegionsAvecChateaux(chateaux);
    expect(res[0].chateaux.map((c) => c.nom)).toEqual(["Alpha", "Zoo"]);
  });

  it("ignore les chateaux sans region", () => {
    const chateaux = [
      { id: 1, nom: "A", slug: "a", departement: "Eure" }, // pas de region
      { id: 2, nom: "B", slug: "b", region: "R", departement: "Eure" },
    ];
    const res = getRegionsAvecChateaux(chateaux);
    expect(res).toHaveLength(1);
    expect(res[0].region).toBe("R");
  });

  it("retourne un tableau vide sur entree vide ou absente", () => {
    expect(getRegionsAvecChateaux([])).toEqual([]);
    expect(getRegionsAvecChateaux()).toEqual([]);
  });
});
