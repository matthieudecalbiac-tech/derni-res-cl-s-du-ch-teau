const { expect } = require('@playwright/test');

/**
 * Attendre que les DONNEES soient a l'ecran — un seul endroit pour la regle.
 *
 * ── POURQUOI CE HARNAIS EXISTE ───────────────────────────────────────────────
 *
 * Deux flakes de la table de surveillance mouraient au meme endroit : sur une
 * attente d'un element qui n'existe QUE lorsque Supabase a repondu.
 *
 *     retour-intelligent:52   waitForSelector('.pr-carte--cliquable', 15000)
 *     blanc-buisson:25        toBeVisible()  ← defaut de 5 s
 *
 * ── LA MESURE QUI COMMANDE LA REGLE (21 aout 2026, serveur de dev) ───────────
 *
 * Le site n'est PAS lent. La structure et le contenu n'arrivent simplement pas
 * en meme temps, et seul le second depend du reseau :
 *
 *     STRUCTURE (montage React, sans donnees)       CONTENU (apres Supabase)
 *       .vit-page               483 ms                .une-semaine-carte  1759-2389 ms
 *       .vit-carte-france svg   502 ms                .vit-carte          1316 ms
 *       .dk-overlay             626 ms                .pr-carte--cliquable 1167 ms
 *       .dk-section-*        642-659 ms
 *       .tcl-onglet          386-557 ms
 *
 * ⚠ ET A FROID, `.une-semaine-carte` EST MESUREE A 5126 ms — au-dessus du defaut
 * de 5 s de Playwright. Le defaut n'est donc pas « un peu juste » : il n'a
 * AUCUNE marge au premier chargement, celui que paie le premier test d'une
 * suite. En CI, ou la machine est chargee et le serveur froid, c'est exactement
 * la fenetre ou ces tests tombent.
 *
 * ── CE QUE CE HARNAIS FAIT, ET CE QU'IL SE REFUSE A FAIRE ────────────────────
 *
 * ⚠ CE N'EST PAS « UN TIMEOUT PLUS LONG ». C'est le patron des tests qui ne
 * flakent PAS, extrait et nomme. Trois regles, et la troisieme est la plus
 * importante :
 *
 *   1. On attend `.first()` VISIBLE — pas « present », pas « attache ».
 *   2. Le delai est celui des tests robustes (15 s), pas le defaut.
 *   3. ⚠ `count()` N'EST JAMAIS UNE PORTE. Il s'execute INSTANTANEMENT : pose
 *      avant l'arrivee des donnees il rend 0, et un test qui s'en sert pour
 *      decider se skippe tout seul — un filet inerte qui se lit comme un filet
 *      vert. C'est arrive une fois (`routes-vitrines-proprietaires`, 20 aout) :
 *      trois navigateurs verts sur un test qui ne testait rien. Ici, `count()`
 *      n'est lu qu'APRES l'attente.
 *
 * ⚠ IL NE MASQUE RIEN. Si l'element n'apparait jamais — vrai defaut du site —
 * l'attente ECHOUE au bout du delai et le test rougit. Un harnais qui
 * attendrait indefiniment transformerait un bug en lenteur, ce qui serait pire
 * que le flake qu'il pretend fermer. Verifie par un test dedie sur un selecteur
 * inexistant.
 *
 * ⚠ NE PAS L'UTILISER POUR LA STRUCTURE. Les elements de la colonne de gauche
 * ci-dessus ne dependent pas du reseau : les faire passer par ici n'ajouterait
 * aucune robustesse et brouillerait la lecture — on ne saurait plus, en lisant
 * un test, ce qui attend le reseau et ce qui n'attend que React.
 *
 * ⚠ NE PAS L'UTILISER POUR `vitrines-tous-chateaux:111`. Ce flake-la ne
 * dependait PAS des donnees : son `.tcl-onglet` parait a 386-557 ms, bien AVANT
 * elles. Autre motif, cause reelle inconnue — cf. le commentaire de ce fichier.
 */

// ── QUINZE SECONDES, ET CE CHIFFRE A ETE CORRIGE APRES MESURE ───────────────
//
// Premiere version : 20 s, choisis « dans la fourchette des tests robustes ».
// ⚠ C'ETAIT UN CHIFFRE D'INTENTION, PAS UNE MESURE, et il portait un risque que
// la boucle de validation a revele : le budget TOTAL d'un test est de 30 s
// (`playwright.config.cjs:22`). Une attente qui peut manger 20 s de ces 30 n'en
// laisse que 10 au reste du parcours — sur `retour-intelligent:53`, qui ouvre
// une vitrine puis revient, c'est trop peu. Un plafond plus haut ne rend pas un
// test plus robuste : il deplace l'echec de l'attente vers le budget.
//
// Les tests qui n'ont JAMAIS flake utilisent 15 s (`route-dernieres-cles`,
// `header-uniformise`, `routes-vitrines-proprietaires` : 9 et 7 occurrences).
// C'est donc la valeur EPROUVEE, pas la plus genereuse — et elle garde une marge
// de ~3x sur le pire cas mesure (5126 ms a froid).
const DELAI_DONNEES = 15000;

/**
 * Attend que le contenu issu de Supabase soit VISIBLE, puis rend le locator.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} selecteur       ex. '.une-semaine-carte', '.pr-carte--cliquable'
 * @param {object} [options]
 * @param {number} [options.timeout=15000]
 * @param {number} [options.minimum=1]  nombre minimal d'elements attendus,
 *                                      verifie APRES l'attente — jamais avant.
 * @returns {import('@playwright/test').Locator} le locator, pret a etre chaine
 */
async function attendreContenu(page, selecteur, options = {}) {
  const { timeout = DELAI_DONNEES, minimum = 1 } = options;
  const cible = page.locator(selecteur);

  await expect(
    cible.first(),
    `Les donnees ne sont pas arrivees a l'ecran : « ${selecteur} » est reste invisible ${timeout} ms.`,
  ).toBeVisible({ timeout });

  if (minimum > 1) {
    const n = await cible.count();
    expect(n, `« ${selecteur} » : ${n} element(s) pour ${minimum} attendu(s).`)
      .toBeGreaterThanOrEqual(minimum);
  }

  return cible;
}

module.exports = { attendreContenu, DELAI_DONNEES };
