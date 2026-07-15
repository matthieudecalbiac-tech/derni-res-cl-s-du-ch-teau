/**
 * Helper regions — fonction pure synchrone.
 * Travaille sur un tableau de chateaux deja charge (via useChateaux()).
 * Centralise la derivation region->chateaux aujourd hui dupliquee
 * (VitrinePermanente, DernieresCles) avec des divergences (sentinelles,
 * tri). Ici : pas de sentinelle (detail UI de chaque ecran),
 * tri alphabetique stable.
 *
 * La modale Destination (BarreRecherche) consomme desormais `departements`
 * (departements distincts de la region, tries alpha FR, sans doublon) pour
 * offrir une selection region OU departement. `chateaux` reste expose : il
 * peut servir a d autres ecrans (toggle Liste, vitrines) et sa suppression
 * serait une regression silencieuse.
 *
 * @param {Array} chateaux - tableau de chateaux deja charge
 * @returns {Array<{region: string, departements: string[], chateaux: Array<{id, nom, slug, estLaUne}>}>}
 */
export function getRegionsAvecChateaux(chateaux = []) {
  const parRegion = new Map();
  for (const c of chateaux) {
    if (!c.region) continue;
    if (!parRegion.has(c.region)) {
      parRegion.set(c.region, { chateaux: [], departements: new Set() });
    }
    const entree = parRegion.get(c.region);
    entree.chateaux.push({
      id: c.id,
      nom: c.nom,
      slug: c.slug,
      estLaUne: c.estLaUne === true,
    });
    // Un chateau sans departement (null / vide) ne pollue pas le Set.
    if (c.departement) entree.departements.add(c.departement);
  }

  return Array.from(parRegion.entries())
    .map(([region, { chateaux: liste, departements }]) => ({
      region,
      departements: Array.from(departements).sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
      chateaux: liste.sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    }))
    .sort((a, b) => a.region.localeCompare(b.region, "fr"));
}
