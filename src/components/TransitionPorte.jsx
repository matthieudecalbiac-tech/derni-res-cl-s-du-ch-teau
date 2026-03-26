import { useEffect, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine, chateau }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);
    const t2 = setTimeout(() => setPhase(2), 1300);
    const t3 = setTimeout(() => setPhase(3), 2800);
    const t4 = setTimeout(onTermine, 3500);
    return () => [t1,t2,t3,t4].forEach(clearTimeout);
  }, [onTermine]);

  return (
    <div className="tp-wrap">
      <div className="tp-fond" />
      <div className={"tp-battant tp-gauche " + (phase >= 1 ? "tp-ouvert" : "")} />
      <div className={"tp-battant tp-droite " + (phase >= 1 ? "tp-ouvert" : "")} />

      <div className={"tp-centre " + (phase >= 1 && phase < 3 ? "tp-centre--visible" : "")}>
        <span className="tp-lys">&#x269C;</span>
        <span className="tp-label">Ouverture du Château</span>
        {chateau && <span className="tp-nom">{chateau.nom}</span>}

        {chateau && chateau.coordonnees && (
          <div className={"tp-carte-france " + (phase >= 2 ? "tp-carte-france--visible" : "")}>
            <div className="tp-carte-wrap">
              <svg viewBox="0 0 210 228" className="tp-france-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="france-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(192,152,64,0.15)"/>
                    <stop offset="100%" stopColor="rgba(192,152,64,0.04)"/>
                  </radialGradient>
                </defs>
                <path d="M100,8 C104,6 110,7 115,9 C120,8 126,10 130,8 C136,11 142,9 147,12 C153,10 158,14 163,12 C168,15 172,12 177,16 C181,20 184,16 188,20 C192,26 190,24 194,32 C197,28 200,34 199,40 C202,38 204,44 202,50 C205,48 207,54 204,60 C207,58 210,65 207,70 C210,68 213,76 209,80 C212,78 215,86 211,91 C214,90 216,98 211,103 C215,102 217,110 212,115 C217,115 218,124 213,128 C217,128 218,137 212,141 C215,142 215,151 209,154 C211,156 210,165 204,167 C206,170 204,178 197,179 C198,183 195,191 188,191 C188,195 184,202 177,201 C176,205 171,211 164,209 C162,213 156,218 149,215 C146,218 140,222 133,219 C129,221 123,224 116,220 C112,221 106,223 99,219 C95,220 89,220 83,215 C79,215 73,214 68,208 C64,207 59,205 55,199 C51,197 47,194 44,187 C40,184 37,180 35,173 C31,169 29,164 28,157 C24,152 23,147 23,140 C19,134 19,129 20,122 C16,116 17,110 19,104 C15,97 17,91 20,85 C17,78 19,72 23,67 C21,60 24,54 28,49 C27,42 31,37 36,33 C36,26 41,22 46,18 C47,12 53,9 58,7 C60,2 66,0 72,2 C75,-2 81,0 86,3 C89,-1 95,1 100,8 Z" fill="url(#france-glow)" stroke="rgba(192,152,64,0.7)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <div
                className="tp-carte-point"
                style={{
                  left: ((chateau.coordonnees.lng + 5.1) / 13.2 * 100) + "%",
                  top: ((51.2 - chateau.coordonnees.lat) / 10.0 * 100) + "%",
                }}
              >
                <div className="tp-point-dot" />
                <div className="tp-point-ring" />
              </div>
            </div>
            <div className="tp-carte-label">
              <span className="tp-carte-dept">Localisation : {chateau.departement}</span>
            </div>
          </div>
        )}
      </div>

      <div className={"tp-fondu " + (phase >= 3 ? "tp-fondu--actif" : "")} />
    </div>
  );
}
