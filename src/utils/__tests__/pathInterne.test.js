import { describe, it, expect } from "vitest";
import { isPathInterneValide } from "../pathInterne";
import {
  DESTINATIONS_PRO,
  lienConnexion,
} from "../../components/auth/EspaceProfessionnel";

// Le prédicat garde une redirection post-authentification : ses cas de REFUS
// sont la partie qui compte. Un test qui ne couvrirait que les chemins valides
// laisserait passer une régression ouvrant l'open-redirect.
describe("isPathInterneValide", () => {
  describe("accepte les chemins internes", () => {
    it.each([
      ["/club"],
      ["/"],
      ["/mon-compte"],
      ["/chateau/les-briottieres"],
      ["/club?onglet=messages"],
      ["/club#ancre"],
    ])("%s", (path) => {
      expect(isPathInterneValide(path)).toBe(true);
    });
  });

  describe("refuse les URL externes et les schémas", () => {
    it.each([
      ["https://evil.fr"],
      ["http://evil.fr"],
      ["evil.fr"],
      ["//evil.fr"],                 // protocol-relative
      ["/\\evil.fr"],                // backslash escape
      ["javascript:alert(1)"],
      ["/javascript:alert(1)"],      // schéma déguisé derrière un slash
      ["data:text/html,<script>"],
      ["mailto:x@y.fr"],
    ])("%s", (path) => {
      expect(isPathInterneValide(path)).toBe(false);
    });
  });

  describe("refuse tout ce qui n'est pas une chaîne", () => {
    it.each([
      [null],
      [undefined],
      [42],
      [{}],
      [[]],
      [true],
    ])("%s", (valeur) => {
      expect(isPathInterneValide(valeur)).toBe(false);
    });
  });

  it("refuse la chaîne vide (ne commence pas par /)", () => {
    expect(isPathInterneValide("")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Les raccourcis de /professionnel dépendent de ce prédicat : une destination
// qu'il recalerait ne serait pas mémorisée en lcc_auth_next, et le raccourci
// mènerait à /connexion SANS destination — un lien mort silencieux, qui n'a
// aucun symptôme visible tant qu'on ne va pas jusqu'au bout du parcours.
// Le test porte sur les constantes réelles de la page, pas sur des copies.
// ─────────────────────────────────────────────────────────────────────────────
describe("destinations de /professionnel", () => {
  it("les deux destinations passent la whitelist", () => {
    expect(DESTINATIONS_PRO).toHaveLength(2);
    for (const { chemin } of DESTINATIONS_PRO) {
      expect(isPathInterneValide(chemin)).toBe(true);
    }
    expect(DESTINATIONS_PRO.map((d) => d.chemin)).toEqual([
      "/chatelain/dashboard",
      "/admin",
    ]);
  });

  it("lienConnexion encode la destination dans ?next", () => {
    expect(lienConnexion("/chatelain/dashboard")).toBe(
      "/connexion?next=%2Fchatelain%2Fdashboard"
    );
    expect(lienConnexion("/admin")).toBe("/connexion?next=%2Fadmin");
  });

  it("le next relu depuis l'URL fabriquée est bien la destination d'origine", () => {
    // Le trajet réel : Link -> barre d'adresse -> searchParams.get("next") ->
    // isPathInterneValide -> localStorage. On rejoue le décodage.
    for (const { chemin } of DESTINATIONS_PRO) {
      const url = new URL(lienConnexion(chemin), "https://lcc.test");
      const next = url.searchParams.get("next");
      expect(next).toBe(chemin);
      expect(isPathInterneValide(next)).toBe(true);
    }
  });
});
