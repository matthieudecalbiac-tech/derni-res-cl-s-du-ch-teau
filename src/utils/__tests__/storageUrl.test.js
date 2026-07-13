import { describe, it, expect } from "vitest";
import { cheminStorageDepuisUrl } from "../storageUrl.js";

describe("cheminStorageDepuisUrl", () => {
  it("URL Storage du bucket → chemin interne", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/chateaux-images/chateaux/1720000000-photo.avif";
    expect(cheminStorageDepuisUrl(url)).toBe("chateaux/1720000000-photo.avif");
  });

  it("URL Storage avec query string → chemin sans la query", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/chateaux-images/chateaux/x.jpg?t=123";
    expect(cheminStorageDepuisUrl(url)).toBe("chateaux/x.jpg");
  });

  it("URL Storage avec caractères encodés → décodé", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/chateaux-images/chateaux/mon%20image.png";
    expect(cheminStorageDepuisUrl(url)).toBe("chateaux/mon image.png");
  });

  it("URL externe (unsplash) → null", () => {
    expect(cheminStorageDepuisUrl("https://images.unsplash.com/photo-123?w=400")).toBeNull();
  });

  it("chemin public/ local → null", () => {
    expect(cheminStorageDepuisUrl("/bri-1.avif")).toBeNull();
    expect(cheminStorageDepuisUrl("/bb-donjon.avif")).toBeNull();
  });

  it("non-string ou vide → null", () => {
    expect(cheminStorageDepuisUrl(null)).toBeNull();
    expect(cheminStorageDepuisUrl(undefined)).toBeNull();
    expect(cheminStorageDepuisUrl("")).toBeNull();
  });
});
