import { useState } from "react";
import { chateaux } from "../data/chateaux";
import TransitionPorte from "./TransitionPorte";
import VitrineClub from "./VitrineClub";
import "../styles/club-membres.css";

export default function ClubMembres({ user, onClose }) {
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [filtreRegion, setFiltreRegion] = useState("tous");

  const regions = ["tous", ...new Set(chateaux.map(c => c.region))];
  const chateauxFiltres = filtreRegion === "tous" ? chateaux : chateaux.filter(c => c.region === filtreRegion);

  return (
    <div className="cm-overlay">
      <header className="cm-header">
        <div className="cm-header-gauche">
          <span className="cm-header-lys">&#x269C;</span>
          <div>
            <span className="cm-header-titre">Club des Châtelains</span>
            <span className="cm-header-sub">Offres exclusives membres</span>
          </div>
        </div>
        <div className="cm-header-droite">
          <span className="cm-header-user">
            {user?.prenom || user?.email?.split("@")[0]}
          </span>
          <button className="cm-header-fermer" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="cm-hero">
        <div className="cm-hero-inner">
          <div className="cm-orn">
            <span className="cm-orn-trait"/><span className="cm-orn-lys">&#x269C;</span><span className="cm-orn-trait"/>
          </div>
          <h1 className="cm-hero-titre">Vos offres exclusives</h1>
          <p className="cm-hero-accroche">
            Des séjours conçus pour les membres du Club — packages, avant-premières
            et tarifs confidentiels que les propriétaires ne publient nulle part ailleurs.
          </p>
        </div>
      </div>

      <div className="cm-corps">
        <div className="cm-filtres">
          {regions.map(r => (
            <button key={r} className={"cm-filtre " + (filtreRegion === r ? "actif" : "")}
              onClick={() => setFiltreRegion(r)}>
              {r === "tous" ? "Toutes les régions" : r}
            </button>
          ))}
        </div>

        <div className="cm-grille">
          {chateauxFiltres.map(c => {
            const prixFinal = c.prixBarre
              ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100))
              : c.prix;
            const reduction = c.reduction || Math.floor(Math.random() * 15 + 10);

            return (
              <div key={c.id} className="cm-carte" onClick={() => setTransitionChateau(c)}>
                <div className="cm-carte-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                  <div className="cm-carte-overlay" />
                  <div className="cm-carte-badges">
                    <span className="cm-badge-club">&#x269C; Exclusif membres</span>
                    {c.reduction && <span className="cm-badge-promo">−{c.reduction} %</span>}
                  </div>
                  {c.urgence && (
                    <span className={"cm-urgence cm-urgence--" + (c.urgence === "J-7" ? "j7" : c.urgence === "J-10" ? "j10" : "j15")}>
                      {c.urgence}
                    </span>
                  )}
                </div>
                <div className="cm-carte-corps">
                  <div className="cm-carte-region">{c.region} · {c.distanceParis}</div>
                  <h3 className="cm-carte-nom">{c.nom}</h3>
                  <p className="cm-carte-accroche">{c.accroche}</p>
                  <div className="cm-carte-pied">
                    <div className="cm-prix">
                      {c.prixBarre && <span className="cm-prix-barre">{c.prixBarre} €</span>}
                      <span className="cm-prix-final">{prixFinal} €</span>
                      <span className="cm-prix-nuit">/ nuit</span>
                    </div>
                    <span className="cm-cta">Découvrir →</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau}
          onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <VitrineClub
          chateau={transitionChateau || chateauSelectionne}
          user={user}
          onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }}
        />
      )}
    </div>
  );
}
