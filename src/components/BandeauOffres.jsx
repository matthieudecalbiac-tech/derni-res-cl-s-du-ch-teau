import { useCompteurs } from "../hooks/useCompteurs";
import { useNavigate } from "react-router-dom";
import "../styles/bandeau-offres.css";

export default function BandeauOffres({ onOuvrirDernieres, onOuvrirVitrines }) {
  const { compteurs, loading, error } = useCompteurs();
  const navigate = useNavigate();

  const OFFRES = [
    {
      num: "01",
      icone: "/icon-cle.png",
      titre: "Les Dernières Clés",
      desc: "Les chambres ouvertes cette semaine, à court terme.",
      lien: "Les Dernières Clés du moment →",
      illustration: "/offre-dernieres.png",
      action: "dernieres",
    },
    {
      num: "02",
      icone: "/icon-demeure.png",
      titre: "Les Vitrines Permanentes",
      desc: "Les demeures à réserver toute l'année, en direct avec les familles.",
      lien: "Découvrir les demeures →", // Audit Fondation J2 (P1-1) : « 31 demeures » retiré
      illustration: "/offre-vitrines.png",
      action: "vitrines",
    },
    {
      num: "03",
      icone: "/icon-couronne.png",
      titre: "Le Club des Châtelains",
      desc: "Les séjours confidentiels, réservés aux membres.",
      lien: "Devenir membre →",
      illustration: "/offre-club.png",
      action: "club",
    },
  ];

  const gererClic = (action) => {
    if (action === "dernieres") onOuvrirDernieres?.();
    else if (action === "vitrines") onOuvrirVitrines?.();
    else if (action === "club") navigate("/inscription");
  };

  return (
    <section className="bandeau-offres">
      <div className="bandeau-offres-orne">
        <span className="bandeau-offres-orne-ligne bandeau-offres-orne-ligne--g" />
        <span className="bandeau-offres-orne-texte">Trois façons de</span>
        <span className="bandeau-offres-orne-ligne bandeau-offres-orne-ligne--d" />
      </div>
      <h2 className="bandeau-offres-titre-section">Franchir le seuil</h2>

      <div className="bandeau-offres-grille">
        {OFFRES.map((o, i) => (
          <button
            key={o.num}
            type="button"
            className={`bandeau-offres-cellule ${i === 1 ? "bandeau-offres-cellule--centre" : ""}`}
            onClick={() => gererClic(o.action)}
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
