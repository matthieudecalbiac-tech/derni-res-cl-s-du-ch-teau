import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logErreurSupabase } from "../logSupabase.js";

// La règle est invisible à l'œil nu : rien dans l'UI ne change selon qu'on
// logge ou non. Sans ces tests, elle peut être cassée sans que personne ne le
// voie avant le prochain rouge CI.

let erreurSpy;
let debugSpy;

beforeEach(() => {
  erreurSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ERREUR_TRANSPORT = { message: "TypeError: Load failed", details: "", hint: "", code: "" };
const ERREUR_BASE = { message: "permission denied", details: "", hint: "", code: "42501" };

describe("logErreurSupabase", () => {
  it("status 0 (transport / annulation) : AUCUN console.error", () => {
    logErreurSupabase("[chateauxService] Supabase error:", ERREUR_TRANSPORT, 0);

    expect(erreurSpy).not.toHaveBeenCalled();
    // La trace reste, à un niveau que l'agent QA ne capture pas.
    expect(debugSpy).toHaveBeenCalledTimes(1);
  });

  it("status 400 : console.error, avec le contexte et l'erreur", () => {
    logErreurSupabase("[clubService] getPaliers:", ERREUR_BASE, 400);

    expect(erreurSpy).toHaveBeenCalledTimes(1);
    expect(erreurSpy).toHaveBeenCalledWith("[clubService] getPaliers:", ERREUR_BASE);
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("status 500 : console.error", () => {
    logErreurSupabase("[messagesService] getFil:", ERREUR_BASE, 500);

    expect(erreurSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it("status absent (appel Storage) : console.error — en cas de doute on parle fort", () => {
    logErreurSupabase("[chateauxService] uploadImage error:", ERREUR_BASE, undefined);

    expect(erreurSpy).toHaveBeenCalledTimes(1);
  });

  it("ne discrimine PAS sur le message : un 'Load failed' avec un vrai status reste une erreur", () => {
    // Garde-fou anti-régression : si quelqu'un remplace la règle par un match
    // sur "Load failed", ce test rougit.
    logErreurSupabase("[offresService] getOffresClub:", ERREUR_TRANSPORT, 503);

    expect(erreurSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).not.toHaveBeenCalled();
  });
});
