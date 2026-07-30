import { describe, it, expect } from "vitest";
import { isPathInterneValide } from "../pathInterne";

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
