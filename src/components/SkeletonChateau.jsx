/**
 * SkeletonChateau — composant placeholder de chargement
 *
 * Utilise pendant le loading des hooks data (Phase 2.3 async-ready).
 * Mime la structure d'une carte chateau (image + nom + region + prix)
 * avec une animation pulse douce coherente avec le design patrimonial.
 *
 * Phase 2.3 (5 mai 2026) - C8
 */

import "../styles/skeleton-chateau.css";

export default function SkeletonChateau({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sk-chateau-card">
          <div className="sk-chateau-img" />
          <div className="sk-chateau-content">
            <div className="sk-chateau-line sk-line-nom" />
            <div className="sk-chateau-line sk-line-region" />
            <div className="sk-chateau-line sk-line-prix" />
          </div>
        </div>
      ))}
    </>
  );
}
