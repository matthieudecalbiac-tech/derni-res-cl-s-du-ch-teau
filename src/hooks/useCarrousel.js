import { useCallback, useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// useCarrousel — le COMPORTEMENT d'un carrousel a defilement natif
// ═══════════════════════════════════════════════════════════════════════════
//
// ⚠ EXTRAIT DE DEUX SECTIONS QUI PORTAIENT LE MEME CODE. « Les cles a la une »
// et « Decouvrez aussi » ont ete construites l'une apres l'autre, la seconde en
// copiant la premiere (voie c, 24 aout : copier maintenant, extraire A FROID
// ensuite, avec deux references qui marchent). Mesure avant extraction : CINQ
// des six fonctions etaient identiques AU CARACTERE PRES, et la sixieme ne
// differait que d'un bloc — l'ouverture au milieu, devenue le seul parametre.
//
// ⚠ UN HOOK, ET NON UN COMPOSANT. Ce qui est commun est du COMPORTEMENT — des
// refs, un observateur, des mesures DOM, deux etats. Ce qui differe est du
// MARKUP et du CSS : largeur de carte, gouttiere, echelle, ornement du focus,
// contenu, visibilite mobile. Un composant partage aurait du tout parametrer et
// serait devenu plus complexe que les deux copies reunies.
//
// ⚠⚠ CE HOOK NE CONNAIT AUCUN REGLAGE — IL LES MESURE. Ni `--carte`, ni la
// gouttiere, ni le facteur d'echelle n'entrent ici : ils vivent en CSS, ou ils
// doivent rester. C'est la limite a ne pas franchir en ajoutant des parametres.
//
// ⚠ LE COMPORTEMENT N'EST PAS TESTABLE ICI. La mesure automatisee a menti
// QUATRE FOIS sur ces carrousels (clic des fleches sans effet, focus qui ne
// suit pas, echelle a 1, opacite a 0) alors que tout marchait a l'ecran — c'est
// consigne dans CLAUDE.md. La non-regression de l'extraction a donc ete prouvee
// AUTREMENT : par EQUIVALENCE TEXTUELLE entre ce fichier et le code que les
// composants portaient avant. Un comportement identique ne se demontre pas ;
// un code identique, si.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {Object}  [options]
 * @param {boolean} [options.ouvrirAuMilieu=false] - Positionne le carrousel sur
 *   la carte MEDIANE au premier attachement, une seule fois. ⚠ Utile quand la
 *   reserve laterale est large et la section pleine largeur : au repos,
 *   `scrollLeft` vaut 0, la premiere carte est centree et toute la moitie
 *   gauche reste vide. En partant du milieu, les deux cotes sont peuples.
 *   `false` (defaut) = ouverture sur la premiere carte.
 * @returns {{attacherListe: Function, surDefilement: Function,
 *            defiler: Function, bornes: {debut: boolean, fin: boolean},
 *            centre: number}}
 */
export function useCarrousel({ ouvrirAuMilieu = false } = {}) {
  const listeRef = useRef(null);
  // Index de la carte CENTREE — mesure exacte (cf. majCentre). Alimente le
  // grossissement de la carte au focus ET les points de pagination.
  const [centre, setCentre] = useState(0);
  // ── LES FLECHES ───────────────────────────────────────────────────────────
  // ⚠ POURQUOI ELLES EXISTENT, ET CE N'EST PAS UN ORNEMENT. Le carrousel
  //   deborde bien (mesure : scrollWidth 869 contre clientWidth 645) et il est
  //   defilable — mais `scrollbar-width: none`, promu du mobile, lui retire la
  //   BARRE, et la molette d'une souris classique defile VERTICALEMENT. Au
  //   doigt et au trackpad tout marchait ; a la souris, la carte suivante etait
  //   INATTEIGNABLE. Les fleches sont ce moyen-la, et elles seules.
  const [bornes, setBornes] = useState({ debut: true, fin: true });
  const rafRef = useRef(0);
  // ⚠ N'est lu que si `ouvrirAuMilieu` : la section 3 ouvre sur la carte 1.
  const ouvertureFaite = useRef(false);

  // ⚠ LE PAS EST MESURE DANS LE DOM, JAMAIS CODE EN DUR. La largeur d'une carte
  //   vient d'un `clamp(...calc(100% ...))` : elle change avec le conteneur, a
  //   chaque redimensionnement. Une constante mentirait des le premier resize —
  //   le clic sauterait une demi-carte, ou deux.
  const pasCarte = () => {
    const el = listeRef.current;
    const premier = el?.children?.[0];
    if (!el || !premier) return 0;
    const gouttiere = parseFloat(getComputedStyle(el).columnGap) || 0;
    return premier.getBoundingClientRect().width + gouttiere;
  };

  // ⚠⚠ LA CARTE CENTREE SE MESURE, ELLE NE SE DEDUIT PAS D'UNE DIVISION.
  //   L'ancien calcul faisait scrollLeft / (scrollWidth / nbEnfants) : une
  //   heuristique qui suppose des cartes de largeur egale, sans gouttiere ni
  //   reserve laterale. Elle derivait deja sur les points de pagination, et
  //   elle serait FAUSSE ici — la reserve laterale decale tout.
  //   On prend la carte dont le CENTRE est le plus proche du centre du
  //   conteneur : exact quelles que soient largeurs, gouttieres et paddings.
  const majCentre = () => {
    const el = listeRef.current;
    if (!el) return;
    // ⚠⚠ ON COMPARE DES RECTANGLES ECRAN, PAS `offsetLeft` CONTRE `scrollLeft`.
    //   Premiere version : `offsetLeft + offsetWidth/2` face a
    //   `scrollLeft + clientWidth/2`. DEUX ESPACES DE COORDONNEES DIFFERENTS —
    //   `offsetLeft` se mesure depuis l'`offsetParent`, et la liste n'etant pas
    //   positionnee, cet ancetre n'est PAS le conteneur defilant. L'ecart
    //   constant ainsi introduit designait toujours la meme carte : mesure du
    //   24 aout, le focus restait a l'index 0 apres un defilement de 300 px.
    //   `getBoundingClientRect` ramene tout le monde dans l'espace de l'ecran,
    //   quel que soit le positionnement CSS.
    const boite = el.getBoundingClientRect();
    const cible = boite.left + boite.width / 2;
    let meilleur = 0;
    let ecartMin = Infinity;
    [...el.children].forEach((n, i) => {
      const r = n.getBoundingClientRect();
      const ecart = Math.abs(r.left + r.width / 2 - cible);
      if (ecart < ecartMin) { ecartMin = ecart; meilleur = i; }
    });
    setCentre(meilleur);
  };

  const majBornes = () => {
    const el = listeRef.current;
    if (!el) return;
    majCentre();
    const max = el.scrollWidth - el.clientWidth;
    // ⚠ Tolerance d'1 px : `scrollLeft` est fractionnaire (zoom, DPI), et une
    //   comparaison stricte laisserait la fleche active sur un reste de 0,4 px.
    setBornes({ debut: el.scrollLeft <= 1, fin: max <= 1 || el.scrollLeft >= max - 1 });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ⚠⚠ CALLBACK REF — ET NON `ref={listeRef}` + useEffect
  // ══════════════════════════════════════════════════════════════════════════
  // TROIS CORRECTIFS DE TIMING ONT ECHOUE ICI avant celui-ci : deps `[]`, puis
  // un `requestAnimationFrame`, puis un ResizeObserver dans un effet. Les trois
  // butaient sur le MEME garde `if (!el) return`, et la mesure l'a prouve :
  //     majAppels 2 · majRef "NULL" · bornes absente
  // `majBornes` etait bien appelee — mais TOUJOURS avec une ref nulle.
  //
  // LA CAUSE N'ETAIT PAS LE MOMENT DE LA MESURE, C'ETAIT LE MOMENT OU LE NŒUD
  // EXISTE. Pendant le chargement Supabase, `selection` est vide et le
  // composant rend `null` : aucun `.une-semaine-liste` n'est monte, la ref
  // reste nulle, et l'effet ne se rejoue plus ensuite.
  //
  // ⚠ LE DEPOT AVAIT DEJA RESOLU CE PROBLEME, dans `useScrollAnimation.js`
  //   importe deux lignes plus haut : « Robuste face aux montages tardifs :
  //   utilise une callback ref plutot qu'un objet ref. React appelle la
  //   callback avec le nœud DES QU'IL EST MONTE (et avec null au demontage),
  //   donc l'observer s'attache correctement meme si l'element n'existe pas au
  //   premier render (cas des composants async a early-return, ex. data
  //   Supabase pas encore chargee). » C'est notre cas, mot pour mot.
  //
  // ⚠ On observe AUSSI les cartes : la liste est un element de grille, sa
  //   boite ne change pas quand les cartes arrivent — seul son contenu change.
  const roRef = useRef(null);
  const attacherListe = useCallback((node) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    listeRef.current = node;
    if (!node) return;               // demontage : rien a observer

    // ⚠ OUVERTURE SUR LA CARTE DU MILIEU, UNE SEULE FOIS. Au repos, `scrollLeft`
    //   vaut 0 : la premiere carte serait centree et TOUTE la reserve laterale
    //   gauche resterait vide — sur une section pleine largeur, une demi-page
    //   blanche. En partant du milieu, les deux cotes sont peuples et les cinq
    //   cartes de front de la DA apparaissent des l'arrivee.
    //   ⚠ Sans `behavior`, donc instantane : un defilement anime au chargement
    //   se lirait comme un mouvement parasite.
    if (ouvrirAuMilieu && !ouvertureFaite.current && node.children.length > 2) {
      const milieu = node.children[Math.floor(node.children.length / 2)];
      const b = node.getBoundingClientRect();
      const m = milieu.getBoundingClientRect();
      node.scrollLeft += m.left + m.width / 2 - (b.left + b.width / 2);
      ouvertureFaite.current = true;
    }
    majBornes();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(majBornes);
    ro.observe(node);
    for (const enfant of node.children) ro.observe(enfant);
    roRef.current = ro;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defiler = (sens) => {
    const el = listeRef.current;
    const pas = pasCarte();
    if (!el || !pas) return;
    // ⚠ Le defilement doux devient instantane pour qui refuse les animations —
    //   meme regle que le reste de la section.
    const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: sens * pas, behavior: doux ? "smooth" : "auto" });
  };

  const surDefilement = () => {
    // ⚠ `scroll` tire a chaque frame : sans cet etranglement, on poserait un
    //   setState par evenement pendant tout le geste.
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      majBornes();   // pose les bornes ET la carte centree
    });
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  return { attacherListe, surDefilement, defiler, bornes, centre };
}
