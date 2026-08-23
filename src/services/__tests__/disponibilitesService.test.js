// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — disponibilitesService.js, moitié MOTEUR (étape 2.4)
// ═══════════════════════════════════════════════════════════════════════════
// Mock du client Supabase via vi.mock(). Pas de chaining .from() : les quatre
// fonctions passent par supabase.rpc(), qu'on mocke directement.
// Modèle : chatelainService.test.js.
//
// ⚠ CE QUI EST TESTÉ ICI EST LE CONTRAT D'APPEL, PAS LA RÈGLE MÉTIER. La règle
// vit en SQL et elle est prouvée là-bas — tests-est-disponible.sql (16/16) et
// tests-jours-disponibles.sql (11/11), joués en base réelle. La rejouer avec un
// client mocké ne prouverait que la qualité du mock.
//
// ⚠⚠ LE TEST QUI COMPTE LE PLUS EST CELUI DU FORMAT DE DATE. Envoyer un objet
// Date à une RPC le ferait sérialiser en ISO **UTC** par PostgREST, et le cast
// `::date` côté Postgres peut alors rendre LE JOUR PRÉCÉDENT selon l'heure et le
// fuseau du visiteur. Ce module a déjà payé ce bug une fois (cf. le commentaire
// de `minuit()`). Un tel défaut ne casse rien visiblement : il décale une
// journée, parfois, pour certains. C'est exactement ce qu'un test doit verrouiller.
//
// Les trois fonctions historiques (chateauxDisponibles, datesAvecOffre,
// predicatDateOuverte) ne sont PAS couvertes ici : elles reposent sur le proxy
// `urgence` et disparaîtront à l'étape 4. Les tester serait figer ce qu'on veut
// retirer.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";

// IMPORTANT : vi.mock() est hoisted, le mock doit être déclaré AVANT les imports.
vi.mock("../../lib/supabase.js", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../lib/supabase.js";
import {
  estDisponible,
  chateauDisponible,
  joursDisponiblesChambre,
  joursDisponiblesChateau,
} from "../disponibilitesService.js";

const CHAMBRE = "11111111-2222-3333-4444-555555555555";
const CHATEAU = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** Réponse PostgREST nominale. */
function mockRpc(data) {
  supabase.rpc.mockResolvedValue({ data, error: null, status: 200 });
}

/** Erreur telle que PostgREST la remonte : un objet, pas un throw. */
function mockRpcErreur(code, message, status = 400) {
  supabase.rpc.mockResolvedValue({ data: null, error: { code, message }, status });
}

/** Les paramètres du dernier appel rpc(). */
function dernierAppel() {
  return supabase.rpc.mock.calls.at(-1);
}

beforeEach(() => {
  vi.clearAllMocks();
});


// ───────────────────────────────────────────────────────────────────────────
// Le contrat d'appel : nom de RPC et noms de paramètres
// ───────────────────────────────────────────────────────────────────────────
// Un renommage côté SQL ne se verrait pas autrement : le front continuerait de
// compiler, et l'erreur n'apparaîtrait qu'à l'exécution, sur un écran.
describe("contrat d'appel des quatre RPC", () => {
  it("estDisponible appelle est_disponible avec p_chambre_id / p_arrivee / p_depart", async () => {
    mockRpc(true);
    await estDisponible(CHAMBRE, "2026-09-01", "2026-09-04");

    expect(dernierAppel()).toEqual([
      "est_disponible",
      { p_chambre_id: CHAMBRE, p_arrivee: "2026-09-01", p_depart: "2026-09-04" },
    ]);
  });

  it("chateauDisponible appelle chateau_disponible avec p_chateau_id / p_arrivee / p_depart", async () => {
    mockRpc(false);
    await chateauDisponible(CHATEAU, "2026-09-01", "2026-09-04");

    expect(dernierAppel()).toEqual([
      "chateau_disponible",
      { p_chateau_id: CHATEAU, p_arrivee: "2026-09-01", p_depart: "2026-09-04" },
    ]);
  });

  it("joursDisponiblesChambre appelle jours_disponibles_chambre avec p_du / p_au", async () => {
    mockRpc([]);
    await joursDisponiblesChambre(CHAMBRE, "2026-09-01", "2026-09-30");

    expect(dernierAppel()).toEqual([
      "jours_disponibles_chambre",
      { p_chambre_id: CHAMBRE, p_du: "2026-09-01", p_au: "2026-09-30" },
    ]);
  });

  it("joursDisponiblesChateau appelle jours_disponibles_chateau avec p_du / p_au", async () => {
    mockRpc([]);
    await joursDisponiblesChateau(CHATEAU, "2026-09-01", "2026-09-30");

    expect(dernierAppel()).toEqual([
      "jours_disponibles_chateau",
      { p_chateau_id: CHATEAU, p_du: "2026-09-01", p_au: "2026-09-30" },
    ]);
  });
});


// ───────────────────────────────────────────────────────────────────────────
// ⚠⚠ LE VERROU DU BUG DE FUSEAU
// ───────────────────────────────────────────────────────────────────────────
describe("format de date envoyé — le verrou du fuseau", () => {
  it("un objet Date part en chaîne 'YYYY-MM-DD', JAMAIS en Date ni en ISO UTC", async () => {
    mockRpc(true);
    // 23 h 30 heure LOCALE : le pire cas. En UTC+1 ou plus, toISOString() de
    // cette date porte DÉJÀ le lendemain ; en UTC-x, la veille.
    await estDisponible(CHAMBRE, new Date(2026, 8, 1, 23, 30), new Date(2026, 8, 4, 23, 30));

    const [, params] = dernierAppel();
    expect(params.p_arrivee).toBe("2026-09-01");
    expect(params.p_depart).toBe("2026-09-04");
    // La preuve explicite : ce ne sont pas des Date, et il n'y a pas d'heure.
    expect(params.p_arrivee).not.toBeInstanceOf(Date);
    expect(params.p_arrivee).not.toContain("T");
    expect(params.p_arrivee).not.toContain("Z");
  });

  it("le jour envoyé est le jour LOCAL, pas le jour UTC", async () => {
    mockRpc(true);
    // 1er septembre 00 h 30 locales. En UTC+2, toISOString() dirait
    // "2026-08-31T22:30:00Z" — soit le MOIS PRÉCÉDENT.
    const minuitPasse = new Date(2026, 8, 1, 0, 30);
    await estDisponible(CHAMBRE, minuitPasse, new Date(2026, 8, 2, 0, 30));

    const [, params] = dernierAppel();
    expect(params.p_arrivee).toBe("2026-09-01");
    // Le contre-exemple, écrit noir sur blanc : voilà ce qu'on aurait envoyé
    // en laissant PostgREST sérialiser l'objet Date.
    expect(params.p_arrivee).not.toBe(minuitPasse.toISOString().slice(0, 10));
  });

  it("une chaîne déjà au format 'YYYY-MM-DD' passe telle quelle", async () => {
    mockRpc(true);
    await estDisponible(CHAMBRE, "2026-12-24", "2026-12-26");

    const [, params] = dernierAppel();
    expect(params.p_arrivee).toBe("2026-12-24");
    expect(params.p_depart).toBe("2026-12-26");
  });

  it("une entrée qui n'est pas une date part en null (les bornes SQL la traitent)", async () => {
    mockRpc(false);
    await estDisponible(CHAMBRE, undefined, "pas une date");

    const [, params] = dernierAppel();
    expect(params.p_arrivee).toBeNull();
    expect(params.p_depart).toBeNull();
  });

  it("une Date invalide part en null plutôt qu'en 'NaN-NaN-NaN'", async () => {
    mockRpc(false);
    await estDisponible(CHAMBRE, new Date("n'importe quoi"), "2026-09-04");

    const [, params] = dernierAppel();
    expect(params.p_arrivee).toBeNull();
  });
});


// ───────────────────────────────────────────────────────────────────────────
// Normalisation du retour
// ───────────────────────────────────────────────────────────────────────────
describe("normalisation du retour", () => {
  it("les booléennes rendent un vrai booléen, jamais la valeur brute", async () => {
    mockRpc(true);
    await expect(estDisponible(CHAMBRE, "2026-09-01", "2026-09-04")).resolves.toBe(true);

    mockRpc(false);
    await expect(estDisponible(CHAMBRE, "2026-09-01", "2026-09-04")).resolves.toBe(false);

    // null / undefined ne doivent pas devenir "disponible" par accident.
    mockRpc(null);
    await expect(estDisponible(CHAMBRE, "2026-09-01", "2026-09-04")).resolves.toBe(false);
  });

  it("les fonctions jours rendent le tableau de chaînes tel quel", async () => {
    mockRpc(["2026-09-01", "2026-09-02", "2026-09-05"]);
    await expect(joursDisponiblesChambre(CHAMBRE, "2026-09-01", "2026-09-30"))
      .resolves.toEqual(["2026-09-01", "2026-09-02", "2026-09-05"]);
  });

  it("les fonctions jours acceptent aussi la forme 'tableau d'objets'", async () => {
    // Filet sur un detail de serialisation PostgREST qui a deja varie ailleurs
    // dans ce projet (cf. clubService.getPalierCourant).
    mockRpc([
      { jours_disponibles_chateau: "2026-09-01" },
      { jours_disponibles_chateau: "2026-09-02" },
    ]);
    await expect(joursDisponiblesChateau(CHATEAU, "2026-09-01", "2026-09-30"))
      .resolves.toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("un retour non-tableau rend [] plutôt que de casser l'appelant", async () => {
    mockRpc(null);
    await expect(joursDisponiblesChambre(CHAMBRE, "2026-09-01", "2026-09-30"))
      .resolves.toEqual([]);
  });
});


// ───────────────────────────────────────────────────────────────────────────
// Propagation de l'erreur
// ───────────────────────────────────────────────────────────────────────────
describe("propagation de l'erreur", () => {
  it("une erreur RPC est relancée BRUTE, sans transformation", async () => {
    mockRpcErreur("42501", "permission denied");
    await expect(estDisponible(CHAMBRE, "2026-09-01", "2026-09-04"))
      .rejects.toMatchObject({ code: "42501" });
  });

  it("le 22023 de la garde d'horizon n'est PAS discriminé", async () => {
    // ⚠ Volontaire : une fenetre de plus de 366 jours est un defaut d'APPELANT,
    // pas un cas metier que l'UI rattrape. Il remonte comme n'importe quel
    // autre — surtout pas transforme en tableau vide, qui se lirait « rien de
    // libre » et masquerait le defaut.
    mockRpcErreur("22023", "fenetre de 400 jours demandee, maximum 366");
    await expect(joursDisponiblesChambre(CHAMBRE, "2026-09-01", "2027-12-01"))
      .rejects.toMatchObject({ code: "22023" });
  });

  it("les quatre fonctions relancent, aucune n'avale l'erreur", async () => {
    for (const appel of [
      () => estDisponible(CHAMBRE, "2026-09-01", "2026-09-04"),
      () => chateauDisponible(CHATEAU, "2026-09-01", "2026-09-04"),
      () => joursDisponiblesChambre(CHAMBRE, "2026-09-01", "2026-09-30"),
      () => joursDisponiblesChateau(CHATEAU, "2026-09-01", "2026-09-30"),
    ]) {
      mockRpcErreur("PGRST202", "fonction introuvable");
      await expect(appel()).rejects.toMatchObject({ code: "PGRST202" });
    }
  });
});
