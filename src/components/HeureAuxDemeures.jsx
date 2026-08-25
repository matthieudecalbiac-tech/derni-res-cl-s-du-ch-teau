import { useCallback, useMemo, useRef, useState } from "react";
import { useChateaux } from "../hooks/useChateaux";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import "../styles/heure-aux-demeures.css";

export default function HeureAuxDemeures({ onOuvrirChateau, onVoirTout }) {
  const { chateaux } = useChateaux();
  const [ref, visible] = useScrollAnimation(0.15);

  // ══════════════════════════════════════════════════════════════════════════
  // LA PLOMBERIE DU CARROUSEL — copiee de « Les cles a la une »
  // ══════════════════════════════════════════════════════════════════════════
  // ⚠ DUPLICATION TEMPORAIRE ET ASSUMEE (voie c, 24 aout). On ne rouvre pas une
  //   section validee a l'ecran pour la partager sous pression : l'extraction
  //   d'un carrousel commun est le CHANTIER SUIVANT, mene a froid avec DEUX
  //   references qui marchent. ⚠ Dette NOMMEE — cf. CLAUDE.md. Toute
  //   correction faite ici doit etre reportee dans UneDeLaSemaine, et
  //   reciproquement, jusqu'a l'extraction.
  const listeRef = useRef(null);
  const roRef = useRef(null);
  const rafRef = useRef(0);
  const ouvertureFaite = useRef(false);
  const [bornes, setBornes] = useState({ debut: true, fin: true });
  const [centre, setCentre] = useState(0);

  // ⚠ Mesure dans le DOM, jamais en dur : `--carte` est en vw, elle change a
  //   chaque redimensionnement.
  const pasCarte = () => {
    const el = listeRef.current;
    const premier = el?.children?.[0];
    if (!el || !premier) return 0;
    const gouttiere = parseFloat(getComputedStyle(el).columnGap) || 0;
    return premier.getBoundingClientRect().width + gouttiere;
  };

  // ⚠ RECTANGLES ECRAN, jamais `offsetLeft` contre `scrollLeft` : ce sont deux
  //   espaces de coordonnees differents des lors que la liste n'est pas
  //   positionnee — le focus resterait fige sur la meme carte.
  const majCentre = () => {
    const el = listeRef.current;
    if (!el) return;
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
    // Tolerance d'1 px : `scrollLeft` est fractionnaire (zoom, DPI).
    setBornes({ debut: el.scrollLeft <= 1, fin: max <= 1 || el.scrollLeft >= max - 1 });
  };

  const defiler = (sens) => {
    const el = listeRef.current;
    const pas = pasCarte();
    if (!el || !pas) return;
    const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: sens * pas, behavior: doux ? "smooth" : "auto" });
  };

  const surDefilement = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      majBornes();
    });
  };

  // ⚠⚠ CALLBACK REF, ET NON `ref={listeRef}` + useEffect. Meme cause qu'a la
  //   section 3 : pendant le chargement Supabase, `demeures` est vide et le
  //   composant rend `null` — aucun nœud n'est monte, une ref d'objet resterait
  //   nulle, et l'effet ne se rejouerait pas. Trois correctifs de timing y ont
  //   echoue avant qu'on ne mesure. React appelle CETTE callback des que le
  //   nœud existe. Patron deja ecrit dans `useScrollAnimation.js`.
  const attacherListe = useCallback((node) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    listeRef.current = node;
    if (!node) return;

    // ⚠ OUVERTURE SUR LA CARTE DU MILIEU, UNE SEULE FOIS. Au repos, `scrollLeft`
    //   vaut 0 : la premiere carte serait centree et TOUTE la reserve laterale
    //   gauche resterait vide — sur une section pleine largeur, une demi-page
    //   blanche. En partant du milieu, les deux cotes sont peuples et les cinq
    //   cartes de front de la DA apparaissent des l'arrivee.
    //   ⚠ Sans `behavior`, donc instantane : un defilement anime au chargement
    //   se lirait comme un mouvement parasite.
    if (!ouvertureFaite.current && node.children.length > 2) {
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
  // Débranché de la liste SLUGS codée en dur : les publiés non-démo, triés par
  // ordreHome ascendant (null/undefined à la fin), puis par nom.
  const demeures = useMemo(
    () =>
      chateaux
        .filter((c) => !c.isDemoMock)
        .slice()
        .sort((a, b) => {
          const oa = a.ordreHome ?? Infinity;
          const ob = b.ordreHome ?? Infinity;
          if (oa !== ob) return oa - ob;
          return a.nom.localeCompare(b.nom);
        }),
    [chateaux]
  );
  if (demeures.length === 0) return null;

  // ⚠⚠ DEUX NIVEAUX, COMME « Les cles a la une ». L'ITEM porte la largeur, le
  //   point d'ancrage du snap et l'ENTREE (avec son delai par index) ; la CARTE
  //   est l'objet visuel, et c'est elle qui recevra le grossissement en 2b. La
  //   geometrie de l'item ne bougeant jamais, un `scale` sur la carte ne peut
  //   PAS deplacer un point de calage. Vrai par construction.
  //
  // ⚠ UNE SEULE ZONE CLIQUABLE, ET UN SEUL ARRET DE TABULATION. Le bouton
  //   « Voir la demeure » porte le geste ; son `::after` etendu (cf. la
  //   feuille) couvre toute la carte, si bien que la cible reste GRANDE sans
  //   qu'on empile deux elements interactifs. L'ancienne carte etait un
  //   <article onClick> — cliquable a la souris, invisible au clavier.
  //   ⚠ Le <h3> est ainsi PRESERVE : il ne pourrait pas vivre dans un <button>,
  //   qui n'accepte que du contenu de phrase.
  const renderCarte = (c, n) => (
    <div
      key={c.id}
      className={"da-item" + (n - 1 === centre ? " da-item--centre" : "")}
      style={{ transitionDelay: `${0.30 + (n - 1) * 0.07}s` }}
    >
      {/* ⚠ LA LYS VIT DANS L'ITEM, PAS DANS LA CARTE. La carte porte
          `overflow: hidden` (pour arrondir la photo) et le `scale` : a
          l'interieur, la lys serait ROGNEE et grandirait avec la carte. Dans
          l'item, elle flotte au-dessus, a taille constante.
          ⚠ Rendue en permanence, revelee par l'opacite : montee et demontee au
          fil du defilement, elle claquerait a chaque changement de focus.
          ⚠ Decorative — `aria-hidden` : un glyphe qui saute de carte en carte
          serait re-annonce sans arret. */}
      <span className="da-lys" aria-hidden="true">⚜</span>
      <article className="da-carte" data-slug={c.slug}>
        <div className="da-photo">
          {c.images?.[0] && <img src={c.images[0]} alt={c.nom} loading="lazy" />}
        </div>
        <div className="da-corps">
          <span className="da-num">{String(n).padStart(2, "0")}</span>
          <h3 className="da-nom">{c.nom}</h3>
          <p className="da-desc">{c.accroche}</p>
          <button type="button" className="da-lien" onClick={() => onOuvrirChateau?.(c)}>
            Voir la demeure <span aria-hidden="true">→</span>
          </button>
        </div>
      </article>
    </div>
  );

  return (
    <section className={"journal-demeures" + (visible ? " journal-demeures--visible" : "")} ref={ref}>
      <div className="da-wrap">

        <header className="da-tete">
          <h2 className="da-titre">Découvrez aussi</h2>
          <p className="da-intro">
            D'autres demeures d'exception à explorer, chacune porteuse d'une histoire unique.
          </p>
        </header>

        {/* ⚠ LA GRILLE A TROIS COLONNES A DISPARU, avec l'embleme central, le
            `row-reverse` de la colonne droite et le septieme medaillon isole en
            bas. La DA demande un carrousel : une seule liste, sept cartes. */}
        <div className="da-carrousel">
          {/* ⚠ HORS du conteneur defilant : dedans, elles defileraient avec les
              cartes. Et elles sont le SEUL moyen de piloter ce carrousel a la
              souris — `scrollbar-width: none` retire la barre, et la molette
              d'une souris classique defile VERTICALEMENT. */}
          <div className="da-fleches">
            <button
              type="button"
              className="da-fleche"
              aria-label="Voir les demeures précédentes"
              onClick={() => defiler(-1)}
              disabled={bornes.debut}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              className="da-fleche"
              aria-label="Voir les demeures suivantes"
              onClick={() => defiler(1)}
              disabled={bornes.fin}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>

          <div className="da-liste" ref={attacherListe} onScroll={surDefilement}>
            {demeures.map((c, i) => renderCarte(c, i + 1))}
          </div>

          {/* ⚠ LA PHRASE EST ECRITE POUR LE DESKTOP, ET C'EST DELIBERE. La DA
              disait « Faites glisser » — un geste TACTILE, or cette section est
              `display: none` sous 768 px : elle n'a pas de tactile. Un texte
              qui decrit un geste impossible ment au visiteur. Libelle
              provisoire, a revoir avec Tanguy.
              ⚠ LES SEPT POINTS ONT ETE RETIRES : ils faisaient DOUBLE EMPLOI
              avec les fleches — les deux disaient la position. La phrase, elle,
              INVITE : role different, donc elle reste. */}
          <div className="da-pied">
            <span className="da-invite">Parcourez les autres demeures</span>
          </div>
        </div>

        <div className="da-cta-wrap">
          <button
            type="button"
            className="da-cta"
            onClick={() => onVoirTout?.()}
          >
            Voir toutes les demeures →
          </button>
        </div>
      </div>
    </section>
  );
}
