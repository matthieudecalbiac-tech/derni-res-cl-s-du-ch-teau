import { describe, it, expect } from "vitest";
import { slugify } from "../slug.js";

describe("slugify — cas réels du corpus", () => {
  it("château : accents retirés, mots de liaison conservés, minuscules", () => {
    expect(slugify("Château de La Rivière")).toBe("chateau-de-la-riviere");
  });

  it("personnage avec apostrophe + chiffre romain", () => {
    // apostrophe -> séparateur ("d'" -> "d-") ; "II" reste "ii" (lettres, non converti)
    expect(slugify("Étienne II d'Aligre")).toBe("etienne-ii-d-aligre");
  });

  it("événement accentué", () => {
    expect(slugify("École de jeunes filles")).toBe("ecole-de-jeunes-filles");
  });

  it("nom simple", () => {
    expect(slugify("Jean Gabin")).toBe("jean-gabin");
  });
});

describe("slugify — règles", () => {
  it("apostrophe droite ET typographique -> séparateur", () => {
    expect(slugify("L'Orangerie")).toBe("l-orangerie");
    expect(slugify("L’Orangerie")).toBe("l-orangerie");
  });

  it("ponctuation et espaces multiples -> un seul tiret, pas de tiret en tête/fin", () => {
    expect(slugify("  Madame  de   Maintenon !! ")).toBe("madame-de-maintenon");
  });

  it("garde les chiffres", () => {
    expect(slugify("Louis 14")).toBe("louis-14");
  });
});

describe("slugify — robustesse", () => {
  it("chaîne vide -> ''", () => {
    expect(slugify("")).toBe("");
  });
  it("null / undefined -> '' (pas de crash)", () => {
    expect(slugify(null)).toBe("");
    expect(slugify(undefined)).toBe("");
  });
  it("chaîne sans alphanumérique -> ''", () => {
    expect(slugify("—’!")).toBe("");
  });
});
