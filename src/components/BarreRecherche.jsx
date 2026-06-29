import "../styles/barre-recherche.css";

export default function BarreRecherche() {
  return (
    <div className="barre-recherche">
      <div className="br-inner">
        <div className="br-carte">
          <div className="br-champ">
            <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 16s5-4.4 5-8.5a5 5 0 0 0-10 0C4 11.6 9 16 9 16Z" stroke="#C09840" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="9" cy="7.5" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
            </svg>
            <div className="br-champ-txt">
              <span className="br-label">Destination</span>
              <span className="br-valeur">Où rêvez-vous d’aller ?</span>
            </div>
            <svg className="br-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="br-sep" />
          <div className="br-champ">
            <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="4.5" width="12" height="10.5" rx="1.5" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 7.5h12M6 3v3M12 3v3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="br-champ-txt">
              <span className="br-label">Dates</span>
              <span className="br-valeur">Arrivée — Départ</span>
            </div>
            <svg className="br-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="br-sep" />
          <div className="br-champ">
            <svg className="br-ico" width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="6.8" cy="6.5" r="2.3" stroke="#C09840" strokeWidth="1.5"/>
              <circle cx="12.2" cy="7" r="1.8" stroke="#C09840" strokeWidth="1.5"/>
              <path d="M3 15c0-2.1 1.7-3.4 3.8-3.4S10.6 12.9 10.6 15" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11.2 11.7c1.9 0 3.3 1.2 3.3 3.3" stroke="#C09840" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div className="br-champ-txt">
              <span className="br-label">Invités</span>
              <span className="br-valeur">2 invités</span>
            </div>
            <svg className="br-chevron" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.5 7 9l3.5-3.5" stroke="#A8884E" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button className="br-cta">Trouver votre château <span className="br-cta-fl">→</span></button>
        </div>
      </div>
    </div>
  );
}
