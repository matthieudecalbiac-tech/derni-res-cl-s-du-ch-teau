/**
 * Agent QA · Validation des données (src/data/chateaux.js)
 *
 * Niveau C exhaustif — 12 familles de vérifications :
 *   1. Champs obligatoires (id, nom, slug kebab-case, region, departement,
 *      accroche ≥ 20, histoire ≥ 100, description, chambres ≥ 1,
 *      proprietaires{nom,description}, images ≥ 3, coordonnees{lat,lng})
 *   2. Types et bornes GPS France (lat ∈ [41,52], lng ∈ [-5,10])
 *   3. Cohérence tarifaire (prixBarre > prix, reduction ≈ calc à ±1%)
 *   4. Unicité globale (id, slug, nom) + alerte coord dupliquées
 *   5. Qualité chambres (nom, prix, description, capacite, superficie)
 *   6. Cohérence région↔département (warning via table minimale)
 *   7. Placeholders oubliés (TODO, FIXME, Lorem, placeholder, etc.)
 *   8. Typographie (double espaces, apostrophes droites, guillemets droits)
 *   9. Longueurs narratives (warning si < seuil qualité)
 *  10. Accessibilité des images (HTTP HEAD parallèle, fs.existsSync pour
 *      les chemins locaux /public/, timeout 3s)
 *  11. Recomptage final des stats depuis details[]
 *  12. Écriture du bilan commun dans qa-reports/validation-donnees.json
 *
 * Variables d'env :
 *   - SKIP_IMAGE_CHECK=1 → saute les HEAD (environnement sans Internet)
 *
 * Le process exit 0 si aucune erreur (warnings OK), 1 sinon.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { chargerChateaux } = require('../lib/charger-chateaux.cjs');

const ROOT = path.join(__dirname, '..', '..');
const ID = 'validation-donnees';
const LIBELLE = 'Validation données';

const debut = Date.now();
const details = [];
const stats = {
  chateauxTotal: 0,
  chateauxValides: 0,
  chateauxAvecAvertissements: 0,
  anomaliesErreurs: 0,
  anomaliesAvertissements: 0,
  imagesVerifiees: 0,
  imagesInaccessibles: 0,
};

// ── Table région → départements (minimale, couvre chateaux.js actuel) ──
const REGIONS_DEPTS = {
  'Île-de-France': ['Seine-et-Marne'],
  'Hauts-de-France': ['Oise'],
  'Centre-Val de Loire': ['Loiret'],
  'Bourgogne-Franche-Comté': ['Saône-et-Loire'],
  'Pays de la Loire': ['Maine-et-Loire'],
  'Normandie': ['Eure'],
};

const PLACEHOLDER_REGEX = /\b(TODO|FIXME|XXX+|lorem ipsum|placeholder|à compléter|à vérifier)\b/i;

// ── Helpers ──
function ajouter(type, opts) {
  details.push({ type, ...opts });
  if (type === 'erreur') stats.anomaliesErreurs++;
  if (type === 'avertissement') stats.anomaliesAvertissements++;
}

function estString(v) {
  return typeof v === 'string';
}

function chaineNonVide(v) {
  return estString(v) && v.trim().length > 0;
}

function reKebab(s) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}

// Champs où on n'applique pas les checks typographiques (URLs, codes, slugs)
function champTechnique(chemin) {
  const c = chemin.toLowerCase();
  return (
    c.includes('url') ||
    c.includes('src') ||
    c.includes('href') ||
    c.includes('image') ||
    c.includes('portrait') ||
    c.includes('videobackground') ||
    c.includes('slug') ||
    c.includes('coordonnees') ||
    c.includes('couleurtheme') ||
    c.includes('accenttheme') ||
    c.includes('icone')
  );
}

function parcoursStrings(obj, prefixe, visiteur) {
  if (obj == null) return;
  if (estString(obj)) {
    visiteur(prefixe, obj);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => parcoursStrings(v, `${prefixe}[${i}]`, visiteur));
    return;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      parcoursStrings(obj[k], prefixe ? `${prefixe}.${k}` : k, visiteur);
    }
  }
}

// ── Test accessibilité d'une image ──
// URL absolue (http/https) → HEAD réseau. Chemin relatif /... → fs.existsSync
// dans public/. Retourne { url, ok, status, reason }.
function testerImage(url, timeoutMs = 3000) {
  if (typeof url !== 'string' || !url.trim()) {
    return Promise.resolve({ url, ok: false, status: 0, reason: 'URL vide' });
  }
  if (url.startsWith('/')) {
    const fsPath = path.join(ROOT, 'public', url.replace(/^\//, ''));
    const existe = fs.existsSync(fsPath);
    return Promise.resolve({
      url,
      ok: existe,
      status: existe ? 200 : 404,
      reason: existe ? '' : 'fichier absent',
    });
  }
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      resolve({ url, ok: false, status: 0, reason: 'URL invalide' });
      return;
    }
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: timeoutMs }, (res) => {
      const ok = res.statusCode >= 200 && res.statusCode < 400;
      resolve({ url, ok, status: res.statusCode });
      res.resume();
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, ok: false, status: 0, reason: 'timeout' });
    });
    req.on('error', (e) => {
      resolve({ url, ok: false, status: 0, reason: e.code || e.message });
    });
    req.end();
  });
}

// ── Validation principale ──
async function valider() {
  const chateaux = chargerChateaux();
  stats.chateauxTotal = chateaux.length;

  // ─ Unicité globale ─
  const vusIds = new Map();
  const vusSlugs = new Map();
  const vusNoms = new Map();
  const vusCoords = new Map();

  for (const c of chateaux) {
    const nomC = c.nom || c.slug || `id=${c.id}`;
    if (c.id != null) {
      if (vusIds.has(c.id)) {
        ajouter('erreur', {
          message: `id dupliqué (déjà utilisé par ${vusIds.get(c.id)})`,
          chateau: nomC,
          champ: 'id',
          valeurTrouvee: c.id,
        });
      } else vusIds.set(c.id, nomC);
    }
    if (chaineNonVide(c.slug)) {
      if (vusSlugs.has(c.slug)) {
        ajouter('erreur', {
          message: `slug dupliqué (déjà utilisé par ${vusSlugs.get(c.slug)})`,
          chateau: nomC,
          champ: 'slug',
          valeurTrouvee: c.slug,
        });
      } else vusSlugs.set(c.slug, nomC);
    }
    if (chaineNonVide(c.nom)) {
      if (vusNoms.has(c.nom)) {
        ajouter('erreur', {
          message: `nom dupliqué`,
          chateau: nomC,
          champ: 'nom',
          valeurTrouvee: c.nom,
        });
      } else vusNoms.set(c.nom, nomC);
    }
    if (
      c.coordonnees &&
      typeof c.coordonnees.lat === 'number' &&
      typeof c.coordonnees.lng === 'number'
    ) {
      const cle = `${c.coordonnees.lat.toFixed(4)},${c.coordonnees.lng.toFixed(4)}`;
      if (vusCoords.has(cle)) {
        ajouter('avertissement', {
          message: `coordonnées identiques à ${vusCoords.get(cle)} (copier-coller ?)`,
          chateau: nomC,
          champ: 'coordonnees',
          valeurTrouvee: cle,
        });
      } else vusCoords.set(cle, nomC);
    }
  }

  // ─ Boucle par château (champs, bornes, typo, placeholders, chambres) ─
  const tachesImages = []; // { chateau, urls }

  for (const c of chateaux) {
    const nomC = c.nom || c.slug || `id=${c.id}`;
    const emettre = (type, opts) => ajouter(type, { chateau: nomC, ...opts });

    // Champs obligatoires
    if (!Number.isInteger(c.id) || c.id <= 0)
      emettre('erreur', { message: 'id manquant ou invalide', champ: 'id', valeurTrouvee: c.id });
    if (!chaineNonVide(c.nom)) emettre('erreur', { message: 'nom manquant', champ: 'nom' });
    if (!chaineNonVide(c.slug)) emettre('erreur', { message: 'slug manquant', champ: 'slug' });
    else if (!reKebab(c.slug))
      emettre('erreur', {
        message: 'slug non kebab-case',
        champ: 'slug',
        valeurTrouvee: c.slug,
        valeurAttendue: '^[a-z0-9]+(-[a-z0-9]+)*$',
      });
    if (!chaineNonVide(c.region)) emettre('erreur', { message: 'region manquante', champ: 'region' });
    if (!chaineNonVide(c.departement))
      emettre('erreur', { message: 'departement manquant', champ: 'departement' });
    if (!chaineNonVide(c.accroche) || c.accroche.trim().length < 20)
      emettre('erreur', {
        message: 'accroche manquante ou trop courte (< 20 caractères)',
        champ: 'accroche',
        valeurTrouvee: chaineNonVide(c.accroche) ? c.accroche.trim().length : 0,
      });
    if (!chaineNonVide(c.histoire) || c.histoire.trim().length < 100)
      emettre('erreur', {
        message: 'histoire manquante ou trop courte (< 100 caractères)',
        champ: 'histoire',
        valeurTrouvee: chaineNonVide(c.histoire) ? c.histoire.trim().length : 0,
      });
    if (!chaineNonVide(c.description))
      emettre('erreur', { message: 'description manquante', champ: 'description' });

    // Chambres
    if (!Array.isArray(c.chambres) || c.chambres.length === 0) {
      emettre('erreur', { message: 'chambres vide ou absent', champ: 'chambres' });
    } else {
      c.chambres.forEach((ch, i) => {
        if (!chaineNonVide(ch.nom))
          emettre('erreur', { message: 'chambre sans nom', champ: `chambres[${i}].nom` });
        if (!(typeof ch.prix === 'number' && ch.prix > 0))
          emettre('erreur', {
            message: 'chambre prix invalide',
            champ: `chambres[${i}].prix`,
            valeurTrouvee: ch.prix,
          });
        if (!chaineNonVide(ch.description))
          emettre('erreur', { message: 'chambre sans description', champ: `chambres[${i}].description` });
        if (ch.capacite != null && !(Number.isInteger(ch.capacite) && ch.capacite >= 1))
          emettre('erreur', {
            message: 'capacite invalide',
            champ: `chambres[${i}].capacite`,
            valeurTrouvee: ch.capacite,
          });
        if (ch.superficie != null) {
          const sup = ch.superficie;
          const okSup =
            (typeof sup === 'string' && /m²/i.test(sup)) || (typeof sup === 'number' && sup > 0);
          if (!okSup)
            emettre('erreur', {
              message: 'superficie invalide (attendu : string avec m² OU number > 0)',
              champ: `chambres[${i}].superficie`,
              valeurTrouvee: sup,
            });
        }
      });
    }

    // Proprietaires
    if (!c.proprietaires || typeof c.proprietaires !== 'object') {
      emettre('erreur', { message: 'proprietaires absent', champ: 'proprietaires' });
    } else {
      if (!chaineNonVide(c.proprietaires.nom))
        emettre('erreur', { message: 'proprietaires.nom manquant', champ: 'proprietaires.nom' });
      if (!chaineNonVide(c.proprietaires.description))
        emettre('erreur', { message: 'proprietaires.description manquant', champ: 'proprietaires.description' });
    }

    // Images ≥ 3
    if (!Array.isArray(c.images) || c.images.length < 3) {
      emettre('erreur', {
        message: `images < 3 (trouvé : ${Array.isArray(c.images) ? c.images.length : 0})`,
        champ: 'images',
        valeurTrouvee: Array.isArray(c.images) ? c.images.length : 0,
      });
    }

    // Coordonnees + bornes France
    if (!c.coordonnees || typeof c.coordonnees.lat !== 'number' || typeof c.coordonnees.lng !== 'number') {
      emettre('erreur', { message: 'coordonnees absent ou incomplet', champ: 'coordonnees' });
    } else {
      if (c.coordonnees.lat < 41 || c.coordonnees.lat > 52)
        emettre('erreur', {
          message: `lat hors bornes France (${c.coordonnees.lat})`,
          champ: 'coordonnees.lat',
          valeurTrouvee: c.coordonnees.lat,
          valeurAttendue: '[41, 52]',
        });
      if (c.coordonnees.lng < -5 || c.coordonnees.lng > 10)
        emettre('erreur', {
          message: `lng hors bornes France (${c.coordonnees.lng})`,
          champ: 'coordonnees.lng',
          valeurTrouvee: c.coordonnees.lng,
          valeurAttendue: '[-5, 10]',
        });
    }

    // Prix / prixBarre / reduction
    if (c.prix != null && !(typeof c.prix === 'number' && c.prix > 0))
      emettre('erreur', { message: 'prix invalide', champ: 'prix', valeurTrouvee: c.prix });
    if (c.prixBarre != null && !(typeof c.prixBarre === 'number' && c.prixBarre > 0))
      emettre('erreur', { message: 'prixBarre invalide', champ: 'prixBarre', valeurTrouvee: c.prixBarre });
    if (c.reduction != null && !(typeof c.reduction === 'number' && c.reduction >= 0 && c.reduction <= 100))
      emettre('erreur', { message: 'reduction hors [0,100]', champ: 'reduction', valeurTrouvee: c.reduction });

    if (typeof c.prix === 'number' && typeof c.prixBarre === 'number' && c.prixBarre <= c.prix) {
      emettre('erreur', {
        message: `prixBarre (${c.prixBarre}) <= prix (${c.prix})`,
        champ: 'prixBarre',
        valeurTrouvee: c.prixBarre,
      });
    }
    if (
      typeof c.prix === 'number' &&
      typeof c.prixBarre === 'number' &&
      typeof c.reduction === 'number' &&
      c.prixBarre > 0
    ) {
      const calc = 100 * (1 - c.prix / c.prixBarre);
      if (Math.abs(calc - c.reduction) > 1) {
        emettre('erreur', {
          message: `reduction incohérente (calculé ${calc.toFixed(1)}% vs déclaré ${c.reduction}%)`,
          champ: 'reduction',
          valeurTrouvee: c.reduction,
          valeurAttendue: calc.toFixed(1),
        });
      }
    }

    // Cohérence région↔département (warning)
    if (chaineNonVide(c.region) && chaineNonVide(c.departement)) {
      const dansTable = REGIONS_DEPTS[c.region];
      if (!dansTable) {
        emettre('avertissement', {
          message: `région "${c.region}" hors table de validation (peut-être obsolète ?)`,
          champ: 'region',
          valeurTrouvee: c.region,
        });
      } else if (!dansTable.includes(c.departement)) {
        emettre('avertissement', {
          message: `incohérence region/departement : "${c.departement}" non rattaché à "${c.region}"`,
          champ: 'departement',
          valeurTrouvee: c.departement,
          valeurAttendue: dansTable.join(' | '),
        });
      }
    }

    // Placeholders + typographie (un warning par champ, pas par occurrence)
    parcoursStrings(c, '', (chemin, valeur) => {
      if (PLACEHOLDER_REGEX.test(valeur)) {
        emettre('erreur', {
          message: `placeholder détecté dans ${chemin}`,
          champ: chemin,
          valeurTrouvee: valeur.slice(0, 80),
        });
      }
      if (champTechnique(chemin)) return;
      if (/ {2,}/.test(valeur))
        emettre('avertissement', { message: `double espace dans ${chemin}`, champ: chemin });
      if (/[a-zA-Zéèêà]'[a-zA-Zéèêà]/.test(valeur))
        emettre('avertissement', {
          message: `apostrophe droite dans ${chemin} (préférer ’)`,
          champ: chemin,
        });
      // Guillemets droits " ... " : uniquement si paire (évite les apostrophes isolées)
      if (/"[^"]+"/.test(valeur))
        emettre('avertissement', {
          message: `guillemets droits dans ${chemin} (préférer « »)`,
          champ: chemin,
        });
    });

    // Longueurs narratives (warning, en plus du seuil erreur)
    if (chaineNonVide(c.accroche) && c.accroche.trim().length >= 20 && c.accroche.trim().length < 40) {
      emettre('avertissement', {
        message: 'accroche courte (< 40 caractères)',
        champ: 'accroche',
        valeurTrouvee: c.accroche.trim().length,
      });
    }
    if (chaineNonVide(c.histoire) && c.histoire.trim().length >= 100 && c.histoire.trim().length < 200) {
      emettre('avertissement', {
        message: 'histoire courte (< 200 caractères)',
        champ: 'histoire',
        valeurTrouvee: c.histoire.trim().length,
      });
    }
    if (chaineNonVide(c.description) && c.description.trim().length < 80) {
      emettre('avertissement', {
        message: 'description courte (< 80 caractères)',
        champ: 'description',
        valeurTrouvee: c.description.trim().length,
      });
    }

    // Préparer les URLs d'images à tester (les 3 premières)
    if (Array.isArray(c.images) && c.images.length > 0) {
      const aTester = c.images.slice(0, 3).filter(chaineNonVide);
      if (aTester.length > 0) tachesImages.push({ chateau: nomC, urls: aTester });
    }
  }

  // ─ Vérification des images (en parallèle total) ─
  if (process.env.SKIP_IMAGE_CHECK === '1') {
    ajouter('info', {
      message: 'Vérification des images sautée (SKIP_IMAGE_CHECK=1)',
      champ: 'images',
    });
    stats.imagesVerifiees = 0;
  } else if (tachesImages.length > 0) {
    // Aplatir toutes les URLs, tester en parallèle, regrouper par château après
    const plat = [];
    for (const t of tachesImages) for (const u of t.urls) plat.push({ chateau: t.chateau, url: u });

    const resultats = await Promise.all(
      plat.map((x) => testerImage(x.url, 3000).then((r) => ({ ...x, ...r })))
    );

    // Par château : warning par image KO, puis erreur si TOUTES KO
    const parChateau = new Map();
    for (const r of resultats) {
      stats.imagesVerifiees++;
      if (!r.ok) stats.imagesInaccessibles++;
      const groupe = parChateau.get(r.chateau) || { total: 0, ok: 0, echecs: [] };
      groupe.total++;
      if (r.ok) groupe.ok++;
      else groupe.echecs.push(r);
      parChateau.set(r.chateau, groupe);
    }
    for (const [nomC, g] of parChateau) {
      for (const e of g.echecs) {
        ajouter('avertissement', {
          message: `image inaccessible (${e.reason || e.status})`,
          chateau: nomC,
          champ: 'images',
          urlTestee: e.url,
          codeHTTP: e.status || undefined,
        });
      }
      if (g.ok === 0 && g.total > 0) {
        ajouter('erreur', {
          message: `toutes les images testées (${g.total}) sont inaccessibles`,
          chateau: nomC,
          champ: 'images',
        });
      }
    }
  }

  // ─ Recompte des compteurs château valides / avec avertissements ─
  // Source de vérité : le contenu de details[].
  const nomsAvecErreur = new Set();
  const nomsAvecWarn = new Set();
  for (const d of details) {
    if (!d.chateau) continue;
    if (d.type === 'erreur') nomsAvecErreur.add(d.chateau);
    if (d.type === 'avertissement') nomsAvecWarn.add(d.chateau);
  }
  stats.chateauxValides = stats.chateauxTotal - nomsAvecErreur.size;
  stats.chateauxAvecAvertissements = nomsAvecWarn.size;

  // ─ Écriture du rapport commun ─
  const okGlobal = stats.anomaliesErreurs === 0;
  const rapport = {
    agent: ID,
    libelle: LIBELLE,
    ok: okGlobal,
    dureeSec: Math.round((Date.now() - debut) / 1000),
    stats,
    details,
    timestamp: new Date().toISOString(),
  };

  fs.mkdirSync(path.join(ROOT, 'qa-reports'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'qa-reports', `${ID}.json`),
    JSON.stringify(rapport, null, 2)
  );

  // ─ Résumé console ─
  console.log(`\n⚜  Validation données · ${stats.chateauxValides}/${stats.chateauxTotal} châteaux valides`);
  console.log(`   ${stats.anomaliesErreurs} erreur(s) · ${stats.anomaliesAvertissements} avertissement(s) · ${stats.chateauxAvecAvertissements} château(x) avec avertissements`);
  if (stats.imagesVerifiees > 0) {
    console.log(`   ${stats.imagesVerifiees} image(s) vérifiée(s) · ${stats.imagesInaccessibles} inaccessible(s)`);
  }

  process.exit(okGlobal ? 0 : 1);
}

valider().catch((err) => {
  console.error('[validation-donnees] crash :', err);
  process.exit(2);
});
