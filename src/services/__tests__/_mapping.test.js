// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — _mapping.js (S1-δ Phase 4.3)
// ═══════════════════════════════════════════════════════════════════════════
// Couvre les 7 mappers : 6 atomiques + 1 wrapper public mapChateau.
// 3 fixtures : Briottières (avec offre B), Vaux (sans offre B), MINIMAL.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import {
  mapChateauBase,
  mapChambre,
  mapTimelineItem,
  mapAlentour,
  flattenAmenities,
  applyOffreModuleB,
  mapChateau,
  chateauToRow,
  DERIVES_NON_ECRITS,
  chambreToRow,
  timelineToRow,
  alentourToRow,
  amenityToRow,
  mapAmenity,
  mapPersonnage,
  personnageToRow,
  mapPersonnageFiche,
  MODULE_B_ID,
} from "../_mapping.js";
import {
  FIXTURE_BRIOTTIERES,
  FIXTURE_VAUX,
  FIXTURE_MINIMAL,
  FIXTURE_PERSONNAGE_FICHE,
  MODULE_IDS,
} from "../__fixtures__/chateaux.fixtures.js";


describe("mapChateauBase", () => {
  it("nominal — Briottières : renames + unflatten coordonnees + proprietaires", () => {
    const out = mapChateauBase(FIXTURE_BRIOTTIERES);
    expect(out.id).toBe(FIXTURE_BRIOTTIERES.id);
    expect(out.estLaUne).toBe(true);
    expect(out.isDemoMock).toBe(false);
    expect(out.distanceParis).toBe("2h15 de Paris");
    expect(out.distanceParisMinutes).toBe(135);
    expect(out.coordonnees).toEqual({ lat: 47.6833, lng: -0.5333 });
    expect(out.proprietaires.nom).toBe("Arnaud & Madeleine de Valbray");
    expect(out.proprietaires.initiale).toBe("A");
    expect(out.proprietaires.nomAffiche).toBe("Arnaud & Madeleine de Valbray");
    expect(out.regionNarrative).toContain("Anjou");
    expect(out.videoBackground).toBeNull();
    expect(out.heroNightStars).toBe(false);
  });

  it("heroNightStars : true explicite, absent/null/undefined → false", () => {
    expect(mapChateauBase({ hero_night_stars: true }).heroNightStars).toBe(true);
    expect(mapChateauBase({ hero_night_stars: false }).heroNightStars).toBe(false);
    expect(mapChateauBase({ hero_night_stars: null }).heroNightStars).toBe(false);
    expect(mapChateauBase({ hero_night_stars: undefined }).heroNightStars).toBe(false);
    expect(mapChateauBase({}).heroNightStars).toBe(false);
  });

  it("Vaux mock : flag is_demo_mock + chiffres_cles null + accent gold", () => {
    const out = mapChateauBase(FIXTURE_VAUX);
    expect(out.isDemoMock).toBe(true);
    expect(out.estLaUne).toBe(false);
    expect(out.chiffresCles).toBeNull();
    expect(out.accentTheme).toBe("#c8973e");
  });

  it("FIXTURE_MINIMAL : tolère null partout sans crash", () => {
    const out = mapChateauBase(FIXTURE_MINIMAL);
    expect(out.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(out.coordonnees).toEqual({ lat: null, lng: null });
    expect(out.proprietaires.nom).toBeNull();
    expect(out.images).toEqual([]);
  });

  it("input null → null (zéro crash)", () => {
    expect(mapChateauBase(null)).toBeNull();
    expect(mapChateauBase(undefined)).toBeNull();
  });
});


describe("mapChambre", () => {
  it("nominal — convertit prix_cents en euros", () => {
    const out = mapChambre(FIXTURE_BRIOTTIERES.chambres[0]);
    expect(out.nom).toBe("Chambre Charles X");
    expect(out.prix).toBe(320);
    expect(out.capacite).toBe(2);
    expect(out.equipements).toEqual([
      "Balcon vue lac",
      "Mobilier Empire",
      "Lit à baldaquin",
    ]);
    expect(out.ordre).toBe(0);
  });

  it("input null → null", () => {
    expect(mapChambre(null)).toBeNull();
  });

  it("equipements absent → tableau vide", () => {
    const out = mapChambre({ id: "x", nom: "Y", prix_cents: 10000 });
    expect(out.equipements).toEqual([]);
  });
});


describe("mapTimelineItem", () => {
  it("nominal", () => {
    const out = mapTimelineItem(FIXTURE_BRIOTTIERES.chateau_timeline[0]);
    expect(out).toEqual({
      annee: "1485",
      evenement: "Jean de La Saussaie acquiert les Briottières",
    });
  });

  it("input null → null", () => {
    expect(mapTimelineItem(null)).toBeNull();
  });
});


describe("mapAlentour", () => {
  it("nominal — type + icone unicode", () => {
    const out = mapAlentour(FIXTURE_BRIOTTIERES.chateau_alentours[0]);
    expect(out.nom).toBe("Château du Plessis-Bourré");
    expect(out.type).toBe("patrimoine");
    expect(out.icone).toBe("⚜");
    expect(out.distance).toBe("20 min");
  });

  it("input null → null", () => {
    expect(mapAlentour(null)).toBeNull();
  });
});


describe("flattenAmenities", () => {
  it("Briottières : parking + wifi + animaux true, petit-déjeuner false", () => {
    const out = flattenAmenities(FIXTURE_BRIOTTIERES.chateau_amenities);
    expect(out).toEqual({
      parking: true,
      wifi: true,
      animaux: true,
      petitDejeuner: false,
    });
  });

  it("Vaux : parking + wifi true, animaux false (pas dans amenities)", () => {
    const out = flattenAmenities(FIXTURE_VAUX.chateau_amenities);
    expect(out.parking).toBe(true);
    expect(out.wifi).toBe(true);
    expect(out.animaux).toBe(false);
    expect(out.petitDejeuner).toBe(false);
  });

  it("MINIMAL (tableau vide) : tout false", () => {
    const out = flattenAmenities([]);
    expect(out).toEqual({
      parking: false,
      wifi: false,
      animaux: false,
      petitDejeuner: false,
    });
  });

  it("input null → tout false", () => {
    expect(flattenAmenities(null)).toEqual({
      parking: false,
      wifi: false,
      animaux: false,
      petitDejeuner: false,
    });
  });

  it("amenity inclus=false → ne compte pas comme présent", () => {
    const out = flattenAmenities([
      { nom: "Parking", inclus: false },
    ]);
    expect(out.parking).toBe(false);
  });
});


describe("applyOffreModuleB", () => {
  it("Briottières : extrait prixBarre + prix + reduction depuis l'offre B active", () => {
    const out = applyOffreModuleB(FIXTURE_BRIOTTIERES.offres);
    expect(out).toEqual({
      prixBarre: 380,
      prix: 285,
      reduction: 25,
    });
  });

  it("Vaux : pas d'offre B → tout null", () => {
    const out = applyOffreModuleB(FIXTURE_VAUX.offres);
    expect(out).toEqual({
      prixBarre: null,
      prix: null,
      reduction: null,
    });
  });

  it("offres vides → tout null", () => {
    expect(applyOffreModuleB([])).toEqual({
      prixBarre: null,
      prix: null,
      reduction: null,
    });
  });

  it("input null → tout null (zéro crash)", () => {
    expect(applyOffreModuleB(null)).toEqual({
      prixBarre: null,
      prix: null,
      reduction: null,
    });
  });

  it("offre Module B mais visible=false → ignorée", () => {
    const out = applyOffreModuleB([
      {
        module_id: MODULE_B_ID,
        visible: false,
        prix_base_cents: 38000,
        prix_promo_cents: 28500,
        reduction_pct: 25,
      },
    ]);
    expect(out).toEqual({ prixBarre: null, prix: null, reduction: null });
  });

  it("offre Module B sans promo → prix = prixBarre", () => {
    const out = applyOffreModuleB([
      {
        module_id: MODULE_B_ID,
        visible: true,
        prix_base_cents: 38000,
        prix_promo_cents: null,
        reduction_pct: null,
      },
    ]);
    expect(out.prixBarre).toBe(380);
    expect(out.prix).toBe(380);
    expect(out.reduction).toBeNull();
  });

  it("MODULE_B_ID exposé matche l'UUID seed", () => {
    expect(MODULE_B_ID).toBe(MODULE_IDS.B);
  });
});


describe("mapChateau (wrapper d'intégration)", () => {
  it("Briottières : objet React complet avec offres prixBarre/reduction", () => {
    const out = mapChateau(FIXTURE_BRIOTTIERES);
    expect(out.id).toBe(FIXTURE_BRIOTTIERES.id);
    expect(out.estLaUne).toBe(true);
    expect(out.parking).toBe(true);
    expect(out.wifi).toBe(true);
    expect(out.animaux).toBe(true);
    expect(out.prixBarre).toBe(380);
    expect(out.prix).toBe(285);
    expect(out.reduction).toBe(25);
    expect(out.chambres).toHaveLength(3);
    expect(out.chambres[0].nom).toBe("Chambre Charles X");
    expect(out.timeline).toHaveLength(5);
    expect(out.alentours).toHaveLength(3);
    expect(out.chambresRestantes).toBeNull();
  });

  it("Briottières : amenities[] exposé, trié par ordre, forme complète (+ rétrocompat booléens)", () => {
    const out = mapChateau(FIXTURE_BRIOTTIERES);
    expect(Array.isArray(out.amenities)).toBe(true);
    expect(out.amenities).toHaveLength(4);
    expect(out.amenities.map((a) => a.ordre)).toEqual([0, 1, 2, 3]);
    for (const a of out.amenities) {
      expect(a).toHaveProperty("type");
      expect(a).toHaveProperty("nom");
      expect(a).toHaveProperty("description");
      expect(a).toHaveProperty("icone");
      expect(a).toHaveProperty("image");
      expect(a).toHaveProperty("inclus");
    }
    const diner = out.amenities.find((a) => a.nom === "Dîner aux chandelles");
    expect(diner.image).toBe("/bri-diner.avif");
    // rétrocompat : les 4 booléens flatten restent présents
    expect(out.parking).toBe(true);
    expect(out.wifi).toBe(true);
  });

  it("Vaux : sans offre B → prixBarre/reduction null", () => {
    const out = mapChateau(FIXTURE_VAUX);
    expect(out.prixBarre).toBeNull();
    expect(out.prix).toBeNull();
    expect(out.reduction).toBeNull();
    expect(out.estLaUne).toBe(false);
    expect(out.isDemoMock).toBe(true);
  });

  it("FIXTURE_MINIMAL : pas de crash, tout vide", () => {
    const out = mapChateau(FIXTURE_MINIMAL);
    expect(out.chambres).toEqual([]);
    expect(out.timeline).toEqual([]);
    expect(out.alentours).toEqual([]);
    expect(out.parking).toBe(false);
    expect(out.prixBarre).toBeNull();
    expect(out.chambresRestantes).toBeNull();
  });

  it("input null → null", () => {
    expect(mapChateau(null)).toBeNull();
    expect(mapChateau(undefined)).toBeNull();
  });

  it("chambresRestantes toujours null (Phase 4 — RPC en S2)", () => {
    expect(mapChateau(FIXTURE_BRIOTTIERES).chambresRestantes).toBeNull();
    expect(mapChateau(FIXTURE_VAUX).chambresRestantes).toBeNull();
  });

  it("chambres triées par ordre croissant", () => {
    const shuffled = {
      ...FIXTURE_BRIOTTIERES,
      chambres: [
        { ...FIXTURE_BRIOTTIERES.chambres[2], ordre: 2 },
        { ...FIXTURE_BRIOTTIERES.chambres[0], ordre: 0 },
        { ...FIXTURE_BRIOTTIERES.chambres[1], ordre: 1 },
      ],
    };
    const out = mapChateau(shuffled);
    expect(out.chambres[0].ordre).toBe(0);
    expect(out.chambres[1].ordre).toBe(1);
    expect(out.chambres[2].ordre).toBe(2);
  });

  it("Briottières : prixDepart = min(chambres.prix) = 320", () => {
    const result = mapChateau(FIXTURE_BRIOTTIERES);
    expect(result.prixDepart).toBe(320);
    // chateau.prix reste 285 (offre Module B), prixDepart est distinct
    expect(result.prix).toBe(285);
  });

  it("Vaux : prixDepart = 380 même sans offre B", () => {
    const result = mapChateau(FIXTURE_VAUX);
    expect(result.prixDepart).toBe(380);
    expect(result.prix).toBeNull();           // pas d'offre B
    expect(result.prixBarre).toBeNull();
  });

  it("MINIMAL : prixDepart = null si chambres vides", () => {
    const result = mapChateau(FIXTURE_MINIMAL);
    expect(result.prixDepart).toBeNull();
    expect(result.chambres).toEqual([]);
  });
});


describe("chateauToRow (mapper inverse — colonnes chateaux)", () => {
  // Colonnes de `chateaux` que chateauToRow gère (exclut id/statut/amenities/
  // dérivés/DB-managées). Sert à construire l'attendu de l'aller-retour.
  const COLONNES_GEREES = [
    "nom", "slug", "region", "departement", "ville", "accroche", "siecle", "style",
    "distance_paris_label", "distance_paris", "urgence", "histoire", "description",
    "region_narrative", "region_histoire", "chiffres_cles", "images",
    "video_background_youtube_id", "est_la_une", "is_demo_mock", "hero_night_stars",
    "une_de_la_semaine", "ordre_home",
    "couleur_theme", "accent_theme", "coordonnees_lat", "coordonnees_lng",
    "prop_nom", "prop_depuis", "prop_initiale", "prop_nom_affiche", "prop_portrait",
    "prop_citation", "prop_description",
  ];
  const pick = (obj, keys) =>
    Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

  it("renommages camelCase → snake_case", () => {
    const row = chateauToRow({
      nom: "X", slug: "x",
      regionNarrative: "RN", regionHistoire: "RH",
      videoBackground: "yt123",
      estLaUne: true, isDemoMock: false, heroNightStars: true,
      couleurTheme: "#111", accentTheme: "#222",
    });
    expect(row.region_narrative).toBe("RN");
    expect(row.region_histoire).toBe("RH");
    expect(row.video_background_youtube_id).toBe("yt123");
    expect(row.est_la_une).toBe(true);
    expect(row.is_demo_mock).toBe(false);
    expect(row.hero_night_stars).toBe(true);
    expect(row.couleur_theme).toBe("#111");
    expect(row.accent_theme).toBe("#222");
  });

  it("coordonnees.{lat,lng} → coordonnees_lat / coordonnees_lng", () => {
    const row = chateauToRow({ nom: "X", slug: "x", coordonnees: { lat: 47.68, lng: -0.53 } });
    expect(row.coordonnees_lat).toBe(47.68);
    expect(row.coordonnees_lng).toBe(-0.53);
    expect("coordonnees" in row).toBe(false);
  });

  it("proprietaires.* → colonnes prop_*", () => {
    const row = chateauToRow({
      nom: "X", slug: "x",
      proprietaires: {
        nom: "Famille Y", depuis: "1900", initiale: "Y", nomAffiche: "de Y",
        portrait: "/y.avif", citation: "Cit.", description: "Bio.",
      },
    });
    expect(row.prop_nom).toBe("Famille Y");
    expect(row.prop_depuis).toBe("1900");
    expect(row.prop_initiale).toBe("Y");
    expect(row.prop_nom_affiche).toBe("de Y");
    expect(row.prop_portrait).toBe("/y.avif");
    expect(row.prop_citation).toBe("Cit.");
    expect(row.prop_description).toBe("Bio.");
    expect("proprietaires" in row).toBe(false);
  });

  it("distance re-séparée : distanceParis → label, distanceParisMinutes → integer", () => {
    const row = chateauToRow({ nom: "X", slug: "x", distanceParis: "2h15 de Paris", distanceParisMinutes: 135 });
    expect(row.distance_paris_label).toBe("2h15 de Paris");
    expect(row.distance_paris).toBe(135);
  });

  it("chiffresCles → chiffres_cles (jsonb passthrough) + images text[] passthrough", () => {
    const cc = { ans: 7, hectares: 50 };
    const imgs = ["/a.avif", "/b.avif"];
    const row = chateauToRow({ nom: "X", slug: "x", chiffresCles: cc, images: imgs });
    expect(row.chiffres_cles).toEqual(cc);
    expect(row.images).toEqual(imgs);
  });

  it("ALLER-RETOUR fidèle : chateauToRow(mapChateau(BRIOTTIERES)) == colonnes gérées de la fixture", () => {
    const row = chateauToRow(mapChateau(FIXTURE_BRIOTTIERES));
    expect(row).toEqual(pick(FIXTURE_BRIOTTIERES, COLONNES_GEREES));
  });

  it("dérivés (prix/prixBarre/reduction/prixDepart/chambresRestantes) NON écrits", () => {
    const row = chateauToRow(mapChateau(FIXTURE_BRIOTTIERES));
    for (const derive of DERIVES_NON_ECRITS) {
      expect(derive in row).toBe(false);
    }
    // Sécurité explicite : aucune colonne de prix ni de chambre dans le row.
    expect("prix" in row).toBe(false);
    expect("prix_cents" in row).toBe(false);
  });

  it("amenities (parking/wifi/animaux) NON écrits — hors périmètre 2b (pivot en 2d)", () => {
    const row = chateauToRow(mapChateau(FIXTURE_BRIOTTIERES));
    expect("parking" in row).toBe(false);
    expect("wifi" in row).toBe(false);
    expect("animaux" in row).toBe(false);
    expect("petit_dejeuner" in row).toBe(false);
  });

  it("id / statut / DB-managées NON écrits", () => {
    const row = chateauToRow(mapChateau(FIXTURE_BRIOTTIERES));
    expect("id" in row).toBe(false);
    expect("statut" in row).toBe(false);
    expect("created_at" in row).toBe(false);
  });

  it("nom absent → throw", () => {
    expect(() => chateauToRow({ slug: "x" })).toThrow(/nom/);
  });

  it("slug absent → throw", () => {
    expect(() => chateauToRow({ nom: "X" })).toThrow(/slug/);
  });

  it("nom/slug vides (chaîne blanche) → throw", () => {
    expect(() => chateauToRow({ nom: "  ", slug: "x" })).toThrow(/nom/);
    expect(() => chateauToRow({ nom: "X", slug: "" })).toThrow(/slug/);
  });

  it("form null/invalide → throw", () => {
    expect(() => chateauToRow(null)).toThrow();
    expect(() => chateauToRow(undefined)).toThrow();
  });

  it("mode partiel : nom/slug non requis, seules les clés présentes deviennent colonnes", () => {
    const row = chateauToRow({ accroche: "Nouvelle accroche" }, { partial: true });
    expect(row).toEqual({ accroche: "Nouvelle accroche" });
  });

  it("émission partielle : une clé absente ne produit pas de colonne", () => {
    const row = chateauToRow({ nom: "X", slug: "x" });
    expect(row).toEqual({ nom: "X", slug: "x" });
    expect("region" in row).toBe(false);
    expect("coordonnees_lat" in row).toBe(false);
  });
});


const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));


describe("chambreToRow (inverse fille — chambres)", () => {
  const CHAMBRE_COLS = ["id", "nom", "description", "superficie", "capacite", "prix_cents", "image", "equipements", "ordre"];

  it("prix (euros) → prix_cents (entier)", () => {
    const row = chambreToRow({ nom: "Suite", prix: 320, capacite: 2 });
    expect(row.prix_cents).toBe(32000);
  });

  it("émet id si présent (diff), jamais chateau_id", () => {
    const row = chambreToRow({ nom: "Suite", prix: 100, capacite: 2, id: "x", chateau_id: "y" });
    expect(row.id).toBe("x");
    expect("chateau_id" in row).toBe(false);
  });

  it("n'émet pas id si absent (chambre nouvelle → INSERT)", () => {
    const row = chambreToRow({ nom: "Suite", prix: 100, capacite: 2 });
    expect("id" in row).toBe(false);
  });

  it("ALLER-RETOUR : chambreToRow(mapChambre(row)) == colonnes gérées", () => {
    const row0 = FIXTURE_BRIOTTIERES.chambres[0];
    expect(chambreToRow(mapChambre(row0))).toEqual(pick(row0, CHAMBRE_COLS));
  });

  it("nom absent → throw", () => {
    expect(() => chambreToRow({ prix: 100, capacite: 2 })).toThrow(/nom/);
  });

  it("prix <= 0 → throw (CHECK prix_cents > 0)", () => {
    expect(() => chambreToRow({ nom: "X", prix: 0, capacite: 2 })).toThrow(/prix/);
    expect(() => chambreToRow({ nom: "X", prix: -5, capacite: 2 })).toThrow(/prix/);
  });

  it("capacite hors [1,20] → throw", () => {
    expect(() => chambreToRow({ nom: "X", prix: 100, capacite: 0 })).toThrow(/capacite/);
    expect(() => chambreToRow({ nom: "X", prix: 100, capacite: 21 })).toThrow(/capacite/);
    expect(() => chambreToRow({ nom: "X", prix: 100, capacite: 2.5 })).toThrow(/capacite/);
  });
});


describe("timelineToRow (inverse fille — timeline)", () => {
  it("ordre reconstruit depuis l'index", () => {
    expect(timelineToRow({ annee: "1485", evenement: "E" }, 3).ordre).toBe(3);
  });

  it("ALLER-RETOUR : timelineToRow(mapTimelineItem(row), row.ordre) == colonnes gérées", () => {
    const tl0 = FIXTURE_BRIOTTIERES.chateau_timeline[0]; // ordre 0
    expect(timelineToRow(mapTimelineItem(tl0), tl0.ordre)).toEqual({
      annee: tl0.annee,
      evenement: tl0.evenement,
      ordre: tl0.ordre,
    });
  });

  it("annee absente → throw", () => {
    expect(() => timelineToRow({ evenement: "E" }, 0)).toThrow(/annee/);
  });

  it("evenement absent → throw", () => {
    expect(() => timelineToRow({ annee: "1485" }, 0)).toThrow(/evenement/);
  });
});


describe("alentourToRow (inverse fille — alentours)", () => {
  const ALENTOUR_COLS = ["nom", "distance", "type", "icone", "description", "ordre"];

  it("ordre reconstruit depuis l'index", () => {
    expect(alentourToRow({ nom: "X", type: "patrimoine" }, 2).ordre).toBe(2);
  });

  it("ALLER-RETOUR : alentourToRow(mapAlentour(row), row.ordre) == colonnes gérées", () => {
    const al0 = FIXTURE_BRIOTTIERES.chateau_alentours[0]; // ordre 0
    expect(alentourToRow(mapAlentour(al0), al0.ordre)).toEqual(pick(al0, ALENTOUR_COLS));
  });

  it("nom absent → throw", () => {
    expect(() => alentourToRow({ type: "patrimoine" }, 0)).toThrow(/nom/);
  });

  it("type (enum) absent/vide → throw", () => {
    expect(() => alentourToRow({ nom: "X" }, 0)).toThrow(/type/);
    expect(() => alentourToRow({ nom: "X", type: "" }, 0)).toThrow(/type/);
  });
});


describe("amenityToRow (ligne pivot COMPLÈTE — pas 4 booléens)", () => {
  it("écrit une ligne pivot complète (type/nom/inclus/supplément/durée/ordre)", () => {
    const row = amenityToRow(
      { type: "service", nom: "Parking", description: "Cour intérieure", icone: "🚗", inclus: true },
      0
    );
    expect(row).toEqual({
      type: "service",
      categorie: null,
      nom: "Parking",
      inclus: true,
      prix_supplement_cents: null,
      duree_minutes: null,
      image: null,
      ordre: 0,
      equipements: [],
      description: "Cour intérieure",
      icone: "🚗",
    });
  });

  it("PAS de booléens parking/wifi/animaux — c'est une ligne, pas un flatten", () => {
    const row = amenityToRow({ type: "service", nom: "Wi-Fi" }, 1);
    expect("parking" in row).toBe(false);
    expect("wifi" in row).toBe(false);
    expect("animaux" in row).toBe(false);
    expect("petitDejeuner" in row).toBe(false);
    expect(row.nom).toBe("Wi-Fi");
    expect(row.type).toBe("service");
  });

  it("inclus : défaut true si absent, false respecté si fourni", () => {
    expect(amenityToRow({ type: "service", nom: "X" }, 0).inclus).toBe(true);
    expect(amenityToRow({ type: "activite", nom: "X", inclus: false }, 0).inclus).toBe(false);
  });

  it("prixSupplement (euros) → prix_supplement_cents ; dureeMinutes passthrough", () => {
    const row = amenityToRow(
      { type: "activite", nom: "Dîner aux chandelles", inclus: false, prixSupplement: 85, dureeMinutes: 120 },
      3
    );
    expect(row.prix_supplement_cents).toBe(8500);
    expect(row.duree_minutes).toBe(120);
    expect(row.inclus).toBe(false);
    expect(row.ordre).toBe(3);
  });

  it("n'émet ni id ni chateau_id", () => {
    const row = amenityToRow({ type: "service", nom: "X", id: "a", chateau_id: "b" }, 0);
    expect("id" in row).toBe(false);
    expect("chateau_id" in row).toBe(false);
  });

  it("type absent → throw ; nom absent → throw", () => {
    expect(() => amenityToRow({ nom: "X" }, 0)).toThrow(/type/);
    expect(() => amenityToRow({ type: "service" }, 0)).toThrow(/nom/);
  });

  it("prixSupplement < 0 → throw ; dureeMinutes <= 0 → throw", () => {
    expect(() => amenityToRow({ type: "activite", nom: "X", prixSupplement: -1 }, 0)).toThrow(/prixSupplement/);
    expect(() => amenityToRow({ type: "activite", nom: "X", dureeMinutes: 0 }, 0)).toThrow(/dureeMinutes/);
  });
});


describe("mapAmenity <-> amenityToRow (aller-retour pivot amenity)", () => {
  // Colonnes PLATES de chateau_amenities. `equipements` n'y figure PAS : c'est
  // une liaison N-N (jonction amenity_equipements), pas une colonne — les
  // aller-retours l'asserent donc a part (payload slugs vs embedding DB).
  const AMENITY_COLS = ["type", "categorie", "nom", "description", "icone", "image", "inclus", "prix_supplement_cents", "duree_minutes", "ordre"];

  it("mapAmenity : cents → euros, inclus bool, forme React", () => {
    const am = FIXTURE_BRIOTTIERES.chateau_amenities[3]; // Dîner : supplement 8500, duree 120, inclus false
    const out = mapAmenity(am);
    expect(out.type).toBe("activite");
    expect(out.nom).toBe("Dîner aux chandelles");
    expect(out.prixSupplement).toBe(85);
    expect(out.dureeMinutes).toBe(120);
    expect(out.inclus).toBe(false);
  });

  it("prix_supplement_cents null → prixSupplement null (pas 0)", () => {
    const out = mapAmenity({ type: "service", nom: "X", prix_supplement_cents: null });
    expect(out.prixSupplement).toBeNull();
  });

  it("ALLER-RETOUR amenity (activité avec supplément) : amenityToRow(mapAmenity(row), ordre) == colonnes pivot + equipements en slugs", () => {
    const am = FIXTURE_BRIOTTIERES.chateau_amenities[3];
    expect(amenityToRow(mapAmenity(am), am.ordre)).toEqual({
      ...pick(am, AMENITY_COLS),
      equipements: ["table_hotes"], // liaison DB -> slugs pour la RPC
    });
  });

  it("ALLER-RETOUR amenity (service, supplément/durée null) : null préservé + equipements []", () => {
    const am = FIXTURE_BRIOTTIERES.chateau_amenities[0]; // Parking : supplement/duree null, inclus true, pas d'equipement
    expect(amenityToRow(mapAmenity(am), am.ordre)).toEqual({
      ...pick(am, AMENITY_COLS),
      equipements: [],
    });
  });

  it("mapAmenity : lit image (présent → valeur, absent → null)", () => {
    expect(mapAmenity(FIXTURE_BRIOTTIERES.chateau_amenities[3]).image).toBe("/bri-diner.avif");
    expect(mapAmenity({ type: "service", nom: "X" }).image).toBeNull();
  });

  it("amenityToRow : émet image (valeur transmise, null si absent)", () => {
    expect(amenityToRow({ type: "service", nom: "X", image: "/y.avif" }, 0).image).toBe("/y.avif");
    expect(amenityToRow({ type: "service", nom: "X" }, 0).image).toBeNull();
  });

  it("mapAmenity : lit categorie (présent → valeur, absent → null)", () => {
    expect(mapAmenity(FIXTURE_BRIOTTIERES.chateau_amenities[3]).categorie).toBe("gastronomie");
    expect(mapAmenity(FIXTURE_BRIOTTIERES.chateau_amenities[0]).categorie).toBeNull(); // Parking : pratique, pas de catégorie
    expect(mapAmenity({ type: "service", nom: "X", categorie: "bien_etre" }).categorie).toBe("bien_etre");
    expect(mapAmenity({ type: "service", nom: "X" }).categorie).toBeNull();
  });

  it("amenityToRow : émet categorie NORMALISÉE — '' → null (piège CHECK blindé), undefined → null, valeur préservée", () => {
    expect(amenityToRow({ type: "service", nom: "X", categorie: "bien_etre" }, 0).categorie).toBe("bien_etre");
    expect(amenityToRow({ type: "service", nom: "X", categorie: "" }, 0).categorie).toBeNull();
    expect(amenityToRow({ type: "service", nom: "X" }, 0).categorie).toBeNull();
    expect(amenityToRow({ type: "service", nom: "X", categorie: null }, 0).categorie).toBeNull();
  });

  it("mapAmenity : aplatit les equipements en [{slug,libelle}] trié par ordre ; liaison vide → []", () => {
    // Dîner : 1 equipement (table_hotes)
    expect(mapAmenity(FIXTURE_BRIOTTIERES.chateau_amenities[3]).equipements).toEqual([
      { slug: "table_hotes", libelle: "Table d'hôtes" },
    ]);
    // Parking : liaison vide → []
    expect(mapAmenity(FIXTURE_BRIOTTIERES.chateau_amenities[0]).equipements).toEqual([]);
    // Liaison absente (pas de clé amenity_equipements) → [] (jamais null)
    expect(mapAmenity({ type: "service", nom: "X" }).equipements).toEqual([]);
    // Tri par ordre : sauna (20) avant piscine (10) en entrée -> réordonné
    const multi = {
      type: "activite", nom: "Bien-être",
      amenity_equipements: [
        { equipement_slug: "sauna", equipements: { slug: "sauna", libelle: "Sauna", ordre: 20 } },
        { equipement_slug: "piscine", equipements: { slug: "piscine", libelle: "Piscine", ordre: 10 } },
      ],
    };
    expect(mapAmenity(multi).equipements.map((e) => e.slug)).toEqual(["piscine", "sauna"]);
  });

  it("amenityToRow : émet equipements en SLUGS ; accepte objets {slug} OU slugs ; absent/vide → []", () => {
    // objets {slug} (forme mapAmenity)
    expect(amenityToRow({ type: "service", nom: "X", equipements: [{ slug: "piscine" }, { slug: "sauna" }] }, 0).equipements)
      .toEqual(["piscine", "sauna"]);
    // slugs bruts
    expect(amenityToRow({ type: "service", nom: "X", equipements: ["tennis", "velos"] }, 0).equipements)
      .toEqual(["tennis", "velos"]);
    // absent → []
    expect(amenityToRow({ type: "service", nom: "X" }, 0).equipements).toEqual([]);
    // vide → []
    expect(amenityToRow({ type: "service", nom: "X", equipements: [] }, 0).equipements).toEqual([]);
  });

  it("input null → null", () => {
    expect(mapAmenity(null)).toBeNull();
  });
});


describe("mapPersonnage (lecture liaison chateau_personnages)", () => {
  it("nominal — aplatit personnages(id,nom,slug) + nature/texte/ordre de la liaison", () => {
    const cp = FIXTURE_BRIOTTIERES.chateau_personnages[0];
    expect(mapPersonnage(cp)).toEqual({
      id: "pg-sand",
      nom: "George Sand",
      slug: "george-sand",
      nature: "a_habite",
      texte: "A séjourné aux Briottières.",
      ordre: 0,
    });
  });

  it("`id` exposé = id du PERSONNAGE (référentiel), pas de la liaison", () => {
    // La liaison n'a pas d'id dans l'embed ; l'id vient de personnages(id,...).
    expect(mapPersonnage(FIXTURE_BRIOTTIERES.chateau_personnages[1]).id).toBe("pg-chopin");
  });

  it("texte null → null préservé (pas de coercition)", () => {
    const out = mapPersonnage({ nature: "evenement", texte: null, ordre: 2, personnages: { id: "p", nom: "N", slug: "n" } });
    expect(out.texte).toBeNull();
  });

  it("input null → null", () => {
    expect(mapPersonnage(null)).toBeNull();
  });

  it("personnage lié absent (liaison orpheline) → null", () => {
    expect(mapPersonnage({ nature: "a_habite", texte: "x", ordre: 0 })).toBeNull();
    expect(mapPersonnage({ nature: "a_habite", personnages: null })).toBeNull();
  });
});


describe("personnageToRow (inverse — payload p_personnages RPC)", () => {
  it("nominal — produit { nom, slug, nature, texte, ordre }", () => {
    const row = personnageToRow(
      { nom: "George Sand", nature: "a_habite", texte: "A séjourné." },
      0
    );
    expect(row).toEqual({
      nom: "George Sand",
      slug: "george-sand",
      nature: "a_habite",
      texte: "A séjourné.",
      ordre: 0,
    });
  });

  it("slug TOUJOURS recalculé depuis nom — une clé slug de l'entrée est ignorée", () => {
    const row = personnageToRow(
      { nom: "Étienne II d'Aligre", slug: "slug-bidon-ignore", nature: "fait_histoire" },
      0
    );
    expect(row.slug).toBe("etienne-ii-d-aligre");
  });

  it("ordre reconstruit depuis l'index", () => {
    expect(personnageToRow({ nom: "X", nature: "a_habite" }, 4).ordre).toBe(4);
  });

  it("n'émet ni id ni chateau_id (personnage résolu par slug, parent posé par la RPC)", () => {
    const row = personnageToRow({ nom: "X", nature: "a_habite", id: "pg-x", chateau_id: "ch-y" }, 0);
    expect("id" in row).toBe(false);
    expect("chateau_id" in row).toBe(false);
  });

  it("texte absent → non émis (clé absente, pas null)", () => {
    const row = personnageToRow({ nom: "X", nature: "evenement" }, 0);
    expect("texte" in row).toBe(false);
  });

  it("texte null explicite → émis tel quel (colonne nullable)", () => {
    const row = personnageToRow({ nom: "X", nature: "evenement", texte: null }, 0);
    expect(row.texte).toBeNull();
  });

  it("nom absent/vide → throw", () => {
    expect(() => personnageToRow({ nature: "a_habite" }, 0)).toThrow(/nom/);
    expect(() => personnageToRow({ nom: "  ", nature: "a_habite" }, 0)).toThrow(/nom/);
  });

  it("nature absente/vide → throw (CHECK NOT NULL)", () => {
    expect(() => personnageToRow({ nom: "X" }, 0)).toThrow(/nature/);
    expect(() => personnageToRow({ nom: "X", nature: "" }, 0)).toThrow(/nature/);
  });

  it("nom sans alphanumérique (slug calculé vide) → throw", () => {
    expect(() => personnageToRow({ nom: "—’!", nature: "a_habite" }, 0)).toThrow(/slug/);
  });

  it("item null/invalide → throw", () => {
    expect(() => personnageToRow(null, 0)).toThrow();
    expect(() => personnageToRow(undefined, 0)).toThrow();
  });
});


describe("mapPersonnage <-> personnageToRow (aller-retour)", () => {
  it("ALLER-RETOUR : personnageToRow(mapPersonnage(row), row.ordre) == payload {nom,slug,nature,texte,ordre}", () => {
    const cp0 = FIXTURE_BRIOTTIERES.chateau_personnages[0];
    expect(personnageToRow(mapPersonnage(cp0), cp0.ordre)).toEqual({
      nom: cp0.personnages.nom,
      slug: cp0.personnages.slug,
      nature: cp0.nature,
      texte: cp0.texte,
      ordre: cp0.ordre,
    });
  });

  it("ALLER-RETOUR sur les 2 entrées Briottières (nom → slug stable)", () => {
    FIXTURE_BRIOTTIERES.chateau_personnages.forEach((cp, i) => {
      const back = personnageToRow(mapPersonnage(cp), i);
      expect(back.slug).toBe(cp.personnages.slug);
      expect(back.nature).toBe(cp.nature);
    });
  });
});


describe("mapChateau — section personnages (intégration)", () => {
  it("Briottières : personnages[] exposé, aplati, trié par ordre", () => {
    const out = mapChateau(FIXTURE_BRIOTTIERES);
    expect(out.personnages).toEqual([
      { id: "pg-sand", nom: "George Sand", slug: "george-sand", nature: "a_habite", texte: "A séjourné aux Briottières.", ordre: 0 },
      { id: "pg-chopin", nom: "Chopin", slug: "chopin", nature: "a_habite", texte: "A séjourné aux Briottières.", ordre: 1 },
    ]);
  });

  it("Vaux (liaison vide) → personnages []", () => {
    expect(mapChateau(FIXTURE_VAUX).personnages).toEqual([]);
  });

  it("MINIMAL (aucune jointure) → personnages [] (zéro crash)", () => {
    expect(mapChateau(FIXTURE_MINIMAL).personnages).toEqual([]);
  });
});


describe("mapPersonnageFiche (fiche publique — sens inverse)", () => {
  it("nominal : { id, nom, slug } + châteaux triés par ordre, mock exclu", () => {
    const out = mapPersonnageFiche(FIXTURE_PERSONNAGE_FICHE);
    expect(out.id).toBe("pg-sand");
    expect(out.nom).toBe("George Sand");
    expect(out.slug).toBe("george-sand");
    // 2 châteaux réels (le mock is_demo_mock est filtré), triés par ordre (0 avant 1).
    expect(out.chateaux.map((c) => c.slug)).toEqual(["les-briottieres", "blanc-buisson"]);
  });

  it("chaque château = mapChateauBase (camelCase) + nature + texte de la liaison", () => {
    const bri = mapPersonnageFiche(FIXTURE_PERSONNAGE_FICHE).chateaux[0];
    expect(bri.nom).toBe("Les Briottières");
    expect(bri.region).toBe("Pays de la Loire");
    expect(bri.accroche).toBe("Demeure de famille en Anjou.");
    expect(bri.images).toEqual(["/bri-1.avif"]);
    expect(bri.isDemoMock).toBe(false);
    // Champs de la LIAISON greffés :
    expect(bri.nature).toBe("a_habite");
    expect(bri.texte).toBe("Premiers séjours aux Briottières.");
  });

  it("filtre is_demo_mock : le mock publié n'apparaît jamais (RLS ne le couvre pas)", () => {
    const out = mapPersonnageFiche(FIXTURE_PERSONNAGE_FICHE);
    expect(out.chateaux.some((c) => c.slug === "vaux-le-vicomte")).toBe(false);
    expect(out.chateaux).toHaveLength(2);
  });

  it("liaison sans château (défensif, chateaux null) → ignorée, pas de crash", () => {
    const out = mapPersonnageFiche({
      id: "p", nom: "N", slug: "n",
      chateau_personnages: [
        { nature: "a_habite", texte: "x", ordre: 0, chateaux: null },
        { nature: "a_habite", texte: "ok", ordre: 1, chateaux: { id: "c", slug: "s", nom: "Vrai", region: "R", accroche: "A", images: [], is_demo_mock: false } },
      ],
    });
    expect(out.chateaux.map((c) => c.slug)).toEqual(["s"]);
  });

  it("texte null → null préservé", () => {
    const out = mapPersonnageFiche({
      id: "p", nom: "N", slug: "n",
      chateau_personnages: [
        { nature: "evenement", texte: null, ordre: 0, chateaux: { id: "c", slug: "s", nom: "V", region: null, accroche: null, images: [], is_demo_mock: false } },
      ],
    });
    expect(out.chateaux[0].texte).toBeNull();
  });

  it("aucune liaison (chateau_personnages absent ou []) → chateaux []", () => {
    expect(mapPersonnageFiche({ id: "p", nom: "N", slug: "n", chateau_personnages: [] }).chateaux).toEqual([]);
    expect(mapPersonnageFiche({ id: "p", nom: "N", slug: "n" }).chateaux).toEqual([]);
  });

  it("expose la biographie du personnage (référentiel, top-level)", () => {
    const out = mapPersonnageFiche(FIXTURE_PERSONNAGE_FICHE);
    expect(out.biographie).toBe("Romancière française (1804-1876), figure majeure du romantisme.");
  });

  it("biographie absente/null → null (pas de crash)", () => {
    const out = mapPersonnageFiche({ id: "p", nom: "N", slug: "n", chateau_personnages: [] });
    expect(out.biographie).toBeNull();
  });

  it("input null → null", () => {
    expect(mapPersonnageFiche(null)).toBeNull();
  });
});
