/**
 * Predicat partage du filtre par equipements (relation N-N).
 * Source de verite UNIQUE : consomme par PageResultats (tunnel /resultats) ET
 * par la carte (CarteInteractive) — ecrire le ET deux fois garantirait une
 * divergence a terme.
 *
 * Semantique = ET : le chateau matche s'il porte TOUS les equipements demandes,
 * peu importe via un ou plusieurs de ses services (on teste l'UNION des
 * equipements de tous ses services). Liste vide -> aucune contrainte -> true.
 *
 * Forme attendue : chateau.amenities[].equipements[] = [{ slug, libelle }]
 * (cf. mapAmenity). Robuste aux champs absents (chateau/amenities/equipements null).
 *
 * @param {Object} chateau - chateau mappe (avec amenities[].equipements[]).
 * @param {string[]} slugs - slugs d'equipements demandes.
 * @returns {boolean}
 */
export function chateauPorteEquipements(chateau, slugs) {
  const demandes = Array.isArray(slugs) ? slugs : [];
  if (demandes.length === 0) return true; // aucun critere -> pas de contrainte

  const possedes = new Set(
    (chateau?.amenities ?? []).flatMap((a) => (a?.equipements ?? []).map((e) => e.slug))
  );
  return demandes.every((slug) => possedes.has(slug));
}
