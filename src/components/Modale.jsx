import { useEffect } from "react";
import { createPortal } from "react-dom";
import "../styles/modale.css";

// Primitif modale plein ecran. Monte via portal sur document.body pour
// echapper a tout containing block (ex: .barre-recherche a un transform en
// animation forwards qui piegerait un enfant position:fixed). Fournit :
// overlay assombri, scroll-lock, fermeture Escape + clic sur le fond.
// Perimetre : nouveau primitif, non impose aux 8 modales maison existantes.
export default function Modale({ ouvert, onClose, titre, children, largeur = 560 }) {
  useEffect(() => {
    if (!ouvert) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [ouvert, onClose]);

  if (!ouvert) return null;

  return createPortal(
    <div className="mdl-overlay" onMouseDown={onClose}>
      <div
        className="mdl-panneau"
        style={{ maxWidth: largeur }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titre || undefined}
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
