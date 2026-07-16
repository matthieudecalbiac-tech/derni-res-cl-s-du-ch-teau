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

// Icones line (currentColor -> or via .insp-pastille-ico), esprit DA.
const IcoSiecle = () => (
  <svg className="insp-pastille-ico" width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M5 3h8M5 15h8M6.5 3v2.5L9 9m2.5-6v2.5L9 9m0 0-2.5 3.5V15m2.5-6 2.5 3.5V15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoHistoire = () => (
  <svg className="insp-pastille-ico" width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 5c-1.2-1-3-1.4-5-1.4V13c2 0 3.8.4 5 1.4 1.2-1 3-1.4 5-1.4V3.6c-2 0-3.8.4-5 1.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M9 5v9.4" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);
const IcoDistance = () => (
  <svg className="insp-pastille-ico" width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 16s5-4.4 5-8.5a5 5 0 0 0-10 0C4 11.6 9 16 9 16Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="9" cy="7.5" r="1.7" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);
const IcoDetente = () => (
  <svg className="insp-pastille-ico" width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 14c-3 0-5.5-1.8-5.5-4C6 10 8 11.2 9 13c1-1.8 3-3 5.5-3 0 2.2-2.5 4-5.5 4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M9 12.5C9 9 8 7 9 4c1 3 0 5 0 8.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);

// Distance reste un placeholder (donnees pas encore structurees). Siecle,
// Histoire des lieux et Espace detente sont FONCTIONNELS (boutons dedies).
const PLACEHOLDERS = [
  { cle: "distance", label: "Distance de chez vous", Ico: IcoDistance },
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
            <IcoSiecle />
            <span className="insp-pastille-label">Siècle</span>
            <svg className="insp-pastille-chevron" width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3.5 5.5 7 9l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Histoire des lieux : FONCTIONNEL, route directe vers le catalogue. */}
          <button
            type="button"
            className="insp-pastille"
            onClick={() => navigate("/histoire")}
          >
            <IcoHistoire />
            <span className="insp-pastille-label">Histoire des lieux</span>
          </button>

          {PLACEHOLDERS.map(({ cle, label, Ico }) => (
            <button
              type="button"
              key={cle}
              className="insp-pastille insp-pastille--bientot"
              disabled
              aria-disabled="true"
            >
              <Ico />
              <span className="insp-pastille-label">{label}</span>
              <span className="insp-pastille-bientot">Bientôt</span>
            </button>
          ))}

          {/* Espace detente : FONCTIONNEL, valeur fixe -> route directe (pas de modale). */}
          <button
            type="button"
            className="insp-pastille"
            onClick={() => navigate("/resultats?categorie=bien_etre")}
          >
            <IcoDetente />
            <span className="insp-pastille-label">Espace détente</span>
          </button>
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
