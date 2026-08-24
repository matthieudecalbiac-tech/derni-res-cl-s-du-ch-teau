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
            style={{ transitionDelay: `${0.25 + i * 0.15}s` }}
          >
            <span className="bandeau-offres-num">{o.num}</span>
            <img className="bandeau-offres-illu" src={o.illustration} alt="" aria-hidden="true" />
            <img className="bandeau-offres-icone-img" src={o.icone} alt="" aria-hidden="true" />
            <h3 className="bandeau-offres-titre">{o.titre}</h3>
            <p className="bandeau-offres-desc">{o.desc}</p>
            <span className="bandeau-offres-lien">{o.lien}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
