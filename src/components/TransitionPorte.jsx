import { useEffect, useRef, useState } from "react";
import "../styles/transition-porte.css";

export default function TransitionPorte({ onTermine }) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState("entree"); // entree | sortie

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {
      // Si la vidéo ne charge pas, on passe directement
      setTimeout(() => {
        setPhase("sortie");
        setTimeout(onTermine, 600);
      }, 400);
    });

    // Après 2.2s on lance la sortie
    const t1 = setTimeout(() => setPhase("sortie"), 2200);
    const t2 = setTimeout(onTermine, 2800);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onTermine]);

  return (
    <div className={"tp-overlay tp-overlay--" + phase}>
      <video
        ref={videoRef}
        className="tp-video"
        src="https://videos.pexels.com/video-files/3773486/3773486-uhd_2560_1440_25fps.mp4"
        muted
        playsInline
        autoPlay
      />
      <div className="tp-voile" />
      <div className="tp-lys">&#x269C;</div>
    </div>
  );
}
