// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — utils/calendrierSaisie.js (étape 3.3a)
// ═══════════════════════════════════════════════════════════════════════════
// Logique pure : aucun mock, aucun client Supabase, aucun DOM. C'est ce qui
// permet de la tester avec ce que le projet a déjà (`environment: "node"`),
// sans introduire jsdom ni @testing-library.
//
// ⚠ CE FICHIER EST LE FILET DE L'ÉCRAN DE SAISIE. Les trois fonctions portent
// les trois façons dont cet écran peut mentir au châtelain :
//   — peindre une nuit du mauvais état (aplatirEtat)
//   — inverser les bornes d'un glissement (plageDepuis)
//   — appeler la mauvaise RPC (actionPourSelection)
// Aucune des trois ne se verrait à l'œil sur un rendu qui « a l'air bon ».
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  aplatirEtat,
  estModifiable,
  plageDepuis,
  plageLimitee,
  nombreDeNuits,
  actionPourSelection,
  APPARENCE_INCONNUE,
} from "../calendrierSaisie.js";

afterEach(() => {
  vi.restoreAllMocks();
});


describe("aplatirEtat — les six états de la base en quatre apparences", () => {
  // ⚠ EXHAUSTIF, et il doit le rester : les six clés sont l'union fermée
  //   décidée en 3.1. Un état ajouté côté SQL sans passer ici tomberait sur le
  //   repli prudent — ce test est l'endroit où on s'en apercevrait.
  it.each([
    ["vendue", "vendu"],
    ["bloquee", "bloque"],
    ["ouverte_explicite", "disponible"],
    ["ouverte_horizon", "disponible"],
    ["non_renseignee", "hors_horizon"],
    ["hors_gestion", "hors_horizon"],
  ])("%s -> %s", (brut, attendu) => {
    expect(aplatirEtat(brut)).toBe(attendu);
  });

  it("⚠ les DEUX façons d'être ouverte donnent la MÊME apparence", () => {
    // Décision produit : le châtelain voit « réservable », pas le pourquoi.
    // La distinction reste entière en base — c'est elle qui fait qu'une ligne
    // `true` survit à un raccourcissement de l'horizon.
    expect(aplatirEtat("ouverte_explicite")).toBe(aplatirEtat("ouverte_horizon"));
  });

  it("un état INCONNU se replie sur le plus fermé, et le SIGNALE", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(aplatirEtat("etat_invente_en_2027")).toBe(APPARENCE_INCONNUE);
    expect(aplatirEtat("etat_invente_en_2027")).toBe("hors_horizon");
    // ⚠ Le repli est PRUDENT par décision : devant un état incompris, on
    //   n'ouvre pas une date. Mieux vaut refuser une réservation qu'en
    //   promettre une qu'on ne peut pas tenir.
    expect(warn).toHaveBeenCalled();
  });

  it("undefined et null se replient aussi, sans jeter", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(aplatirEtat(undefined)).toBe("hors_horizon");
    expect(aplatirEtat(null)).toBe("hors_horizon");
  });
});


describe("estModifiable — ce que le châtelain peut cliquer", () => {
  it("disponible et bloqué sont modifiables", () => {
    expect(estModifiable("disponible")).toBe(true);
    expect(estModifiable("bloque")).toBe(true);
  });

  it("⚠ vendu ne l'est PAS — on ne dé-vend pas une nuit depuis un calendrier", () => {
    expect(estModifiable("vendu")).toBe(false);
  });

  it("⚠ hors_horizon ne l'est pas non plus — c'est l'horizon qu'il faut déplacer", () => {
    // Et c'est ce qui rend possible la sémantique « Ouvrir = effacer » :
    // une sélection ne peut jamais chevaucher la frontière de l'horizon.
    expect(estModifiable("hors_horizon")).toBe(false);
  });
});


describe("plageDepuis — l'ordre des bornes", () => {
  it("glissement vers l'AVENIR : les bornes sont dans l'ordre", () => {
    expect(plageDepuis("2026-09-12", "2026-09-18")).toEqual({
      du: "2026-09-12",
      au: "2026-09-18",
    });
  });

  it("⚠ glissement vers le PASSÉ : les bornes sont REMISES dans l'ordre", () => {
    // Personne ne sélectionne toujours vers l'avenir. Sans ce tri, la RPC
    // recevrait une fenêtre inversée et LÈVERAIT (22023, cf. 3.1) : le
    // châtelain verrait une erreur pour un geste parfaitement légitime.
    expect(plageDepuis("2026-09-18", "2026-09-12")).toEqual({
      du: "2026-09-12",
      au: "2026-09-18",
    });
  });

  it("⚠ le TAP UNITAIRE rend une plage d'UNE nuit, pas une plage vide", () => {
    expect(plageDepuis("2026-09-12", "2026-09-12")).toEqual({
      du: "2026-09-12",
      au: "2026-09-12",
    });
  });

  it("les deux sens donnent le MÊME résultat", () => {
    const aller = plageDepuis("2026-01-05", "2026-12-31");
    const retour = plageDepuis("2026-12-31", "2026-01-05");
    expect(aller).toEqual(retour);
  });

  it("franchit un changement de mois et d'année sans se tromper", () => {
    // La comparaison est lexicographique sur des chaînes ISO : le zéro de tête
    // est ce qui la rend juste (« 2026-09-05 » < « 2026-09-12 »).
    expect(plageDepuis("2027-01-03", "2026-12-28")).toEqual({
      du: "2026-12-28",
      au: "2027-01-03",
    });
    expect(plageDepuis("2026-09-12", "2026-09-05")).toEqual({
      du: "2026-09-05",
      au: "2026-09-12",
    });
  });

  it("une borne manquante rend null — l'appelant ne fait rien", () => {
    expect(plageDepuis(null, "2026-09-12")).toBeNull();
    expect(plageDepuis("2026-09-12", undefined)).toBeNull();
    expect(plageDepuis(null, null)).toBeNull();
  });
});


describe("plageLimitee — le glissement bute, il n'enjambe pas", () => {
  // Un mois de dix nuits. Le 4 et le 5 sont vendus, le 8 est hors horizon.
  // ⚠ padStart, PAS `0${i+1}` : au dixième jour, la concaténation naïve produit
  //   « 2026-09-010 » — une clé qui ne correspond à rien, et un test qui rougit
  //   pour une raison qui n'a rien à voir avec la fonction. Le zéro de tête est
  //   ce qui rend la comparaison lexicographique juste ; il se construit, il ne
  //   s'improvise pas.
  const JOURS = Array.from(
    { length: 10 },
    (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`,
  );
  const FIGES = new Set(["2026-09-04", "2026-09-05", "2026-09-08"]);
  const modifiable = (j) => !FIGES.has(j);

  it("sans obstacle, la plage va jusqu'au survol", () => {
    expect(plageLimitee(JOURS, "2026-09-01", "2026-09-03", modifiable)).toEqual({
      du: "2026-09-01",
      au: "2026-09-03",
    });
  });

  it("⚠ vers l'AVANT, la plage s'arrête AVANT la première nuit vendue", () => {
    // Du 2 vers le 7 : les 4 et 5 sont vendus -> on bute au 3.
    expect(plageLimitee(JOURS, "2026-09-02", "2026-09-07", modifiable)).toEqual({
      du: "2026-09-02",
      au: "2026-09-03",
    });
  });

  it("⚠ vers l'ARRIÈRE aussi — le sens ne change rien à la règle", () => {
    // Du 7 vers le 2 : on descend, on bute au 6.
    expect(plageLimitee(JOURS, "2026-09-07", "2026-09-02", modifiable)).toEqual({
      du: "2026-09-06",
      au: "2026-09-07",
    });
  });

  it("⚠ SANS CE GARDE-FOU la plage ENJAMBERAIT les nuits vendues", () => {
    // La démonstration par l'absurde : plageDepuis seule donnerait 2 -> 7,
    // une plage qui CONTIENT les nuits vendues des 4 et 5. « Bloquer »
    // écrirait alors un blocage sur une nuit déjà vendue.
    const naive = plageDepuis("2026-09-02", "2026-09-07");
    const limitee = plageLimitee(JOURS, "2026-09-02", "2026-09-07", modifiable);
    expect(naive).toEqual({ du: "2026-09-02", au: "2026-09-07" });
    expect(limitee).not.toEqual(naive);
  });

  it("⚠ la frontière de l'horizon ne peut pas être franchie", () => {
    // Le 8 est hors horizon. C'est ce qui garantit qu'une sélection reste
    // ENTIÈREMENT d'un côté — donc que « Ouvrir = effacer » reste valide.
    expect(plageLimitee(JOURS, "2026-09-06", "2026-09-10", modifiable)).toEqual({
      du: "2026-09-06",
      au: "2026-09-07",
    });
  });

  it("ancre et survol identiques : une nuit", () => {
    expect(plageLimitee(JOURS, "2026-09-02", "2026-09-02", modifiable)).toEqual({
      du: "2026-09-02",
      au: "2026-09-02",
    });
  });

  it("⚠ un survol HORS de la grille rend null — la sélection précédente est GARDÉE", () => {
    // Le doigt qui sort de la grille en cours de glissement est fréquent. Rendre
    // une plage vide effacerait la sélection sous les yeux du châtelain.
    expect(plageLimitee(JOURS, "2026-09-02", "2026-10-15", modifiable)).toBeNull();
    expect(plageLimitee(JOURS, "2026-09-02", null, modifiable)).toBeNull();
  });

  it("une ancre non modifiable rend null — on ne part pas d'une nuit vendue", () => {
    expect(plageLimitee(JOURS, "2026-09-04", "2026-09-06", modifiable)).toBeNull();
  });

  it("entrées absentes : null, sans jeter", () => {
    expect(plageLimitee(null, "2026-09-02", "2026-09-03", modifiable)).toBeNull();
    expect(plageLimitee(JOURS, null, "2026-09-03", modifiable)).toBeNull();
  });
});


describe("nombreDeNuits — bornes incluses", () => {
  it("⚠ du 12 au 18 = SEPT nuits, pas six", () => {
    // Le « + 1 » n'est pas un ajustement, c'est la définition — la même que
    // celle des RPC de 3.1. L'oublier afficherait « 6 nuits » sous une
    // sélection qui en écrit sept.
    expect(nombreDeNuits({ du: "2026-09-12", au: "2026-09-18" })).toBe(7);
  });

  it("le tap unitaire vaut UNE nuit", () => {
    expect(nombreDeNuits({ du: "2026-09-12", au: "2026-09-12" })).toBe(1);
  });

  it("franchit un mois et une année sans se tromper", () => {
    // Décembre a 31 jours : du 28/12 au 3/1 = 4 + 3 = 7 nuits.
    expect(nombreDeNuits({ du: "2026-12-28", au: "2027-01-03" })).toBe(7);
  });

  it("⚠ traverse un 29 février sans perdre un jour", () => {
    // 2028 est bissextile. Du 27/02 au 02/03 : 27, 28, 29, 1, 2 = 5 nuits.
    expect(nombreDeNuits({ du: "2028-02-27", au: "2028-03-02" })).toBe(5);
  });

  it("une plage absente vaut 0", () => {
    expect(nombreDeNuits(null)).toBe(0);
    expect(nombreDeNuits({ du: "2026-09-12" })).toBe(0);
  });
});


describe("actionPourSelection — quelle RPC, et avec quoi", () => {
  const PLAGE = { du: "2026-09-12", au: "2026-09-18" };

  it("BLOQUER écrit l'exception : poser_disponibilites(..., false)", () => {
    expect(actionPourSelection("bloquer", PLAGE)).toEqual({
      rpc: "poser",
      du: "2026-09-12",
      au: "2026-09-18",
      estDisponible: false,
    });
  });

  it("⚠ OUVRIR EFFACE l'exception : retirer_disponibilites — il n'ÉCRIT PAS", () => {
    // LA décision de conception de 3.3. `disponibilites` ne contient que des
    // BLOCAGES : ouvrir, c'est retirer le blocage, pas poser une ligne `true`.
    const action = actionPourSelection("ouvrir", PLAGE);

    expect(action.rpc).toBe("retirer");
    expect(action).toEqual({ rpc: "retirer", du: "2026-09-12", au: "2026-09-18" });
  });

  it("⚠ OUVRIR ne passe PAS estDisponible — retirer_ n'en prend pas", () => {
    // Un champ inutile serait une fausse piste pour le prochain lecteur, et
    // laisserait croire qu'on peut « ouvrir en écrivant ».
    expect(actionPourSelection("ouvrir", PLAGE)).not.toHaveProperty("estDisponible");
  });

  it("⚠ les deux actions ne sont PAS symétriques, et c'est voulu", () => {
    // Si un jour ces deux appels devenaient le même verbe avec un booléen
    // différent, la propriété « une ligne true est immune a l'horizon »
    // reviendrait par la porte de derrière — avec sa divergence silencieuse
    // le jour ou le chatelain raccourcit son horizon.
    const bloquer = actionPourSelection("bloquer", PLAGE);
    const ouvrir = actionPourSelection("ouvrir", PLAGE);
    expect(bloquer.rpc).not.toBe(ouvrir.rpc);
  });

  it("le tap unitaire produit une plage d'un jour, transmise telle quelle", () => {
    const plage = plageDepuis("2026-09-12", "2026-09-12");
    expect(actionPourSelection("bloquer", plage)).toEqual({
      rpc: "poser",
      du: "2026-09-12",
      au: "2026-09-12",
      estDisponible: false,
    });
  });

  it("une action inconnue ou une plage absente rend null — on ne fait RIEN", () => {
    expect(actionPourSelection("supprimer", PLAGE)).toBeNull();
    expect(actionPourSelection("bloquer", null)).toBeNull();
    expect(actionPourSelection("bloquer", { du: "2026-09-12" })).toBeNull();
    expect(actionPourSelection(undefined, PLAGE)).toBeNull();
  });
});
