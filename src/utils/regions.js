/**
 * Helper regions — fonction pure synchrone.
 * Travaille sur un tableau de chateaux deja charge (via useChateaux()).
 * Centralise la derivation region->chateaux aujourd hui dupliquee
 * (VitrinePermanente, DernieresCles) avec des divergences (sentinelles,
 * tri, perimetre). Ici : pas de sentinelle (detail UI de chaque ecran),
 * tri alphabetique stable, perimetre parametrable.
 *
 * @param {Array} chateaux - tableau de chateaux deja charge
 * @param {Object} [opts]
 * @param {"permanent"|"dernieresCles"|"club"} [opts.module] - filtre de perimetre ; si absent, tous les chateaux
 * @returns {Array<{region: string, chateaux: Array<{id, nom, slug, estLaUne, modules}>}>}
 */
export function getRegionsAvecChateaux(chateaux = [], { module: moduleFiltre } = {}) {
  const base = moduleFiltre
    ? chateaux.filter((c) => c.modules?.[moduleFiltre] === true)
    : chateaux;

  const parRegion = new Map();
  for (const c of base) {
    if (!c.region) continue;
    if (!parRegion.has(c.region)) parRegion.set(c.region, []);
    parRegion.get(c.region).push({
      id: c.id,
      nom: c.nom,
      slug: c.slug,
      estLaUne: c.estLaUne === true,
      modules: c.modules || {},
    });
  }

  return Array.from(parRegion.entries())
    .map(([region, liste]) => ({
      region,
      chateaux: liste.sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    }))
    .sort((a, b) => a.region.localeCompare(b.region, "fr"));
}

/**
 * Liste plate des regions (noms seuls), triee. Pratique pour un menu simple.
 * @param {Array} chateaux
 * @param {Object} [opts] - meme signature que getRegionsAvecChateaux
 * @returns {string[]}
 */
export function getRegions(chateaux = [], opts = {}) {
  return getRegionsAvecChateaux(chateaux, opts).map((r) => r.region);
}
