/**
 * Helper regions — fonction pure synchrone.
 * Travaille sur un tableau de chateaux deja charge (via useChateaux()).
 * Centralise la derivation region->chateaux aujourd hui dupliquee
 * (VitrinePermanente, DernieresCles) avec des divergences (sentinelles,
 * tri). Ici : pas de sentinelle (detail UI de chaque ecran),
 * tri alphabetique stable.
 *
 * @param {Array} chateaux - tableau de chateaux deja charge
 * @returns {Array<{region: string, chateaux: Array<{id, nom, slug, estLaUne}>}>}
 */
export function getRegionsAvecChateaux(chateaux = []) {
  const parRegion = new Map();
  for (const c of chateaux) {
    if (!c.region) continue;
    if (!parRegion.has(c.region)) parRegion.set(c.region, []);
    parRegion.get(c.region).push({
      id: c.id,
      nom: c.nom,
      slug: c.slug,
      estLaUne: c.estLaUne === true,
    });
  }

  return Array.from(parRegion.entries())
    .map(([region, liste]) => ({
      region,
      chateaux: liste.sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    }))
    .sort((a, b) => a.region.localeCompare(b.region, "fr"));
}
