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
              <svg viewBox="0 0 500 550" className="tp-france-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="france-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(192,152,64,0.15)"/>
                    <stop offset="100%" stopColor="rgba(192,152,64,0.04)"/>
                  </radialGradient>
                </defs>
                <path d="M 261.5,17.7 L 249.3,21.9 L 238.2,22.4 L 230.6,34.6 L 229.6,53.2 L 222.4,68.6 L 199.7,77.6 L 189.2,86.1 L 181.0,99.4 L 181.0,106.3 L 165.5,110.5 L 142.2,115.8 L 124.4,91.9 L 116.8,88.2 L 111.3,146.1 L 101.4,146.6 L 84.0,148.7 L 66.9,147.7 L 48.5,143.9 L 30.4,158.8 L 21.2,185.9 L 34.0,192.8 L 67.2,192.8 L 86.9,206.0 L 95.5,219.3 L 106.3,238.9 L 126.7,265.4 L 137.6,297.8 L 140.2,309.5 L 139.2,356.7 L 130.0,414.6 L 122.4,424.6 L 118.8,426.2 L 130.3,432.1 L 153.7,445.9 L 189.5,461.2 L 201.3,461.8 L 225.0,466.0 L 234.5,471.3 L 253.0,475.0 L 276.3,479.3 L 281.6,475.0 L 293.4,435.2 L 305.2,423.6 L 321.0,417.2 L 336.8,426.8 L 344.0,420.4 L 353.6,435.2 L 368.4,439.5 L 380.5,438.4 L 396.3,444.8 L 405.5,423.6 L 411.8,415.6 L 416.7,407.7 L 422.3,405.0 L 424.9,403.4 L 427.5,394.4 L 430.2,384.8 L 426.9,376.9 L 419.3,369.4 L 411.1,362.6 L 406.2,354.6 L 403.9,346.1 L 398.6,337.6 L 395.6,332.8 L 397.9,327.0 L 400.6,320.6 L 401.9,314.3 L 402.9,307.9 L 404.5,301.5 L 406.2,294.6 L 403.9,288.3 L 401.2,284.6 L 403.9,280.3 L 404.5,276.1 L 391.4,263.3 L 382.8,265.4 L 378.2,259.1 L 375.6,252.7 L 377.6,245.8 L 378.9,238.9 L 378.9,235.7 L 383.2,231.5 L 390.1,232.0 L 394.0,227.2 L 399.6,220.9 L 403.9,216.6 L 407.8,214.0 L 411.8,210.3 L 416.0,207.1 L 421.0,205.0 L 426.2,201.8 L 427.5,198.1 L 428.2,192.8 L 428.8,189.0 L 430.2,183.7 L 431.5,176.8 L 432.5,168.9 L 432.8,162.5 L 433.5,156.1 L 434.1,149.2 L 434.1,143.4 L 434.1,138.1 L 434.1,131.7 L 433.5,127.5 L 431.5,125.4 L 428.2,123.2 L 425.9,121.1 L 423.6,120.1 L 419.3,118.5 L 414.4,116.9 L 407.8,114.8 L 401.9,111.6 L 396.0,107.3 L 391.4,104.1 L 386.8,102.0 L 382.2,99.9 L 377.6,97.2 L 373.6,94.6 L 370.0,89.3 L 368.7,82.9 L 368.7,76.6 L 368.7,70.2 L 364.4,68.1 L 359.2,67.0 L 353.6,66.5 L 348.6,65.4 L 343.7,63.8 L 337.5,65.4 L 331.5,61.7 L 325.6,57.4 L 320.4,54.3 L 314.4,59.0 L 308.5,54.3 L 303.9,49.5 L 303.9,45.8 L 299.3,43.7 L 294.4,40.5 L 290.4,37.8 L 284.8,35.2 L 279.3,31.4 L 274.7,27.7 L 270.4,23.5 L 265.8,21.4 L 261.5,17.7 Z" fill="rgba(192,152,64,0.08)" stroke="rgba(192,152,64,0.65)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              </svg>
              <div
                className="tp-carte-point"
                style={{
                  left: ((chateau.coordonnees.lng + 5.1) / 14.6 * 100) + "%",
                  top: ((51.1 - chateau.coordonnees.lat) / 9.8 * 100) + "%",
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
