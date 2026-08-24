import { useCompteurs } from "../hooks/useCompteurs";
import { useScrollAnimation } from "../hooks/useScrollAnimation";
import { useNavigate } from "react-router-dom";
import { cheminAuth, NEXT_CLUB } from "../utils/cheminAuth";
import "../styles/bandeau-offres.css";

// ⚠ `onOuvrirDernieres` a ete RETIREE de la signature avec la carte qu'elle
//   servait. A restaurer en meme temps que le bloc en veille ci-dessous.
export default function BandeauOffres({ onOuvrirVitrines }) {
  const { compteurs, loading, error } = useCompteurs();
  const navigate = useNavigate();
  const [ref, visible] = useScrollAnimation(0.2);

  // ⚠ DEUX OFFRES DEPUIS LE PASSAGE DES DERNIERES CLES AU CLUB. La carte
  //   « Les Dernieres Cles » est EN VEILLE, pas supprimee — elles deviennent une
  //   offre reservee aux connectes, a l'interieur du Club. Pour reactiver :
  //   restaurer le bloc ci-dessous, renumeroter, et remettre « Trois » a
  //   l'exergue + repeat(3, 1fr) a la grille (cf. bandeau-offres.css).
  //
  //   { num: "01", icone: "/icon-cle.png", titre: "Les Dernières Clés",
  //     desc: "Les chambres ouvertes cette semaine, à court terme.",
  //     lien: "Les Dernières Clés du moment →",
  //     illustration: "/offre-dernieres.png", action: "dernieres" },
  const OFFRES = [
    {
      num: "01",
      icone: "/icon-demeure.png",
      titre: "Les Vitrines",
      desc: "Les demeures à réserver toute l'année, en direct avec les familles.",
      lien: "Découvrir les demeures →", // Audit Fondation J2 (P1-1) : « 31 demeures » retiré
      illustration: "/offre-vitrines.png",
      action: "vitrines",
    },
    {
      num: "02",
      icone: "/icon-couronne.png",
      titre: "Le Club des Châtelains",
      desc: "Les séjours confidentiels, réservés aux membres.",
      lien: "Devenir membre →",
      illustration: "/offre-club.png",
      action: "club",
    },
  ];

  const gererClic = (action) => {
    if (action === "vitrines") onOuvrirVitrines?.();
    else if (action === "club") navigate(cheminAuth("/inscription", NEXT_CLUB));
  };

  return (
    <section className={"bandeau-offres" + (visible ? " bandeau-offres--visible" : "")} ref={ref}>
      <div className="bandeau-offres-orne">
        <span className="bandeau-offres-orne-ligne bandeau-offres-orne-ligne--g" />
        {/* ⚠ « Deux » depuis le passage des Dernieres Cles au Club : l'exergue
            COMPTE les cartes rendues juste dessous. La laisser a « Trois »
            aurait fait mentir l'accueil sur sa propre grille. */}
        <span className="bandeau-offres-orne-texte">Deux façons de</span>
        <span className="bandeau-offres-orne-ligne bandeau-offres-orne-ligne--d" />
      </div>
      <h2 className="bandeau-offres-titre-section">Franchir le seuil</h2>

      <div className="bandeau-offres-grille">
        {OFFRES.map((o, i) => (
          <button
            key={o.num}
            type="button"
            /* ⚠ `--centre` RETIRE, PAS DEPLACE. Ce modificateur posait un fond
               or sur la cellule du MILIEU — a trois cartes, les Vitrines. A
               deux cartes il n'y a plus de milieu : le garder sur l'index 1
               aurait donne au CLUB une mise en avant que personne n'a decidee.
               A restaurer avec la troisieme carte, pas avant. */
            className="bandeau-offres-cellule"
            onClick={() => gererClic(o.action)}
            /* ⚠ CE DELAI EST CELUI DE L'APPARITION AU SCROLL, et il reste ICI,
               sur la cellule, inchange. Ne pas le deplacer sur le voile
               ci-dessous : c'est ce qui garantit que la cascade d'entree
               (0,25 s puis 0,40 s) survit a l'ajout du survol. */
            style={{ transitionDelay: `${0.25 + i * 0.15}s` }}
          >
            {/* ⚠⚠ UN VOILE INTERIEUR, ET CE N'EST PAS UN CAPRICE DE MARKUP.
                L'apparition au scroll anime `opacity` ET `transform` SUR LA
                CELLULE, en 0,85 s et avec un delai inline par index. Le survol
                veut animer LES MEMES DEUX PROPRIETES, en 0,4 s et SANS delai.
                Sur un seul element, les deux se disputeraient : le voisin
                s'estomperait en 0,85 s, avec 0,25 a 0,40 s de retard — un
                survol qui traine, sans que rien ne le signale.

                Deux elements, deux jeux de proprietes : la CELLULE garde
                l'entree, le VOILE porte le survol. Le conflit devient
                structurellement impossible, et la cascade n'a pas a etre
                reattribuee — elle n'a pas bouge. */}
            <span className="bandeau-offres-voile">
              <span className="bandeau-offres-num">{o.num}</span>
              <img className="bandeau-offres-illu" src={o.illustration} alt="" aria-hidden="true" />
              <img className="bandeau-offres-icone-img" src={o.icone} alt="" aria-hidden="true" />
              <h3 className="bandeau-offres-titre">{o.titre}</h3>
              <p className="bandeau-offres-desc">{o.desc}</p>
              <span className="bandeau-offres-lien">{o.lien}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
