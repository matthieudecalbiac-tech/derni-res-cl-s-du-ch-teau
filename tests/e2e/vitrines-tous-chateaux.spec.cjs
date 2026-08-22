const { test, expect } = require('@playwright/test');
const { selModule, selTheme, ouvrirNavVitrine } = require('./_navVitrine.cjs');

/**
 * Tests E2E · Vitrines — comportement, decouverte DOM (piece 5).
 *
 * Zero lecture de fichier. La liste des chateaux servis est decouverte au
 * runtime depuis la modale "Liste" du toggle Carte/Liste
 * (.tcl-item[data-slug]). Pour chacun, on verifie que la vitrine REND ses
 * sections - jamais qu'une donnee vaut une valeur precise.
 *
 * POURQUOI CETTE SOURCE, et plus les medaillons de HeureAuxDemeures : cette
 * liste est le catalogue INTEGRAL des chateaux publies non-demo (c'est son
 * contrat, pas un effet de bord), et elle est visible aux DEUX tailles. Les
 * medaillons, eux, sont masques sous 768 px depuis le design mobile
 * (heure-aux-demeures.css) : ils restaient dans le DOM mais invisibles, ce qui
 * faisait echouer ce fichier sur mobile-safari de facon deterministe.
 * Le carrousel "Les clefs a la une" a ete ecarte : il n'expose que 2 chateaux
 * sur 7, la couverture serait devenue partielle en silence.
 *
 * Robustesse : un ajout de chambre, une timeline plus longue, une citation
 * reecrite ne cassent rien. Seule une vitrine qui cesse de rendre une section,
 * ou une image en 4xx, fait rougir. Les sections optionnelles (accroche,
 * timeline, citation) sont gardees par leur presence dans le DOM : un chateau
 * qui n'en a pas n'echoue pas.
 */

// Ouvre la modale "Liste" du toggle Carte/Liste (catalogue integral) et attend
// que ses items soient reellement VISIBLES - pas seulement presents.
async function ouvrirCatalogue(page) {
  const onglet = page.locator('.tcl-onglet').filter({ hasText: 'Liste' });
  const items = page.locator('.tcl-item[data-slug]');

  let derniereErreur;
  for (let essai = 0; essai < 3; essai++) {
    // Ne reclique QUE si la modale n'est pas deja ouverte : une fois ouverte,
    // elle recouvre le toggle et le clic serait intercepte.
    // ── ⚠ LA CAUSE ECRITE ICI ETAIT FAUSSE. ELLE A ETE REFUTEE PAR MESURE ────
    //
    // Ce commentaire affirmait : « a l'arrivee des donnees Supabase, useChateaux
    // fait re-rendre tout le sous-arbre .tcl et REMPLACE le noeud du bouton ; le
    // clic atterrit sur un noeud detache ». C'etait ecrit comme une certitude.
    // Mesure du 21 aout, sur les DEUX moteurs :
    //
    //   chromium   bouton a 557 ms, donnees a 1362 ms
    //   webkit     bouton a 489 ms, donnees a  849 ms
    //   MEME NOEUD apres l'arrivee des donnees : true   (les deux)
    //   noeud d'avant encore attache            : true   (les deux)
    //   MutationObserver pose avant le boot     : 0 retrait d'un .tcl-onglet
    //
    // React RECONCILIE, il ne remplace pas. Le clic n'atterrit donc PAS sur un
    // noeud detache. LA CAUSE REELLE DE CE FLAKE EST INCONNUE A CE JOUR.
    //
    // Ce qu'on sait, et qui n'est pas rien : CE N'EST PAS UN PROBLEME DE
    // DONNEES. `.tcl-onglet` parait a 386-557 ms, BIEN AVANT elles. Ce test
    // n'appartient donc pas a la famille de `retour-intelligent:52` et
    // `blanc-buisson:25`, et le harnais `_attendreContenu` ne le concerne pas.
    // Le log CI dit `waiting for locator` SANS `resolved to` : l'element n'a
    // jamais ete trouve — ni noeud detache, ni donnee lente.
    //
    // Le retry ci-dessous est CONSERVE : il rattrape le symptome, quel qu'en
    // soit le mecanisme. Diagnostic a reprendre sur l'artefact du prochain rouge
    // CI (4 occurrences au 21 aout, cf. CLAUDE.md § Flakes sous surveillance).
    // ⚠ NE PAS reconstruire une explication par ressemblance : c'est exactement
    // ainsi que la precedente s'etait installee.
    if ((await page.locator('.tcl-liste').count()) === 0) await onglet.click();
    try {
      await expect(items.first()).toBeVisible({ timeout: 8000 });
      return;
    } catch (e) {
      derniereErreur = e;
    }
  }
  throw derniereErreur;
}

// Ouvre la vitrine d'un chateau par son slug, via son item de catalogue (meme
// source que la decouverte, et meme parcours qu'un visiteur : versVitrine()
// passe par onEntrerChateau, donc par la TransitionPorte). Patron eprouve :
// retry click mobile-safari + attente de la transition avant l'overlay visible.
async function ouvrirVitrineParSlug(page, slug) {
  const item = page.locator(`.tcl-item[data-slug="${slug}"]`);

  let derniereErreur;
  for (let essai = 0; essai < 3; essai++) {
    // versVitrine() REFERME la modale a chaque clic. Sans cette reouverture, un
    // 2e essai cliquerait dans le vide - ce que les medaillons, eux, ne
    // demandaient pas.
    if (!(await item.isVisible().catch(() => false))) await ouvrirCatalogue(page);
    await item.scrollIntoViewIfNeeded();
    await item.click();
    try {
      // 12 s, et non 3 : depuis le catalogue, versVitrine() joue la porte PUIS
      // navigue vers /chateau/<slug> - l'overlay n'est monte qu'a l'arrivee.
      // Mesure : ~4,3 s ici, contre ~0,5 s par les medaillons, qui montaient
      // l'overlay tout de suite et jouaient la porte par-dessus. Le total, lui,
      // est inchange (~4,2 s jusqu'a .vc3-visible) : seul l'ordre des jalons
      // change. Un timeout de 3 s echouait donc a TOUS les coups.
      await expect(page.locator('.vc3-overlay')).toBeVisible({ timeout: 12000 });
      derniereErreur = null;
      break;
    } catch (e) {
      derniereErreur = e;
      // Ne JAMAIS reessayer pendant la porte : son voile .tp-fond intercepte
      // les clics, et le retry echouerait sur le catalogue au lieu du chateau.
      await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    }
  }
  if (derniereErreur) throw derniereErreur;

  await page.locator('.tp-wrap').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await expect(page.locator('.vc3-overlay.vc3-visible')).toBeVisible({ timeout: 3000 });
}

// Charge la home et retourne les slugs des chateaux servis (catalogue integral).
async function decouvrirSlugs(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await ouvrirCatalogue(page);
  return page.locator('.tcl-item[data-slug]').evaluateAll(
    (els) => els.map((e) => e.getAttribute('data-slug')).filter(Boolean)
  );
}

test.describe('Vitrines · comportement (decouverte DOM)', () => {

  test('Au moins un chateau est servi et decouvrable sur la home', async ({ page }) => {
    const slugs = await decouvrirSlugs(page);
    // Seule alarme si le catalogue public se vide : plus aucune vitrine a tester.
    expect(slugs.length, 'Aucun item [data-slug] dans le catalogue').toBeGreaterThan(0);
  });

  test('Chaque vitrine servie rend ses sections', async ({ page }) => {
    // Sweep O(nombre de chateaux publies) : ouvre CHAQUE vitrine avec parcours
    // complet. Le catalogue public grandit (nouveaux partenaires) → le budget
    // doit suivre. C'etait l'intention affichee ici, mais test.slow() ne la
    // tenait pas : son x3 est FIXE (30 -> 90 s) et ne suit rien. Mesure sur
    // webkit : ~12 s par chateau, dont ~4,3 s de TransitionPorte. A 7 demeures
    // le sweep touchait donc deja le plafond AVANT ce chantier - verifie en
    // relancant la version d'origine, qui meurt sur la 7e. Le budget devient
    // explicite et reellement proportionnel (cf. test.setTimeout plus bas).
    // Aucun timeout d'assertion n'est touche : une vraie panne echoue toujours
    // aussi vite qu'avant.

    // 4xx d'images collectees sur tout le parcours, asserees a la fin.
    const imagesEnErreur = [];
    page.on('response', (res) => {
      if (res.status() >= 400 && res.request().resourceType() === 'image') {
        imagesEnErreur.push(`${res.status()} ${res.url()}`);
      }
    });

    const slugs = await decouvrirSlugs(page);
    expect(slugs.length).toBeGreaterThan(0);

    // 30 s de socle + 20 s par chateau (12 s mesures, ~65 % de marge). A 7
    // demeures : 170 s. Le 8e partenaire ajoutera son budget tout seul.
    test.setTimeout(30_000 + slugs.length * 20_000);

    for (const slug of slugs) {
      await test.step(`Vitrine ${slug}`, async () => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        // ouvrirVitrineParSlug ouvre le catalogue lui-meme : rien a attendre ici.
        await ouvrirVitrineParSlug(page, slug);

        // — Nom : present et non vide.
        const nom = (await page.locator('.vc3-header-nom').textContent()) || '';
        expect(nom.trim().length, 'Nom de vitrine vide').toBeGreaterThan(0);

        // — Hero : accroche gardee par presence, prix contenant l'euro.
        const accroche = page.locator('.vc3-hero2-accroche');
        if (await accroche.count() > 0) {
          await expect(accroche.first()).toBeVisible();
        }
        await expect(page.locator('.vc3-sejour-prix')).toContainText('€');

        // Les themes s'ouvrent desormais en MODALE : le contenu n'est plus
        // insere dans le flux. On porte donc les assertions sur .mdl-panneau,
        // et on REFERME entre deux themes — sinon l'overlay de la premiere
        // modale intercepte le clic sur la barre. C'est aussi le geste reel du
        // visiteur : il ferme, puis rouvre ailleurs.
        const modaleTheme = page.locator('.mdl-panneau');

        // — Theme Histoire : timeline gardee par sa presence (chateau sans
        //   timeline = pas de .vc4-theme-timeline, on ne teste rien).
        // selTheme() et non `[data-theme="histoire"]` nu : depuis que la feuille
        // mobile porte les MEMES attributs que la barre laterale, le selecteur
        // nu resout deux elements et Playwright refuse en mode strict. Le helper
        // filtre par `:visible` — une seule des deux sources repond.
        await ouvrirNavVitrine(page, 'themes');
        await page.locator(selTheme('histoire')).click();
        await expect(modaleTheme).toBeVisible({ timeout: 5000 });
        if (await modaleTheme.locator('.vc4-theme-timeline').count() > 0) {
          expect(
            await modaleTheme.locator('.vc4-theme-tl-item').count(),
            'Timeline rendue mais sans evenement'
          ).toBeGreaterThan(0);
        }
        await page.keyboard.press('Escape');
        await expect(modaleTheme).toHaveCount(0, { timeout: 3000 });

        // — Theme Famille : citation gardee par sa presence.
        await ouvrirNavVitrine(page, 'themes');
        await page.locator(selTheme('famille')).click();
        await expect(modaleTheme).toBeVisible({ timeout: 5000 });
        const citation = modaleTheme.locator('.vc4-theme-famille-citation');
        if (await citation.count() > 0) {
          await expect(citation.first()).toBeVisible();
        }
        await page.keyboard.press('Escape');
        await expect(modaleTheme).toHaveCount(0, { timeout: 3000 });

        // — Module Permanent : meme regime que les themes desormais. La bande de
        //   cartes Niveau 1 a quitte le flux, et l'overlay maison
        //   .vc3-module-panel a fait place a Modale.jsx. L'acces passe par la
        //   barre laterale en desktop, par la feuille « Explorer » en mobile.
        await ouvrirNavVitrine(page, 'offres');
        await page.locator(selModule('permanent')).click();
        await expect(modaleTheme).toBeVisible({ timeout: 5000 });
        expect(
          await modaleTheme.locator('.vc4-permanent-chambre').count(),
          'Aucune chambre dans le module Permanent'
        ).toBeGreaterThan(0);

        // — Modale de reservation : s'ouvre PAR-DESSUS celle du module
        //   (.vc3-reserve-overlay est en z-index 9100 contre 9000), puis se ferme.
        await modaleTheme.locator('.vc4-permanent-chambre-cta').first().click();
        await expect(page.locator('.vc3-reserve-modal')).toBeVisible();
        await page.locator('.vc3-reserve-close').click();
        await expect(page.locator('.vc3-reserve-modal')).not.toBeVisible();

        // Referme la modale du module : sans ca, l'Escape suivant serait absorbe
        // par elle au lieu de fermer la vitrine (garde pose dans VitrineChateau).
        await page.keyboard.press('Escape');
        await expect(modaleTheme).toHaveCount(0, { timeout: 3000 });
        await expect(page.locator('.vc3-module-panel')).toHaveCount(0);

        // — Images : declenche le chargement sous le fold (4xx collectes globalement).
        await page.evaluate(() => {
          const corps = document.querySelector('.vc3-corps');
          if (corps) corps.scrollTo({ top: corps.scrollHeight, behavior: 'instant' });
        });
        await page.waitForTimeout(800);

        // — Escape ferme la vitrine.
        await page.keyboard.press('Escape');
        await expect(page.locator('.vc3-overlay')).toHaveCount(0, { timeout: 3000 });
      });
    }

    expect(imagesEnErreur, `Images en 4xx :\n${imagesEnErreur.join('\n')}`).toEqual([]);
  });

});
