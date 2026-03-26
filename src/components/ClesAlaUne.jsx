import { useState } from "react";
import VitrineDernieresCle from "./VitrineDernieresCle";
import TransitionPorte from "./TransitionPorte";

import { chateaux } from "../data/chateaux";
import "../styles/cles-une.css";

const CHATEAUX_UNE = chateaux.slice(0, 4);

export default function ClesAlaUne({ onSelectChateau }) {
  const [hover, setHover] = useState(null);
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [chateauSelectionne, setChateauSelectionne] = useState(null);

  return (
    <section className="cles-une-section" id="offres">
      {/* Motif lys */}
      <div className="cles-lys-pattern">
        <svg width="100%" height="100%">
          <rect width="100%" height="100%" fill="url(#lys-pattern)" />
        </svg>
      </div>

      <div className="cles-une-inner">
        {/* En-tête éditorial */}
        <div className="cles-une-entete">
          <div className="cles-une-entete-ligne">
            <div className="cles-une-ornement">
              <span className="cles-une-trait" />
              <span className="cles-une-lys">⚜</span>
              <span className="cles-une-trait" />
            </div>
            <span className="cles-une-sur-titre">
              Sélection · Cette semaine · Dernière minute
            </span>
            <div className="cles-une-ornement">
              <span className="cles-une-trait" />
              <span className="cles-une-lys">⚜</span>
              <span className="cles-une-trait" />
            </div>
          </div>
          <h2 className="cles-une-titre">Les Dernières Clés à la Une</h2>
          <p className="cles-une-sous-titre">
            Quatre demeures d'exception sélectionnées cette semaine — à saisir
            avant qu'elles ne ferment leurs portes
          </p>
        </div>

        {/* Grille 2x2 */}
        <div className="cles-une-grille">
          {CHATEAUX_UNE.map((c, i) => {
            const classBande =
              { "J-7": "j7", "J-10": "j10", "J-15": "j15" }[c.urgence] || "j15";
            const classBadge =
              { "J-7": "badge-j7", "J-10": "badge-j10", "J-15": "badge-j15" }[
                c.urgence
              ] || "badge-j15";
            const estHover = hover === c.id;

            return (
              <article
                key={c.id}
                className={`cle-carte ${estHover ? "hover" : ""}`}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setTransitionChateau(c)}
              >
                {/* Cadre décoratif */}
                <div className="cle-cadre-tl" />
                <div className="cle-cadre-tr" />
                <div className="cle-cadre-bl" />
                <div className="cle-cadre-br" />

                {/* Bande urgence */}
                <div className={`cle-urgence-bande ${classBande}`} />

                {/* Photo */}
                <div className="cle-photo-wrapper">
                  <img
                    src={c.image}
                    alt={c.nom}
                    className="cle-photo"
                    loading="lazy"
                  />
                  <div className="cle-photo-overlay" />

                  {/* Badges flottants */}
                  <div className="cle-badges-top">
                    <span className={`badge-urgence ${classBadge}`}>
                      ◆ {c.urgence}
                    </span>
                    <span className="cle-reduction">−{c.reduction}%</span>
                  </div>

                  {/* Numéro éditorial */}
                  <span className="cle-numero">0{i + 1}</span>
                </div>

                {/* Contenu */}
                <div className="cle-contenu">
                  <div className="cle-meta">
                    <span className="cle-region">{c.region}</span>
                    <span className="cle-distance">{c.distanceParis}</span>
                  </div>

                  <h3 className="cle-nom">{c.nom}</h3>

                  <p className="cle-style">
                    {c.style} · {c.siecle}
                  </p>

                  <div className="cle-separateur" />

                  <p className="cle-accroche">{c.accroche}</p>

                  <div className="cle-tags">
                    {c.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="cle-tag">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="cle-pied">
                    <div className="cle-prix-bloc">
                      <span className="cle-prix-barre">{c.prixBarre} €</span>
                      <div className="cle-prix-ligne">
                        <span className="cle-prix">{c.prix} €</span>
                        <span className="cle-prix-nuit">/ nuit</span>
                      </div>
                    </div>
                    <button className="cle-cta">
                      <span>Découvrir</span>
                      <span className="cle-cta-fleche">→</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <VitrineDernieresCle chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </section>
  );
}
