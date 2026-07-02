// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — dates.js (Chantier #1b-1)
// ═══════════════════════════════════════════════════════════════════════════
// Couvre les 5 primitives pures du calendrier extraites de DernieresCles :
// genererGrilleMois, formatDate, joursAvant, estMemeJour, estEntre.
// joursAvant depend de new Date() -> teste sur des dates relatives calculees.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  genererGrilleMois,
  formatDate,
  joursAvant,
  estMemeJour,
  estEntre,
} from "../dates.js";

describe("genererGrilleMois", () => {
  it("retourne toujours 42 cases (6 semaines)", () => {
    // mai 2026 commence un vendredi -> matrice non triviale
    expect(genererGrilleMois(new Date(2026, 4, 1))).toHaveLength(42);
    // fevrier 2026 (28 jours) — cas court
    expect(genererGrilleMois(new Date(2026, 1, 1))).toHaveLength(42);
  });

  it("demarre un LUNDI (decalage (getDay()+6)%7)", () => {
    // 1er mai 2026 = vendredi -> 4 cases hors-mois avant (lun/mar/mer/jeu)
    const cases = genererGrilleMois(new Date(2026, 4, 1));
    expect(cases[0].date.getDay()).toBe(1); // lundi
  });

  it("marque hors-mois les jours des mois adjacents et in-mois les autres", () => {
    const cases = genererGrilleMois(new Date(2026, 4, 1)); // mai 2026, 31 jours
    const inMois = cases.filter((c) => !c.horsMois);
    expect(inMois).toHaveLength(31);
    // 42 - 31 = 11 cases hors-mois (avant + apres)
    expect(cases.filter((c) => c.horsMois)).toHaveLength(11);
    // les cases in-mois sont bien du mois de mai (index 4)
    expect(inMois.every((c) => c.date.getMonth() === 4)).toBe(true);
  });
});

describe("formatDate", () => {
  it("formate en francais court weekday/day/month", () => {
    // 5 mai 2026 = mardi
    const s = formatDate(new Date(2026, 4, 5));
    expect(s).toMatch(/mar/i);  // weekday court
    expect(s).toMatch(/5/);     // jour
    expect(s).toMatch(/mai/i);  // mois
  });
});

describe("joursAvant", () => {
  it("retourne ~N pour une date a N jours dans le futur", () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    expect(joursAvant(d)).toBe(5);
  });

  it("retourne 0 pour aujourd'hui (meme instant)", () => {
    expect(joursAvant(new Date())).toBe(0);
  });

  it("est negatif pour une date passee", () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    expect(joursAvant(d)).toBe(-3);
  });
});

describe("estMemeJour", () => {
  it("vrai pour deux dates du meme jour calendaire (heures differentes)", () => {
    expect(estMemeJour(new Date(2026, 4, 5, 9), new Date(2026, 4, 5, 22))).toBe(true);
  });

  it("faux pour deux jours differents", () => {
    expect(estMemeJour(new Date(2026, 4, 5), new Date(2026, 4, 6))).toBe(false);
  });

  it("faux si l'un des deux est null/undefined", () => {
    expect(estMemeJour(null, new Date())).toBe(false);
    expect(estMemeJour(new Date(), undefined)).toBe(false);
    expect(estMemeJour(null, null)).toBe(false);
  });
});

describe("estEntre", () => {
  const debut = new Date(2026, 4, 5);
  const fin = new Date(2026, 4, 10);

  it("vrai pour une date strictement entre debut et fin", () => {
    expect(estEntre(new Date(2026, 4, 7), debut, fin)).toBe(true);
  });

  it("faux sur les bornes (exclues)", () => {
    expect(estEntre(new Date(2026, 4, 5), debut, fin)).toBe(false);
    expect(estEntre(new Date(2026, 4, 10), debut, fin)).toBe(false);
  });

  it("faux hors intervalle", () => {
    expect(estEntre(new Date(2026, 4, 1), debut, fin)).toBe(false);
    expect(estEntre(new Date(2026, 4, 20), debut, fin)).toBe(false);
  });

  it("faux si debut ou fin manquant", () => {
    expect(estEntre(new Date(2026, 4, 7), null, fin)).toBe(false);
    expect(estEntre(new Date(2026, 4, 7), debut, null)).toBe(false);
  });
});
