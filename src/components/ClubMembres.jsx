import { useState } from "react";
import { chateaux } from "../data/chateaux";
import TransitionPorte from "./TransitionPorte";
import VitrineClub from "./VitrineClub";
import "../styles/club-membres.css";

function getDatesPossibles() {
  const today = new Date();
  const dates = [];
  for (let i = 0; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDate(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function joursAvant(d) {
  return Math.round((d - new Date()) / (1000 * 60 * 60 * 24));
}

const PACKAGES_CHATEAU = {
  1: ["Séjour 2 nuits avec dîner gastronomique", "Visite privée du domaine & potager", "Accès illimité au spa"],
  2: ["Week-end chevalerie — visite guidée privée", "Nuit en chambre tour médiévale", "Petit-déjeuner médiéval servi en chambre"],
  3: ["Entrée VIP aux grandes écuries", "Visite privée des collections art", "Dîner au bord du lac — service exclusif"],
  4: ["Séjour littéraire — chambre Napoléon", "Accès privé aux appartements royaux", "Pique-nique dans les jardins à la française"],
  5: ["Week-end du roi René — immersion solognote", "Balade à cheval dans la forêt", "Table d'hôtes avec les propriétaires"],
  6: ["Séjour vigneron — dégustation privée en cave", "Visite du vignoble avec l'oenologue", "Dîner accord mets & vins maison"],
  7: ["Table d'hôtes familiale aux chandelles chaque soir", "Promenade à cheval dans le parc de 50 ha", "Accès piscine & jardins de lavande"],
  8: ["Nuit en Suite du Donjon (XIIIème siècle)", "Visite guidée privée des douves & tourelles", "Petit-déjeuner servi dans la cour médiévale"],
};

export default function ClubMembres({ user, onClose }) {
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [dateArrivee, setDateArrivee] = useState(null);
  const [dateDepart, setDateDepart] = useState(null);
  const [etape, setEtape] = useState("arrivee");
  const [calVisible, setCalVisible] = useState(false);

  const numeroMembre = user?.id || Math.floor(Math.random() * 9000 + 1000);
  const dates = getDatesPossibles();

  const handleDate = (d) => {
    if (etape === "arrivee") {
      setDateArrivee(d); setDateDepart(null); setEtape("depart");
    } else {
      if (d > dateArrivee) { setDateDepart(d); setEtape("done"); setCalVisible(false); }
      else { setDateArrivee(d); setDateDepart(null); setEtape("depart"); }
    }
  };

  const isArrivee = (d) => dateArrivee && d.toDateString() === dateArrivee.toDateString();
  const isDepart = (d) => dateDepart && d.toDateString() === dateDepart.toDateString();
  const isBetween = (d) => dateArrivee && dateDepart && d > dateArrivee && d < dateDepart;

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
          <div className="cm-header-membre">
            <span className="cm-header-user">{user?.prenom || user?.email?.split("@")[0]}</span>
            <span className="cm-header-num">N° {String(numeroMembre).padStart(4, "0")}</span>
          </div>
          <button className="cm-header-fermer" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="cm-hero">
        <div className="cm-hero-inner">
          <div className="cm-orn"><span className="cm-orn-trait"/><span className="cm-orn-lys">&#x269C;</span><span className="cm-orn-trait"/></div>
          <h1 className="cm-hero-titre">Vos offres exclusives</h1>
          <p className="cm-hero-accroche">
            Des séjours et packages conçus pour les membres du Club —
            tarifs confidentiels, avant-premières et expériences sur mesure.
          </p>
        </div>
      </div>

      {/* Sélecteur de dates */}
      <div className="cm-dates-section">
        <div className="cm-dates-bar">
          <div className="cm-dates-label">Vos dates de séjour</div>
          <div className="cm-dates-etapes">
            <div className={"cm-date-etape " + (etape === "arrivee" ? "actif" : dateArrivee ? "done" : "")}
              onClick={() => { setEtape("arrivee"); setCalVisible(true); }}>
              <span className="cm-date-ico">&#x25c6;</span>
              <div>
                <span className="cm-date-label">Arrivée</span>
                <span className="cm-date-val">{dateArrivee ? formatDate(dateArrivee) : "Choisir"}</span>
              </div>
            </div>
            <span className="cm-dates-fleche">→</span>
            <div className={"cm-date-etape " + (etape === "depart" ? "actif" : dateDepart ? "done" : "")}
              onClick={() => { if (dateArrivee) { setEtape("depart"); setCalVisible(true); } }}>
              <span className="cm-date-ico">&#x25c6;</span>
              <div>
                <span className="cm-date-label">Départ</span>
                <span className="cm-date-val">{dateDepart ? formatDate(dateDepart) : "Choisir"}</span>
              </div>
            </div>
            {dateArrivee && (
              <button className="cm-dates-reset" onClick={() => { setDateArrivee(null); setDateDepart(null); setEtape("arrivee"); }}>
                &#x2715; Effacer
              </button>
            )}
          </div>
          {dateArrivee && dateDepart && (
            <div className="cm-dates-result">
              Du <strong>{formatDate(dateArrivee)}</strong> au <strong>{formatDate(dateDepart)}</strong>
              {" "}— <strong>{Math.round((dateDepart - dateArrivee)/(1000*60*60*24))}</strong> nuit{Math.round((dateDepart - dateArrivee)/(1000*60*60*24)) > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {calVisible && (
          <div className="cm-cal-wrap">
            <div className="cm-cal-titre">
              {etape === "arrivee" ? "Sélectionnez votre date d’arrivée" : "Sélectionnez votre date de départ"}
            </div>
            <div className="cm-cal">
              {dates.map((d, i) => (
                <button key={i}
                  className={"cm-cal-jour" + (isArrivee(d) ? " arrivee" : "") + (isDepart(d) ? " depart" : "") + (isBetween(d) ? " between" : "")}
                  onClick={() => handleDate(d)}>
                  <span className="cm-cal-nom">{d.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                  <span className="cm-cal-num">{d.toLocaleDateString("fr-FR", { day: "numeric" })}</span>
                  <span className="cm-cal-mois">{d.toLocaleDateString("fr-FR", { month: "short" })}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Liste châteaux — 1 par ligne */}
      <div className="cm-liste">
        {chateaux.map(c => {
          const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1 - (c.reduction || 0) / 100)) : c.prix;
          const packages = PACKAGES_CHATEAU[c.id] || ["Séjour prestige avec petit-déjeuner", "Visite privée du domaine", "Accès aux jardins"];
          return (
            <div key={c.id} className="cm-ligne">
              <div className="cm-ligne-img" style={{ backgroundImage: `url(${c.images?.[0]})` }}>
                <div className="cm-ligne-img-overlay" />
                {c.reduction && <span className="cm-ligne-promo">−{c.reduction} %</span>}
              </div>
              <div className="cm-ligne-corps">
                <div className="cm-ligne-top">
                  <div>
                    <span className="cm-ligne-region">{c.region} · {c.distanceParis}</span>
                    <h3 className="cm-ligne-nom">{c.nom}</h3>
                    <p className="cm-ligne-accroche">{c.accroche}</p>
                  </div>
                  <div className="cm-ligne-prix-bloc">
                    <span className="cm-ligne-eyebrow">Tarif membres</span>
                    {c.prixBarre && <span className="cm-ligne-barre">{c.prixBarre} €</span>}
                    <span className="cm-ligne-final">{prixFinal} €</span>
                    <span className="cm-ligne-nuit">/ nuit</span>
                  </div>
                </div>
                <div className="cm-ligne-sep" />
                <div className="cm-ligne-packages">
                  <span className="cm-ligne-pkg-titre">&#x269C; Packages inclus</span>
                  <div className="cm-ligne-pkg-liste">
                    {packages.map((p, i) => (
                      <span key={i} className="cm-ligne-pkg">✦ {p}</span>
                    ))}
                  </div>
                </div>
                <button className="cm-ligne-cta" onClick={() => setTransitionChateau(c)}>
                  Découvrir ce séjour →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau}
          onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <VitrineClub chateau={transitionChateau || chateauSelectionne} user={user}
          onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </div>
  );
}
