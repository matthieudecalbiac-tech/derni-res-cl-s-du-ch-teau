import { describe, it, expect } from "vitest";
import { validerPublication } from "../validerPublication.js";

// Château complet et conforme — sert de base, muté champ par champ.
const CHATEAU_OK = {
  nom: "Château Test",
  slug: "chateau-test",
  region: "Normandie",
  accroche: "Une demeure au coeur du bocage.",
  histoire: "Une longue histoire familiale.",
  description: "Description complete du chateau.",
  regionNarrative: "Le narratif de la region.",
  images: ["/a.avif", "/b.avif", "/c.avif"],
  chambres: [{ nom: "Chambre 1" }],
  coordonnees: { lat: 48.9, lng: 1.2 },
  proprietaires: { nom: "Famille Test" },
};

describe("validerPublication — château conforme", () => {
  it("complet et conforme → aucun bloquant, aucun avertissement", () => {
    const r = validerPublication(CHATEAU_OK);
    expect(r.bloquants).toEqual([]);
    expect(r.avertissements).toEqual([]);
  });

  it("input null/invalide → un bloquant", () => {
    expect(validerPublication(null).bloquants.length).toBe(1);
    expect(validerPublication(undefined).bloquants.length).toBe(1);
  });
});

describe("validerPublication — bloquants (complétude)", () => {
  it("nom vide → 1 bloquant", () => {
    const r = validerPublication({ ...CHATEAU_OK, nom: "" });
    expect(r.bloquants.length).toBe(1);
    expect(r.bloquants[0]).toMatch(/nom/i);
  });

  it("slug vide → 1 bloquant", () => {
    expect(validerPublication({ ...CHATEAU_OK, slug: "  " }).bloquants.length).toBe(1);
  });

  it("region vide → 1 bloquant", () => {
    expect(validerPublication({ ...CHATEAU_OK, region: null }).bloquants.length).toBe(1);
  });

  it("accroche / histoire / description vides → 1 bloquant chacun", () => {
    expect(validerPublication({ ...CHATEAU_OK, accroche: "" }).bloquants.length).toBe(1);
    expect(validerPublication({ ...CHATEAU_OK, histoire: "" }).bloquants.length).toBe(1);
    expect(validerPublication({ ...CHATEAU_OK, description: "" }).bloquants.length).toBe(1);
  });

  it("moins de 3 images → 1 bloquant avec le compte", () => {
    const r = validerPublication({ ...CHATEAU_OK, images: ["/a.avif", "/b.avif"] });
    expect(r.bloquants.length).toBe(1);
    expect(r.bloquants[0]).toMatch(/3 images.*actuellement 2/);
  });

  it("aucune chambre → 1 bloquant", () => {
    const r = validerPublication({ ...CHATEAU_OK, chambres: [] });
    expect(r.bloquants.length).toBe(1);
    expect(r.bloquants[0]).toMatch(/chambre/i);
  });

  it("GPS manquant (lat ou lng null) → 1 bloquant", () => {
    expect(validerPublication({ ...CHATEAU_OK, coordonnees: { lat: null, lng: 1.2 } }).bloquants.length).toBe(1);
    expect(validerPublication({ ...CHATEAU_OK, coordonnees: { lat: 48.9, lng: null } }).bloquants.length).toBe(1);
    expect(validerPublication({ ...CHATEAU_OK, coordonnees: {} }).bloquants.length).toBe(1);
  });

  it("nom du propriétaire manquant → 1 bloquant", () => {
    const r = validerPublication({ ...CHATEAU_OK, proprietaires: { nom: "" } });
    expect(r.bloquants.length).toBe(1);
    expect(r.bloquants[0]).toMatch(/propri/i);
  });

  it("plusieurs manques cumulés → plusieurs bloquants", () => {
    const r = validerPublication({ ...CHATEAU_OK, nom: "", images: [], chambres: [] });
    expect(r.bloquants.length).toBe(3);
  });
});

describe("validerPublication — avertissements (non bloquants)", () => {
  it("un pourcentage dans un texte → avertissement, pas de bloquant", () => {
    const r = validerPublication({ ...CHATEAU_OK, accroche: "10% de nos recettes reversés." });
    expect(r.bloquants).toEqual([]);
    expect(r.avertissements.some((a) => /pourcentage/i.test(a))).toBe(true);
  });

  it("placeholder (TODO / lorem / à compléter / xxx) → avertissement, pas de bloquant", () => {
    expect(validerPublication({ ...CHATEAU_OK, histoire: "TODO écrire l'histoire." }).avertissements.length).toBeGreaterThan(0);
    expect(validerPublication({ ...CHATEAU_OK, description: "Lorem ipsum dolor." }).avertissements.length).toBeGreaterThan(0);
    expect(validerPublication({ ...CHATEAU_OK, regionNarrative: "À compléter." }).avertissements.length).toBeGreaterThan(0);
    const r = validerPublication({ ...CHATEAU_OK, accroche: "xxx" });
    expect(r.bloquants).toEqual([]);
    expect(r.avertissements.length).toBeGreaterThan(0);
  });

  it("avertissements n'empêchent pas la publication (bloquants vides)", () => {
    const r = validerPublication({ ...CHATEAU_OK, accroche: "50% TODO" });
    expect(r.bloquants).toEqual([]);
    expect(r.avertissements.length).toBeGreaterThan(0);
  });
});
