import { useState } from "react";
import VitrineDernieresCle from "./VitrineDernieresCle";
import TransitionPorte from "./TransitionPorte";
import { chateaux } from "../data/chateaux";
import "../styles/cles-une.css";

const LAST_MINUTE = chateaux.filter(c => c.urgence).slice(0, 4);
const VITRINES = chateaux.slice(0, 6);
const CLUB = chateaux.slice(2, 6);

export default function ClesAlaUne({ onOuvrirClub }) {
  const [onglet, setOnglet] = useState("lastminute");
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [chateauSelectionne, setChateauSelectionne] = useState(null);

  const ouvrir = (c) => {
    if (onglet === "club") { onOuvrirClub?.(); return; }
    setTransitionChateau(c);
  };

  const liste = onglet === "lastminute" ? LAST_MINUTE : onglet === "vitrines" ? VITRINES : CLUB;

  return (
    <>
    <section className="cles-une-section" id="offres">
      <div className="cles-lys-pattern">
        <svg width="100%" height="100%">
          <rect width="100%" height="100%" fill="url(#lys-pattern)" />
        </svg>
      </div>

      <div className="cles-une-inner">

        {/* Titre éditorial */}
        <div className="cles-une-entete">
          <div className="cles-une-lys-grand">⚜</div>
          <h2 className="cles-une-titre">Les Châteaux</h2>
          <p className="cles-une-sous-titre">
            Sélectionnés pour leur histoire, leur famille, leur singularité
          </p>
          <p className="cles-une-modes-intro">
            Trois façons d'accéder aux demeures — <em>offres last-minute</em>, <em>vitrines permanentes</em> et <em>packages membres</em> réservés au Club des Châtelains.
          </p>
        </div>

        {/* Onglets */}
        <div className="cles-onglets">
          <button
            className={`cles-onglet ${onglet === "lastminute" ? "actif" : ""}`}
            onClick={() => setOnglet("lastminute")}
          >
            <span className="cles-onglet-ico">⏳</span>
            <div className="cles-onglet-textes">
              <span className="cles-onglet-titre">Dernières Clés</span>
              <span className="cles-onglet-desc">Offres last-minute · J−7 à J−15</span>
            </div>
          </button>
          <button
            className={`cles-onglet ${onglet === "vitrines" ? "actif" : ""}`}
            onClick={() => setOnglet("vitrines")}
          >
            <span className="cles-onglet-ico">⚜</span>
            <div className="cles-onglet-textes">
              <span className="cles-onglet-titre">Vitrines permanentes</span>
              <span className="cles-onglet-desc">Réservation immédiate · Chambres disponibles</span>
            </div>
          </button>
          <button
            className={`cles-onglet ${onglet === "club" ? "actif" : ""}`}
            onClick={() => setOnglet("club")}
          >
            <span className="cles-onglet-ico">🔐</span>
            <div className="cles-onglet-textes">
              <span className="cles-onglet-titre">Club des Châtelains</span>
              <span className="cles-onglet-desc">Offres exclusives · Membres uniquement</span>
            </div>
          </button>
        </div>

        {/* Grille */}
        <div className="cles-grille-onglet">
          {liste.map((c) => {
            const isClub = onglet === "club";
            const classBadge = { "J-7": "badge-j7", "J-10": "badge-j10", "J-15": "badge-j15" }[c.urgence] || "";
            return (
              <article
                key={c.id}
                className={`cle-ong-carte ${isClub ? "cle-ong-carte--club" : ""}`}
                onClick={() => ouvrir(c)}
              >
                {/* Photo */}
                <div className="cle-ong-photo">
                  <img src={c.images?.[0]} alt={c.nom} loading="lazy" />
                  <div className="cle-ong-photo-overlay" />
                  {onglet === "lastminute" && c.urgence && (
                    <span className={`cle-ong-urgence ${classBadge}`}>{c.urgence}</span>
                  )}
                  {isClub && (
                    <div className="cle-ong-club-lock">
                      <span>🔐</span>
                      <span>Membres uniquement</span>
                    </div>
                  )}
                </div>
                {/* Infos */}
                <div className="cle-ong-infos">
                  <span className="cle-ong-region">{c.region} · {c.departement}</span>
                  <h3 className="cle-ong-nom">{c.nom}</h3>
                  <p className="cle-ong-accroche">{c.accroche}</p>
                  <div className="cle-ong-pied">
                    {!isClub ? (
                      <>
                        <div className="cle-ong-prix">
                          {onglet === "lastminute" && <span className="cle-ong-prix-barre">{c.prixBarre} €</span>}
                          <span className="cle-ong-prix-val">{c.prix || c.prixBarre} €</span>
                          <span className="cle-ong-prix-nuit">/ nuit</span>
                        </div>
                        <span className="cle-ong-cta">Découvrir →</span>
                      </>
                    ) : (
                      <span className="cle-ong-cta cle-ong-cta--club">⚜ Accéder au Club →</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Club CTA */}
        {onglet === "club" && (
          <div className="cles-club-cta">
            <p>Ces offres sont réservées aux membres du Club des Châtelains.</p>
            <button className="cles-club-btn" onClick={onOuvrirClub}>
              <span>⚜</span> Rejoindre le Club gratuitement
            </button>
          </div>
        )}

      </div>
    </section>

    {transitionChateau && (
      <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
    )}
    {(transitionChateau || chateauSelectionne) && (
      <VitrineDernieresCle chateau={transitionChateau || chateauSelectionne} onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
    )}
    </>
  );
}
