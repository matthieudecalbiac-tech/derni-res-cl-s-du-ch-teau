import { useChateaux } from "../hooks/useChateaux";
import { useCarrousel } from "../hooks/useCarrousel";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import { derivePrix } from "../utils/derivePrix";
import "../styles/une-semaine.css";

export default function UneDeLaSemaine({ onOuvrirChateau, onVoirTout }) {
  const { chateaux, loading, error } = useChateaux();
  const [ref, visible] = useScrollAnimation(0.2);
  // ⚠ TOUTE LA PLOMBERIE DU CARROUSEL VIT DESORMAIS DANS `useCarrousel`, et
  //   elle y a ete DEPLACEE, pas reecrite : le hook contient le code que ce
  //   fichier portait, au caractere pres (equivalence verifiee par script).
  //   Ce qui reste ici est ce qui appartient a CETTE section : son markup, sa
  //   feuille, ses fleches, son badge.
  //
  // ⚠ SANS ARGUMENT : la section 3 ouvre sur la PREMIERE carte. L'ouverture au
  //   milieu est le seul parametre du hook, et il sert a « Decouvrez aussi »,
  //   dont la reserve laterale laisserait sinon une demi-page vide.
  const { attacherListe, surDefilement, defiler, bornes, centre } = useCarrousel();
  // Vedettes curatées par l’admin (champ « Ordre à la une »). Repli si aucune
  // n’a de rang : les publiés non-démo (4 premiers) — la section n’est jamais vide.
  // ⚠⚠ LE FILTRE **ET** LE TRI — l'un sans l'autre ne sert a rien. Avant le
  //   25 aout, `une_de_la_semaine` etait un booleen : il disait QUI etait a la
  //   une, jamais dans quel ORDRE, et les vedettes sortaient dans l'ordre du
  //   catalogue (est_la_une, puis nom). `ordre_une` porte desormais les deux.
  //   ⚠ Sans le `sort` ci-dessous, la migration livrerait des rangs que RIEN
  //   NE LIRAIT : les trois demeures s'afficheraient quand meme, dans le
  //   desordre, et aucune erreur ne le signalerait.
  //
  // ⚠ `!= null` et non un test de verite : le rang 0 est un entier valide que
  //   `if (c.ordreUne)` ecarterait silencieusement.
  //
  // ⚠ Le comparateur est celui d'`HeureAuxDemeures` — meme convention pour les
  //   deux sections. Le `?? Infinity` y est REDONDANT (le filtre a deja ecarte
  //   les null) et il est garde volontairement : il rend le tri independant du
  //   filtre, donc incassable si celui-ci change. Le departage par nom traite
  //   les rangs en double, TOLERES par la base — le formulaire admin edite un
  //   chateau a la fois et ne peut pas savoir qu'un autre porte deja ce rang.
  const vedettes = chateaux
    .filter((c) => c.ordreUne != null && !c.isDemoMock)
    .slice()
    .sort((a, b) => {
      const oa = a.ordreUne ?? Infinity;
      const ob = b.ordreUne ?? Infinity;
      if (oa !== ob) return oa - ob;
      return a.nom.localeCompare(b.nom);
    });
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
              <article className={"une-semaine-carte" + (i === centre ? " une-semaine-carte--centre" : "")}>
                {/* ⚠ LE BADGE SUIT LA CARTE CENTRALE, et il est DECORATIF.
                    `aria-hidden` n'est pas une precaution de style : un texte
                    qui saute d'une carte a l'autre a chaque defilement serait
                    re-annonce sans arret par un lecteur d'ecran. C'est un
                    signe visuel — l'information « selection » est deja portee
                    par l'eyebrow de la section, lu une seule fois.
                    ⚠ Rendu EN PERMANENCE, revele par l'opacite : monte et
                    demonte, il apparaitrait d'un coup au lieu de se fondre. */}
                <span className="une-semaine-badge" aria-hidden="true">Sélection</span>
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
              <span key={c.id} className={"une-semaine-point" + (i === centre ? " une-semaine-point--actif" : "")} />
            ))}
          </div>
        )}
        </div>
      </div>
    </section>
  );
}
