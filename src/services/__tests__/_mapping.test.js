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
  MODULE_B_ID,
} from "../_mapping.js";
import {
  FIXTURE_BRIOTTIERES,
  FIXTURE_VAUX,
  FIXTURE_MINIMAL,
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
