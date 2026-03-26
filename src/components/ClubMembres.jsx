import React, { useState } from "react";
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
  let jourSemaine = premier.getDay();
  if (jourSemaine === 0) jourSemaine = 7;
  for (let i = 1; i < jourSemaine; i++) jours.push(null);
  for (let d = 1; d <= dernier.getDate(); d++) jours.push(new Date(annee, mois, d));
  return jours;
}

const MOIS_FR = ["Janvier","F\u00e9vrier","Mars","Avril","Mai","Juin","Juillet","A\u00f4t","Septembre","Octobre","Novembre","D\u00e9cembre"];
const JOURS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

const PACKAGES = {
  1: ["Package \u00ab Grand Si\u00e8cle \u00bb \u2014 2 nuits + d\u00eener gastronomique dans les appartements priv\u00e9s","Visite priv\u00e9e hors ouverture avec le directeur du domaine","Champagne d\u2019accueil & acc\u00e8s aux jardins \u00e0 la fran\u00e7aise"],
  2: ["Package \u00ab Ch\u00e2teau M\u00e9di\u00e9val \u00bb \u2014 nuit en chambre tour + visite guid\u00e9e des fortifications","D\u00eener th\u00e9matique chevalerie dans la grande salle vo\u00fbt\u00e9e","Petit-d\u00e9jeuner m\u00e9di\u00e9val \u2014 pain maison, confitures artisanales"],
  3: ["Package \u00ab Princes de Cond\u00e9 \u00bb \u2014 entr\u00e9e VIP aux Grandes \u00c9curies + spectacle \u00e9questre priv\u00e9","Visite priv\u00e9e des collections d\u2019art avec conservateur","D\u00eener exclusif au bord du lac des Cygnes"],
  4: ["Package \u00ab Chambre Napol\u00e9on \u00bb \u2014 nuit dans les appartements historiques class\u00e9s","Acc\u00e8s priv\u00e9 aux galeries royales avant l\u2019ouverture + guide d\u00e9di\u00e9","Pique-nique gastronomique dans les jardins \u00e0 la fran\u00e7aise"],
  5: ["Package \u00ab Roi Ren\u00e9 \u00bb \u2014 immersion en Sologne + balade \u00e0 cheval dans la for\u00eat","Table d\u2019h\u00f4tes priv\u00e9e avec les propri\u00e9taires \u2014 cuisine du terroir","Acc\u00e8s libre aux \u00e9tangs & for\u00eats du domaine"],
  6: ["Package \u00ab Vigneron \u00bb \u2014 d\u00e9gustation priv\u00e9e en cave avec l\u2019oenologue","Visite guid\u00e9e du vignoble \u00e0 l\u2019aube + petit-d\u00e9jeuner dans les vignes","D\u00eener accord mets & vins maison"],
  7: ["Package \u00ab Famille de Valbray \u00bb \u2014 table d\u2019h\u00f4tes aux chandelles avec Fran\u00e7ois & Hedwige","Promenade \u00e0 cheval dans le parc de 50 ha guid\u00e9e par la famille","Acc\u00e8s piscine, jardins de lavande & paniers de fruits offerts"],
  8: ["Package \u00ab Suite du Donjon \u00bb \u2014 nuit dans la tour m\u00e9di\u00e9vale du XIIIe si\u00e8cle","Visite guid\u00e9e priv\u00e9e par Ma\u00ebt\u00e9 de la Fresnaye \u2014 histoire & architecture","Petit-d\u00e9jeuner dans la cour int\u00e9rieure m\u00e9di\u00e9vale"],
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

  const numeroMembre = String(Math.abs((user?.email || "").split("").reduce((a,c) => a + c.charCodeAt(0), 1000)) % 9000 + 1000).padStart(4,"0");

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
            <span className="cm-header-titre">Club des Ch\u00e2telains</span>
            <span className="cm-header-sub">Offres exclusives membres</span>
          </div>
        </div>
        <div className="cm-header-droite">
          <div className="cm-header-membre">
            <span className="cm-header-user">{user?.prenom || user?.email?.split("@")[0] || "Membre"}</span>
            <span className="cm-header-num">N\u00b0 {numeroMembre}</span>
          </div>
          <button className="cm-header-fermer" onClick={onClose}>Fermer</button>
        </div>
      </header>

      <div className="cm-hero">
        <div className="cm-hero-inner">
          <div className="cm-orn"><span className="cm-orn-trait"/><span className="cm-orn-lys">&#x269C;</span><span className="cm-orn-trait"/></div>
          <h1 className="cm-hero-titre">Vos offres exclusives</h1>
          <p className="cm-hero-accroche">Des s\u00e9jours et packages con\u00e7us pour les membres du Club \u2014 tarifs confidentiels, avant-premi\u00e8res et exp\u00e9riences sur mesure.</p>
        </div>
      </div>

      <div className="cm-dates-section">
        <div className="cm-dates-bar">
          <div className="cm-dates-label">Vos dates</div>
          <div className="cm-dates-etapes">
            <div className={"cm-date-etape " + (etape === "arrivee" ? "actif" : dateArrivee ? "done" : "")}
              onClick={() => { setEtape("arrivee"); setCalVisible(true); }}>
              <span className="cm-date-ico">&#x25c6;</span>
              <div>
                <span className="cm-date-label">Arriv\u00e9e</span>
                <span className="cm-date-val">{dateArrivee ? formatDate(dateArrivee) : "Choisir"}</span>
              </div>
            </div>
            <span className="cm-dates-fleche">\u2192</span>
            <div className={"cm-date-etape " + (etape === "depart" ? "actif" : dateDepart ? "done" : "")}
              onClick={() => { if (dateArrivee) { setEtape("depart"); setCalVisible(true); } }}>
              <span className="cm-date-ico">&#x25c6;</span>
              <div>
                <span className="cm-date-label">D\u00e9part</span>
                <span className="cm-date-val">{dateDepart ? formatDate(dateDepart) : "Choisir"}</span>
              </div>
            </div>
            {dateArrivee && <button className="cm-dates-reset" onClick={() => { setDateArrivee(null); setDateDepart(null); setEtape("arrivee"); setCalVisible(false); }}>\u2715 Effacer</button>}
          </div>
          {dateArrivee && dateDepart && (
            <div className="cm-dates-result">Du <strong>{formatDate(dateArrivee)}</strong> au <strong>{formatDate(dateDepart)}</strong></div>
          )}
        </div>

        {calVisible && (
          <div className="cm-cal-wrap">
            <div className="cm-cal-header">
              <button className="cm-cal-nav" onClick={() => { if (calMois === 0) { setCalMois(11); setCalAnnee(calAnnee-1); } else setCalMois(calMois-1); }}>\u2039</button>
              <span className="cm-cal-mois-titre">{MOIS_FR[calMois]} {calAnnee}</span>
              <button className="cm-cal-nav" onClick={() => { if (calMois === 11) { setCalMois(0); setCalAnnee(calAnnee+1); } else setCalMois(calMois+1); }}>\u203a</button>
            </div>
            <div className="cm-cal-jours-semaine">{JOURS_FR.map(j => <span key={j} className="cm-cal-jour-sem">{j}</span>)}</div>
            <div className="cm-cal-grille">
              {getMoisCalendrier(calAnnee, calMois).map((d, i) => {
                if (!d) return <div key={i} className="cm-cal-vide" />;
                const passe = d < today && d.toDateString() !== today.toDateString();
                return (
                  <button key={i} disabled={passe}
                    className={"cm-cal-jour" + (isArrivee(d) ? " arrivee" : "") + (isDepart(d) ? " depart" : "") + (isBetween(d) ? " between" : "") + (passe ? " passe" : "")}
                    onClick={() => handleDate(d)}>{d.getDate()}</button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="cm-liste">
        {chateaux.map(c => {
          const prixFinal = c.prixBarre ? Math.round(c.prixBarre * (1-(c.reduction||0)/100)) : c.prix;
          const pkgs = PACKAGES[c.id] || ["Package s\u00e9jour prestige","Visite priv\u00e9e du domaine","Acc\u00e8s jardins & terrasses"];
          return (
            <div key={c.id} className="cm-ligne">
              <div className="cm-ligne-img" style={{backgroundImage:`url(${c.images?.[0]})`}}>
                <div className="cm-ligne-img-overlay" />
                {c.reduction && <span className="cm-ligne-promo">\u2212{c.reduction}\u00a0%</span>}
              </div>
              <div className="cm-ligne-corps">
                <div className="cm-ligne-top">
                  <div>
                    <span className="cm-ligne-region">{c.region} \u00b7 {c.distanceParis}</span>
                    <h3 className="cm-ligne-nom">{c.nom}</h3>
                    <p className="cm-ligne-accroche">{c.accroche}</p>
                  </div>
                  <div className="cm-ligne-prix-bloc">
                    <span className="cm-ligne-eyebrow">Offre membres</span>
                    {c.prixBarre && <span className="cm-ligne-barre">{c.prixBarre}\u00a0\u20ac</span>}
                    <span className="cm-ligne-final">{prixFinal}\u00a0\u20ac</span>
                    <span className="cm-ligne-nuit">/ nuit</span>
                  </div>
                </div>
                <div className="cm-ligne-sep" />
                <div className="cm-ligne-packages">
                  <span className="cm-ligne-pkg-titre">&#x269C; Packages & offres exclusifs</span>
                  <div className="cm-ligne-pkg-liste">
                    {pkgs.map((p,i) => <span key={i} className="cm-ligne-pkg">\u2726 {p}</span>)}
                  </div>
                </div>
                <button className="cm-ligne-cta" onClick={() => setTransitionChateau(c)}>D\u00e9couvrir ce s\u00e9jour \u2192</button>
              </div>
            </div>
          );
        })}
      </div>

      {transitionChateau && (
        <TransitionPorte chateau={transitionChateau} onTermine={() => { setChateauSelectionne(transitionChateau); setTransitionChateau(null); }} />
      )}
      {(transitionChateau || chateauSelectionne) && (
        <VitrineClub chateau={transitionChateau || chateauSelectionne} user={user}
          onClose={() => { setChateauSelectionne(null); setTransitionChateau(null); }} />
      )}
    </div>
  );
}
