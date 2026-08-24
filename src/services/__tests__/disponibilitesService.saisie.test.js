// ═══════════════════════════════════════════════════════════════════════════
// Tests Vitest — disponibilitesService, moitié SAISIE (étape 3.3d)
// ═══════════════════════════════════════════════════════════════════════════
// Fichier séparé de disponibilitesService.test.js, qui couvre la moitié MOTEUR
// (lectures de 2.2/2.3). Les deux mockent `supabase.rpc`, mais leurs contrats
// n'ont rien à voir : là-bas on lit, ici on écrit.
//
// ⚠ CE QUI EST TESTÉ : le CONTRAT D'APPEL et la NORMALISATION. La règle vit en
// SQL et elle est prouvée là-bas — `tests-saisie-disponibilites.sql`, 12/12 en
// base réelle, avec la frontière de l'horizon et la cohérence édition ↔ moteur.
// La rejouer avec un client mocké ne prouverait que la qualité du mock.
//
// ⚠ ET LE VERROU DE FUSEAU EST À NOUVEAU LE TEST QUI COMPTE. Ces trois
// fonctions ÉCRIVENT : envoyer un objet Date laisserait PostgREST le sérialiser
// en ISO UTC, et le cast `::date` pourrait bloquer LE JOUR PRÉCÉDENT de celui
// que le châtelain a désigné. Un tel défaut ne casse rien visiblement — il
// décale une nuit, parfois, pour certains fuseaux.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../lib/supabase.js", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from "../../lib/supabase.js";
import {
  poserDisponibilites,
  retirerDisponibilites,
  calendrierEditionChambre,
} from "../disponibilitesService.js";

const CHAMBRE = "11111111-2222-3333-4444-555555555555";

function mockRpc(data) {
  supabase.rpc.mockResolvedValue({ data, error: null, status: 200 });
}
function mockRpcErreur(code, message, status = 400) {
  supabase.rpc.mockResolvedValue({ data: null, error: { code, message }, status });
}
function dernierAppel() {
  return supabase.rpc.mock.calls.at(-1);
}

beforeEach(() => {
  vi.clearAllMocks();
});


describe("contrat d'appel", () => {
  it("poserDisponibilites appelle poser_disponibilites avec les cinq paramètres", async () => {
    mockRpc(7);
    await poserDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18", false, 45000);

    expect(dernierAppel()).toEqual([
      "poser_disponibilites",
      {
        p_chambre_id: CHAMBRE,
        p_du: "2026-09-12",
        p_au: "2026-09-18",
        p_est_disponible: false,
        p_prix_special_cents: 45000,
      },
    ]);
  });

  it("le prix est null par défaut — le SQL le PRÉSERVE alors (COALESCE)", async () => {
    // ⚠ Bloquer une date ne doit pas effacer son tarif. Passer 0 ou undefined
    //   à la place de null changerait ce comportement côté SQL.
    mockRpc(3);
    await poserDisponibilites(CHAMBRE, "2026-09-12", "2026-09-14", false);

    expect(dernierAppel()[1].p_prix_special_cents).toBeNull();
  });

  it("retirerDisponibilites appelle retirer_disponibilites — TROIS paramètres", async () => {
    mockRpc(7);
    await retirerDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18");

    expect(dernierAppel()).toEqual([
      "retirer_disponibilites",
      { p_chambre_id: CHAMBRE, p_du: "2026-09-12", p_au: "2026-09-18" },
    ]);
  });

  it("⚠ retirer ne passe PAS de p_est_disponible — la RPC n'en prend pas", async () => {
    // Un paramètre en trop laisserait croire qu'on peut « ouvrir en écrivant ».
    mockRpc(0);
    await retirerDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18");

    expect(dernierAppel()[1]).not.toHaveProperty("p_est_disponible");
  });

  it("calendrierEditionChambre appelle calendrier_edition_chambre", async () => {
    mockRpc([]);
    await calendrierEditionChambre(CHAMBRE, "2026-09-01", "2026-09-30");

    expect(dernierAppel()).toEqual([
      "calendrier_edition_chambre",
      { p_chambre_id: CHAMBRE, p_du: "2026-09-01", p_au: "2026-09-30" },
    ]);
  });

  it("⚠ poser et retirer sont DEUX RPC distinctes, pas un verbe à booléen", async () => {
    // Le pendant, côté service, du test d'asymétrie d'actionPourSelection :
    // « ouvrir » efface, il n'écrit pas. Si ces deux appels convergeaient vers
    // la même RPC, les lignes `true` — immunes à l'horizon — reviendraient.
    mockRpc(1);
    await poserDisponibilites(CHAMBRE, "2026-09-12", "2026-09-12", false);
    const nomPoser = dernierAppel()[0];
    mockRpc(1);
    await retirerDisponibilites(CHAMBRE, "2026-09-12", "2026-09-12");
    const nomRetirer = dernierAppel()[0];

    expect(nomPoser).not.toBe(nomRetirer);
  });
});


describe("⚠ le verrou de fuseau — on écrit, donc l'erreur coûterait une nuit", () => {
  it("un objet Date part en 'YYYY-MM-DD' LOCAL, jamais en ISO UTC", async () => {
    mockRpc(1);
    // 1er septembre 00 h 30 locales. En UTC+2, toISOString() dirait
    // "2026-08-31T22:30:00Z" — soit le mois PRÉCÉDENT.
    const minuitPasse = new Date(2026, 8, 1, 0, 30);
    await poserDisponibilites(CHAMBRE, minuitPasse, new Date(2026, 8, 3, 23, 45), false);

    const [, params] = dernierAppel();
    expect(params.p_du).toBe("2026-09-01");
    expect(params.p_au).toBe("2026-09-03");
    expect(params.p_du).not.toContain("T");
    // Le contre-exemple, écrit noir sur blanc.
    expect(params.p_du).not.toBe(minuitPasse.toISOString().slice(0, 10));
  });

  it("les trois fonctions passent par le même convertisseur", async () => {
    const d = new Date(2026, 11, 31, 23, 59);
    for (const appel of [
      () => poserDisponibilites(CHAMBRE, d, d, false),
      () => retirerDisponibilites(CHAMBRE, d, d),
      () => calendrierEditionChambre(CHAMBRE, d, d),
    ]) {
      mockRpc([]);
      await appel();
      expect(dernierAppel()[1].p_du).toBe("2026-12-31");
    }
  });

  it("une entrée qui n'est pas une date part en null — le SQL la refuse", async () => {
    mockRpc(0);
    await poserDisponibilites(CHAMBRE, undefined, "pas une date", false);

    const [, params] = dernierAppel();
    expect(params.p_du).toBeNull();
    expect(params.p_au).toBeNull();
  });
});


describe("normalisation du retour", () => {
  it("poser et retirer rendent un NOMBRE, jamais la valeur brute", async () => {
    mockRpc(7);
    await expect(poserDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18", false)).resolves.toBe(7);

    // null ne doit pas devenir NaN ni undefined : l'écran affiche ce compte.
    mockRpc(null);
    await expect(retirerDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18")).resolves.toBe(0);
  });

  it("le booléen est strict : seul `true` ouvre", async () => {
    mockRpc(1);
    await poserDisponibilites(CHAMBRE, "2026-09-12", "2026-09-12", "oui");
    expect(dernierAppel()[1].p_est_disponible).toBe(false);
  });

  it("calendrierEditionChambre passe les lignes en camelCase", async () => {
    mockRpc([
      {
        nuit: "2026-09-12",
        etat: "bloquee",
        ligne_existe: true,
        ligne_ouverte: false,
        dans_horizon: true,
        vendue: false,
        prix_special_cents: 45000,
      },
    ]);
    const res = await calendrierEditionChambre(CHAMBRE, "2026-09-12", "2026-09-12");

    expect(res).toEqual([
      {
        nuit: "2026-09-12",
        etat: "bloquee",
        ligneExiste: true,
        ligneOuverte: false,
        dansHorizon: true,
        vendue: false,
        prixSpecialCents: 45000,
      },
    ]);
  });

  it("⚠ ligneOuverte reste NULL quand aucune ligne n'existe — trois états, pas deux", async () => {
    // Le forcer en false ferait passer « je n'ai rien dit » pour « j'ai fermé ».
    mockRpc([
      {
        nuit: "2026-09-12",
        etat: "ouverte_horizon",
        ligne_existe: false,
        ligne_ouverte: null,
        dans_horizon: true,
        vendue: false,
        prix_special_cents: null,
      },
    ]);
    const res = await calendrierEditionChambre(CHAMBRE, "2026-09-12", "2026-09-12");

    expect(res[0].ligneOuverte).toBeNull();
    expect(res[0].ligneExiste).toBe(false);
    expect(res[0].prixSpecialCents).toBeNull();
  });

  it("un retour non-tableau rend [] plutôt que de casser l'appelant", async () => {
    mockRpc(null);
    await expect(calendrierEditionChambre(CHAMBRE, "2026-09-01", "2026-09-30")).resolves.toEqual([]);
  });
});


describe("propagation de l'erreur", () => {
  it("⚠ AUCUNE erreur n'est discriminée : chacune serait un DÉFAUT", async () => {
    // 22023 fenêtre invalide, P0002 chambre introuvable, 42501 ni châtelain ni
    // admin — l'écran ne propose que les chambres du châtelain et borne ses
    // fenêtres. Habiller l'une d'elles en message masquerait le défaut.
    for (const code of ["22023", "P0002", "42501"]) {
      mockRpcErreur(code, "erreur SQL");
      await expect(
        poserDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18", false),
      ).rejects.toMatchObject({ code });
    }
  });

  it("les trois fonctions relancent, aucune n'avale l'erreur", async () => {
    for (const appel of [
      () => poserDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18", false),
      () => retirerDisponibilites(CHAMBRE, "2026-09-12", "2026-09-18"),
      () => calendrierEditionChambre(CHAMBRE, "2026-09-01", "2026-09-30"),
    ]) {
      mockRpcErreur("PGRST202", "fonction introuvable");
      await expect(appel()).rejects.toMatchObject({ code: "PGRST202" });
    }
  });
});
