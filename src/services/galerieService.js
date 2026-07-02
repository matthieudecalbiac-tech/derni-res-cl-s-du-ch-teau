/**
 * Point unique de construction de la galerie photos d'un chateau.
 * Aujourd'hui : derive des 3 sources existantes (images / chambres / proprietaires).
 * Futur : si chateau.galerie (champ editorial dedie) existe, le preferer ici -
 * aucun composant a retoucher (meme pattern que estDisponible / offresService).
 *
 * @returns {Array<{ titre: string, photos: Array<{ url: string, legende?: string }> }>}
 *          Sections non vides uniquement.
 */
export function construireGalerie(chateau) {
  if (!chateau) return [];

  // ═══ PLUG-READY GALERIE EDITORIALE ═══
  // Le jour ou un champ chateau.galerie structure arrive (Supabase + mapper),
  // decommenter pour le preferer :
  // if (Array.isArray(chateau.galerie) && chateau.galerie.length) return chateau.galerie;

  const sections = [];

  // Section 1 - Le domaine (chateau.images)
  const domaine = (chateau.images || []).filter(Boolean).map((url) => ({ url }));
  if (domaine.length) sections.push({ titre: "Le domaine", photos: domaine });

  // Section 2 - Les chambres (photos + nom en legende)
  const chambres = (chateau.chambres || [])
    .filter((ch) => ch && ch.image)
    .map((ch) => ({ url: ch.image, legende: ch.nom }));
  if (chambres.length) sections.push({ titre: "Les chambres", photos: chambres });

  // Section 3 - Les proprietaires (portrait)
  const p = chateau.proprietaires;
  if (p && p.portrait) {
    sections.push({ titre: "Les proprietaires", photos: [{ url: p.portrait, legende: p.nom }] });
  }

  return sections;
}
