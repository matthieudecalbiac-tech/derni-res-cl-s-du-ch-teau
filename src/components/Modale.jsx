import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "../styles/modale.css";

// Primitif modale plein ecran. Monte via portal sur document.body pour
// echapper a tout containing block (ex: .barre-recherche a un transform en
// animation forwards qui piegerait un enfant position:fixed). Fournit :
// overlay assombri, scroll-lock, fermeture Escape + clic sur le fond, et
// piege a focus (focus initial dans le panneau, Tab cycle a l'interieur,
// focus restaure a la fermeture).
// Perimetre : nouveau primitif, non impose aux 8 modales maison existantes.
export default function Modale({ ouvert, onClose, titre, children, largeur = 560 }) {
  const panneauRef = useRef(null);
  // onClose via ref : l'effet ne depend que de `ouvert` -> il ne se re-arme
  // pas a chaque rendu du parent (sinon un input dans une modale volerait son
  // propre focus a chaque frappe). Cf. modales de BarreRecherche.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!ouvert) return;
    const restaurer = document.activeElement;
    document.body.style.overflow = "hidden";

    const SELECTEUR =
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';
    const focusables = () =>
      Array.from(panneauRef.current?.querySelectorAll(SELECTEUR) || [])
        .filter((el) => el.offsetParent !== null);

    // Focus initial dans la modale.
    (focusables()[0] || panneauRef.current)?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") { onCloseRef.current(); return; }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) { e.preventDefault(); return; }
      const premier = els[0];
      const dernier = els[els.length - 1];
      const actif = document.activeElement;
      if (e.shiftKey && (actif === premier || !panneauRef.current.contains(actif))) {
        e.preventDefault(); dernier.focus();
      } else if (!e.shiftKey && actif === dernier) {
        e.preventDefault(); premier.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      if (restaurer instanceof HTMLElement) restaurer.focus();
    };
  }, [ouvert]);

  if (!ouvert) return null;

  return createPortal(
    <div className="mdl-overlay" onMouseDown={onClose}>
      <div
        className="mdl-panneau"
        ref={panneauRef}
        style={{ maxWidth: largeur }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titre || undefined}
        tabIndex={-1}
      >
        <button className="mdl-close" onClick={onClose} aria-label="Fermer">✕</button>
        {titre && (
          <div className="mdl-entete">
            <img src="/FDL-transparent.png" alt="" className="mdl-entete-logo" />
            <span className="mdl-entete-titre">{titre}</span>
          </div>
        )}
        <div className="mdl-corps">{children}</div>
      </div>
    </div>,
    document.body
  );
}
