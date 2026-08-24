import { useCallback, useEffect, useRef, useState } from "react";
import { useChateaux } from "../hooks/useChateaux";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import { derivePrix } from "../utils/derivePrix";
import "../styles/une-semaine.css";

export default function UneDeLaSemaine({ onOuvrirChateau, onVoirTout }) {
  const { chateaux, loading, error } = useChateaux();
  const [ref, visible] = useScrollAnimation(0.2);
  // Index de la carte au centre du carrousel MOBILE. Purement presentationnel :
  // il n'alimente que les points de pagination, masques au-dessus du seuil. En
  // desktop la liste est une colonne non defilable — le handler ne se declenche
  // jamais et l'etat reste a 0.
  const listeRef = useRef(null);
  const [actif, setActif] = useState(0);
  // ── LES FLECHES ───────────────────────────────────────────────────────────
  // ⚠ POURQUOI ELLES EXISTENT, ET CE N'EST PAS UN ORNEMENT. Le carrousel
  //   deborde bien (mesure : scrollWidth 869 contre clientWidth 645) et il est
  //   defilable — mais `scrollbar-width: none`, promu du mobile, lui retire la
  //   BARRE, et la molette d'une souris classique defile VERTICALEMENT. Au
  //   doigt et au trackpad tout marchait ; a la souris, la carte suivante etait
  //   INATTEIGNABLE. Les fleches sont ce moyen-la, et elles seules.
  const [bornes, setBornes] = useState({ debut: true, fin: true });
  const rafRef = useRef(0);

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

  const majBornes = () => {
    const el = listeRef.current;
    if (!el) return;
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
      majBornes();
      const el = listeRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const pas = el.scrollWidth / Math.max(1, el.children.length);
      setActif(Math.round(el.scrollLeft / pas));
    });
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  // Vedettes curatées par l'admin (case "Une de la semaine"). Fallback si aucune
  // n'est cochée : les publiés non-démo (4 premiers) — la section n'est jamais vide.
  const vedettes = chateaux.filter((c) => c.uneDeLaSemaine && !c.isDemoMock);
  const selection = vedettes.length > 0 ? vedettes : chateaux.filter((c) => !c.isDemoMock).slice(0, 4);

  if (selection.length === 0) return null;

  return (
    <section className={"une-semaine" + (visible ? " une-semaine--visible" : "")} ref={ref}>
      <div className="une-semaine-wrap">
        <aside className="une-semaine-intro">
          <img className="une-semaine-embleme" src="/embleme-horloge.png" alt="" aria-hidden="true" />
          <span className="une-semaine-eyebrow">Sélection d'exception</span>
          <h2 className="une-semaine-titre">Les clés<br />à la une</h2>
          <div className="une-semaine-intro-sep" />
          <p className="une-semaine-intro-txt">Des demeures d'exception, chacune porteuse d'une histoire, d'un art de vivre et d'émotions à partager.</p>
          <p className="une-semaine-intro-txt">Des lieux où le temps suspend son cours, pour des séjours et des expériences inoubliables.</p>
          {/* « Voir tout » : MOBILE UNIQUEMENT (une-semaine.css le masque
              au-dessus du seuil). Mene au catalogue complet. */}
          {/* ⚠ VISIBLE AUX DEUX TAILLES depuis la refonte (il etait mobile
              seulement). Il ne fait PAS doublon avec « Decouvrir la demeure »
              des cartes : deux niveaux distincts — une demeure, ou le
              catalogue entier.

              ⚠ DEUX LIBELLES, ET C'EST UNE CONTRAINTE DE PLACE, PAS UN CAPRICE.
              En mobile ce bouton vit dans la ligne d'en-tete, en colonne 2,
              avec `white-space: nowrap` : « Voir toutes les demeures » y
              ecraserait le titre. Le libelle long est celui de la DA ; le court
              ne sort qu'en dessous du seuil. */}
          {onVoirTout && (
            <button type="button" className="une-semaine-voirtout" onClick={onVoirTout}>
              <span className="une-semaine-voirtout-long">Voir toutes les demeures</span>
              <span className="une-semaine-voirtout-court">Voir tout</span>
              <span aria-hidden="true">→</span>
            </button>
          )}
        </aside>

        <div className="une-semaine-carrousel">
        {/* ⚠ EN HAUT A DROITE, comme la DA — et hors du conteneur defilant :
            dedans, elles auraient defile avec les cartes. */}
        <div className="une-semaine-fleches">
          <button
            type="button"
            className="une-semaine-fleche"
            aria-label="Voir les demeures precedentes"
            onClick={() => defiler(-1)}
            disabled={bornes.debut}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="une-semaine-fleche"
            aria-label="Voir les demeures suivantes"
            onClick={() => defiler(1)}
            disabled={bornes.fin}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="une-semaine-liste" ref={attacherListe} onScroll={surDefilement}>
          {selection.map((chateau, i) => {
            const prix = derivePrix(chateau);
            return (
              /* ⚠⚠ DEUX NIVEAUX, ET C'EST LA STRUCTURE QUI PORTE TOUT LE RESTE.
                 L'ITEM est la cible du defilement : c'est lui qui a une largeur,
                 une place dans le flux et le point d'ancrage du snap. Il porte
                 AUSSI l'entree au scroll (opacity + translateX + le delai inline
                 par index) — la cascade n'a donc pas change de nature, elle a
                 change d'element, a l'index pres.
                 La CARTE, elle, est l'objet visuel : c'est elle qui portera en
                 3b l'agrandissement de la carte centrale.

                 POURQUOI LES SEPARER. Meme conflit qu'a la section 1 : l'entree
                 anime `transform`, le focus veut `transform: scale()`. Sur un
                 seul element, le second ecraserait le premier — et le delai
                 inline s'appliquerait aussi au grossissement, qui trainerait.
                 ⚠ Et surtout : la geometrie de l'ITEM ne bouge jamais, donc le
                 `scale` de la carte ne peut PAS deplacer les points de snap.
                 C'est vrai par construction, pas par reglage. */
              <div
                key={chateau.id}
                className="une-semaine-item"
                style={{ transitionDelay: `${0.35 + i * 0.12}s` }}
              >
              <article className="une-semaine-carte">
                <div className="une-semaine-photo">
                  {chateau.images?.[0] && <img src={chateau.images[0]} alt={chateau.nom} loading="lazy" />}
                </div>
                <div className="une-semaine-infos">
                  <span className="une-semaine-meta">
                    {chateau.region} · {chateau.departement} · {chateau.siecle}
                  </span>
                  <h3 className="une-semaine-nom">{chateau.nom}</h3>
                  <p className="une-semaine-accroche">{chateau.accroche}</p>
                  <div className="une-semaine-filet" />
                  <div className="une-semaine-pied">
                    <div className="une-semaine-prix">
                      <span className="une-semaine-prix-prefix">À partir de</span>
                      <span className="une-semaine-prix-val">{prix} €</span>
                      <span className="une-semaine-prix-nuit">la nuit</span>
                    </div>
                    <button
                      type="button"
                      className="une-semaine-cta"
                      onClick={() => onOuvrirChateau?.(chateau)}
                    >
                      Découvrir la demeure →
                    </button>
                  </div>
                </div>
              </article>
              </div>
            );
          })}
        </div>

        {/* Points de pagination : MOBILE UNIQUEMENT. Indicateurs, pas des
            commandes — d'ou aria-hidden et l'absence de bouton : le carrousel se
            manipule au doigt, et le lecteur d'ecran parcourt les cartes
            elles-memes, qui sont deja dans le flux. */}
        {selection.length > 1 && (
          <div className="une-semaine-points" aria-hidden="true">
            {selection.map((c, i) => (
              <span key={c.id} className={"une-semaine-point" + (i === actif ? " une-semaine-point--actif" : "")} />
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
