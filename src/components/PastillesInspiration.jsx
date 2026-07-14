import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChateaux } from "../hooks/useChateaux";
import { getSieclesDisponibles } from "../utils/siecles";
import Modale from "./Modale";
import "../styles/inspiration.css";

// Section "Besoin d'inspiration" (bas du hero, sous la barre de recherche).
// Ordre DA : Siecle | Histoire des lieux | Distance de chez vous | Espace detente.
//   - Siecle : FONCTIONNEL (options derivees getSieclesDisponibles) -> au choix,
//     route vers /resultats?siecle (meme convention qu'avant, nouveau point d'entree).
//   - Les 3 autres : placeholders desactives (donnees pas encore structurees).

const PLACEHOLDERS = [
  { cle: "histoire", label: "Histoire des lieux" },
  { cle: "distance", label: "Distance de chez vous" },
  { cle: "detente", label: "Espace détente" },
];

export default function PastillesInspiration() {
  const { chateaux } = useChateaux();
  const navigate = useNavigate();
  const [siecleOuvert, setSiecleOuvert] = useState(false);
  const siecles = getSieclesDisponibles(chateaux);

  const choisirSiecle = (s) => {
    setSiecleOuvert(false);
    navigate(`/resultats?siecle=${encodeURIComponent(s)}`);
  };

  return (
    <section className="insp">
      <div className="insp-inner">
        <span className="insp-eyebrow">Besoin d'inspiration</span>
        <div className="insp-pastilles">
          <button
            type="button"
            className="insp-pastille"
            onClick={() => setSiecleOuvert(true)}
            aria-haspopup="dialog"
          >
            <span className="insp-pastille-ico" aria-hidden="true">⌛</span>
            <span className="insp-pastille-label">Siècle</span>
          </button>

          {PLACEHOLDERS.map((p) => (
            <button
              type="button"
              key={p.cle}
              className="insp-pastille insp-pastille--bientot"
              disabled
              aria-disabled="true"
            >
              <span className="insp-pastille-label">{p.label}</span>
              <span className="insp-pastille-bientot">Bientôt</span>
            </button>
          ))}
        </div>
      </div>

      {/* MODALE SIECLE — options derivees des donnees. */}
      <Modale ouvert={siecleOuvert} onClose={() => setSiecleOuvert(false)} titre="Siècle" largeur={480}>
        <p className="insp-modale-sous">Choisissez l'époque du château.</p>
        <div className="insp-modale-pastilles">
          {siecles.map((s) => (
            <button
              key={s}
              type="button"
              className="insp-siecle-choix"
              onClick={() => choisirSiecle(s)}
            >
              {s}
            </button>
          ))}
          {siecles.length === 0 && (
            <span className="insp-modale-vide">Aucun siècle à proposer pour l'instant.</span>
          )}
        </div>
      </Modale>
    </section>
  );
}
