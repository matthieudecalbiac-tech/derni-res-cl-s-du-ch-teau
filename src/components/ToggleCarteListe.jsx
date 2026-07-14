import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChateaux } from "../hooks/useChateaux";
import Modale from "./Modale";
import CarteInteractive from "./CarteInteractive";
import "../styles/toggle-carte-liste.css";

// Toggle Carte / Liste (DA : sous la carte illustree du hero, aligne a droite).
//   - "Carte"  : ouvre la CarteInteractive Leaflet EXISTANTE (meme composant et
//     meme mecanisme de modale que le champ "Explorer" de la barre). Non modifiee.
//   - "Liste"  : ouvre en superposition la liste INTEGRALE des chateaux publies
//     non-demo, chacun cliquable vers sa vitrine.

export default function ToggleCarteListe({ onEntrerChateau }) {
  const { chateaux } = useChateaux();
  const navigate = useNavigate();

  const [carteOuvert, setCarteOuvert] = useState(false);
  const [listeOuvert, setListeOuvert] = useState(false);

  // Etat dates/invites minimal pour alimenter CarteInteractive (memes handlers
  // que BarreRecherche ; ici le toggle sert surtout a explorer le catalogue).
  const [dateArrivee, setDateArrivee] = useState(null);
  const [dateDepart, setDateDepart] = useState(null);
  const [etapeDate, setEtapeDate] = useState("arrivee");
  const [invites, setInvites] = useState({ adultes: 2, enfants: 0 });

  const handleSelectDate = (d) => {
    if (etapeDate === "arrivee") {
      setDateArrivee(d);
      setDateDepart(null);
      setEtapeDate("depart");
    } else if (d > dateArrivee) {
      setDateDepart(d);
      setEtapeDate("arrivee");
    } else {
      setDateArrivee(d);
      setDateDepart(null);
      setEtapeDate("depart");
    }
  };
  const resetDates = () => {
    setDateArrivee(null);
    setDateDepart(null);
    setEtapeDate("arrivee");
  };

  const reels = (chateaux || []).filter((c) => !c.isDemoMock);

  const toISODate = (d) => {
    const mois = String(d.getMonth() + 1).padStart(2, "0");
    const jour = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mois}-${jour}`;
  };

  // Vers la vitrine, en transportant les criteres (invites/dates). Reutilise le
  // flux onEntrerChateau/transitionCarte de App.jsx (animation TransitionPorte),
  // repris ici depuis l'ancien champ "Explorer" ; fallback navigate direct.
  const versVitrine = (chateau) => {
    if (!chateau?.slug) return;
    const p = new URLSearchParams();
    const totalInvites = invites.adultes + invites.enfants;
    p.set("invites", String(totalInvites));
    p.set("adultes", String(invites.adultes));
    p.set("enfants", String(invites.enfants));
    if (dateArrivee && dateDepart) {
      p.set("arrivee", toISODate(dateArrivee));
      p.set("depart", toISODate(dateDepart));
    }
    const url = `/chateau/${chateau.slug}?${p.toString()}`;
    setListeOuvert(false);
    setCarteOuvert(false);
    if (onEntrerChateau) onEntrerChateau(chateau, url);
    else navigate(url);
  };

  return (
    <div className="tcl">
      <div className="tcl-row">
        <div className="tcl-pill" role="tablist" aria-label="Vue carte ou liste">
          <button
            type="button"
            role="tab"
            className="tcl-onglet tcl-onglet--actif"
            onClick={() => setCarteOuvert(true)}
          >
            <svg className="tcl-onglet-ico" width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M6.5 3 3 4.5v10L6.5 13l5 1.5L15 13V3l-3.5 1.5L6.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M6.5 3v10M11.5 4.5v10" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            Carte
          </button>
          <button
            type="button"
            role="tab"
            className="tcl-onglet"
            onClick={() => setListeOuvert(true)}
          >
            <svg className="tcl-onglet-ico" width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M6 5h9M6 9h9M6 13h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="3" cy="5" r="1" fill="currentColor"/>
              <circle cx="3" cy="9" r="1" fill="currentColor"/>
              <circle cx="3" cy="13" r="1" fill="currentColor"/>
            </svg>
            Liste
          </button>
        </div>
      </div>

      {/* CARTE — CarteInteractive existante, meme mecanisme que le champ "Explorer". */}
      <Modale ouvert={carteOuvert} onClose={() => setCarteOuvert(false)} titre="Naviguer sur la carte" largeur={1440}>
        <CarteInteractive
          chateaux={chateaux}
          dateArrivee={dateArrivee}
          dateDepart={dateDepart}
          etapeDate={etapeDate}
          onSelectDate={handleSelectDate}
          onResetDates={resetDates}
          invites={invites}
          setInvites={setInvites}
          onVoirChateau={versVitrine}
        />
      </Modale>

      {/* LISTE — catalogue integral des chateaux publies non-demo, chacun -> vitrine. */}
      <Modale ouvert={listeOuvert} onClose={() => setListeOuvert(false)} titre="Tous nos châteaux" largeur={720}>
        <div className="tcl-liste">
          {reels.length === 0 && (
            <p className="tcl-liste-vide">Catalogue en cours de constitution.</p>
          )}
          {reels.map((c) => (
            <button
              type="button"
              key={c.id}
              className="tcl-item"
              onClick={() => versVitrine(c)}
            >
              <span
                className="tcl-item-photo"
                style={{ backgroundImage: `url(${c.image || c.images?.[0] || ""})` }}
              />
              <span className="tcl-item-txt">
                <span className="tcl-item-nom">{c.nom}</span>
                <span className="tcl-item-region">
                  {c.region}{c.departement ? ` · ${c.departement}` : ""}
                </span>
              </span>
              <span className="tcl-item-fleche" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </Modale>
    </div>
  );
}
