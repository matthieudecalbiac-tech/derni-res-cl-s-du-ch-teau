import { useMemo } from "react";
import { useChateaux } from "../hooks/useChateaux";
import { useCarrousel } from "../hooks/useCarrousel";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import "../styles/heure-aux-demeures.css";

export default function HeureAuxDemeures({ onOuvrirChateau, onVoirTout }) {
  const { chateaux } = useChateaux();
  const [ref, visible] = useScrollAnimation(0.15);

  // ⚠ LA PLOMBERIE ETAIT ICI EN DOUBLE — elle vit desormais dans
  //   `useCarrousel`, partagee avec « Les cles a la une ». La dette nommee du
  //   24 aout est remboursee : plus de regle « toute correction dans l'une doit
  //   etre reportee dans l'autre ».
  //
  // ⚠ `ouvrirAuMilieu` EST LE SEUL PARAMETRE, et il porte le seul ecart de
  //   comportement qui existait entre les deux sections. Ici il vaut `true` :
  //   la section est PLEINE LARGEUR, sa reserve laterale est large, et au repos
  //   `scrollLeft` vaut 0 — la premiere carte serait centree et toute la
  //   moitie gauche resterait vide. En partant du milieu, les deux cotes sont
  //   peuples et les cinq cartes de front de la DA apparaissent des l'arrivee.
  const { attacherListe, surDefilement, defiler, bornes, centre } = useCarrousel({ ouvrirAuMilieu: true });
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
