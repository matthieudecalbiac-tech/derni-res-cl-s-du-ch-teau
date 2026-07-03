import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChateaux } from "../hooks/useChateaux";
import { getRegionsAvecChateaux } from "../utils/regions";
import { formatDate } from "../utils/dates";
import Modale from "./Modale";
import CalendrierPlage from "./CalendrierPlage";
import CarteInteractive from "./CarteInteractive";
import "../styles/barre-recherche.css";

export default function BarreRecherche({ onEntrerChateau }) {
  const { chateaux } = useChateaux();
  const navigate = useNavigate();

  // Destination
  const [destOuvert, setDestOuvert] = useState(false);
  const [selection, setSelection] = useState(null); // { type: "region"|"chateau", region, chateau? }

  // Dates (calendrier de plage)
  const [datesOuvert, setDatesOuvert] = useState(false);
  const [dateArrivee, setDateArrivee] = useState(null);
  const [dateDepart, setDateDepart] = useState(null);
  const [etapeDate, setEtapeDate] = useState("arrivee");

  // Invites
  const [invOuvert, setInvOuvert] = useState(false);
  const [invites, setInvites] = useState({ adultes: 2, enfants: 0 });

  // Carte interactive
  const [carteOuvert, setCarteOuvert] = useState(false);

  const regions = getRegionsAvecChateaux(chateaux);

  // Ouverture exclusive : chaque champ ouvre sa modale (une seule a la fois,
  // garanti structurellement par le plein ecran).
  const ouvrir = (champ) => {
    setDestOuvert(champ === "dest");
    setDatesOuvert(champ === "dates");
    setInvOuvert(champ === "invites");
    setCarteOuvert(champ === "carte");
  };

  // Machine a etats arrivee -> depart (la source de verite des dates reste ici,
  // le calendrier n'est qu'un rendu ; cf. CalendrierPlage).
  const handleSelectDate = (d) => {
    if (etapeDate === "arrivee") {
      setDateArrivee(d);
      setDateDepart(null);
      setEtapeDate("depart");
    } else {
      if (d > dateArrivee) {
        setDateDepart(d);
        setEtapeDate("arrivee");
        setDatesOuvert(false);
      } else {
        setDateArrivee(d);
        setDateDepart(null);
        setEtapeDate("depart");
      }
    }
  };

  const resetDates = () => {
    setDateArrivee(null);
    setDateDepart(null);
    setEtapeDate("arrivee");
  };

  const labelDestination = selection
    ? selection.type === "chateau"
      ? selection.chateau.nom
      : selection.region
    : "Où rêvez-vous d’aller ?";

  const labelDates = () => {
    if (dateArrivee && dateDepart) return `${formatDate(dateArrivee)} → ${formatDate(dateDepart)}`;
    if (dateArrivee) return `${formatDate(dateArrivee)} → …`;
    return "Arrivée — Départ";
  };

  const labelInvites = () => {
    const a = invites.adultes, e = invites.enfants;
    const pa = `${a} adulte${a > 1 ? "s" : ""}`;
    if (e === 0) return pa;
    return `${pa}, ${e} enfant${e > 1 ? "s" : ""}`;
  };

  const choisirRegion = (region) => {
    setSelection({ type: "region", region });
    setDestOuvert(false);
  };
  const choisirChateau = (region, chateau) => {
    setSelection({ type: "chateau", region, chateau });
    setDestOuvert(false);
  };

  // Date -> "YYYY-MM-DD" construit depuis les composantes LOCALES (jamais
  // toISOString, qui bascule en UTC et peut decaler d'un jour selon le fuseau).
  const toISODate = (d) => {
    const mois = String(d.getMonth() + 1).padStart(2, "0");
    const jour = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mois}-${jour}`;
  };

  const lancerRecherche = () => {
    const p = new URLSearchParams();
    if (selection?.type === "chateau" && selection.chateau?.slug) {
      p.set("chateau", selection.chateau.slug);
    } else if (selection?.type === "region") {
      p.set("region", selection.region);
    }
    const totalInvites = invites.adultes + invites.enfants;
    p.set("invites", String(totalInvites));
    p.set("adultes", String(invites.adultes));
    p.set("enfants", String(invites.enfants));
    if (dateArrivee && dateDepart) {
      p.set("arrivee", toISODate(dateArrivee));
      p.set("depart", toISODate(dateDepart));
    }
    navigate(`/resultats?${p.toString()}`);
  };

  // Depuis la carte : va a la vitrine du chateau en transportant les memes
  // criteres que lancerRecherche (memes cles d'URL, meme toISODate). Ferme la
  // modale carte avant de naviguer pour ne pas la retrouver ouverte au retour.
  const onVoirChateau = (chateau) => {
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
    setCarteOuvert(false);
    if (onEntrerChateau) {
      onEntrerChateau(chateau, url);
    } else {
      navigate(url);
    }
  };

  return (
    <div className="barre-recherche">
      <div className="br-inner">
        <div className="br-carte">

          {/* DESTINATION */}
          <div className="br-champ br-champ--dest">
            <button
              type="button"
              className="br-champ-btn"
              onClick={() => ouvrir("dest")}
              aria-expanded={destOuvert}
            >
              <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 16s5-4.4 5-8.5a5 5 0 0 0-10 0C4 11.6 9 16 9 16Z" stroke="#C09840" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="9" cy="7.5" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
              </svg>
              <span className="br-champ-txt">
                <span className="br-label">Destination</span>
                <span className="br-valeur">{labelDestination}</span>
              </span>
              <svg className={"br-chevron" + (destOuvert ? " br-chevron--ouvert" : "")} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="br-sep" />

          {/* DATES */}
          <div className="br-champ br-champ--dates">
            <button
              type="button"
              className="br-champ-btn"
              onClick={() => ouvrir("dates")}
              aria-expanded={datesOuvert}
            >
              <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="3" y="4.5" width="12" height="10.5" rx="1.5" stroke="#C09840" strokeWidth="1.5"/>
                <path d="M3 7.5h12M6 3v3M12 3v3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="br-champ-txt">
                <span className="br-label">Dates</span>
                <span className="br-valeur">{labelDates()}</span>
              </span>
              <svg className={"br-chevron" + (datesOuvert ? " br-chevron--ouvert" : "")} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="br-sep" />

          {/* INVITES */}
          <div className="br-champ br-champ--invites">
            <button
              type="button"
              className="br-champ-btn"
              onClick={() => ouvrir("invites")}
              aria-expanded={invOuvert}
            >
              <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="6.8" cy="6.5" r="2.3" stroke="#C09840" strokeWidth="1.5"/>
                <circle cx="12.2" cy="7" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
                <path d="M3 15c0-2.1 1.7-3.4 3.8-3.4S10.6 12.9 10.6 15" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M11.2 11.7c1.9 0 3.3 1.2 3.3 3.3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="br-champ-txt">
                <span className="br-label">Invités</span>
                <span className="br-valeur">{labelInvites()}</span>
              </span>
              <svg className={"br-chevron" + (invOuvert ? " br-chevron--ouvert" : "")} width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="br-sep" />

          {/* NAVIGUER SUR LA CARTE */}
          <div className="br-champ br-champ--carte">
            <button
              type="button"
              className="br-champ-btn"
              onClick={() => ouvrir("carte")}
              aria-expanded={carteOuvert}
            >
              <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M6.5 3 3 4.5v10L6.5 13l5 1.5L15 13V3l-3.5 1.5L6.5 3Z" stroke="#C09840" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M6.5 3v10M11.5 4.5v10" stroke="#C09840" strokeWidth="1.5"/>
              </svg>
              <span className="br-champ-txt">
                <span className="br-label">Explorer</span>
                <span className="br-valeur">Naviguer sur la carte</span>
              </span>
            </button>
          </div>

          <button className="br-cta" onClick={lancerRecherche} disabled={!selection}>Trouver votre château <span className="br-cta-fl">→</span></button>
        </div>
      </div>

      {/* MODALE DESTINATION */}
      <Modale ouvert={destOuvert} onClose={() => setDestOuvert(false)} titre="Destination" largeur={520}>
        <div className="br-dest-liste">
          {regions.length === 0 && (
            <p className="br-dest-vide">Chargement des destinations…</p>
          )}
          {regions.map((r) => (
            <div className="br-dest-region" key={r.region}>
              <button
                type="button"
                className="br-dest-region-titre"
                onClick={() => choisirRegion(r.region)}
              >
                {r.region}
              </button>
              <ul className="br-dest-chateaux">
                {r.chateaux.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="br-dest-chateau"
                      onClick={() => choisirChateau(r.region, c)}
                    >
                      {c.nom}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modale>

      {/* MODALE DATES (2 mois cote a cote) */}
      <Modale ouvert={datesOuvert} onClose={() => setDatesOuvert(false)} titre="Vos dates" largeur={720}>
        <CalendrierPlage
          dateArrivee={dateArrivee}
          dateDepart={dateDepart}
          etape={etapeDate}
          onSelectDate={handleSelectDate}
          onReset={resetDates}
        />
      </Modale>

      {/* MODALE INVITES */}
      <Modale ouvert={invOuvert} onClose={() => setInvOuvert(false)} titre="Voyageurs" largeur={460}>
        <div className="br-stepper-ligne">
          <span className="br-stepper-label">Adultes</span>
          <div className="br-stepper">
            <button
              type="button"
              className="br-stepper-btn"
              aria-label="Diminuer les adultes"
              onClick={() => setInvites((v) => ({ ...v, adultes: Math.max(1, v.adultes - 1) }))}
              disabled={invites.adultes <= 1}
            >−</button>
            <span className="br-stepper-val">{invites.adultes}</span>
            <button
              type="button"
              className="br-stepper-btn"
              aria-label="Augmenter les adultes"
              onClick={() => setInvites((v) => ({ ...v, adultes: v.adultes + 1 }))}
              disabled={invites.adultes + invites.enfants >= 20}
            >+</button>
          </div>
        </div>
        <div className="br-stepper-ligne">
          <span className="br-stepper-label">Enfants</span>
          <div className="br-stepper">
            <button
              type="button"
              className="br-stepper-btn"
              aria-label="Diminuer les enfants"
              onClick={() => setInvites((v) => ({ ...v, enfants: Math.max(0, v.enfants - 1) }))}
              disabled={invites.enfants <= 0}
            >−</button>
            <span className="br-stepper-val">{invites.enfants}</span>
            <button
              type="button"
              className="br-stepper-btn"
              aria-label="Augmenter les enfants"
              onClick={() => setInvites((v) => ({ ...v, enfants: v.enfants + 1 }))}
              disabled={invites.adultes + invites.enfants >= 20}
            >+</button>
          </div>
        </div>
      </Modale>

      {/* MODALE CARTE */}
      <Modale ouvert={carteOuvert} onClose={() => setCarteOuvert(false)} titre="Naviguer sur la carte" largeur={1280}>
        <CarteInteractive
          chateaux={chateaux}
          dateArrivee={dateArrivee}
          dateDepart={dateDepart}
          invites={invites}
          onVoirChateau={onVoirChateau}
        />
      </Modale>
    </div>
  );
}
