import { useState } from "react";
import { chateaux } from "../data/chateaux";
import TransitionPorte from "./TransitionPorte";
import VitrineClub from "./VitrineClub";
import "../styles/club-membres.css";

function formatDate(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function getMoisCalendrier(annee, mois) {
  const premier = new Date(annee, mois, 1);
  const dernier = new Date(annee, mois + 1, 0);
  const jours = [];
  // Jours vides avant le 1er (lundi = 0)
  let jourSemaine = premier.getDay();
  if (jourSemaine === 0) jourSemaine = 7;
  for (let i = 1; i < jourSemaine; i++) jours.push(null);
  for (let d = 1; d <= dernier.getDate(); d++) jours.push(new Date(annee, mois, d));
  return jours;
}

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const JOURS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const PACKAGES_CHATEAU = {
  1: [
    "Package « Grand Siècle » — 2 nuits + dîner gastronomique aux chandelles dans les appartements privés",
    "Visite privée hors ouverture avec le directeur du domaine — réservée aux membres",
    "Champagne d’accueil & accès illimité aux jardins à la française"
  ],
  2: [
    "Package « Château Médiéval » — nuit en chambre tour + visite guidée privée des fortifications",
    "Dîner thématique chevalerie servi dans la grande salle voûtée",
    "Petit-déjeuner médiéval — pain maison, confitures artisanales, produits locaux"
  ],
  3: [
    "Package « Princes de Condé» — entrée VIP aux Grandes Écuries + spectacle équestre privé",
    "Visite privée des collections d’art avec conservateur — après fermeture",
    "Dîner exclusif au bord du lac des Cygnes — table dressée sur la terrasse privée"
  ],
  4: [
    "Package « Chambre Napoléon» — nuit dans les appartements historiques classés",
    "Accès privé aux galeries royales avant l’ouverture au public + guide dédié",
    "Pique-nique gastronomique dans les jardins à la française — paniers préparés par le chef"
  ],
  5: [
    "Package « Roi René» — immersion en Sologne + balade à cheval dans la forêt domaniale",
    "Table d’hôtes privée avec les propriétaires — cuisine du terroir, vins de Loire",
    "Accès libre aux étangs & forêts du domaine — vélos mis à disposition"
  ],
  6: [
    "Package « Vigneron» — dégustation privée en cave avec l’oenologue du domaine",
    "Visite guidée du vignoble à l’aube + petit-déjeuner dans les vignes",
    "Dîner accord mets & vins maison — sélection exclusive aux millésimes du château"
  ],
  7: [
    "Package « Famille de Valbray» — table d’hôtes aux chandelles avec François & Hedwige chaque soir",
    "Promenade à cheval dans le parc de 50 ha guidée par la famille propriétaire",
    "Accès piscine, jardins de lavande & potager — paniers de fruits du jardin offerts"
  ],
  8: [
    "Package « Suite du Donjon» — nuit dans la tour médiévale du XIIIème siècle, douves intégrales",
    "Visite guidée privée du château par Maïté de la Fresnaye — histoire familiale & architecture",
    "Petit-déjeuner servi dans la cour intérieure médiévale — produits normands sélectionnés"
  ],
};

export default function ClubMembres({ user, onClose }) {
  const [transitionChateau, setTransitionChateau] = useState(null);
  const [chateauSelectionne, setChateauSelectionne] = useState(null);
  const [dateArrivee, setDateArrivee] = useState(null);
  const [dateDepart, setDateDepart] = useState(null);
  const [etape, setEtape] = useState("arrivee");
  const [calVisible, setCalVisible] = useState(false);
  const today = new Date();
  const [calMois, setCalMois] = useState(today.getMonth());
  const [calAnnee, setCalAnnee] = useState(today.getFullYear());

  const numeroMembre = user?.id || Math.floor(Math.random() * 9000 + 1000);
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
            packages et expériences exclusives, avant-premières et expériences sur mesure.
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
            <div className="cm-cal-header">
              <button className="cm-cal-nav" onClick={() => {
                if (calMois === 0) { setCalMois(11); setCalAnnee(calAnnee - 1); }
                else setCalMois(calMois - 1);
              }}>‹</button>
              <span className="cm-cal-mois-titre">{MOIS_FR[calMois]} {calAnnee}</span>
              <button className="cm-cal-nav" onClick={() => {
                if (calMois === 11) { setCalMois(0); setCalAnnee(calAnnee + 1); }
                else setCalMois(calMois + 1);
              }}>›</button>
            </div>
            <div className="cm-cal-jours-semaine">
              {JOURS_FR.map(j => <span key={j} className="cm-cal-jour-sem">{j}</span>)}
            </div>
            <div className="cm-cal-grille">
              {getMoisCalendrier(calAnnee, calMois).map((d, i) => {
                if (!d) return <div key={i} className="cm-cal-vide" />;
                const passe = d < today && d.toDateString() !== today.toDateString();
                return (
                  <button key={i}
                    className={"cm-cal-jour" + (isArrivee(d) ? " arrivee" : "") + (isDepart(d) ? " depart" : "") + (isBetween(d) ? " between" : "") + (passe ? " passe" : "")}
                    onClick={() => !passe && handleDate(d)}
                    disabled={passe}>
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="cm-cal-legende">
              <span className="cm-cal-leg-item cm-cal-leg-arrivee">Arrivée</span>
              <span className="cm-cal-leg-item cm-cal-leg-depart">Départ</span>
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
                    <span className="cm-ligne-eyebrow">Offre membres</span>
                    {c.prixBarre && <span className="cm-ligne-barre">{c.prixBarre} €</span>}
                    <span className="cm-ligne-final">{prixFinal} €</span>
                    <span className="cm-ligne-nuit">/ nuit</span>
                  </div>
                </div>
                <div className="cm-ligne-sep" />
                <div className="cm-ligne-packages">
                  <span className="cm-ligne-pkg-titre">&#x269C; Offres & packages exclusifs</span>
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
